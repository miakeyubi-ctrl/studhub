/** Coordonnées approx. Tunisie (démo + fallback si lat/lng non saisis) */
const CITY_COORDS: { key: string; lat: number; lng: number }[] = [
  { key: 'el manar', lat: 36.8185, lng: 10.152 },
  { key: 'manar', lat: 36.8185, lng: 10.152 },
  { key: 'la marsa', lat: 36.8782, lng: 10.3248 },
  { key: 'marsa', lat: 36.8782, lng: 10.3248 },
  { key: 'el menzah', lat: 36.8455, lng: 10.1705 },
  { key: 'menzah', lat: 36.8455, lng: 10.1705 },
  { key: 'soukra', lat: 36.882, lng: 10.186 },
  { key: 'ariana', lat: 36.8665, lng: 10.1647 },
  { key: 'manouba', lat: 36.808, lng: 10.097 },
  { key: 'carthage', lat: 36.852, lng: 10.323 },
  { key: 'tunis', lat: 36.8065, lng: 10.1815 },
  { key: 'sahloul', lat: 35.841, lng: 10.598 },
  { key: 'sousse', lat: 35.8256, lng: 10.6411 },
  { key: 'sfax', lat: 34.7406, lng: 10.7603 },
  { key: 'monastir', lat: 35.777, lng: 10.826 },
];

function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function resolveCoords(
  city?: string | null,
  location?: string | null,
  title?: string | null,
): { lat: number; lng: number } | null {
  const hay = norm(`${location || ''} ${city || ''} ${title || ''}`);
  if (!hay) return null;
  for (const c of CITY_COORDS) {
    if (hay.includes(c.key)) return { lat: c.lat, lng: c.lng };
  }
  return null;
}

export function parseOptionalCoord(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}
