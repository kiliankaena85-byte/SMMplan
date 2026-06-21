import { MetadataRoute } from 'next';
import { getPublicCatalogAction } from '@/actions/order/catalog';

export const revalidate = 86400; // 24 hours

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://smmplan.pro';
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
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
  ];

  try {
    const catalogResult = await getPublicCatalogAction();
    if (catalogResult.success && catalogResult.data) {
      for (const network of catalogResult.data) {
        routes.push({
          url: `${baseUrl}/services/${network.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        });

        for (const category of network.categories) {
          routes.push({
            url: `${baseUrl}/services/${network.slug}/${category.slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        }
      }
    }
  } catch (error) {
    console.error('Failed to generate sitemap', error);
  }

  return routes;
}
