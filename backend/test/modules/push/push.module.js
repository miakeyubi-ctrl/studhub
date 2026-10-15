"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PushModule", {
    enumerable: true,
    get: function() {
        return PushModule;
    }
});
const _common = require("@nestjs/common");
const _pushservice = require("./push.service");
const _pushcontroller = require("./push.controller");
const _authmodule = require("../auth/auth.module");
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
let PushModule = class PushModule {
};
PushModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _authmodule.AuthModule
        ],
        controllers: [
            _pushcontroller.PushController
        ],
        providers: [
            _pushservice.PushService
        ],
        exports: [
            _pushservice.PushService
        ]
    })
], PushModule);

//# sourceMappingURL=push.module.js.map