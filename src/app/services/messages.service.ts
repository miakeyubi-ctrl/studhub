import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { AgentAuthService } from './agent-auth.service';
import { ActiveRoleService } from './active-role.service';
import { PushNotificationsService } from './push-notifications.service';

export interface ChatMessage {
  id: number;
  text: string;
  time: string;
  fromMe: boolean;
  kind?: 'text' | 'call' | 'image' | 'audio' | 'file';
  mediaUrl?: string;
  fileName?: string;
  callStatus?: 'completed' | 'missed' | 'rejected' | 'cancelled';
  callDirection?: 'in' | 'out';
  durationSec?: number;
  /** Accusé de lecture (messages envoyés par moi) */
  readAt?: string | null;
  status?: 'sending' | 'sent' | 'read';
}

export type CallLogStatus = 'completed' | 'missed' | 'rejected' | 'cancelled';
export type CallDirection = 'in' | 'out';

const CALL_PREFIX = '__CALL__:';

export interface Conversation {
  id: number;
  name: string;
  role: string;
  avatar: string;
  online: boolean;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
  /** Conversation système StudHub — pas de réponse possible */
  isSystem?: boolean;
  allowReplies?: boolean;
}

type SubjectMe = { type: 'user' | 'agent'; id: number } | null;

const STUDHUB_TEAM_AVATAR = 'assets/images/logo.png';
const CACHE_KEY = 'STUDHUB-CHAT-CACHE';

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private _conversations$ = new BehaviorSubject<Conversation[]>([]);
  /** Flux temps réel des conversations (UI doit s'y abonner). */
  readonly conversations$: Observable<Conversation[]> = this._conversations$.asObservable();

  private _typing$ = new BehaviorSubject<Record<number, boolean>>({});
  /** conversationId → le pair est en train d'écrire */
  readonly typing$ = this._typing$.asObservable();

  /** Événements signaling WebRTC (appels). */
  private _signal$ = new Subject<{ event: string; data: any }>();
  readonly signal$ = this._signal$.asObservable();

  get conversations(): Conversation[] {
    return this._conversations$.value;
  }

  /** Total messages non lus (réactif via conversations$). */
  get totalUnread(): number {
    return this._conversations$.value.reduce((sum, c) => sum + (Number(c.unreadCount) || 0), 0);
  }

  private socket: any = null;
  private lastSubjectKey: string | null = null;
  private lastWsToken: string | null = null;
  private audioCtx: AudioContext | null = null;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private agentAuth: AgentAuthService,
    private activeRole: ActiveRoleService,
    private router: Router,
    private zone: NgZone,
    private push: PushNotificationsService,
  ) {
    this.loadCache();
    void this.silentLoadFromBackend();
    void this.ensureRealtime();

    this.auth.user$.subscribe(() => void this.onAuthChanged());
    this.agentAuth.agent$.subscribe(() => void this.onAuthChanged());
  }

  isPeerTyping(conversationId: number): boolean {
    return !!this._typing$.value[conversationId];
  }

  isPeerOnline(conversationId: number): boolean {
    return !!this._conversations$.value.find((c) => c.id === conversationId)?.online;
  }

  /**
   * Rejoint la room et attend l’événement presence (évite le faux « hors ligne »
   * juste après startConversation).
   */
  async waitForPeerPresence(conversationId: number, timeoutMs = 2500): Promise<boolean> {
    if (!conversationId) return false;
    await this.ensureRealtime();
    this.joinConversation(conversationId);
    if (this.isPeerOnline(conversationId)) return true;

    return new Promise<boolean>((resolve) => {
      let done = false;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        sub.unsubscribe();
        resolve(ok);
      };
      const sub = this.conversations$.subscribe(() => {
        if (this.isPeerOnline(conversationId)) finish(true);
      });
      const timer = setTimeout(() => finish(this.isPeerOnline(conversationId)), timeoutMs);
      // Re-join au cas où le 1er emit est parti avant le connect
      this.joinConversation(conversationId);
    });
  }

  /** Signale au pair que j'écris (ou j'arrête). */
  setTyping(conversationId: number, isTyping: boolean): void {
    if (!conversationId || !this.socket?.connected) return;
    this.socket.emit?.('typing', { conversationId: Number(conversationId), isTyping: !!isTyping });
  }

  /** Émet un événement signaling (appels WebRTC). */
  emitSignal(event: string, data: any): void {
    if (!this.socket?.connected) return;
    this.socket.emit?.(event, data);
  }

  /** true si le socket chat/appels est connecté. */
  get isRealtimeConnected(): boolean {
    return !!this.socket?.connected;
  }

  /* ------------------------------------------------------------------ *
   *  Rôle actif : espace agent → identité agent, sinon étudiant         *
   * ------------------------------------------------------------------ */
  private preferAgentContext(): boolean {
    if (this.activeRole.preferAgent()) return true;
    const url = this.router.url || '';
    return url.includes('/agent-dashboard') || url.includes('/agent-login');
  }

  private me(): SubjectMe {
    if (this.preferAgentContext()) {
      const agent = this.agentAuth.currentAgent;
      if (agent?.id) {
        const idNum = Number(agent.id);
        if (!Number.isNaN(idNum)) return { type: 'agent', id: idNum };
      }
    }
    const student = this.auth.currentUser;
    if (student?.id) {
      const idNum = Number(student.id);
      if (!Number.isNaN(idNum)) return { type: 'user', id: idNum };
    }
    const agent = this.agentAuth.currentAgent;
    if (agent?.id) {
      const idNum = Number(agent.id);
      if (!Number.isNaN(idNum)) return { type: 'agent', id: idNum };
    }
    return null;
  }

  private subjectKey(me: SubjectMe): string | null {
    return me ? `${me.type}:${me.id}` : null;
  }

  private async onAuthChanged(): Promise<void> {
    const me = this.me();
    const key = this.subjectKey(me);
    if (key !== this.lastSubjectKey) {
      this.lastSubjectKey = key;
      if (!me) {
        this.updateStore([]);
        this.disconnectWs();
        return;
      }
      // Nouveau compte / rôle → vider le cache seed et recharger
      try { localStorage.removeItem(CACHE_KEY); } catch {}
      this.updateStore([]);
      await this.getConversations();
      await this.ensureRealtime(true);
    }
  }

  /* ------------------------------------------------------------------ *
   *  CACHE LOCAL (pas de seed fictif une fois connecté)                 *
   * ------------------------------------------------------------------ */
  private loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Conversation[];
      if (Array.isArray(parsed) && parsed.length) {
        this._conversations$.next(parsed);
      }
    } catch {}
  }

  private saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this._conversations$.value));
    } catch {}
  }

  /* ------------------------------------------------------------------ *
   *  NORMALISATEURS BACK → FRONT                                        *
   * ------------------------------------------------------------------ */
  private fmtShortTime(d: any): string {
    if (!d) return '';
    try {
      const date = d instanceof Date ? d : new Date(d);
      const now = new Date();
      const sameDay = date.toDateString() === now.toDateString();
      if (sameDay) {
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      }
      const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
      if (diffDays === 1) return 'Hier';
      if (diffDays < 7) {
        return date.toLocaleDateString('fr-FR', { weekday: 'short' });
      }
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    } catch {
      return String(d);
    }
  }

  private normalizeConversation(raw: any, me: SubjectMe): Conversation {
    const isSystem = raw?.type === 'SYSTEM' || raw?.allowReplies === false || raw?.isSystem === true;
    const isUser = me?.type === 'user';
    let other: any;
    if (isSystem) {
      other = null;
    } else if (isUser && raw.peerStudentId) {
      // Conv étudiant↔étudiant : l'autre = peer si je suis studentId, sinon student
      other = Number(me.id) === Number(raw.studentId) ? raw.peerStudent : raw.student;
    } else {
      other = isUser ? raw.agent : raw.student;
    }
    const name = isSystem
      ? (raw.title || 'Équipe StudHub')
      : (other?.agencyName || other?.fullName || other?.name || 'Contact');
    const avatar = isSystem
      ? STUDHUB_TEAM_AVATAR
      : ((other?.avatarUrl || other?.avatar || '') as string).trim();
    const role = isSystem
      ? 'StudHub'
      : (raw.peerStudentId ? 'Étudiant' : (isUser ? (raw.title || 'Agent immobilier') : 'Étudiant'));
    const unreadCount = (() => {
      if (!isUser) return Number(raw.unreadAgentCount ?? raw.unreadCount) || 0;
      if (raw.peerStudentId && Number(me.id) === Number(raw.peerStudentId)) {
        return Number(raw.unreadAgentCount ?? 0) || 0;
      }
      return Number(raw.unreadStudentCount ?? raw.unreadCount) || 0;
    })();
    const local = this._conversations$.value.find((c) => c.id === Number(raw.id));
    const preview: ChatMessage[] = raw.lastMessage
      ? [
          this.normalizeMessage(
            {
              id: 0,
              content: String(raw.lastMessage),
              createdAt: raw.lastMessageAt || raw.updatedAt,
              isSystem,
            },
            me,
          ),
        ]
      : [];
    if (preview[0] && !preview[0].kind && String(raw.lastMessage).startsWith('Appel')) {
      preview[0] = { ...preview[0], kind: 'call' };
    }
    return {
      id: Number(raw.id),
      name,
      role,
      avatar,
      online: isSystem ? false : (local?.online ?? false),
      lastMessageTime: this.fmtShortTime(raw.lastMessageAt || raw.updatedAt),
      unreadCount,
      messages: local?.messages?.length ? local.messages : preview,
      isSystem,
      allowReplies: isSystem ? false : raw?.allowReplies !== false,
    };
  }

  private normalizeMessage(raw: any, me: SubjectMe): ChatMessage {
    const fromMe =
      (me?.type === 'user' && raw.studentSenderId && Number(raw.studentSenderId) === Number(me.id)) ||
      (me?.type === 'agent' && raw.agentSenderId && Number(raw.agentSenderId) === Number(me.id));
    const content = String(raw.content || raw.text || '');
    const mediaUrl = raw.mediaUrl ? String(raw.mediaUrl) : '';
    const call = this.parseCallPayload(content);
    if (call) {
      // dir dans le payload = point de vue de l'émetteur du log
      const callDirection: CallDirection =
        call.direction === 'out'
          ? fromMe
            ? 'out'
            : 'in'
          : fromMe
            ? 'in'
            : 'out';
      return {
        id: Number(raw.id),
        text: this.callPreviewLabel(call.status, call.durationSec, callDirection),
        time: this.fmtShortTime(raw.createdAt || raw.time),
        fromMe: !!fromMe,
        kind: 'call',
        callStatus: call.status,
        callDirection,
        durationSec: call.durationSec,
      };
    }
    const kind = mediaUrl
      ? this.mediaKindFromUrl(mediaUrl, { content })
      : 'text';
    return {
      id: Number(raw.id),
      text: content,
      time: this.fmtShortTime(raw.createdAt || raw.time),
      fromMe: !!fromMe,
      kind,
      mediaUrl: mediaUrl ? this.resolveMediaUrl(mediaUrl) : undefined,
      fileName: mediaUrl && kind === 'file'
        ? (content || this.fileNameFromUrl(mediaUrl))
        : undefined,
      readAt: raw.readAt ? String(raw.readAt) : null,
      status: fromMe ? (raw.readAt ? 'read' : 'sent') : undefined,
    };
  }

  /** Absolu pour Android / WebView (URLs relatives /uploads/…). */
  resolveMediaUrl(url: string): string {
    const u = String(url || '').trim();
    if (!u) return u;
    if (/^https?:\/\//i.test(u) || u.startsWith('blob:') || u.startsWith('data:')) return u;
    const base = (environment as any).uploadsUrl
      || String(environment.apiUrl || '').replace(/\/api\/v1\/?$/, '') + '/uploads';
    if (u.startsWith('/uploads/')) {
      return `${String(base).replace(/\/uploads\/?$/, '')}${u}`;
    }
    if (u.startsWith('/')) {
      return `${String(environment.wsUrl || '').replace(/\/$/, '')}${u}`;
    }
    return `${String(base).replace(/\/$/, '')}/${u.replace(/^\//, '')}`;
  }

  mediaKindFromUrl(
    url: string,
    opts?: { content?: string; forceKind?: 'image' | 'audio' | 'file' },
  ): 'image' | 'audio' | 'file' {
    if (opts?.forceKind) return opts.forceKind;
    const raw = String(url || '');
    const u = raw.toLowerCase().split('?')[0];
    const q = raw.toLowerCase();
    if (/\.(jpe?g|png|gif|webp)$/.test(u)) return 'image';
    if (/\.(webm|ogg|mp3|m4a|wav|aac|opus)$/.test(u)) return 'audio';
    // Cloudinary / CDN sans extension claire
    if (
      /\/(?:video|audio|raw)\/upload\//i.test(u) ||
      /resource_type[=/]audio/i.test(q) ||
      /voice[-_]/i.test(u) ||
      /\/chat\/.*voice/i.test(u)
    ) {
      // Les notes vocales MediaRecorder partent souvent en video/webm sur Cloudinary
      if (/voice[-_]/i.test(u) || /\/chat\/.*voice/i.test(u) || /audio/i.test(q)) {
        return 'audio';
      }
    }
    const content = String(opts?.content || '');
    if (/🎤|note vocale/i.test(content)) return 'audio';
    return 'file';
  }

  private fileNameFromUrl(url: string): string {
    try {
      const path = String(url).split('?')[0];
      const name = path.substring(path.lastIndexOf('/') + 1);
      return decodeURIComponent(name || 'fichier');
    } catch {
      return 'fichier';
    }
  }

  private parseCallPayload(
    content: string,
  ): { status: CallLogStatus; durationSec: number; direction: CallDirection } | null {
    if (!content.startsWith(CALL_PREFIX)) return null;
    const parts = content.split(':');
    // __CALL__:completed:67:out → ['__CALL__', 'completed', '67', 'out']
    const status = parts[1] as CallLogStatus;
    const durationSec = Number(parts[2] || 0) || 0;
    const direction: CallDirection = parts[3] === 'in' ? 'in' : 'out';
    if (!['completed', 'missed', 'rejected', 'cancelled'].includes(status)) return null;
    return { status, durationSec, direction };
  }

  /** Libellé stable (FR) pour aperçu liste / lastMessage. */
  callPreviewLabel(status: CallLogStatus, durationSec = 0, direction: CallDirection = 'out'): string {
    const dur = this.formatDuration(durationSec);
    const side = direction === 'out' ? 'sortant' : 'entrant';
    switch (status) {
      case 'completed':
        return `Appel ${side} · ${dur}`;
      case 'missed':
        return direction === 'out' ? 'Appel sortant manqué' : 'Appel entrant manqué';
      case 'rejected':
        return direction === 'out' ? 'Appel sortant refusé' : 'Appel entrant refusé';
      case 'cancelled':
        return direction === 'out' ? 'Appel sortant annulé' : 'Appel entrant annulé';
      default:
        return `Appel ${side}`;
    }
  }

  formatDuration(totalSec: number): string {
    const total = Math.max(0, Math.floor(totalSec || 0));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  encodeCallPayload(status: CallLogStatus, durationSec = 0, direction: CallDirection = 'out'): string {
    return `${CALL_PREFIX}${status}:${Math.max(0, Math.floor(durationSec || 0))}:${direction}`;
  }

  /** Enregistre un événement d'appel dans l'historique de conversation. */
  async logCallEvent(
    conversationId: number,
    status: CallLogStatus,
    durationSec = 0,
    direction: CallDirection = 'out',
  ): Promise<void> {
    if (!conversationId) return;
    const me = this.me();
    const content = this.encodeCallPayload(status, durationSec, direction);
    const optimistic: ChatMessage = {
      id: Date.now(),
      text: this.callPreviewLabel(status, durationSec, direction),
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      fromMe: true,
      kind: 'call',
      callStatus: status,
      callDirection: direction,
      durationSec,
    };
    this.appendLocalMessage(conversationId, optimistic);
    await this.ensureRealtime();
    this.joinConversation(conversationId);

    if (!me) return;
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/messages`, {
          conversationId: Number(conversationId),
          content,
        }),
      );
      if (res?.success && res?.data) {
        const real = this.normalizeMessage(res.data, me);
        this.replaceOptimistic(conversationId, optimistic.id, real);
      }
    } catch {}
  }

  private updateStore(next: Conversation[]) {
    this._conversations$.next(next);
    this.saveCache();
  }

  /* ------------------------------------------------------------------ *
   *  CHARGEMENT BACKEND                                                 *
   * ------------------------------------------------------------------ */
  private async silentLoadFromBackend() {
    await this.getConversations();
  }

  async getConversations(): Promise<Conversation[]> {
    const me = this.me();
    this.lastSubjectKey = this.subjectKey(me);
    if (!me) {
      return this._conversations$.value;
    }
    await this.ensureRealtime();
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/conversations`),
      );
      if (res?.success && Array.isArray(res?.data)) {
        const mapped = res.data.map((c: any) => this.normalizeConversation(c, me));
        this.updateStore(mapped);
        this.joinAllRooms();
        return mapped;
      }
    } catch {}
    return this._conversations$.value;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const me = this.me();
    const local = this._conversations$.value.find((c) => c.id === id);

    if (me) {
      try {
        const res: any = await firstValueFrom(
          this.http.get(`${environment.apiUrl}/conversations/${id}/messages`),
        );
        if (res?.success && Array.isArray(res?.data)) {
          const serverMsgs = res.data
            .map((m: any) => this.normalizeMessage(m, me))
            .sort((a: ChatMessage, b: ChatMessage) => a.id - b.id);
          // Conserve les bulles optimistes (ex. note vocale en cours d'upload)
          // pour éviter le flash disparaître / réapparaître pendant le poll.
          const pendingLocal = (local?.messages || []).filter(
            (m) =>
              m.status === 'sending' &&
              !serverMsgs.some((s: ChatMessage) => s.id === m.id),
          );
          const msgs = [...serverMsgs, ...pendingLocal].sort(
            (a: ChatMessage, b: ChatMessage) => a.id - b.id,
          );
          let updated = this._conversations$.value.map((c) =>
            c.id === id ? { ...c, messages: msgs, unreadCount: 0 } : c,
          );
          if (!updated.find((c) => c.id === id)) {
            updated = [
              {
                id,
                name: local?.name || 'Conversation',
                role: local?.role || '',
                avatar: local?.avatar || '',
                online: local?.online ?? false,
                lastMessageTime: msgs.length ? msgs[msgs.length - 1].time : '',
                unreadCount: 0,
                messages: msgs,
                isSystem: local?.isSystem,
                allowReplies: local?.allowReplies,
              },
              ...updated,
            ];
          }
          this.updateStore(updated);
          void this.markReadRemote(id).catch(() => {});
          await this.ensureRealtime();
          this.joinConversation(id);
          return this._conversations$.value.find((c) => c.id === id);
        }
      } catch {}
    }

    return local;
  }

  /** Rejoindre une room WS (appelé à l'ouverture d'une conversation). */
  joinConversation(conversationId: number): void {
    if (!conversationId || !this.socket) return;
    this.socket.emit?.('join', { conversationId: Number(conversationId) });
  }

  async startConversation(person: {
    name: string;
    avatar: string;
    role: string;
    agentId?: number;
    studentId?: number;
  }): Promise<number> {
    const me = this.me();
    const targetType = person.agentId ? 'agent' : person.studentId ? 'user' : null;
    const targetId = person.agentId ?? person.studentId;

    if (me && targetType && targetId) {
      try {
        const res: any = await firstValueFrom(
          this.http.post(`${environment.apiUrl}/conversations`, {
            targetId: Number(targetId),
            targetType,
          }),
        );
        if (res?.success && res?.data?.id) {
          const convId = Number(res.data.id);
          const already = this._conversations$.value.find((c) => c.id === convId);
          if (!already) {
            const conv: Conversation = {
              id: convId,
              name: person.name,
              role: person.role,
              avatar: (person.avatar || '').trim(),
              online: false,
              lastMessageTime: '',
              unreadCount: 0,
              messages: [],
            };
            this.updateStore([conv, ...this._conversations$.value.filter((c) => c.id !== convId)]);
          }
          await this.ensureRealtime();
          this.joinConversation(convId);
          return convId;
        }
        throw new Error('CONVERSATION_CREATE_FAILED');
      } catch (err: any) {
        if (err?.message === 'CONVERSATION_CREATE_FAILED') throw err;
        const apiMsg = err?.error?.message;
        const msg = typeof apiMsg === 'string' ? apiMsg : Array.isArray(apiMsg) ? String(apiMsg[0]) : null;
        throw new Error(msg || 'Impossible de démarrer la conversation');
      }
    }

    // Invité non connecté : conversation locale uniquement
    return this.createLocalConversation(person);
  }

  private createLocalConversation(person: {
    name: string;
    avatar: string;
    role: string;
  }): number {
    const conversation: Conversation = {
      id: Math.max(...this._conversations$.value.map((c) => c.id), 0) + 1,
      name: person.name,
      role: person.role,
      avatar: (person.avatar || '').trim(),
      online: false,
      lastMessageTime: '',
      unreadCount: 0,
      messages: [],
    };
    this.updateStore([conversation, ...this._conversations$.value]);
    return conversation.id;
  }

  async sendMessage(
    conversationId: number,
    text: string,
    mediaUrl?: string,
    opts?: {
      replaceTempId?: number;
      revokeUrl?: string;
      forceKind?: 'image' | 'audio' | 'file';
    },
  ): Promise<ChatMessage | undefined> {
    const me = this.me();
    const content = (text || '').trim();
    const media = (mediaUrl || '').trim();
    if (!content && !media) return undefined;

    const prev = opts?.replaceTempId
      ? this._conversations$.value
          .find((c) => c.id === conversationId)
          ?.messages.find((m) => m.id === opts.replaceTempId)
      : undefined;
    let kind: ChatMessage['kind'] = media
      ? this.mediaKindFromUrl(media, { content, forceKind: opts?.forceKind })
      : 'text';
    // Ne pas dégrader une note vocale en "fichier" si l'URL CDN n'a pas d'extension
    if (prev?.kind === 'audio' && kind === 'file') kind = 'audio';
    if (opts?.forceKind === 'audio') kind = 'audio';

    const resolvedMedia = media ? this.resolveMediaUrl(media) : undefined;
    const optimistic: ChatMessage = {
      id: opts?.replaceTempId ?? Date.now(),
      text: content || (kind === 'audio' ? '🎤 Note vocale' : kind === 'image' ? '📷 Photo' : '📎 Fichier'),
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      fromMe: true,
      kind,
      mediaUrl: resolvedMedia,
      fileName: kind === 'file' ? (content || this.fileNameFromUrl(media)) : undefined,
      status: 'sending',
      readAt: null,
    };

    if (opts?.replaceTempId) {
      // Remplace la preview blob locale par l'URL serveur (sans faire disparaître la bulle)
      this.replaceOptimistic(conversationId, opts.replaceTempId, optimistic);
      // Révoque le blob après un court délai pour laisser le player basculer sur l'URL serveur
      if (opts.revokeUrl?.startsWith('blob:')) {
        const blobUrl = opts.revokeUrl;
        setTimeout(() => {
          try { URL.revokeObjectURL(blobUrl); } catch {}
        }, 2500);
      }
    } else {
      this.appendLocalMessage(conversationId, optimistic);
    }

    await this.ensureRealtime();
    this.joinConversation(conversationId);

    if (me) {
      try {
        const res: any = await firstValueFrom(
          this.http.post(`${environment.apiUrl}/messages`, {
            conversationId: Number(conversationId),
            content: content || '',
            mediaUrl: media || undefined,
          }),
        );
        if (res?.success && res?.data) {
          const real = this.normalizeMessage(res.data, me);
          this.replaceOptimistic(conversationId, optimistic.id, real);
          return real;
        }
      } catch {}
    }

    return optimistic;
  }

  /** Affiche immédiatement un média (ex. note vocale en blob:) avant l'upload. */
  appendOptimisticMedia(
    conversationId: number,
    partial: { id: number; kind: 'audio' | 'image' | 'file'; mediaUrl: string; text?: string },
  ): void {
    const msg: ChatMessage = {
      id: partial.id,
      text: partial.text || (partial.kind === 'audio' ? '🎤 Note vocale' : ''),
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      fromMe: true,
      kind: partial.kind,
      mediaUrl: partial.mediaUrl,
      status: 'sending',
      readAt: null,
    };
    this.appendLocalMessage(conversationId, msg);
  }

  removeOptimistic(conversationId: number, tempId: number): void {
    const updated = this._conversations$.value.map((c) => {
      if (c.id !== conversationId) return c;
      return { ...c, messages: c.messages.filter((m) => m.id !== tempId) };
    });
    this.updateStore(updated);
  }

  private appendLocalMessage(conversationId: number, msg: ChatMessage) {
    const list = this._conversations$.value;
    const exists = list.some((c) => c.id === conversationId);
    if (!exists) {
      // Conversation absente du store local → recharger la liste pour le badge
      void this.getConversations().then(() => {
        const after = this._conversations$.value;
        if (!after.some((c) => c.id === conversationId)) return;
        this.appendLocalMessage(conversationId, msg);
      });
      return;
    }
    const updated = list.map((c) => {
      if (c.id !== conversationId) return c;
      if (c.messages.some((m) => m.id === msg.id)) return c;
      return {
        ...c,
        messages: [...c.messages.filter((m) => m.id !== 0), msg],
        lastMessageTime: msg.time,
        unreadCount: msg.fromMe ? c.unreadCount : c.unreadCount + 1,
      };
    });
    this.updateStore(updated);
  }

  private setPeerOnline(conversationId: number, online: boolean) {
    const updated = this._conversations$.value.map((c) =>
      c.id === conversationId ? { ...c, online } : c,
    );
    this.updateStore(updated);
    if (!online) {
      this._typing$.next({ ...this._typing$.value, [conversationId]: false });
    }
  }

  private setPeerTyping(conversationId: number, isTyping: boolean) {
    const wasTyping = !!this._typing$.value[conversationId];
    const next = !!isTyping;
    this._typing$.next({ ...this._typing$.value, [conversationId]: next });
    // Son type Facebook : uniquement au début de « est en train d'écrire »
    if (next && !wasTyping) {
      this.playTypingSound();
    }
  }

  /** Son court à la réception d'un message. */
  private playIncomingSound() {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      const ctx = this.audioCtx!;
      if (ctx.state === 'suspended') void ctx.resume();

      const now = ctx.currentTime;
      const beep = (freq: number, start: number, dur: number, vol = 0.12) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(vol, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.02);
      };
      beep(880, 0, 0.12);
      beep(1175, 0.12, 0.14);
    } catch {
      /* ignore autoplay restrictions */
    }
  }

  /** Son type notification Google pour le message de bienvenue StudHub. */
  playWelcomeSound(): void {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      const ctx = this.audioCtx!;
      if (ctx.state === 'suspended') void ctx.resume();

      const now = ctx.currentTime;
      const tone = (freq: number, start: number, dur: number, vol = 0.14) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + start);
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(vol, now + start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.03);
      };
      tone(523.25, 0, 0.16, 0.13);
      tone(659.25, 0.14, 0.18, 0.15);
      tone(783.99, 0.3, 0.28, 0.12);
    } catch {
      /* ignore */
    }
  }

  /**
   * Crée le message système « Équipe StudHub » (idempotent) + son de notif.
   */
  async ensureStudhubWelcome(firstName?: string): Promise<number | null> {
    const me = this.me();
    if (!me || me.type !== 'user') return null;

    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/conversations/system-welcome`, {
          firstName: firstName || undefined,
        }),
      );
      const data = res?.success && res?.data !== undefined ? res.data : res;
      const convRaw = data?.conversation || data;
      if (convRaw?.id) {
        const mapped = this.normalizeConversation(convRaw, me);
        if (Array.isArray(convRaw.messages) && convRaw.messages.length) {
          mapped.messages = convRaw.messages
            .map((m: any) => this.normalizeMessage({ ...m, isSystem: true }, me))
            .sort((a: ChatMessage, b: ChatMessage) => a.id - b.id);
        }
        if (data?.created !== false) {
          mapped.unreadCount = Math.max(Number(mapped.unreadCount) || 0, 1);
        }
        const others = this._conversations$.value.filter((c) => c.id !== mapped.id);
        this.updateStore([mapped, ...others]);
        if (data?.created !== false) {
          this.playWelcomeSound();
          this.push.showLocalIfBackground(
            mapped.name,
            mapped.messages?.[0]?.text || 'Bienvenue sur StudHub',
            mapped.id,
          );
        }
        await this.ensureRealtime();
        this.joinConversation(mapped.id);
        return mapped.id;
      }
    } catch {
      // Fallback local si API / migration pas encore dispo
      return this.ensureLocalStudhubWelcome(firstName);
    }
    return null;
  }

  private ensureLocalStudhubWelcome(firstName?: string): number {
    const existing = this._conversations$.value.find((c) => c.isSystem);
    if (existing) return existing.id;

    const id = -9001;
    const name = (firstName || '').trim() || 'là';
    const text =
      `Salut ${name} 👋 Bienvenue sur StudHub !\n\n` +
      `On est ravis de t’accueillir. Explore les annonces, le marketplace et les services étudiants — ` +
      `et n’hésite pas à compléter ton profil.\n\n` +
      `— L’équipe StudHub`;
    const conv: Conversation = {
      id,
      name: 'Équipe StudHub',
      role: 'StudHub',
      avatar: STUDHUB_TEAM_AVATAR,
      online: false,
      lastMessageTime: this.fmtShortTime(new Date()),
      unreadCount: 1,
      isSystem: true,
      allowReplies: false,
      messages: [
        {
          id: 1,
          text,
          time: this.fmtShortTime(new Date()),
          fromMe: false,
          kind: 'text',
        },
      ],
    };
    this.updateStore([conv, ...this._conversations$.value.filter((c) => c.id !== id)]);
    this.playWelcomeSound();
    return id;
  }

  /** Soft bubbles façon Messenger quand l'autre commence à écrire. */
  private playTypingSound() {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      const ctx = this.audioCtx!;
      if (ctx.state === 'suspended') void ctx.resume();

      const now = ctx.currentTime;
      const pop = (freq: number, start: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.35, now + start + 0.06);
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.055, now + start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + 0.1);
      };
      // Trois petits « pops » espacés, comme l'indicateur Messenger
      pop(520, 0);
      pop(640, 0.11);
      pop(780, 0.22);
    } catch {
      /* ignore */
    }
  }

  private replaceOptimistic(conversationId: number, tempId: number, real: ChatMessage) {
    const updated = this._conversations$.value.map((c) => {
      if (c.id !== conversationId) return c;
      return {
        ...c,
        messages: c.messages.map((m): ChatMessage => {
          if (m.id !== tempId) return m;
          const kind =
            m.kind === 'audio' && real.kind === 'file' ? 'audio' : (real.kind || m.kind);
          return {
            ...real,
            kind,
            status: real.readAt ? 'read' : (real.status === 'sending' ? 'sending' : 'sent'),
            // Garde l'URL blob tant que le serveur n'a pas encore d'URL
            mediaUrl: real.mediaUrl || m.mediaUrl,
          };
        }),
      };
    });
    this.updateStore(updated);
  }

  /** Le pair a lu mes messages → double coche. */
  private markConversationMessagesRead(conversationId: number, readAt: string): void {
    const updated = this._conversations$.value.map((c) => {
      if (c.id !== conversationId) return c;
      return {
        ...c,
        messages: c.messages.map((m) =>
          m.fromMe && m.kind !== 'call'
            ? { ...m, readAt, status: 'read' as const }
            : m,
        ),
      };
    });
    this.updateStore(updated);
  }

  private async markReadRemote(id: number) {
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/conversations/${id}/read`, {}),
      );
    } catch {}
  }

  /* ------------------------------------------------------------------ *
   *  WEBSOCKET                                                          *
   * ------------------------------------------------------------------ */
  private currentAccessToken(): string | null {
    return this.preferAgentContext()
      ? (this.agentAuth.getAccessToken() || this.auth.getAccessToken())
      : (this.auth.getAccessToken() || this.agentAuth.getAccessToken());
  }

  private disconnectWs() {
    try {
      this.socket?.removeAllListeners?.();
      this.socket?.disconnect?.();
    } catch {}
    this.socket = null;
    this.lastWsToken = null;
  }

  private joinAllRooms() {
    if (!this.socket?.connected) return;
    this._conversations$.value.forEach((c) => {
      this.socket.emit?.('join', { conversationId: c.id });
    });
  }

  /** Assure une connexion WS avec le bon token (reconnecte si rôle/token change). */
  async ensureRealtime(force = false): Promise<void> {
    const me = this.me();
    if (!me) {
      this.disconnectWs();
      return;
    }
    const token = this.currentAccessToken();
    if (!token) return;

    if (!force && this.socket?.connected && this.lastWsToken === token) {
      this.joinAllRooms();
      return;
    }

    this.disconnectWs();
    this.lastWsToken = token;

    try {
      const mod: any = await import('socket.io-client');
      const io = mod?.io ?? mod?.default?.io ?? mod?.default;
      if (!io) return;

      this.socket = io(environment.wsUrl, {
        auth: { accessToken: token },
        transports: ['websocket', 'polling'],
        path: '/ws/chat',
        reconnection: true,
        reconnectionAttempts: 12,
        reconnectionDelay: 1200,
      });

      this.socket.on('connect', () => {
        this.zone.run(() => this.joinAllRooms());
      });

      this.socket.on('newMessage', (rawMsg: any) => {
        if (!rawMsg?.conversationId) return;
        this.zone.run(() => {
          const subject = this.me();
          const msg = this.normalizeMessage(rawMsg, subject);
          if (msg.fromMe) return;
          this.appendLocalMessage(Number(rawMsg.conversationId), msg);
          this.setPeerTyping(Number(rawMsg.conversationId), false);
          if (msg.kind === 'call') return;
          this.playIncomingSound();
          const conv = this._conversations$.value.find(
            (c) => c.id === Number(rawMsg.conversationId),
          );
          this.push.showLocalIfBackground(
            conv?.name || 'StudHub',
            msg.text,
            Number(rawMsg.conversationId),
          );
        });
      });

      this.socket.on('presence', (payload: any) => {
        const conversationId = Number(payload?.conversationId);
        if (!conversationId) return;
        const me = this.me();
        if (
          me &&
          payload?.subjectType === me.type &&
          Number(payload?.subjectId) === Number(me.id)
        ) {
          return;
        }
        this.zone.run(() => {
          this.setPeerOnline(conversationId, !!payload?.online);
        });
      });

      this.socket.on('typing', (payload: any) => {
        const conversationId = Number(payload?.conversationId);
        if (!conversationId) return;
        const me = this.me();
        if (
          me &&
          payload?.senderType === me.type &&
          Number(payload?.senderId) === Number(me.id)
        ) {
          return;
        }
        this.zone.run(() => {
          this.setPeerTyping(conversationId, !!payload?.isTyping);
        });
      });

      const callEvents = [
        'call:incoming',
        'call:accepted',
        'call:rejected',
        'call:offer',
        'call:answer',
        'call:ice',
        'call:ended',
        'call:peer-mute',
        'call:peer-hold',
      ];
      for (const ev of callEvents) {
        this.socket.on(ev, (data: any) => {
          this.zone.run(() => this._signal$.next({ event: ev, data }));
        });
      }

      this.socket.on('markRead', ({ conversationId }: any) => {
        this.zone.run(() => {
          const convId = Number(conversationId);
          const updated = this._conversations$.value.map((c) =>
            c.id === convId ? { ...c, unreadCount: 0 } : c,
          );
          this.updateStore(updated);
        });
      });

      this.socket.on('messagesRead', (payload: any) => {
        const convId = Number(payload?.conversationId);
        if (!convId) return;
        const me = this.me();
        if (
          me &&
          payload?.readerType === me.type &&
          Number(payload?.readerId) === Number(me.id)
        ) {
          return;
        }
        const readAt = payload?.readAt ? String(payload.readAt) : new Date().toISOString();
        this.zone.run(() => this.markConversationMessagesRead(convId, readAt));
      });

      // Attendre la connexion réelle (sinon appels → « temps réel indisponible »)
      await new Promise<void>((resolve) => {
        if (this.socket?.connected) {
          resolve();
          return;
        }
        const timer = setTimeout(() => resolve(), 4000);
        this.socket?.once?.('connect', () => {
          clearTimeout(timer);
          resolve();
        });
        this.socket?.once?.('connect_error', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    } catch {
      /* socket.io-client absent : HTTP seulement */
    }
  }
}
