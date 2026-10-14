export const digits = (s: string | null | undefined) => (s || '').replace(/\D/g, '');

/**
 * Bitrix24 sends Brazilian numbers with the 55 country code (5515996045202),
 * but most PBX dial plans expect them without it (15996045202).
 */
export function stripBrazilDDI(phone: string): string {
  const n = digits(phone);
  return n.startsWith('55') && n.length >= 12 ? n.slice(2) : n;
}

/** Compare two numbers ignoring country code, trunk prefixes and formatting. */
export function sameNumber(a: string, b: string): boolean {
  const da = digits(a);
  const db = digits(b);
  if (!da || !db) return false;
  const len = Math.min(da.length, db.length, 10);
  return len >= 8 && da.slice(-len) === db.slice(-len);
}
