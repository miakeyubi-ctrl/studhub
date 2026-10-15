"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ChatController", {
    enumerable: true,
    get: function() {
        return ChatController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _chatservice = require("./chat.service");
const _chatgateway = require("./gateways/chat.gateway");
const _jwtauthguard = require("../../common/guards/jwt-auth.guard");
const _currentuserdecorator = require("../../common/decorators/current-user.decorator");
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
let ChatController = class ChatController {
    list(u) {
        const subject = {
            type: u.type,
            id: u.sub
        };
        return this.chat.listConversationsFor(subject);
    }
    createOrGet(u, targetId, targetType) {
        const subject = {
            type: u.type,
            id: u.sub
        };
        return this.chat.getOrCreateConversation(subject, {
            type: targetType,
            id: targetId
        });
    }
    /** Crée (si besoin) le message de bienvenue système StudHub — non répondable. */ async systemWelcome(u, firstName) {
        if (u.type !== 'user') {
            return {
                created: false
            };
        }
        const result = await this.chat.ensureStudhubWelcome(u.sub, firstName);
        if (result.created && result.conversation?.messages?.[0]) {
            this.gateway.emitNewMessage(result.conversation.id, {
                ...result.conversation.messages[0],
                isSystem: true
            });
        }
        return result;
    }
    messages(id, limit, beforeId) {
        return this.chat.getMessages(id, Number(limit || 50), beforeId ? Number(beforeId) : undefined);
    }
    async send(u, conversationId, content, mediaUrl) {
        const sender = {
            type: u.type,
            id: u.sub
        };
        const msg = await this.chat.saveMessage(conversationId, sender, content, mediaUrl);
        // Temps réel : pousse le message aux participants connectés en WS
        this.gateway.emitNewMessage(conversationId, msg);
        return msg;
    }
    read(u, id) {
        return this.chat.markRead(id, {
            type: u.type,
            id: u.sub
        });
    }
    constructor(chat, gateway){
        this.chat = chat;
        this.gateway = gateway;
    }
};
_ts_decorate([
    (0, _common.Get)('conversations'),
    _ts_param(0, (0, _currentuserdecorator.CurrentUser)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _currentuserdecorator.JwtPayload === "undefined" ? Object : _currentuserdecorator.JwtPayload
    ]),
    _ts_metadata("design:returntype", void 0)
], ChatController.prototype, "list", null);
_ts_decorate([
    (0, _common.Post)('conversations'),
    _ts_param(0, (0, _currentuserdecorator.CurrentUser)()),
    _ts_param(1, (0, _common.Body)('targetId', _common.ParseIntPipe)),
    _ts_param(2, (0, _common.Body)('targetType')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _currentuserdecorator.JwtPayload === "undefined" ? Object : _currentuserdecorator.JwtPayload,
        Number,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], ChatController.prototype, "createOrGet", null);
_ts_decorate([
    (0, _common.Post)('conversations/system-welcome'),
    _ts_param(0, (0, _currentuserdecorator.CurrentUser)()),
    _ts_param(1, (0, _common.Body)('firstName')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _currentuserdecorator.JwtPayload === "undefined" ? Object : _currentuserdecorator.JwtPayload,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ChatController.prototype, "systemWelcome", null);
_ts_decorate([
    (0, _common.Get)('conversations/:id/messages'),
    _ts_param(0, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_param(1, (0, _common.Query)('limit')),
    _ts_param(2, (0, _common.Query)('beforeId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Number,
        Number,
        Number
    ]),
    _ts_metadata("design:returntype", void 0)
], ChatController.prototype, "messages", null);
_ts_decorate([
    (0, _common.Post)('messages'),
    _ts_param(0, (0, _currentuserdecorator.CurrentUser)()),
    _ts_param(1, (0, _common.Body)('conversationId', _common.ParseIntPipe)),
    _ts_param(2, (0, _common.Body)('content')),
    _ts_param(3, (0, _common.Body)('mediaUrl')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _currentuserdecorator.JwtPayload === "undefined" ? Object : _currentuserdecorator.JwtPayload,
        Number,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ChatController.prototype, "send", null);
_ts_decorate([
    (0, _common.Post)('conversations/:id/read'),
    _ts_param(0, (0, _currentuserdecorator.CurrentUser)()),
    _ts_param(1, (0, _common.Param)('id', _common.ParseIntPipe)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _currentuserdecorator.JwtPayload === "undefined" ? Object : _currentuserdecorator.JwtPayload,
        Number
    ]),
    _ts_metadata("design:returntype", void 0)
], ChatController.prototype, "read", null);
ChatController = _ts_decorate([
    (0, _swagger.ApiTags)('Chat'),
    (0, _common.Controller)(),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _swagger.ApiBearerAuth)('JWT-AUTH'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _chatservice.ChatService === "undefined" ? Object : _chatservice.ChatService,
        typeof _chatgateway.ChatGateway === "undefined" ? Object : _chatgateway.ChatGateway
    ])
], ChatController);

//# sourceMappingURL=chat.controller.js.map