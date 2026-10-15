import { environment } from '../../environments/environment';

/** Résout une URL média relative (/uploads/…) en URL absolue. */
export function resolveMediaUrl(
  url?: string | null,
  fallback = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&auto=format&fit=crop',
): string {
  const u = (url || '').trim();
  if (!u || u === 'null' || u === 'undefined' || u.startsWith('data:')) return fallback;
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('blob:') || u.startsWith('assets/')) {
    return u;
  }
  const base = environment.uploadsUrl.replace(/\/$/, '');
  const origin = base.replace(/\/uploads$/i, '');
  if (u.startsWith('/uploads')) return `${origin}${u}`;
  if (u.startsWith('uploads/')) return `${base}/${u.replace(/^uploads\//, '')}`;
  if (u.startsWith('/')) return `${origin}${u}`;
  return `${base}/${u}`;
}
