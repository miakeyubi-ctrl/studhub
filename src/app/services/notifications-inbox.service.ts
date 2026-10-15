import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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

  constructor() {
    this.purgeLegacy();
    this.subject.next(this.load());
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
        this.persist([updated, ...rest].slice(0, MAX_ITEMS));
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
  }

  markRead(id: string): void {
    const next = this.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    this.persist(next);
  }

  /** Marque lues les notifs d'une conversation ouverte. */
  markRouteRead(route: string): void {
    if (!route) return;
    const next = this.notifications.map((n) =>
      n.route === route ? { ...n, read: true } : n,
    );
    this.persist(next);
  }

  markAllRead(): void {
    this.persist(this.notifications.map((n) => ({ ...n, read: true })));
  }

  remove(id: string): void {
    this.persist(this.notifications.filter((n) => n.id !== id));
  }

  clearAll(): void {
    this.persist([]);
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
}
