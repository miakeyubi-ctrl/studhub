/** Liste canonique des établissements Tunis (choix étudiant + carte campus) */
export interface UniversityOption {
  id: string;
  name: string;
  short: string;
  city: string;
  lat: number;
  lng: number;
  /** Variantes pour rattacher les anciennes valeurs seed / saisie libre */
  aliases: string[];
}

export const UNIVERSITIES: UniversityOption[] = [
  {
    id: 'fst',
    name: 'FST — Faculté des Sciences de Tunis',
    short: 'FST',
    city: 'El Manar',
    lat: 36.8169,
    lng: 10.1458,
    aliases: ['fst', 'faculte des sciences de tunis', 'faculté des sciences de tunis', 'el manar'],
  },
  {
    id: 'esc',
    name: 'ESC Tunis',
    short: 'ESC',
    city: 'Tunis',
    lat: 36.8124,
    lng: 10.1702,
    aliases: ['esc', 'esc tunis', 'ecole superieure de commerce'],
  },
  {
    id: 'esprit',
    name: 'ESPRIT',
    short: 'ESPRIT',
    city: 'Ariana',
    lat: 36.8985,
    lng: 10.1874,
    aliases: ['esprit'],
  },
  {
    id: 'insat',
    name: 'INSAT',
    short: 'INSAT',
    city: 'Tunis',
    lat: 36.8506,
    lng: 10.1962,
    aliases: ['insat'],
  },
  {
    id: 'med',
    name: 'Faculté de Médecine de Tunis',
    short: 'Médecine',
    city: 'Tunis',
    lat: 36.8021,
    lng: 10.1654,
    aliases: ['medecine', 'médecine', 'faculte de medecine', 'faculté de médecine de tunis'],
  },
  {
    id: 'isamm',
    name: 'ISAMM Manouba',
    short: 'ISAMM',
    city: 'Manouba',
    lat: 36.8112,
    lng: 10.0635,
    aliases: ['isamm', 'isamm manouba'],
  },
  {
    id: 'enau',
    name: 'ENAU Tunis',
    short: 'ENAU',
    city: 'Tunis',
    lat: 36.8188,
    lng: 10.1659,
    aliases: ['enau', 'enau tunis'],
  },
  {
    id: 'ihec',
    name: 'IHEC Carthage',
    short: 'IHEC',
    city: 'Carthage',
    lat: 36.8689,
    lng: 10.3235,
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

export function matchUniversity(raw: string | null | undefined): UniversityOption | null {
  const key = normalizeUniversityKey(raw || '');
  if (!key) return null;
  for (const u of UNIVERSITIES) {
    const candidates = [u.name, u.short, u.id, ...u.aliases].map(normalizeUniversityKey);
    if (candidates.some((c) => c === key || key.includes(c) || c.includes(key))) {
      return u;
    }
  }
  return null;
}
