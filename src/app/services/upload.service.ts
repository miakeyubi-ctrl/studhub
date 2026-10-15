import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface UploadedFile {
  filename: string;
  url: string;
  size: number;
  mimetype: string;
}

interface BackendFlatUpload {
  url: string;
  filename?: string;
  size?: number;
  mimetype?: string;
  publicUrl?: string;
}

interface BackendWrappedUpload {
  success: boolean;
  data: {
    url: string;
    filename?: string;
    size?: number;
    mimetype?: string;
    publicUrl?: string;
  };
  message?: string;
}

type BackendUploadResponse = BackendFlatUpload | BackendWrappedUpload;
const isWrappedUpload = (r: BackendUploadResponse): r is BackendWrappedUpload =>
  'success' in r && 'data' in r;

const normalizeUpload = (res: BackendUploadResponse): UploadedFile => {
  if (isWrappedUpload(res)) {
    const d = res.data;
    return {
      url: d.publicUrl || d.url,
      filename: d.filename || '',
      size: Number(d.size || 0),
      mimetype: d.mimetype || 'application/octet-stream',
    };
  }
  return {
    url: (res as any).publicUrl || res.url,
    filename: res.filename || '',
    size: Number((res as any).size || 0),
    mimetype: (res as any).mimetype || 'application/octet-stream',
  };
};

@Injectable({ providedIn: 'root' })
export class UploadService {
  constructor(private http: HttpClient) {}

  /**
   * Uploade UN fichier via Multer Nest /api/upload (guarded JWT Bearer auto)
   * @param file Fichier File (FileList)
   * @param folder Dossier cible logique : properties | products | providers | posts | avatars
   * @returns UploadedFile { url, filename, size, mimetype }
   */
  async uploadFile(file: File, folder = 'general'): Promise<UploadedFile> {
    if (!file) {
      throw new Error('UPLOAD.FILE_EMPTY');
    }
    const form = new FormData();
    form.append('file', file, file.name);
    if (folder) form.append('folder', folder);
    try {
      const res = await firstValueFrom(
        this.http.post<BackendUploadResponse>(`${environment.apiUrl}/upload`, form),
      );
      return normalizeUpload(res);
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        const msg =
          err.status === 413 ? 'UPLOAD.TOO_LARGE' :
          err.status === 400 ? 'UPLOAD.FORBIDDEN_TYPE' :
          err.status === 401 ? 'UPLOAD.UNAUTHORIZED' :
          'UPLOAD.ERROR';
        const serverMsg = (err.error as any)?.message;
        throw new Error(serverMsg || msg);
      }
      throw new Error('UPLOAD.ERROR_NETWORK');
    }
  }

  /**
   * Upload MULTIPLE fichiers en parallèle (max 5 parallèles)
   * @returns tableau d'URLs publiques
   */
  async uploadFiles(files: File[], folder = 'general'): Promise<string[]> {
    const urls: string[] = [];
    for (let i = 0; i < files.length; i += 5) {
      const slice = files.slice(i, i + 5);
      const results = await Promise.all(
        slice.map(f => this.uploadFile(f, folder).then(u => u.url).catch(() => '')),
      );
      urls.push(...results.filter(u => !!u));
    }
    return urls;
  }
}
