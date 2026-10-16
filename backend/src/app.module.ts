import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';

// Core
import { PrismaModule } from './common/prisma/prisma.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

// Modules domaine
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AgentsModule } from './modules/agents/agents.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { ProductsModule } from './modules/products/products.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { PostsModule } from './modules/posts/posts.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ChatModule } from './modules/chat/chat.module';
import { UploadModule } from './modules/upload/upload.module';
import { HealthModule } from './modules/health/health.module';
import { PushModule } from './modules/push/push.module';
import { PartnersModule } from './modules/partners/partners.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SupportModule } from './modules/support/support.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    // 1) Config global (charge le .env + variables système)
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: '.env',
    }),

    // 2) Rate Limiting global (200 requêtes / IP / minute par défaut)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => [
        {
          ttl: Number(cfg.get('THROTTLE_TTL', 60)) * 1000,
          limit: Number(cfg.get('THROTTLE_LIMIT', 200)),
        },
      ],
    }),

    // 3) Tâches planifiées (nettoyage codes reset expirés, etc.)
    ScheduleModule.forRoot(),

    // 4) Logger JSON Pino
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        pinoHttp: {
          level: cfg.get('LOG_LEVEL', 'info'),
          autoLogging: { ignorePaths: ['/health', '/favicon.ico'] },
        },
      }) as any,
    }),

    // 5) BDD + Redis via Prisma (global, injectable dans tous les modules)
    PrismaModule,

    // 6) Modules métier
    AuthModule,
    UsersModule,
    AgentsModule,
    PropertiesModule,
    ProductsModule,
    ProvidersModule,
    PostsModule,
    ReviewsModule,
    ChatModule,
    PushModule,
    PartnersModule,
    ReportsModule,
    SupportModule,
    ReservationsModule,
    NotificationsModule,
    UploadModule,
    HealthModule,
  ],
  providers: [
    // Appliquer rate limit à TOUS les endpoints (sauf override @SkipThrottle())
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Uniformiser toutes les réponses API dans { success, data, message }
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
