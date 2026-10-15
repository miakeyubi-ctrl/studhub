import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { AgentAuthService } from './agent-auth.service';
import { NotificationsInboxService } from './notifications-inbox.service';

const WEB_TOKEN_KEY = 'studhub-web-push-token';

/**
 * Notifications push fiables :
 * - Native + google-services.json → FCM
 * - Web / native sans Firebase → Notification API + token web enregistré
 * - Re-sync au login, resume app, et unregister au logout
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private registeredToken: string | null = null;
  private webPermission: NotificationPermission | 'unsupported' = 'default';
  private nativeReady = false;
  private listenersBound = false;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  /** Conversation ouverte (pas de notif spam pour celle-ci). */
  private activeConversationId: number | null = null;

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private agentAuth: AgentAuthService,
    private router: Router,
    private zone: NgZone,
    private inbox: NotificationsInboxService,
  ) {}

  async init(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await this.initNative();
    } else {
      await this.initWeb();
    }

    if (!this.listenersBound) {
      this.listenersBound = true;
      this.auth.user$.subscribe((u) => {
        if (u) void this.syncRegistration();
        else void this.unregisterCurrent();
      });
      this.agentAuth.agent$.subscribe((a) => {
        if (a) void this.syncRegistration();
        else if (!this.auth.currentUser) void this.unregisterCurrent();
      });

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden && this.isLoggedIn()) void this.syncRegistration();
        });
      }

      if (Capacitor.isNativePlatform()) {
        try {
          await App.addListener('appStateChange', ({ isActive }) => {
            if (isActive && this.isLoggedIn()) void this.syncRegistration();
          });
        } catch {
          /* App plugin absent */
        }
      }
    }

    if (this.isLoggedIn()) {
      await this.syncRegistration();
    }
  }

  setActiveConversation(id: number | null): void {
    this.activeConversationId = id && id > 0 ? id : null;
    if (this.activeConversationId) {
      this.inbox.markRouteRead(`/messages/${this.activeConversationId}`);
    }
  }

  /** Affiche une notif locale / inbox sans spammer. */
  showLocalIfBackground(title: string, body: string, conversationId?: number): void {
    if (this.isSpammy(title, body)) return;

    const hidden =
      typeof document !== 'undefined' &&
      (document.hidden || document.visibilityState === 'hidden');

    const viewingThis =
      !!conversationId &&
      this.activeConversationId === conversationId &&
      !hidden;

    // Conversation ouverte au premier plan → aucune notif
    if (viewingThis) return;

    if (!this.pushPrefsEnabled()) return;

    this.pushToInbox(title, body, conversationId, 'message');

    if (!hidden && !Capacitor.isNativePlatform()) return;
    if (Capacitor.isNativePlatform() && this.nativeReady && !hidden) return;

    this.showWebNotification(title, body, conversationId);
  }

  /** Enregistre dans l'inbox (regroupé par conversation). */
  pushToInbox(
    title: string,
    body: string,
    conversationId?: number,
    type: 'message' | 'call' | 'system' | 'alert' = 'message',
  ): void {
    if (this.isSpammy(title, body)) return;
    if (!this.pushPrefsEnabled()) return;
    const t = (title || '').trim();
    if (!t) return;
    if (
      conversationId &&
      this.activeConversationId === conversationId &&
      typeof document !== 'undefined' &&
      !document.hidden
    ) {
      return;
    }
    this.inbox.add({
      type,
      title: t,
      body: (body || '').trim(),
      route: conversationId ? `/messages/${conversationId}` : undefined,
      id: conversationId ? `conv-${conversationId}` : undefined,
      coalesce: type === 'message' && !!conversationId,
    });
  }

  private isSpammy(title: string, body: string): boolean {
    const t = (title || '').toLowerCase();
    const b = (body || '').toLowerCase();
    if (t.includes('équipe studhub') || t.includes('equipe studhub')) return true;
    if (b.includes('bienvenue sur studhub')) return true;
    return false;
  }

  private pushPrefsEnabled(): boolean {
    try {
      const raw = localStorage.getItem('studhub-privacy-prefs-v1');
      if (!raw) return true;
      const parsed = JSON.parse(raw);
      return parsed.pushEnabled !== false;
    } catch {
      return true;
    }
  }

  private async initWeb(): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      this.webPermission = 'unsupported';
      return;
    }
    try {
      this.webPermission = Notification.permission;
      if (Notification.permission === 'default') {
        this.webPermission = await Notification.requestPermission();
      }
      if (this.webPermission === 'granted') {
        this.registeredToken = this.ensureWebToken();
      }
    } catch {
      this.webPermission = 'denied';
    }
  }

  private ensureWebToken(): string {
    try {
      let token = localStorage.getItem(WEB_TOKEN_KEY);
      if (!token || token.length < 16) {
        token = `web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
        localStorage.setItem(WEB_TOKEN_KEY, token);
      }
      return token;
    } catch {
      return `web_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
  }

  private async initNative(): Promise<void> {
    try {
      const hasFirebase = await this.hasFirebaseConfigured();
      if (!hasFirebase) {
        console.warn('[push] Firebase non configuré — fallback Notification API / socket');
        await this.initWeb();
        return;
      }

      let perm = await PushNotifications.checkPermissions();
      if (perm.receive !== 'granted') {
        perm = await PushNotifications.requestPermissions();
      }
      if (perm.receive !== 'granted') {
        await this.initWeb();
        return;
      }

      await PushNotifications.addListener('registration', (token) => {
        this.registeredToken = token.value;
        void this.sendTokenToBackend(token.value, Capacitor.getPlatform());
      });

      await PushNotifications.addListener('registrationError', (err) => {
        console.warn('[push] registrationError', err);
        void this.initWeb();
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        this.zone.run(() => {
          const data = notification?.data || {};
          const title =
            notification?.title ||
            String(data?.['title'] || data?.['fromName'] || 'StudHub');
          const body =
            notification?.body || String(data?.['body'] || data?.['message'] || '');
          const convId = Number(data?.['conversationId'] || 0) || undefined;
          const type = String(data?.['type'] || '') === 'call' ? 'call' : 'message';
          this.pushToInbox(title, body, convId, type as 'message' | 'call');
          this.handlePushPayload(data);
        });
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
        this.zone.run(() => {
          this.handlePushPayload(event?.notification?.data || {});
        });
      });

      await PushNotifications.register();
      this.nativeReady = true;
    } catch (e) {
      console.warn('[push] plugin native indisponible', e);
      await this.initWeb();
    }
  }

  /** Route les push : appel → overlay / wake ; sinon → conversation. */
  private handlePushPayload(data: Record<string, any>): void {
    const type = String(data?.['type'] || '');
    const convId = Number(data?.['conversationId'] || 0);
    if (type === 'call' && convId) {
      const fromName = String(data?.['fromName'] || data?.['title'] || 'Contact');
      try {
        window.dispatchEvent(
          new CustomEvent('studhubIncomingCall', {
            detail: { conversationId: convId, callerName: fromName, acceptCall: false },
          }),
        );
      } catch {
        /* ignore */
      }
      return;
    }
    if (convId) {
      void this.router.navigate(['/messages', convId]);
    }
  }

  private async hasFirebaseConfigured(): Promise<boolean> {
    try {
      // false par défaut : évite le crash Firebase sans google-services.json
      return !!environment.firebasePushEnabled;
    } catch {
      return false;
    }
  }

  private async syncRegistration(): Promise<void> {
    if (!this.isLoggedIn()) return;

    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => void this.doSync(), 250);
  }

  private async doSync(): Promise<void> {
    if (!this.isLoggedIn()) return;

    if (!Capacitor.isNativePlatform() || !this.nativeReady) {
      if (this.webPermission === 'default') await this.initWeb();
      if (this.webPermission === 'granted' && !this.registeredToken) {
        this.registeredToken = this.ensureWebToken();
      }
    }

    if (this.registeredToken) {
      await this.sendTokenToBackend(
        this.registeredToken,
        Capacitor.isNativePlatform() && this.nativeReady
          ? Capacitor.getPlatform()
          : 'web',
      );
    }
  }

  private async unregisterCurrent(): Promise<void> {
    const token = this.registeredToken;
    if (!token) return;
    try {
      await firstValueFrom(
        this.http.delete(`${environment.apiUrl}/push/unregister`, {
          body: { token },
        }),
      );
    } catch {
      /* ignore */
    }
  }

  private isLoggedIn(): boolean {
    return !!(this.auth.currentUser || this.agentAuth.currentAgent);
  }

  private async sendTokenToBackend(token: string, platform: string, attempt = 0): Promise<void> {
    if (!this.isLoggedIn() || !token) return;
    const plat = platform === 'ios' || platform === 'android' ? platform : 'web';
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/push/register`, {
          token,
          platform: plat,
        }),
      );
    } catch (e) {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        return this.sendTokenToBackend(token, platform, attempt + 1);
      }
      console.warn('[push] register failed', e);
    }
  }

  private showWebNotification(title: string, body: string, conversationId?: number): void {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const n = new Notification(title || 'StudHub', {
        body: body || 'Nouveau message',
        icon: '/assets/icon/favicon.png',
        tag: conversationId ? `chat-${conversationId}` : 'studhub-chat',
        silent: false,
      });
      n.onclick = () => {
        window.focus();
        if (conversationId) {
          void this.router.navigateByUrl(`/messages/${conversationId}`);
        }
        n.close();
      };
    } catch {
      /* ignore */
    }
  }
}
