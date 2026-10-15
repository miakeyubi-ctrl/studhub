/** Liste canonique — doit rester alignée avec le frontend (src/app/data/universities.ts) */
export interface UniversityOption {
  id: string;
  name: string;
  short: string;
  aliases: string[];
}

export const UNIVERSITIES: UniversityOption[] = [
  {
    id: 'fst',
    name: 'FST — Faculté des Sciences de Tunis',
    short: 'FST',
    aliases: ['fst', 'faculte des sciences de tunis', 'faculté des sciences de tunis', 'el manar'],
  },
  {
    id: 'esc',
    name: 'ESC Tunis',
    short: 'ESC',
    aliases: ['esc', 'esc tunis', 'ecole superieure de commerce'],
  },
  {
    id: 'esprit',
    name: 'ESPRIT',
    short: 'ESPRIT',
    aliases: ['esprit'],
  },
  {
    id: 'insat',
    name: 'INSAT',
    short: 'INSAT',
    aliases: ['insat'],
  },
  {
    id: 'med',
    name: 'Faculté de Médecine de Tunis',
    short: 'Médecine',
    aliases: ['medecine', 'médecine', 'faculte de medecine', 'faculté de médecine de tunis'],
  },
  {
    id: 'isamm',
    name: 'ISAMM Manouba',
    short: 'ISAMM',
    aliases: ['isamm', 'isamm manouba'],
  },
  {
    id: 'enau',
    name: 'ENAU Tunis',
    short: 'ENAU',
    aliases: ['enau', 'enau tunis'],
  },
  {
    id: 'ihec',
    name: 'IHEC Carthage',
    short: 'IHEC',
    aliases: ['ihec', 'ihec carthage'],
  },
];

export function normalizeUniversityKey(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function matchUniversityId(raw: string | null | undefined): string | null {
  const key = normalizeUniversityKey(raw || '');
  if (!key) return null;
  for (const u of UNIVERSITIES) {
    const candidates = [u.name, u.short, u.id, ...u.aliases].map(normalizeUniversityKey);
    if (candidates.some((c) => c === key || key.includes(c) || c.includes(key))) {
      return u.id;
    }
  }
  return null;
}
