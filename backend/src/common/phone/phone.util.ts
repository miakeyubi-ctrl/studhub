/**
 * Normalise un numéro tunisien (ou E.164) vers +216XXXXXXXX.
 * Accepte: "20 000 001", "20000001", "0021620000001", "+21620000001"
 */
export function normalizeTunisianPhone(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.trim().replace(/[\s\-().]/g, '');
  if (!s) return null;

  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (s.startsWith('+')) {
    const digits = s.slice(1).replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }

  s = s.replace(/\D/g, '');
  if (s.startsWith('216') && s.length === 11) return `+${s}`;
  if (s.startsWith('0') && s.length === 9) return `+216${s.slice(1)}`;
  if (s.length === 8 && /^[2-9]/.test(s)) return `+216${s}`;

  return null;
}

export function isValidE164Phone(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return '***';
  return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
}
