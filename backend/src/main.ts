import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { Request, Response } from 'express';
import { join } from 'path';
import { HealthService } from './modules/health/health.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    cors: false, // géré via CorsModule dans AppModule pour contrôle fin
  });

  const config = app.get(ConfigService);
  const logger = app.get(Logger);
  app.useLogger(logger);

  // =============== SÉCURITÉ ===============
  app.use(helmet({
    // Allow frontend (localhost:4200) to load /uploads images from API (localhost:3000)
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:3000'],
      },
    },
  }));

  // =============== GLOBALS ===============
  app.setGlobalPrefix('api', { exclude: ['docs', 'health', 'v1/health', 'uploads/(.*)'] });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  // Routes spéciales SANS versioning pour monitoring et docs (facile d'accès)
  // /health et /docs fonctionnent aussi bien avec ou sans /v1
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.use(compression());
  app.use(cookieParser());
  app.use(
    '/uploads',
    express.static(join(process.cwd(), config.get('UPLOAD_LOCAL_DIR', './uploads')), {
      maxAge: '30d',
      extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    }),
  );

  // =============== CORS ===============
  const corsOrigins = (config.get('CORS_ORIGIN', 'http://localhost:4200') || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      // Autoriser les origines listées + réseau privé (192.168.x.x / 10.x.x.x / 172.16-31.x.x) + Capacitor mobile
      const isLanIp = /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin);
      const isCapacitor = origin.startsWith('capacitor://') || origin.startsWith('ionic://');
      const isListed = corsOrigins.includes(origin) || corsOrigins.some((c: string) => origin.startsWith(c.replace('/*', '')));
      if (isLanIp || isCapacitor || isListed) return callback(null, true);
      logger.warn(`CORS blocked: ${origin}`);
      return callback(new Error('CORS not allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Requested-With'],
  });

  // =============== SWAGGER ===============
  const swaggerEnabled = config.get('SWAGGER_ENABLED', 'true') === 'true';
  const swaggerPath = config.get('SWAGGER_PATH', 'docs');
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('StudHub API')
      .setDescription('Backend StudHub - Immobilier étudiant, Marketplace, Services, Feed, Chat')
      .setVersion('1.0.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT-AUTH')
      .addTag('Auth', "Authentification étudiant & agent")
      .addTag('Properties', '🏘️ Biens immobiliers')
      .addTag('Marketplace', '🛒 Produits marketplace')
      .addTag('Providers', '💼 Prestataires StudServices')
      .addTag('Feed', '📰 Posts réseau social étudiant')
      .addTag('Chat', '💬 Conversations & WebSocket')
      .addTag('Upload', '🖼️ Upload photos')
      .addTag('Health', '⚕️ Monitoring')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, document, {
      customSiteTitle: 'StudHub API Docs',
      swaggerOptions: {
        persistAuthorization: true,
        defaultModelsExpandDepth: 1,
      },
    });
    logger.log(`📘 Swagger docs  → http://localhost:${config.get('PORT', 3000)}/${swaggerPath}`);
  }

  // =============== START ===============
  const port = Number(config.get('PORT', 3000));
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 StudHub backend → http://localhost:${port}/api (0.0.0.0:${port})`);
  logger.log(`🖼️  Uploads statiques → http://localhost:${port}/uploads`);
}
bootstrap();
