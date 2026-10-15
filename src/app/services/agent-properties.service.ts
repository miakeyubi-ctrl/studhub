import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface AgentProperty {
  id: number;
  agentId: string | number;
  title: string;
  category: string;
  city: string;
  address: string;
  price: number;
  surface: number;
  rooms: number;
  furnished: boolean;
  description: string;
  image: string;
  images?: string[];
  latitude?: number | null;
  longitude?: number | null;
  createdAt: number | string;
}

const PROPERTIES_KEY = 'studhub-agent-properties';

/** Placeholder SVG correctement encodé (évite les images cassées). */
export const PROPERTY_PHOTO_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">` +
      `<rect width="400" height="300" fill="#EFFBFC"/>` +
      `<g fill="#56C8D1" opacity="0.45">` +
      `<circle cx="140" cy="110" r="28"/>` +
      `<path d="M40 260 L160 150 L230 210 L280 160 L360 260 Z"/>` +
      `</g></svg>`,
  );

@Injectable({ providedIn: 'root' })
export class AgentPropertiesService {

  private properties: AgentProperty[] = this.loadLocal();

  constructor(private http: HttpClient) {}

  async getByAgent(agentId: string | number): Promise<AgentProperty[]> {
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/properties/agent/me`),
      );
      if (res?.success && Array.isArray(res?.data?.items)) {
        const mapped = res.data.items.map((p: any) => this.normalize(p));
        const rest = this.properties.filter(p => !mapped.find((m: AgentProperty) => String(m.id) === String(p.id)));
        this.properties = [...mapped, ...rest];
        this.saveLocal();
        return [...mapped].sort((a: AgentProperty, b: AgentProperty) => this.sortKey(b) - this.sortKey(a));
      }
    } catch {}
    return this.properties
      .filter(p => String(p.agentId) === String(agentId))
      .sort((a, b) => this.sortKey(b) - this.sortKey(a))
      .map(p => ({
        ...p,
        image: this.resolvePhotoUrl(p.image),
        images: (p.images || []).map(u => this.resolvePhotoUrl(u)),
      }));
  }

  async getById(id: number): Promise<AgentProperty | undefined> {
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/properties/${id}`),
      );
      if (res?.success && res?.data) {
        const normalized = this.normalize(res.data);
        this.properties = [normalized, ...this.properties.filter(p => p.id !== id)];
        this.saveLocal();
        return normalized;
      }
    } catch {}
    const local = this.properties.find(p => p.id === id);
    return local ? { ...local, image: this.resolvePhotoUrl(local.image) } : undefined;
  }

  /** N'envoie au backend que de vraies URLs (pas blob / placeholder SVG). */
  private toPersistablePhotos(...sources: Array<string[] | string | null | undefined>): string[] {
    const collected: string[] = [];
    for (const src of sources) {
      if (Array.isArray(src)) collected.push(...src);
      else if (src) collected.push(src);
    }
    return collected
      .map(u => this.resolvePhotoUrl(u))
      .filter(u => !!u && !u.startsWith('blob:') && !u.startsWith('data:'));
  }

  async add(property: Omit<AgentProperty, 'id' | 'createdAt' | 'agentId'> & { agentId?: string | number }): Promise<AgentProperty> {
    try {
      const images = this.toPersistablePhotos(property.images, property.image);
      const body: any = {
        ...property,
        images,
        photos: images,
      };
      delete body.image;
      delete body.agentId;
      const res: any = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/properties`, body),
      );
      if (res?.success && res?.data) {
        const created = this.normalize(res.data);
        this.properties = [created, ...this.properties];
        this.saveLocal();
        return created;
      }
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status !== 0 && err.status !== 401) {
        throw err;
      }
    }
    const images = this.toPersistablePhotos(property.images, property.image);
    const created: AgentProperty = {
      ...property,
      agentId: property.agentId ?? 0,
      id: Math.max(...this.properties.map(p => p.id), 0) + 1,
      createdAt: Date.now(),
      images,
      image: images[0] || PROPERTY_PHOTO_PLACEHOLDER,
    };
    this.properties = [created, ...this.properties];
    this.saveLocal();
    return created;
  }

  async update(id: number, changes: Partial<Omit<AgentProperty, 'id' | 'agentId' | 'createdAt'>>): Promise<void> {
    try {
      const body: any = { ...changes };
      if (body.images || body.image) {
        body.images = this.toPersistablePhotos(body.images, body.image);
        body.photos = body.images;
        delete body.image;
      }
      delete body.agentId;
      const res: any = await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/properties/${id}`, body),
      );
      if (res?.success) {
        const updated = res.data
          ? this.normalize(res.data)
          : this.mergeUpdate(this.properties.find(p => p.id === id)!, body);
        this.properties = this.properties.map(p => p.id === id ? updated : p);
        this.saveLocal();
        return;
      }
    } catch (err) {
      // Pas de fallback local si le serveur refuse (pas ton annonce)
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403 || err.status === 404)) {
        throw new Error('Pas autorisé à modifier ce bien');
      }
    }
    const existing = this.properties.find(p => p.id === id);
    if (!existing) throw new Error('Bien introuvable');
    const merged = this.mergeUpdate(existing, changes as any);
    this.properties = this.properties.map(p => p.id === id ? merged : p);
    this.saveLocal();
  }

  async delete(id: number): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(`${environment.apiUrl}/properties/${id}`));
    } catch {}
    this.properties = this.properties.filter(p => p.id !== id);
    this.saveLocal();
  }

  /** URL affichable : relative → absolue, vide → placeholder. */
  resolvePhotoUrl(url?: string | null): string {
    const u = (url || '').trim();
    if (!u || u === 'null' || u === 'undefined') return PROPERTY_PHOTO_PLACEHOLDER;
    if (u.startsWith('data:image/svg+xml;utf8,<')) return PROPERTY_PHOTO_PLACEHOLDER;
    if (u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('http://') || u.startsWith('https://')) {
      return u;
    }
    const base = (environment.uploadsUrl || '').replace(/\/$/, '');
    const origin = base.replace(/\/uploads$/i, '') || 'http://localhost:3000';
    if (u.startsWith('/uploads')) return `${origin}${u}`;
    if (u.startsWith('uploads/')) {
      return `${base}/${u.replace(/^uploads\//, '')}`;
    }
    if (u.startsWith('/')) return `${origin}${u}`;
    return `${base}/${u.replace(/^\//, '')}`;
  }

  private mergeUpdate(p: AgentProperty, changes: Partial<AgentProperty> & { images?: string[] }): AgentProperty {
    const images = (changes.images ?? p.images ?? (p.image ? [p.image] : []))
      .map(u => this.resolvePhotoUrl(u));
    return {
      ...p,
      ...changes,
      images,
      image: images[0] || PROPERTY_PHOTO_PLACEHOLDER,
    };
  }

  private normalize(raw: any): AgentProperty {
    const rawImages: string[] = Array.isArray(raw.photos) && raw.photos.length
      ? raw.photos
      : Array.isArray(raw.images) && raw.images.length
        ? raw.images
        : raw.mainImage
          ? [raw.mainImage]
          : raw.image
            ? [raw.image]
            : [];
    const images = this.toPersistablePhotos(rawImages);
    return {
      id: Number(raw.id),
      agentId: raw.agentId ?? raw.ownerId ?? 0,
      title: raw.title ?? '',
      category: this.mapCategoryLabel(raw.category),
      city: raw.city ?? '',
      address: raw.address ?? raw.location ?? '',
      price: Number(raw.price ?? 0),
      surface: Number(raw.surface ?? 0),
      rooms: Number(raw.rooms ?? 0),
      furnished: !!raw.furnished,
      description: raw.description ?? '',
      image: images[0] || PROPERTY_PHOTO_PLACEHOLDER,
      images: images.length ? images : [PROPERTY_PHOTO_PLACEHOLDER],
      latitude: raw.latitude != null && Number.isFinite(Number(raw.latitude)) ? Number(raw.latitude) : null,
      longitude: raw.longitude != null && Number.isFinite(Number(raw.longitude)) ? Number(raw.longitude) : null,
      createdAt: raw.createdAt ?? Date.now(),
    };
  }

  private mapCategoryLabel(raw: any): string {
    const code = String(raw ?? '').toUpperCase();
    const map: Record<string, string> = {
      STUDIO: 'Studios',
      COLOCATION: 'Colocations',
      RESIDENCE: 'Résidences',
      CHAMBRE: 'Chambres',
    };
    if (map[code]) return map[code];
    if (['Studios', 'Colocations', 'Résidences', 'Chambres'].includes(String(raw))) return String(raw);
    return String(raw || 'Studios');
  }

  private sortKey(p: AgentProperty): number {
    if (typeof p.createdAt === 'number') return p.createdAt;
    if (typeof p.createdAt === 'string') return new Date(p.createdAt).getTime();
    return 0;
  }

  private loadLocal(): AgentProperty[] {
    try {
      const raw = localStorage.getItem(PROPERTIES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private saveLocal(): void {
    try { localStorage.setItem(PROPERTIES_KEY, JSON.stringify(this.properties)); } catch {}
  }
}
