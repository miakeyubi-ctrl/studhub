"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ChatService", {
    enumerable: true,
    get: function() {
        return ChatService;
    }
});
const _common = require("@nestjs/common");
const _prismaservice = require("../../common/prisma/prisma.service");
const _pushservice = require("../push/push.service");
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
let ChatService = class ChatService {
    async listConversationsFor(subject) {
        const where = subject.type === 'user' ? {
            studentId: subject.id
        } : {
            agentId: subject.id
        };
        return this.prisma.conversation.findMany({
            where,
            orderBy: {
                lastMessageAt: 'desc'
            },
            include: {
                student: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true,
                        phone: true
                    }
                },
                agent: {
                    select: {
                        id: true,
                        agencyName: true,
                        avatarUrl: true,
                        phone: true
                    }
                }
            }
        });
    }
    async getOrCreateConversation(subject, other) {
        const [studentId, agentId] = subject.type === 'user' ? [
            subject.id,
            other.id
        ] : [
            other.id,
            subject.id
        ];
        if (other.type !== (subject.type === 'user' ? 'agent' : 'user')) {
            throw new _common.ForbiddenException('Conversation étudiant↔agent seulement');
        }
        let conv = await this.prisma.conversation.findUnique({
            where: {
                studentId_agentId: {
                    studentId,
                    agentId
                }
            }
        });
        if (!conv) {
            conv = await this.prisma.conversation.create({
                data: {
                    studentId,
                    agentId,
                    lastMessageAt: new Date()
                }
            });
        }
        return conv;
    }
    async getConversationMembers(conversationId) {
        const conv = await this.prisma.conversation.findUnique({
            where: {
                id: conversationId
            },
            select: {
                id: true,
                studentId: true,
                agentId: true
            }
        });
        if (!conv) throw new _common.NotFoundException('Conversation introuvable');
        return conv;
    }
    async getMessages(conversationId, limit = 50, beforeId) {
        const where = {
            conversationId
        };
        if (beforeId) where.id = {
            lt: Number(beforeId)
        };
        return this.prisma.chatMessage.findMany({
            where,
            take: limit,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                studentSender: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true
                    }
                },
                agentSender: {
                    select: {
                        id: true,
                        agencyName: true,
                        avatarUrl: true
                    }
                }
            }
        });
    }
    async saveMessage(conversationId, sender, content, mediaUrl) {
        const conv = await this.prisma.conversation.findUnique({
            where: {
                id: conversationId
            }
        });
        if (!conv) throw new _common.NotFoundException('Conversation introuvable');
        if (conv.allowReplies === false || conv.type === 'SYSTEM') {
            throw new _common.ForbiddenException('Cette conversation ne permet pas de répondre');
        }
        const isStudent = sender.type === 'user';
        if (isStudent && conv.studentId !== sender.id || !isStudent && conv.agentId !== sender.id) {
            throw new _common.ForbiddenException("Pas membre de cette conversation");
        }
        // Utilise deux colonnes séparées (mutuellement exclusives) au lieu de senderType enum
        const data = {
            conversationId,
            content: content || '',
            mediaUrl
        };
        if (isStudent) data.studentSenderId = sender.id;
        else data.agentSenderId = sender.id;
        const msg = await this.prisma.chatMessage.create({
            data,
            include: {
                studentSender: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true
                    }
                },
                agentSender: {
                    select: {
                        id: true,
                        agencyName: true,
                        avatarUrl: true
                    }
                }
            }
        });
        await this.prisma.conversation.update({
            where: {
                id: conversationId
            },
            data: {
                lastMessage: this.previewForLastMessage(msg.content, msg.mediaUrl),
                lastMessageAt: msg.createdAt,
                unreadStudentCount: isStudent ? {
                    set: 0
                } : {
                    increment: 1
                },
                unreadAgentCount: isStudent ? {
                    increment: 1
                } : {
                    set: 0
                }
            }
        });
        // Push si le destinataire a le téléphone en veille / app fermée (pas pour logs d'appel)
        if (!String(msg.content || '').startsWith('__CALL__:')) {
            void this.notifyRecipientPush(conv, sender, msg).catch(()=>{});
        }
        return msg;
    }
    /**
   * Message de bienvenue système (non répondable) — idempotent.
   */ async ensureStudhubWelcome(studentId, firstName) {
        const existing = await this.prisma.conversation.findFirst({
            where: {
                studentId,
                type: 'SYSTEM'
            },
            include: {
                student: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true,
                        phone: true
                    }
                },
                agent: {
                    select: {
                        id: true,
                        agencyName: true,
                        avatarUrl: true,
                        phone: true
                    }
                },
                messages: {
                    orderBy: {
                        createdAt: 'asc'
                    },
                    take: 5
                }
            }
        });
        if (existing) {
            return {
                conversation: existing,
                created: false
            };
        }
        const name = firstName && firstName.trim() || (await this.prisma.user.findUnique({
            where: {
                id: studentId
            },
            select: {
                fullName: true
            }
        }))?.fullName?.split(/\s+/)[0] || 'là';
        const text = `Salut ${name} 👋 Bienvenue sur StudHub !\n\n` + `On est ravis de t’accueillir. Explore les annonces, le marketplace et les services étudiants — ` + `et n’hésite pas à compléter ton profil.\n\n` + `— L’équipe StudHub`;
        const conv = await this.prisma.conversation.create({
            data: {
                type: 'SYSTEM',
                title: 'Équipe StudHub',
                studentId,
                agentId: null,
                allowReplies: false,
                lastMessage: text.slice(0, 180),
                lastMessageAt: new Date(),
                unreadStudentCount: 1,
                unreadAgentCount: 0,
                messages: {
                    create: {
                        content: text,
                        isSystem: true
                    }
                }
            },
            include: {
                student: {
                    select: {
                        id: true,
                        fullName: true,
                        avatarUrl: true,
                        phone: true
                    }
                },
                agent: {
                    select: {
                        id: true,
                        agencyName: true,
                        avatarUrl: true,
                        phone: true
                    }
                },
                messages: {
                    orderBy: {
                        createdAt: 'asc'
                    },
                    take: 5
                }
            }
        });
        void this.push.notifyChatMessage({
            recipient: {
                type: 'user',
                id: studentId
            },
            conversationId: conv.id,
            title: 'Équipe StudHub',
            body: text.slice(0, 160)
        }).catch(()=>{});
        return {
            conversation: conv,
            created: true
        };
    }
    previewForLastMessage(content, mediaUrl) {
        const raw = String(content || '');
        if (raw.startsWith('__CALL__:')) {
            const parts = raw.split(':');
            const status = parts[1];
            const dur = Math.max(0, Number(parts[2] || 0) || 0);
            const dir = parts[3] === 'in' ? 'in' : 'out';
            const mm = String(Math.floor(dur / 60)).padStart(2, '0');
            const ss = String(dur % 60).padStart(2, '0');
            const side = dir === 'out' ? 'sortant' : 'entrant';
            switch(status){
                case 'completed':
                    return `Appel ${side} · ${mm}:${ss}`;
                case 'missed':
                    return dir === 'out' ? 'Appel sortant manqué' : 'Appel entrant manqué';
                case 'rejected':
                    return dir === 'out' ? 'Appel sortant refusé' : 'Appel entrant refusé';
                case 'cancelled':
                    return dir === 'out' ? 'Appel sortant annulé' : 'Appel entrant annulé';
                default:
                    return `Appel ${side}`;
            }
        }
        if (mediaUrl) {
            const kind = this.mediaKindFromUrl(mediaUrl);
            if (kind === 'audio') return '🎤 Note vocale';
            if (kind === 'image') return raw || '📷 Photo';
            return raw ? `📎 ${raw}` : '📎 Fichier';
        }
        return raw || '[piece-jointe]';
    }
    mediaKindFromUrl(url) {
        const u = String(url || '').toLowerCase().split('?')[0];
        if (/\.(jpe?g|png|gif|webp)$/.test(u)) return 'image';
        if (/\.(webm|ogg|mp3|m4a|wav|aac|opus)$/.test(u)) return 'audio';
        return 'file';
    }
    async notifyRecipientPush(conv, sender, msg) {
        const recipient = sender.type === 'user' ? conv.agentId ? {
            type: 'agent',
            id: conv.agentId
        } : null : {
            type: 'user',
            id: conv.studentId
        };
        if (!recipient) return;
        const title = sender.type === 'user' ? msg.studentSender?.fullName || 'Étudiant' : msg.agentSender?.agencyName || 'Agent';
        const body = this.mediaPushBody(msg);
        await this.push.notifyChatMessage({
            recipient,
            conversationId: conv.id,
            title,
            body
        });
    }
    mediaPushBody(msg) {
        const url = String(msg?.mediaUrl || '');
        if (url) {
            const u = url.toLowerCase().split('?')[0];
            if (/\.(jpe?g|png|gif|webp)$/.test(u)) return '📷 Photo';
            if (/\.(webm|ogg|mp3|m4a|wav|aac|opus)$/.test(u)) return '🎤 Note vocale';
            return msg?.content ? `📎 ${String(msg.content).slice(0, 120)}` : '📎 Fichier';
        }
        return String(msg.content || 'Nouveau message').slice(0, 160);
    }
    async markRead(conversationId, subject) {
        const conv = await this.prisma.conversation.findUnique({
            where: {
                id: conversationId
            }
        });
        if (!conv) throw new _common.NotFoundException();
        const data = {};
        if (subject.type === 'user') data.unreadStudentCount = 0;
        else data.unreadAgentCount = 0;
        return this.prisma.conversation.update({
            where: {
                id: conversationId
            },
            data
        });
    }
    constructor(prisma, push){
        this.prisma = prisma;
        this.push = push;
    }
};
ChatService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService,
        typeof _pushservice.PushService === "undefined" ? Object : _pushservice.PushService
    ])
], ChatService);

//# sourceMappingURL=chat.service.js.map