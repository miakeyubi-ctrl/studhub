import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type NotifType = 'message' | 'system' | 'favorite' | 'promo' | 'alert' | 'call';

export interface InboxNotification {
  id: string;
  type: NotifType;
  title?: string;
  body?: string;
  titleKey?: string;
  bodyKey?: string;
  titleParams?: Record<string, string | number>;
  bodyParams?: Record<string, string | number>;
  createdAt: number;
  read: boolean;
  route?: string;
  /** Nombre de messages regroupés (anti-spam) */
  count?: number;
}

const STORAGE_KEY = 'studhub-notifications-inbox-v3';
const LEGACY_KEYS = [
  'studhub-notifications-inbox-v1',
  'studhub-notifications-inbox-v2',
];
const MAX_ITEMS = 60;

@Injectable({ providedIn: 'root' })
export class NotificationsInboxService {
  private readonly subject = new BehaviorSubject<InboxNotification[]>([]);
  readonly notifications$ = this.subject.asObservable();
  private syncing = false;

  constructor(private http: HttpClient) {
    this.purgeLegacy();
    this.subject.next(this.load());
    void this.sync();
  }

  get notifications(): InboxNotification[] {
    return this.subject.value;
  }

  get unreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  /**
   * Ajoute une notif. Pour les messages (même conversation), regroupe
   * en une seule entrée pour éviter le spam.
   */
  add(input: {
    id?: string;
    type: NotifType;
    title: string;
    body?: string;
    route?: string;
    coalesce?: boolean;
  }): void {
    const title = (input.title || '').trim();
    if (!title) return;
    const now = Date.now();
    const body = (input.body || '').trim();
    const coalesce = input.coalesce !== false && !!input.route && input.type === 'message';

    if (coalesce) {
      const existing = this.notifications.find(
        (n) => n.route === input.route && n.type === 'message' && !n.read,
      );
      if (existing) {
        const count = (existing.count || 1) + 1;
        const updated: InboxNotification = {
          ...existing,
          title,
          body: count > 1 ? `${body} (+${count - 1})` : body,
          count,
          createdAt: now,
          read: false,
        };
        const rest = this.notifications.filter((n) => n.id !== existing.id);
        const list = [updated, ...rest].slice(0, MAX_ITEMS);
        this.persist(list);
        void this.pushRemote(updated, true);
        return;
      }
    }

    const id =
      input.id ||
      (coalesce && input.route
        ? `conv-${input.route}`
        : `n-${now}-${Math.random().toString(36).slice(2, 8)}`);

    const dup = this.notifications.find(
      (n) =>
        n.id === id ||
        (n.title === title &&
          (n.body || '') === body &&
          n.route === input.route &&
          now - n.createdAt < 5_000),
    );
    if (dup) return;

    const item: InboxNotification = {
      id,
      type: input.type,
      title,
      body,
      createdAt: now,
      read: false,
      route: input.route,
      count: 1,
    };
    this.persist([item, ...this.notifications].slice(0, MAX_ITEMS));
    void this.pushRemote(item, coalesce);
  }

  /** Charge l'historique serveur et y envoie les notifications encore locales. */
  async sync(): Promise<void> {
    if (!this.hasToken() || this.syncing) return;
    this.syncing = true;
    try {
      const pending = this.notifications.filter((n) => !/^\d+$/.test(String(n.id)));
      for (const item of pending) {
        await this.pushRemote(item, item.type === 'message' && !!item.route);
      }
      const res: any = await firstValueFrom(this.http.get(`${environment.apiUrl}/notifications`));
      const data = res?.data ?? res;
      if (Array.isArray(data)) {
        this.persist(data.map((row) => this.normalize(row)).filter((n) => !!n.title));
      }
    } catch {
      /* conserve le cache local si l'API est injoignable */
    } finally {
      this.syncing = false;
    }
  }

  markRead(id: string): void {
    const next = this.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    this.persist(next);
    if (/^\d+$/.test(id)) this.remote('patch', `/${id}/read`);
  }

  /** Marque lues les notifs d'une conversation ouverte. */
  markRouteRead(route: string): void {
    if (!route) return;
    const next = this.notifications.map((n) =>
      n.route === route ? { ...n, read: true } : n,
    );
    this.persist(next);
    this.remote('post', '/read-route', { route });
  }

  markAllRead(): void {
    this.persist(this.notifications.map((n) => ({ ...n, read: true })));
    this.remote('post', '/read-all', {});
  }

  remove(id: string): void {
    this.persist(this.notifications.filter((n) => n.id !== id));
    if (/^\d+$/.test(id)) this.remote('delete', `/${id}`);
  }

  clearAll(): void {
    this.persist([]);
    this.remote('delete', '');
  }

  private purgeLegacy(): void {
    try {
      for (const k of LEGACY_KEYS) localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }

  private load(): InboxNotification[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as InboxNotification[];
        if (Array.isArray(parsed)) {
          return parsed.filter((n) => !String(n.id || '').startsWith('seed-'));
        }
      }
    } catch {
      /* ignore */
    }
    return [];
  }

  private persist(list: InboxNotification[]): void {
    this.subject.next(list);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  }

  private hasToken(): boolean {
    try {
      return !!(
        localStorage.getItem('studhub-access-token') ||
        localStorage.getItem('studhub-agent-access-token')
      );
    } catch {
      return false;
    }
  }

  private normalize(row: any): InboxNotification {
    return {
      id: String(row?.id ?? ''),
      type: row?.type || 'system',
      title: row?.title || '',
      body: row?.body || '',
      createdAt: Number(row?.createdAt) || Date.now(),
      read: !!row?.read,
      route: row?.route || undefined,
      count: Number(row?.count) || 1,
    };
  }

  private remote(method: 'post' | 'patch' | 'delete', path: string, body?: unknown): void {
    if (!this.hasToken()) return;
    const url = `${environment.apiUrl}/notifications${path}`;
    const req =
      method === 'post'
        ? this.http.post(url, body ?? {})
        : method === 'patch'
          ? this.http.patch(url, body ?? {})
          : this.http.delete(url);
    void firstValueFrom(req).catch(() => {});
  }

  private async pushRemote(item: InboxNotification, coalesce: boolean): Promise<void> {
    if (!this.hasToken() || !item.title) return;
    try {
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/notifications`, {
          type: item.type,
          title: item.title,
          body: item.body,
          route: item.route,
          clientKey: item.route || item.id,
          coalesce,
        }),
      );
      const saved = this.normalize(res?.data ?? res);
      if (!saved.id) return;
      const next = this.notifications.map((n) => {
        const same =
          n.id === item.id ||
          (!!saved.route && n.route === saved.route && n.type === item.type && !n.read);
        return same ? { ...n, id: saved.id, body: saved.body, count: saved.count, createdAt: saved.createdAt, read: saved.read } : n;
      });
      this.persist(next);
    } catch {
      /* reste en local jusqu'au prochain sync */
    }
  }
}
