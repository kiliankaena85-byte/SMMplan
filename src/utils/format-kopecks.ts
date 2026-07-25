/**
 * Formats integer kopecks (cents) into human-readable Ruble string with currency symbol.
 * Example: 123456 -> "1 234,56 ₽"
 * Handles BigInt, number, and string inputs safely.
 */
export function formatKopecks(kopecks: bigint | number | string | null | undefined): string {
  if (kopecks === null || kopecks === undefined) return '0,00 ₽';
  
  let totalKopecks: bigint;
  try {
    totalKopecks = typeof kopecks === 'bigint' ? kopecks : BigInt(Math.round(Number(kopecks)));
  } catch {
    return '0,00 ₽';
  }

  const isNegative = totalKopecks < 0n;
  const absKopecks = isNegative ? -totalKopecks : totalKopecks;

  const rubles = absKopecks / 100n;
  const cents = absKopecks % 100n;

  const rublesFormatted = rubles.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const centsFormatted = cents.toString().padStart(2, '0');

  return `${isNegative ? '-' : ''}${rublesFormatted},${centsFormatted} ₽`;
}
