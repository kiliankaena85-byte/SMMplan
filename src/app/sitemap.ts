import { MetadataRoute } from 'next';
import { getPublicCatalogAction, getServicesByCategoryAction } from '@/actions/order/catalog';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { normalizeTenantId, absoluteCanonical } from '@/lib/seo-helpers';

// sitemap.ts uses headers() -> force-dynamic
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const reqHeaders = await headers();
  const rawHost = reqHeaders.get('host') || 'smmplan.pro';
  const tenantId = normalizeTenantId(reqHeaders.get('x-tenant-id'));
  
  // For production: use canonical host based on tenant, not raw request host
  // For localhost dev: use http://localhost:3000 style for testing
  const isLocalhost = rawHost.includes('localhost') || rawHost.includes('127.0.0.1');
  const protocol = isLocalhost ? 'http' : 'https';
  const baseUrl = isLocalhost ? `${protocol}://${rawHost}` : `https://${rawHost}`;

  const routes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/services`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/knowledge`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/legal/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/legal/refund`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/legal/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  // Catalog pages with Quality Gate (only categories with >=3 active, non-quarantined services)
  try {
    const catalogResult = await getPublicCatalogAction(tenantId);
    if (catalogResult.success && catalogResult.data) {
      for (const network of catalogResult.data) {
        routes.push({
          url: `${baseUrl}/services/${network.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        });

        for (const category of network.categories) {
          // Quality Gate: fetch services to verify eligibility before adding to sitemap
          const services = await getServicesByCategoryAction(category.id, tenantId);
          const passesQualityGate = services.length >= 3 && services.some(s => s.pricePerUnitRub > 0);
          
          if (passesQualityGate) {
            routes.push({
              url: `${baseUrl}/services/${network.slug}/${category.slug}`,
              lastModified: new Date(),
              changeFrequency: 'weekly',
              priority: 0.7,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('[sitemap] Failed to generate catalog routes', error);
  }

  // Knowledge base articles
  try {
    const articles = await db.contentItem.findMany({
      where: {
        isPublished: true,
        type: { in: ['PAGE', 'NEWS_POST'] },
      },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    for (const article of articles) {
      if (article.slug) {
        routes.push({
          url: `${baseUrl}/knowledge/${article.slug}`,
          lastModified: article.updatedAt,
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
    }
  } catch (error) {
    console.error('[sitemap] Failed to generate knowledge routes', error);
  }

  // Custom pages (/p/[slug]) — type PAGE that are published
  try {
    const pages = await db.contentItem.findMany({
      where: {
        isPublished: true,
        type: 'PAGE',
        // Only pages that don't have a knowledge-style slug prefix
        // Both knowledge and p/ share PAGE type, so we include all
      },
      select: { slug: true, updatedAt: true },
    });

    for (const page of pages) {
      if (page.slug) {
        routes.push({
          url: `${baseUrl}/p/${page.slug}`,
          lastModified: page.updatedAt,
          changeFrequency: 'monthly',
          priority: 0.5,
        });
      }
    }
  } catch (error) {
    console.error('[sitemap] Failed to generate /p/ routes', error);
  }

  // Academy lessons
  try {
    const lessons = await db.contentItem.findMany({
      where: {
        isPublished: true,
        type: 'ACADEMY_LESSON',
      },
      select: { slug: true, updatedAt: true },
    });

    for (const lesson of lessons) {
      if (lesson.slug) {
        routes.push({
          url: `${baseUrl}/academy/${lesson.slug}`,
          lastModified: lesson.updatedAt,
          changeFrequency: 'monthly',
          priority: 0.6,
        });
      }
    }
  } catch (error) {
    console.error('[sitemap] Failed to generate academy routes', error);
  }

  return routes;
}
