import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getTenantHost, normalizeTenantId } from '@/lib/seo-helpers';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const reqHeaders = await headers();
  const rawHost = reqHeaders.get('host') || '';
  const tenantId = normalizeTenantId(reqHeaders.get('x-tenant-id'));
  
  // Для dev-окружения с localhost используем http, в противном случае https + getTenantHost
  const isLocal = rawHost.includes('localhost') || rawHost.includes('127.0.0.1');
  const protocol = isLocal ? 'http' : 'https';
  const host = isLocal ? rawHost : getTenantHost(tenantId);

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/_next/static'],
      disallow: [
        '/admin',
        '/admin/',
        '/dashboard',
        '/dashboard/',
        '/operator',
        '/operator/',
        '/api',
        '/api/',
        '/client-demo',
        '/client-demo/',
        '/ab-lovable',
        '/ab-lovable/',
        '/login',
        '/register',
        '/payment-redirect',
        '/support/payment-error',
        '/dev',
        '/test',
      ],
    },
    sitemap: `${protocol}://${host}/sitemap.xml`,
  };
}
