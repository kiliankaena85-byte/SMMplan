import { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const reqHeaders = await headers();
  const host = reqHeaders.get('host') || 'smmplan.pro';
  const protocol = host.includes('localhost') ? 'http' : 'https';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/dashboard/', '/api/', '/_next/'],
    },
    sitemap: `${protocol}://${host}/sitemap.xml`,
  };
}
