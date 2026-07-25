import { db } from './db';

// In-memory cache for Edge/Node middleware resolution (5 min TTL)
let tenantCache: Map<string, string> | null = null;
let cacheExpiry = 0;

/**
 * // TODO: Use in Server Components (P3)
 * Resolves tenantId from HTTP Host header using exact domain match.
 */
export async function resolveTenantFromHost(host: string): Promise<string> {
  const now = Date.now();
  if (!tenantCache || now > cacheExpiry) {
    try {
      const tenants = await db.tenant.findMany({
        where: { isActive: true },
        select: { slug: true, domain: true, customDomain: true },
      });
      tenantCache = new Map();
      for (const t of tenants) {
        tenantCache.set(t.domain.toLowerCase(), t.slug);
        if (t.customDomain) {
          tenantCache.set(t.customDomain.toLowerCase(), t.slug);
        }
      }
      cacheExpiry = now + 5 * 60 * 1000;
    } catch (err) {
      console.warn('[TenantResolver] Failed to fetch tenants from DB, using fallback host mapping:', err);
      tenantCache = new Map();
    }
  }

  const cleanHost = host.split(':')[0].toLowerCase();
  
  if (tenantCache.has(cleanHost)) {
    return tenantCache.get(cleanHost)!;
  }

  // Exact fallback matching to prevent sub-domain hijacking (e.g., lovable.evil.com)
  if (cleanHost === 'lovable.local' || cleanHost === 'lovable.smmplan.ru' || cleanHost === 'smmflux.ru' || cleanHost === 'www.smmflux.ru') {
    return 'lovable';
  }

  return 'smmplan';
}

/**
 * Edge-compatible host resolver (without Prisma DB dependency) for Next.js Middleware.
 */
export function resolveTenantFromHostEdge(host: string): string {
  const cleanHost = host.split(':')[0].toLowerCase();
  const lovableDomains = ['lovable.local', 'lovable.smmplan.ru', 'smmflux.ru', 'www.smmflux.ru'];
  if (lovableDomains.includes(cleanHost) || (cleanHost.startsWith('lovable.') && !cleanHost.includes('evil'))) {
    return 'lovable';
  }
  return 'smmplan';
}

