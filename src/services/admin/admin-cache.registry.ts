import { unstable_cache, revalidateTag } from 'next/cache';
import { db } from '@/lib/db';
import { adminCatalogService } from '@/services/admin/catalog.service';
import { adminProviderService } from '@/services/admin/provider.service';

/**
 * OmniSMM Centralized Admin Cache Registry (2026 Remaster)
 * Eliminates N+1 DB queries across Admin navigation, catalog, orders, and services.
 */

export const getCachedAdminCategories = (tenantId?: string) => {
  const normalizedTenant = tenantId && tenantId !== 'all' ? tenantId : 'all';
  return unstable_cache(
    async () => adminCatalogService.listCategories(normalizedTenant !== 'all' ? normalizedTenant : undefined),
    [`admin_categories_${normalizedTenant}`],
    { revalidate: 180, tags: ['catalog', 'categories'] }
  )();
};

export const getCachedAdminProviders = unstable_cache(
  async () => adminProviderService.listProviders(),
  ['admin_providers_list'],
  { revalidate: 300, tags: ['providers'] }
);

export const getCachedAdminNetworks = unstable_cache(
  async () => {
    return db.network.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        sort: true,
        categories: {
          select: { id: true, name: true, slug: true, sort: true },
          orderBy: { sort: 'asc' }
        }
      },
      orderBy: { sort: 'asc' }
    });
  },
  ['admin_networks_list'],
  { revalidate: 300, tags: ['catalog', 'networks'] }
);

export const getCachedAdminCatalogHealth = (tenantId?: string) => {
  const normalizedTenant = tenantId && tenantId !== 'all' ? tenantId : 'all';
  return unstable_cache(
    async () => adminCatalogService.getCatalogHealthCounts(normalizedTenant !== 'all' ? normalizedTenant : undefined),
    [`admin_catalog_health_${normalizedTenant}`],
    { revalidate: 60, tags: ['catalog', 'health'] }
  )();
};

/**
 * Triggers revalidation of cached catalog, categories, and providers.
 */
export function invalidateAdminCatalogCache() {
  try {
    revalidateTag('catalog', 'default');
    revalidateTag('categories', 'default');
    revalidateTag('networks', 'default');
    revalidateTag('health', 'default');
    revalidateTag('providers', 'default');
  } catch (err) {
    console.warn('[invalidateAdminCatalogCache] Next.js tag revalidation warning:', err);
  }
}
