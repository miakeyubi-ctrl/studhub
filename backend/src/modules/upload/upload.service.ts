import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';
import { createReadStream } from 'fs';
import { join } from 'path';
import * as streamifier from 'streamifier';

@Injectable()
export class UploadService {
  constructor(private readonly cfg: ConfigService) {
    if (cfg.get('UPLOAD_MODE') === 'cloudinary') {
      cloudinary.config({
        cloud_name: cfg.get('CLOUDINARY_CLOUD_NAME'),
        api_key:    cfg.get('CLOUDINARY_API_KEY'),
        api_secret: cfg.get('CLOUDINARY_API_SECRET'),
      });
    }
  }

  /**
   * Prend un fichier Multer uploadé en local et retourne l'URL publique.
   * Si UPLOAD_MODE=cloudinary → uploade aussi sur Cloudinary et retourne l'URL CDN.
   */
  async handleUploadedFile(file: Express.Multer.File, folder = 'studhub') {
    const mode = this.cfg.get('UPLOAD_MODE', 'local');
    const prefix = this.cfg.get('UPLOAD_PUBLIC_URL_PREFIX', 'http://localhost:3000/uploads');
    const localUrl = `${prefix}/${file.filename}`;

    if (mode === 'cloudinary') {
      const opts: UploadApiOptions = {
        folder: this.cfg.get('CLOUDINARY_FOLDER', 'studhub-dev') + '/' + folder,
        resource_type: 'auto',
      };
      try {
        const stream = file.buffer
          ? streamifier.createReadStream(file.buffer)
          : createReadStream(join(process.cwd(), this.cfg.get('UPLOAD_LOCAL_DIR', './uploads'), file.filename));
        const result = await new Promise<UploadApiResponse>((resolve, reject) => {
          const up = cloudinary.uploader.upload_stream(opts, (err, res) => {
            if (err || !res) return reject(err);
            resolve(res);
          });
          stream.pipe(up);
        });
        return { url: result.secure_url, localUrl, filename: file.filename, bytes: file.size, mime: file.mimetype, storage: 'cloudinary', publicId: result.public_id };
      } catch (e) {
        return { url: localUrl, filename: file.filename, bytes: file.size, mime: file.mimetype, storage: 'local', warning: 'Cloudinary échoué, fallback en local' };
      }
    }
    return { url: localUrl, filename: file.filename, bytes: file.size, mime: file.mimetype, storage: 'local' };
  }
}
