/**
 * Catalog & Provider Search Query Normalizer
 * Standardizes search inputs across catalog and admin:
 * - Strips prefixes: '#1643', '№1643', 'ID: 1643', 'id 1643', '# 1643', '№  1643'
 * - Detects exact numericId matches without false-positives
 */

export interface NormalizedSearchQuery {
  raw: string;
  normalizedNumericQ: string;
  numId: number | null;
  isPureNumber: boolean;
  cleanText: string;
}

export function normalizeCatalogSearch(query: string): NormalizedSearchQuery {
  if (!query) {
    return {
      raw: '',
      normalizedNumericQ: '',
      numId: null,
      isPureNumber: false,
      cleanText: '',
    };
  }

  const raw = query.trim();
  const normalizedNumericQ = raw
    .replace(/^[#№\s]+/, '')
    .replace(/^id[\s:]*/i, '')
    .trim();

  const numId = parseInt(normalizedNumericQ, 10);
  const isPureNumber = !isNaN(numId) && normalizedNumericQ === String(numId);

  return {
    raw,
    normalizedNumericQ,
    numId: isPureNumber ? numId : null,
    isPureNumber,
    cleanText: raw,
  };
}

export function normalizeSearchQuery(query: string): string {
  if (!query) return '';
  return query
    .trim()
    .replace(/^[#№\s]+/, '')
    .replace(/^id[\s:]*/i, '')
    .trim()
    .toLowerCase();
}

