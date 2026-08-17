/**
 * Pure Edge-Compatible Tenant Resolution & Normalization.
 * ZERO Prisma / DB dependencies. Safe for Next.js Middleware and Edge Runtime.
 */

export const FLUX_DOMAINS = new Set([
  'lovable.local',
  'lovable.smmplan.ru',
  'smmflux.ru',
  'www.smmflux.ru',
  'flux.local',
  'smmflux.local',
  'flux.smmplan.ru',
]);

/**
 * Edge-compatible host resolver (without Prisma DB dependency) for Next.js Middleware.
 */
export function resolveTenantFromHostEdge(host: string): string {
  const cleanHost = host.split(':')[0].toLowerCase();
  return FLUX_DOMAINS.has(cleanHost) ? 'flux' : 'smmplan';
}

/**
 * Pure tenant ID normalizer.
 * Maps legacy 'lovable' to canonical 'flux'. Returns null/undefined or other IDs as-is.
 */
export function normalizeTenantId<T extends string | null | undefined>(tenantId: T): T {
  if (!tenantId) return tenantId;
  const clean = tenantId.trim().toLowerCase();
  return (clean === 'lovable' ? 'flux' : clean) as T;
}

/**
 * Single Canonical View Strategy Resolver for Server Components & Actions.
 * Strategy MUST be resolved ONLY from the 'x-tenant-id' header set by Middleware.
 */
export function resolveTenantFromRequest(headersList: Headers): string {
  return normalizeTenantId(headersList.get('x-tenant-id')) || 'smmplan';
}
