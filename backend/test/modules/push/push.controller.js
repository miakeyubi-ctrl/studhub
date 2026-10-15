"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PushController", {
    enumerable: true,
    get: function() {
        return PushController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _classvalidator = require("class-validator");
const _pushservice = require("./push.service");
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
let RegisterPushDto = class RegisterPushDto {
};
_ts_decorate([
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MinLength)(10),
    _ts_metadata("design:type", String)
], RegisterPushDto.prototype, "token", void 0);
_ts_decorate([
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsIn)([
        'android',
        'ios',
        'web'
    ]),
    _ts_metadata("design:type", String)
], RegisterPushDto.prototype, "platform", void 0);
let UnregisterPushDto = class UnregisterPushDto {
};
_ts_decorate([
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MinLength)(10),
    _ts_metadata("design:type", String)
], UnregisterPushDto.prototype, "token", void 0);
let PushController = class PushController {
    register(u, body) {
        const subject = {
            type: u.type,
            id: u.sub
        };
        return this.push.registerToken(subject, body.token, body.platform);
    }
    unregister(body) {
        return this.push.unregisterToken(body.token);
    }
    constructor(push){
        this.push = push;
    }
};
_ts_decorate([
    (0, _common.Post)('register'),
    _ts_param(0, (0, _currentuserdecorator.CurrentUser)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _currentuserdecorator.JwtPayload === "undefined" ? Object : _currentuserdecorator.JwtPayload,
        typeof RegisterPushDto === "undefined" ? Object : RegisterPushDto
    ]),
    _ts_metadata("design:returntype", void 0)
], PushController.prototype, "register", null);
_ts_decorate([
    (0, _common.Delete)('unregister'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof UnregisterPushDto === "undefined" ? Object : UnregisterPushDto
    ]),
    _ts_metadata("design:returntype", void 0)
], PushController.prototype, "unregister", null);
PushController = _ts_decorate([
    (0, _swagger.ApiTags)('Push'),
    (0, _common.Controller)('push'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    (0, _swagger.ApiBearerAuth)('JWT-AUTH'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _pushservice.PushService === "undefined" ? Object : _pushservice.PushService
    ])
], PushController);

//# sourceMappingURL=push.controller.js.map