import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

type Recipient = { type: 'user' | 'agent'; id: number };

/**
 * Notifications push (FCM).
 * Actives si FIREBASE_SERVICE_ACCOUNT_JSON ou FIREBASE_SERVICE_ACCOUNT_PATH est défini.
 * Sans config Firebase : les tokens sont quand même enregistrés (prêt pour la prod).
 */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private messaging: any = null;
  private ready = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cfg: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initFirebase();
  }

  private async initFirebase() {
    try {
      const jsonInline = this.cfg.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
      const jsonPath = this.cfg.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
      if (!jsonInline && !jsonPath) {
        this.logger.warn(
          'Push FCM désactivé : définissez FIREBASE_SERVICE_ACCOUNT_PATH ou FIREBASE_SERVICE_ACCOUNT_JSON',
        );
        return;
      }

      // Import dynamique pour ne pas casser le build si firebase-admin n'est pas installé
      const adminMod = await import('firebase-admin');
      const admin: any = (adminMod as any).default ?? adminMod;
      if (admin.apps?.length) {
        this.messaging = admin.messaging();
        this.ready = true;
        return;
      }

      let credential: any;
      if (jsonInline) {
        const parsed = JSON.parse(jsonInline);
        credential = admin.credential.cert(parsed);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = await import('fs');
        const raw = fs.readFileSync(jsonPath!, 'utf8');
        credential = admin.credential.cert(JSON.parse(raw));
      }

      admin.initializeApp({ credential });
      this.messaging = admin.messaging();
      this.ready = true;
      this.logger.log('Firebase Admin initialisé — push FCM actif');
    } catch (e: any) {
      this.logger.warn(`Firebase Admin non initialisé (${e?.message || e})`);
      this.ready = false;
    }
  }

  async registerToken(subject: Recipient, token: string, platform: string) {
    const clean = String(token || '').trim();
    if (!clean) return null;
    const plat = (platform || 'android').toLowerCase();

    const data: any = {
      token: clean,
      platform: plat.slice(0, 20),
      userId: subject.type === 'user' ? subject.id : null,
      agentId: subject.type === 'agent' ? subject.id : null,
    };

    return this.prisma.devicePushToken.upsert({
      where: { token: clean },
      create: data,
      update: {
        platform: data.platform,
        userId: data.userId,
        agentId: data.agentId,
      },
    });
  }

  async unregisterToken(token: string) {
    const clean = String(token || '').trim();
    if (!clean) return;
    try {
      await this.prisma.devicePushToken.delete({ where: { token: clean } });
    } catch {
      /* déjà absent */
    }
  }

  async notifyChatMessage(params: {
    recipient: Recipient;
    conversationId: number;
    title: string;
    body: string;
  }) {
    return this.notifyGeneric({
      recipient: params.recipient,
      title: params.title,
      body: params.body || 'Nouveau message',
      data: {
        type: 'chat',
        conversationId: String(params.conversationId),
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      channelId: 'studhub_messages',
    });
  }

  /** Notification d'appel entrant — haute priorité, data-focused pour réveiller l'appareil. */
  async notifyIncomingCall(params: {
    recipient: Recipient;
    conversationId: number;
    fromName: string;
  }) {
    const title = 'Appel StudHub';
    const body = `${params.fromName || 'Contact'} vous appelle…`;
    return this.notifyGeneric({
      recipient: params.recipient,
      title,
      body,
      data: {
        type: 'call',
        conversationId: String(params.conversationId),
        fromName: String(params.fromName || 'Contact').slice(0, 80),
        click_action: 'STUDHUB_INCOMING_CALL',
      },
      channelId: 'studhub_calls',
      callWake: true,
    });
  }

  /** Notification générique (chat, suivi d’agent, etc.). */
  async notifyGeneric(params: {
    recipient: Recipient;
    title: string;
    body: string;
    data?: Record<string, string>;
    channelId?: string;
    /** Mode appel : priorité max + payload adapté au réveil */
    callWake?: boolean;
  }) {
    const where =
      params.recipient.type === 'user'
        ? { userId: params.recipient.id }
        : { agentId: params.recipient.id };

    const devices = await this.prisma.devicePushToken.findMany({ where });
    if (!devices.length) {
      this.logger.debug(
        `Push (aucun token) → ${params.recipient.type}:${params.recipient.id} — ${params.title}`,
      );
      return;
    }

    const channelId = params.channelId || 'studhub_alerts';
    const isCall = !!params.callWake;
    const payload: any = {
      data: {
        ...(params.data || { type: 'generic' }),
        title: params.title.slice(0, 80),
        body: (params.body || '').slice(0, 180),
        click_action: params.data?.click_action || 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        priority: 'high' as const,
        ttl: isCall ? 60_000 : undefined,
        notification: isCall
          ? undefined
          : {
              channelId,
              sound: 'default',
              priority: 'high' as const,
              visibility: 'public' as const,
            },
      },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
        payload: {
          aps: {
            alert: {
              title: params.title.slice(0, 80),
              body: (params.body || '').slice(0, 180),
            },
            sound: isCall ? 'default' : 'default',
            badge: 1,
            contentAvailable: true,
            ...(isCall ? { interruptionLevel: 'time-sensitive' } : {}),
          },
        },
      },
    };

    // Chat / alertes : notification système classique
    if (!isCall) {
      payload.notification = {
        title: params.title.slice(0, 80),
        body: (params.body || '').slice(0, 180),
      };
    } else {
      // Appels Android = data-only (pas de bloc notification).
      // Sinon FCM affiche une notif système et n'appelle PAS onMessageReceived
      // quand l'app est en arrière-plan / tuée → pas de réveil full-screen.
      // CallFirebaseMessagingService affiche la notif + IncomingCallActivity.
      delete payload.android.notification;
      // iOS garde l'alerte APNs ci-dessus (pas de CallKit pour l'instant).
    }

    if (!this.ready || !this.messaging) {
      this.logger.debug(
        `Push (simulation) → ${devices.length} device(s) pour ${params.recipient.type}:${params.recipient.id} — ${params.title}`,
      );
      return;
    }

    const results = await Promise.allSettled(
      devices.map(async (device) => {
        // Tokens web synthétiques : pas d'envoi FCM (notif locale côté client)
        if (device.platform === 'web' || String(device.token).startsWith('web_')) {
          this.logger.debug(`Push skip web token ${device.id}`);
          return;
        }
        try {
          await this.messaging.send({
            token: device.token,
            ...payload,
          });
        } catch (e: any) {
          const code = e?.code || e?.errorInfo?.code || '';
          this.logger.warn(`FCM send failed (${device.platform}): ${e?.message || e}`);
          if (
            String(code).includes('registration-token-not-registered') ||
            String(code).includes('invalid-registration-token') ||
            String(e?.message || '').includes('Requested entity was not found')
          ) {
            await this.unregisterToken(device.token);
          }
          throw e;
        }
      }),
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    this.logger.debug(`Push sent ${ok}/${devices.length} → ${params.recipient.type}:${params.recipient.id}`);
  }
}
