/**
 * Initiales prénom + nom (ex. "Youssef Ben Ali" → "YB", "Test" → "T").
 */
export function initialsFromName(fullName?: string | null, email?: string | null): string {
  const name = (fullName || '').trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return parts[0].charAt(0).toUpperCase();
  }
  const mail = (email || '').trim();
  if (mail) return mail.charAt(0).toUpperCase();
  return '?';
}

/** Couleur de fond stable selon le nom (pastel). */
export function initialsBg(fullName?: string | null, email?: string | null): string {
  const key = (fullName || email || '?').toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const palette = [
    '#0f766e', '#1d4ed8', '#7c3aed', '#be185d', '#c2410c',
    '#0e7490', '#4338ca', '#a16207', '#15803d', '#b91c1c',
  ];
  return palette[hash % palette.length];
}

/** true si l'URL est une vraie photo (pas placeholder Unsplash générique). */
export function hasRealAvatar(url?: string | null): boolean {
  const u = (url || '').trim();
  if (!u) return false;
  if (u.includes('photo-1633332755192') || u.includes('photo-1535713875002')) return false;
  if (u.includes('avatar-placeholder')) return false;
  return true;
}
