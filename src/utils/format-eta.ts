/**
 * Format seconds into human-readable duration.
 * 
 * Examples:
 *   30    → "< 1 мин"
 *   900   → "15 мин"
 *   9000  → "2ч 30м"
 *   93600 → "1д 2ч"
 * 
 * Used by: Admin Orders ETA column, future client-facing ETA.
 */
export function formatEta(seconds: number): string {
  if (seconds < 60) return `< 1 мин`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} мин`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m > 0 ? `${h}ч ${m}м` : `${h}ч`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.round((seconds % 86400) / 3600);
  return h > 0 ? `${d}д ${h}ч` : `${d}д`;
}
