"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ChatGateway", {
    enumerable: true,
    get: function() {
        return ChatGateway;
    }
});
const _websockets = require("@nestjs/websockets");
const _socketio = require("socket.io");
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _jwt = require("@nestjs/jwt");
const _chatservice = require("../chat.service");
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
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let ChatGateway = class ChatGateway {
    subjectKey(type, id) {
        return `${type}:${id}`;
    }
    isOnline(type, id) {
        return this.clients.has(this.subjectKey(type, id));
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.accessToken || (client.handshake.headers?.authorization || '').replace('Bearer ', '');
            if (!token) {
                client.disconnect();
                return;
            }
            const payload = await this.jwt.verifyAsync(token, {
                secret: this.cfg.get('JWT_ACCESS_SECRET'),
                issuer: this.cfg.get('JWT_ISSUER'),
                audience: this.cfg.get('JWT_AUDIENCE')
            });
            const key = this.subjectKey(payload.type, payload.sub);
            this.clients.set(key, {
                socketId: client.id,
                user: payload
            });
            client.data.user = payload;
            this.logger.log(`WS connecté: ${key} (${client.id})`);
        } catch (err) {
            this.logger.warn(`WS connexion rejetée : ${err}`);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        const u = client.data.user;
        if (!u) return;
        const key = this.subjectKey(u.type, u.sub);
        this.clients.delete(key);
        this.logger.log(`WS déconnecté: ${key}`);
        // Notifier les rooms encore liées à ce socket
        const rooms = [
            ...client.rooms || []
        ].filter((r)=>r.startsWith('conv-'));
        for (const room of rooms){
            const conversationId = Number(room.replace('conv-', ''));
            if (!conversationId) continue;
            this.server.to(room).emit('presence', {
                conversationId,
                subjectType: u.type,
                subjectId: u.sub,
                online: false
            });
        }
    }
    async join(client, data) {
        const user = client.data.user;
        if (!user || !data?.conversationId) return {
            ok: false,
            error: 'auth/conversationId requis'
        };
        const conversationId = Number(data.conversationId);
        const room = `conv-${conversationId}`;
        client.join(room);
        // Annoncer mon online aux autres
        client.to(room).emit('presence', {
            conversationId,
            subjectType: user.type,
            subjectId: user.sub,
            online: true
        });
        // Indiquer au joiner si le pair est en ligne
        try {
            const conv = await this.chat.getConversationMembers(conversationId);
            const peerType = user.type === 'user' ? 'agent' : 'user';
            const peerId = user.type === 'user' ? conv.agentId : conv.studentId;
            if (peerId != null) {
                client.emit('presence', {
                    conversationId,
                    subjectType: peerType,
                    subjectId: peerId,
                    online: this.isOnline(peerType, peerId)
                });
            }
        } catch  {
        /* conversation inconnue */ }
        return {
            ok: true,
            joined: room
        };
    }
    leave(client, data) {
        if (!data?.conversationId) return;
        const room = `conv-${data.conversationId}`;
        client.leave(room);
        const user = client.data.user;
        if (user) {
            client.to(room).emit('presence', {
                conversationId: Number(data.conversationId),
                subjectType: user.type,
                subjectId: user.sub,
                online: false
            });
        }
        return {
            ok: true
        };
    }
    onTyping(client, data) {
        const user = client.data.user;
        if (!user || !data?.conversationId) return;
        // Exclure l'émetteur
        client.to(`conv-${data.conversationId}`).emit('typing', {
            conversationId: Number(data.conversationId),
            senderType: user.type,
            senderId: user.sub,
            isTyping: !!data.isTyping
        });
    }
    async onMessage(client, data) {
        const user = client.data.user;
        if (!user || !data?.conversationId) return {
            ok: false,
            error: 'requête invalide'
        };
        try {
            const sender = {
                type: user.type,
                id: user.sub
            };
            const msg = await this.chat.saveMessage(data.conversationId, sender, data.content || '', data.mediaUrl);
            this.emitNewMessage(data.conversationId, msg);
            return {
                ok: true,
                message: msg
            };
        } catch (e) {
            return {
                ok: false,
                error: e?.message || 'Erreur envoi message'
            };
        }
    }
    /* ------------------------------------------------------------------ *
   *  APPELS WebRTC (signaling uniquement — pas de média sur le serveur) *
   * ------------------------------------------------------------------ */ async resolvePeer(conversationId, user) {
        const conv = await this.chat.getConversationMembers(conversationId);
        const peerType = user.type === 'user' ? 'agent' : 'user';
        const peerId = user.type === 'user' ? conv.agentId : conv.studentId;
        if (!peerId) return null;
        return {
            type: peerType,
            id: peerId,
            key: this.subjectKey(peerType, peerId)
        };
    }
    emitToPeer(peerKey, event, payload) {
        const peer = this.clients.get(peerKey);
        if (!peer) return false;
        this.server.to(peer.socketId).emit(event, payload);
        return true;
    }
    async onCallInvite(client, data) {
        const user = client.data.user;
        if (!user || !data?.conversationId) return {
            ok: false,
            error: 'invalide'
        };
        const peer = await this.resolvePeer(Number(data.conversationId), user);
        if (!peer) return {
            ok: false,
            error: 'destinataire introuvable'
        };
        const ok = this.emitToPeer(peer.key, 'call:incoming', {
            conversationId: Number(data.conversationId),
            fromType: user.type,
            fromId: user.sub,
            fromName: data.fromName || data.peerName || 'StudHub'
        });
        if (!ok) return {
            ok: false,
            error: 'offline'
        };
        return {
            ok: true
        };
    }
    async onCallAccept(client, data) {
        const user = client.data.user;
        if (!user || !data?.conversationId) return {
            ok: false
        };
        const peer = await this.resolvePeer(Number(data.conversationId), user);
        if (!peer) return {
            ok: false
        };
        this.emitToPeer(peer.key, 'call:accepted', {
            conversationId: Number(data.conversationId),
            fromType: user.type,
            fromId: user.sub
        });
        return {
            ok: true
        };
    }
    async onCallReject(client, data) {
        const user = client.data.user;
        if (!user || !data?.conversationId) return {
            ok: false
        };
        const peer = await this.resolvePeer(Number(data.conversationId), user);
        if (!peer) return {
            ok: false
        };
        this.emitToPeer(peer.key, 'call:rejected', {
            conversationId: Number(data.conversationId)
        });
        return {
            ok: true
        };
    }
    async onCallOffer(client, data) {
        const user = client.data.user;
        if (!user || !data?.conversationId || !data?.sdp) return {
            ok: false
        };
        const peer = await this.resolvePeer(Number(data.conversationId), user);
        if (!peer) return {
            ok: false
        };
        this.emitToPeer(peer.key, 'call:offer', {
            conversationId: Number(data.conversationId),
            sdp: data.sdp
        });
        return {
            ok: true
        };
    }
    async onCallAnswer(client, data) {
        const user = client.data.user;
        if (!user || !data?.conversationId || !data?.sdp) return {
            ok: false
        };
        const peer = await this.resolvePeer(Number(data.conversationId), user);
        if (!peer) return {
            ok: false
        };
        this.emitToPeer(peer.key, 'call:answer', {
            conversationId: Number(data.conversationId),
            sdp: data.sdp
        });
        return {
            ok: true
        };
    }
    async onCallIce(client, data) {
        const user = client.data.user;
        if (!user || !data?.conversationId || !data?.candidate) return {
            ok: false
        };
        const peer = await this.resolvePeer(Number(data.conversationId), user);
        if (!peer) return {
            ok: false
        };
        this.emitToPeer(peer.key, 'call:ice', {
            conversationId: Number(data.conversationId),
            candidate: data.candidate
        });
        return {
            ok: true
        };
    }
    async onCallMute(client, data) {
        const user = client.data.user;
        if (!user || !data?.conversationId) return {
            ok: false
        };
        const peer = await this.resolvePeer(Number(data.conversationId), user);
        if (!peer) return {
            ok: false
        };
        this.emitToPeer(peer.key, 'call:peer-mute', {
            conversationId: Number(data.conversationId),
            muted: !!data.muted,
            fromName: data.fromName || 'StudHub'
        });
        return {
            ok: true
        };
    }
    async onCallEnd(client, data) {
        const user = client.data.user;
        if (!user || !data?.conversationId) return {
            ok: false
        };
        const peer = await this.resolvePeer(Number(data.conversationId), user);
        if (peer) {
            this.emitToPeer(peer.key, 'call:ended', {
                conversationId: Number(data.conversationId)
            });
        }
        return {
            ok: true
        };
    }
    /** Diffuse un message à tous les clients de la conversation (HTTP ou WS). */ emitNewMessage(conversationId, msg) {
        if (!this.server || !conversationId || !msg) return;
        this.server.to(`conv-${conversationId}`).emit('newMessage', msg);
    }
    constructor(jwt, cfg, chat){
        this.jwt = jwt;
        this.cfg = cfg;
        this.chat = chat;
        this.logger = new _common.Logger(ChatGateway.name);
        /** Clé `${type}:${id}` → socketId + payload */ this.clients = new Map();
    }
};
_ts_decorate([
    (0, _websockets.WebSocketServer)(),
    _ts_metadata("design:type", typeof _socketio.Server === "undefined" ? Object : _socketio.Server)
], ChatGateway.prototype, "server", void 0);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('join'),
    _ts_param(0, (0, _websockets.ConnectedSocket)()),
    _ts_param(1, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ChatGateway.prototype, "join", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('leave'),
    _ts_param(0, (0, _websockets.ConnectedSocket)()),
    _ts_param(1, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ChatGateway.prototype, "leave", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('typing'),
    _ts_param(0, (0, _websockets.ConnectedSocket)()),
    _ts_param(1, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], ChatGateway.prototype, "onTyping", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('message'),
    _ts_param(0, (0, _websockets.ConnectedSocket)()),
    _ts_param(1, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ChatGateway.prototype, "onMessage", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('call:invite'),
    _ts_param(0, (0, _websockets.ConnectedSocket)()),
    _ts_param(1, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ChatGateway.prototype, "onCallInvite", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('call:accept'),
    _ts_param(0, (0, _websockets.ConnectedSocket)()),
    _ts_param(1, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ChatGateway.prototype, "onCallAccept", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('call:reject'),
    _ts_param(0, (0, _websockets.ConnectedSocket)()),
    _ts_param(1, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ChatGateway.prototype, "onCallReject", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('call:offer'),
    _ts_param(0, (0, _websockets.ConnectedSocket)()),
    _ts_param(1, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ChatGateway.prototype, "onCallOffer", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('call:answer'),
    _ts_param(0, (0, _websockets.ConnectedSocket)()),
    _ts_param(1, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ChatGateway.prototype, "onCallAnswer", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('call:ice'),
    _ts_param(0, (0, _websockets.ConnectedSocket)()),
    _ts_param(1, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ChatGateway.prototype, "onCallIce", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('call:mute'),
    _ts_param(0, (0, _websockets.ConnectedSocket)()),
    _ts_param(1, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ChatGateway.prototype, "onCallMute", null);
_ts_decorate([
    (0, _websockets.SubscribeMessage)('call:end'),
    _ts_param(0, (0, _websockets.ConnectedSocket)()),
    _ts_param(1, (0, _websockets.MessageBody)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _socketio.Socket === "undefined" ? Object : _socketio.Socket,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ChatGateway.prototype, "onCallEnd", null);
ChatGateway = _ts_decorate([
    (0, _websockets.WebSocketGateway)({
        cors: {
            origin: (origin, cb)=>cb(null, true),
            credentials: true
        },
        path: '/ws/chat',
        transports: [
            'websocket',
            'polling'
        ],
        pingTimeout: 30000
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _jwt.JwtService === "undefined" ? Object : _jwt.JwtService,
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService,
        typeof _chatservice.ChatService === "undefined" ? Object : _chatservice.ChatService
    ])
], ChatGateway);

//# sourceMappingURL=chat.gateway.js.map