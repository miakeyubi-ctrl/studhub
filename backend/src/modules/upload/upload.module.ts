import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { existsSync, mkdirSync } from 'fs';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MulterModule.registerAsync({
      useFactory: (cfg: ConfigService) => {
        const dir = join(process.cwd(), cfg.get('UPLOAD_LOCAL_DIR', './uploads'));
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        return {
          storage: diskStorage({
            destination: dir,
            filename: (_req, file, cb) => {
              const ext = extname(file.originalname) || '.bin';
              cb(null, `${Date.now()}-${uuidv4()}${ext}`);
            },
          }),
          limits: {
            fileSize: (Number(cfg.get('UPLOAD_MAX_SIZE_MB', 15)) || 15) * 1024 * 1024,
          },
          fileFilter: (_req, file, cb) => {
            const allowed = (cfg.get(
              'UPLOAD_ALLOWED_MIMES',
              'image/jpeg,image/png,image/webp,image/gif,audio/webm,audio/ogg,audio/mpeg,audio/mp4,audio/wav,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain',
            ) || '')
              .split(',').map((s: string) => s.trim());
            if (allowed.includes(file.mimetype)) cb(null, true);
            else cb(new Error(`Type de fichier interdit : ${file.mimetype}`) as any, false);
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
