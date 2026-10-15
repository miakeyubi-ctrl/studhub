"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PushService", {
    enumerable: true,
    get: function() {
        return PushService;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _prismaservice = require("../../common/prisma/prisma.service");
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) return obj;
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") return {
        default: obj
    };
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) return cache.get(obj);
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) Object.defineProperty(newObj, key, desc);
            else newObj[key] = obj[key];
        }
    }
    newObj.default = obj;
    if (cache) cache.set(obj, newObj);
    return newObj;
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") {
        r = Reflect.decorate(decorators, target, key, desc);
    } else {
        for(var i = decorators.length - 1; i >= 0; i--){
            if (d = decorators[i]) {
                r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
            }
        }
    }
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(metadataKey, metadataValue) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") {
        return Reflect.metadata(metadataKey, metadataValue);
    }
}
let PushService = class PushService {
    async onModuleInit() {
        await this.initFirebase();
    }
    async initFirebase() {
        try {
            const jsonInline = this.cfg.get('FIREBASE_SERVICE_ACCOUNT_JSON');
            const jsonPath = this.cfg.get('FIREBASE_SERVICE_ACCOUNT_PATH');
            if (!jsonInline && !jsonPath) {
                this.logger.warn('Push FCM désactivé : définissez FIREBASE_SERVICE_ACCOUNT_PATH ou FIREBASE_SERVICE_ACCOUNT_JSON');
                return;
            }
            // Import dynamique pour ne pas casser le build si firebase-admin n'est pas installé
            const adminMod = await Promise.resolve().then(()=>/*#__PURE__*/ _interop_require_wildcard(require("firebase-admin")));
            const admin = adminMod.default ?? adminMod;
            if (admin.apps?.length) {
                this.messaging = admin.messaging();
                this.ready = true;
                return;
            }
            let credential;
            if (jsonInline) {
                const parsed = JSON.parse(jsonInline);
                credential = admin.credential.cert(parsed);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const fs = await Promise.resolve().then(()=>/*#__PURE__*/ _interop_require_wildcard(require("fs")));
                const raw = fs.readFileSync(jsonPath, 'utf8');
                credential = admin.credential.cert(JSON.parse(raw));
            }
            admin.initializeApp({
                credential
            });
            this.messaging = admin.messaging();
            this.ready = true;
            this.logger.log('Firebase Admin initialisé — push FCM actif');
        } catch (e) {
            this.logger.warn(`Firebase Admin non initialisé (${e?.message || e})`);
            this.ready = false;
        }
    }
    async registerToken(subject, token, platform) {
        const clean = String(token || '').trim();
        if (!clean) return null;
        const plat = (platform || 'android').toLowerCase();
        const data = {
            token: clean,
            platform: plat.slice(0, 20),
            userId: subject.type === 'user' ? subject.id : null,
            agentId: subject.type === 'agent' ? subject.id : null
        };
        return this.prisma.devicePushToken.upsert({
            where: {
                token: clean
            },
            create: data,
            update: {
                platform: data.platform,
                userId: data.userId,
                agentId: data.agentId
            }
        });
    }
    async unregisterToken(token) {
        const clean = String(token || '').trim();
        if (!clean) return;
        try {
            await this.prisma.devicePushToken.delete({
                where: {
                    token: clean
                }
            });
        } catch  {
        /* déjà absent */ }
    }
    async notifyChatMessage(params) {
        return this.notifyGeneric({
            recipient: params.recipient,
            title: params.title,
            body: params.body || 'Nouveau message',
            data: {
                type: 'chat',
                conversationId: String(params.conversationId),
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            channelId: 'studhub_messages'
        });
    }
    /** Notification générique (chat, suivi d’agent, etc.). */ async notifyGeneric(params) {
        const where = params.recipient.type === 'user' ? {
            userId: params.recipient.id
        } : {
            agentId: params.recipient.id
        };
        const devices = await this.prisma.devicePushToken.findMany({
            where
        });
        if (!devices.length) {
            this.logger.debug(`Push (aucun token) → ${params.recipient.type}:${params.recipient.id} — ${params.title}`);
            return;
        }
        const channelId = params.channelId || 'studhub_alerts';
        const payload = {
            notification: {
                title: params.title.slice(0, 80),
                body: (params.body || '').slice(0, 180)
            },
            data: {
                ...params.data || {
                    type: 'generic'
                },
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
            android: {
                priority: 'high',
                notification: {
                    channelId,
                    sound: 'default',
                    priority: 'high'
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                        contentAvailable: true
                    }
                }
            }
        };
        if (!this.ready || !this.messaging) {
            this.logger.debug(`Push (simulation) → ${devices.length} device(s) pour ${params.recipient.type}:${params.recipient.id} — ${params.title}`);
            return;
        }
        for (const device of devices){
            try {
                await this.messaging.send({
                    token: device.token,
                    ...payload
                });
            } catch (e) {
                const code = e?.code || e?.errorInfo?.code || '';
                this.logger.warn(`FCM send failed (${device.platform}): ${e?.message || e}`);
                if (String(code).includes('registration-token-not-registered') || String(code).includes('invalid-registration-token') || String(e?.message || '').includes('Requested entity was not found')) {
                    await this.unregisterToken(device.token);
                }
            }
        }
    }
    constructor(prisma, cfg){
        this.prisma = prisma;
        this.cfg = cfg;
        this.logger = new _common.Logger(PushService.name);
        this.messaging = null;
        this.ready = false;
    }
};
PushService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService,
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], PushService);

//# sourceMappingURL=push.service.js.map