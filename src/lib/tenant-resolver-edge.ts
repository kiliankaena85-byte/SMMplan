/**
 * Pure Edge-Compatible Tenant Resolution & Normalization.
 * ZERO Prisma / DB dependencies. Safe for Next.js Middleware and Edge Runtime.
 */

export const FLUX_DOMAINS = new Set([
  'lovable.local',
  'lovable.smmplan.ru',
  'lovable.pro',
  'www.lovable.pro',
  'smmflux.ru',
  'www.smmflux.ru',
  'flux.local',
  'smmflux.local',
  'flux.smmplan.ru',
  'flux.smmplan.pro',
  'test-flux.smmplan.pro',
  'test.smmflux.ru',
]);

export const VALID_TENANTS = new Set(['smmplan', 'flux']);

/**
 * Edge-compatible host resolver (without Prisma DB dependency) for Next.js Middleware.
 */
export function resolveTenantFromHostEdge(host: string): string {
  if (!host || typeof host !== 'string') return 'smmplan';
  const cleanHost = host.split(':')[0].toLowerCase().trim();
  if (cleanHost.startsWith('flux.') || cleanHost.startsWith('test-flux.') || cleanHost.includes('smmflux') || FLUX_DOMAINS.has(cleanHost)) {
    return 'flux';
  }
  return 'smmplan';
}

/**
 * Pure tenant ID normalizer and sanitizer.
 * Maps legacy 'lovable' to canonical 'flux'.
 * Rejects unknown or malicious strings and falls back to 'smmplan'.
 */
export function normalizeTenantId<T extends string | null | undefined>(tenantId: T): string | T {
  if (!tenantId) return tenantId;
  const clean = tenantId.trim().toLowerCase();
  const normalized = clean === 'lovable' || clean === 'smmflux' ? 'flux' : clean;
  if (!VALID_TENANTS.has(normalized)) {
    return 'smmplan' as T;
  }
  return normalized as T;
}

/**
 * Single Canonical View Strategy Resolver for Server Components & Actions.
 * Strategy MUST be resolved ONLY from the 'x-tenant-id' header set by Middleware.
 */
export function resolveTenantFromRequest(headersList: Headers): string {
  const headerVal = headersList.get('x-tenant-id');
  return (normalizeTenantId(headerVal) as string) || 'smmplan';
}
