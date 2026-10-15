"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AppModule", {
    enumerable: true,
    get: function() {
        return AppModule;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _core = require("@nestjs/core");
const _throttler = require("@nestjs/throttler");
const _schedule = require("@nestjs/schedule");
const _nestjspino = require("nestjs-pino");
const _prismamodule = require("./common/prisma/prisma.module");
const _transforminterceptor = require("./common/interceptors/transform.interceptor");
const _authmodule = require("./modules/auth/auth.module");
const _usersmodule = require("./modules/users/users.module");
const _agentsmodule = require("./modules/agents/agents.module");
const _propertiesmodule = require("./modules/properties/properties.module");
const _productsmodule = require("./modules/products/products.module");
const _providersmodule = require("./modules/providers/providers.module");
const _postsmodule = require("./modules/posts/posts.module");
const _reviewsmodule = require("./modules/reviews/reviews.module");
const _chatmodule = require("./modules/chat/chat.module");
const _uploadmodule = require("./modules/upload/upload.module");
const _healthmodule = require("./modules/health/health.module");
const _pushmodule = require("./modules/push/push.module");
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
let AppModule = class AppModule {
};
AppModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            // 1) Config global (charge le .env + variables système)
            _config.ConfigModule.forRoot({
                isGlobal: true,
                cache: true,
                envFilePath: '.env'
            }),
            // 2) Rate Limiting global (200 requêtes / IP / minute par défaut)
            _throttler.ThrottlerModule.forRootAsync({
                imports: [
                    _config.ConfigModule
                ],
                inject: [
                    _config.ConfigService
                ],
                useFactory: (cfg)=>[
                        {
                            ttl: Number(cfg.get('THROTTLE_TTL', 60)) * 1000,
                            limit: Number(cfg.get('THROTTLE_LIMIT', 200))
                        }
                    ]
            }),
            // 3) Tâches planifiées (nettoyage codes reset expirés, etc.)
            _schedule.ScheduleModule.forRoot(),
            // 4) Logger JSON Pino
            _nestjspino.LoggerModule.forRootAsync({
                imports: [
                    _config.ConfigModule
                ],
                inject: [
                    _config.ConfigService
                ],
                useFactory: (cfg)=>({
                        pinoHttp: {
                            level: cfg.get('LOG_LEVEL', 'info'),
                            autoLogging: {
                                ignorePaths: [
                                    '/health',
                                    '/favicon.ico'
                                ]
                            }
                        }
                    })
            }),
            // 5) BDD + Redis via Prisma (global, injectable dans tous les modules)
            _prismamodule.PrismaModule,
            // 6) Modules métier
            _authmodule.AuthModule,
            _usersmodule.UsersModule,
            _agentsmodule.AgentsModule,
            _propertiesmodule.PropertiesModule,
            _productsmodule.ProductsModule,
            _providersmodule.ProvidersModule,
            _postsmodule.PostsModule,
            _reviewsmodule.ReviewsModule,
            _chatmodule.ChatModule,
            _pushmodule.PushModule,
            _uploadmodule.UploadModule,
            _healthmodule.HealthModule
        ],
        providers: [
            // Appliquer rate limit à TOUS les endpoints (sauf override @SkipThrottle())
            {
                provide: _core.APP_GUARD,
                useClass: _throttler.ThrottlerGuard
            },
            // Uniformiser toutes les réponses API dans { success, data, message }
            {
                provide: _core.APP_INTERCEPTOR,
                useClass: _transforminterceptor.TransformInterceptor
            }
        ]
    })
], AppModule);

//# sourceMappingURL=app.module.js.map