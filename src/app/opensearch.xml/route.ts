/**
 * (c) 2024-2026 SMMplan / OmniSMM. All rights reserved.
 * 
 * OpenSearch 1.1 Description Endpoint.
 * Integrates search engine / browser address bar queries directly into catalog search.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getTenantHost, getTenantSiteName, normalizeTenantId } from '@/lib/seo-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const reqHeaders = await headers();
  const rawHost = reqHeaders.get('host') || reqHeaders.get('x-forwarded-host') || '';
  const tenantId = normalizeTenantId(reqHeaders.get('x-tenant-id') || (rawHost.includes('flux') ? 'flux' : 'smmplan'));
  const siteName = getTenantSiteName(tenantId);
  const host = getTenantHost(tenantId, rawHost);
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>${siteName}</ShortName>
  <Description>Поиск услуг продвижения в социальных сетях на платформе ${siteName}</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image width="16" height="16" type="image/x-icon">${baseUrl}/favicon.ico</Image>
  <Url type="text/html" method="get" template="${baseUrl}/services?q={searchTerms}"/>
</OpenSearchDescription>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/opensearchdescription+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
    },
  });
}
