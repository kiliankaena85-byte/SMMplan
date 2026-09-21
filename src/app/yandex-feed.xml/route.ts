/**
 * (c) 2024-2026 SMMplan / OmniSMM. All rights reserved.
 * 
 * Yandex Market Language (YML) Product Feed Endpoint.
 * Powers Yandex Webmaster "Товары и предложения", Search Rich Snippets,
 * Product Carousel, and Yandex Neuro / Alice pricing citation.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getPublicCatalogAction, getServicesByCategoryAction } from '@/actions/order/catalog';
import { normalizeTenantId, getTenantHost, getTenantSiteName } from '@/lib/seo-helpers';

export const dynamic = 'force-dynamic';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanEmoji(text: string): string {
  return text.replace(/[\p{Emoji}\u200d\uFE0F]+/gu, '').replace(/\s+/g, ' ').trim();
}

export async function GET() {
  const reqHeaders = await headers();
  const rawHost = reqHeaders.get('host') || reqHeaders.get('x-forwarded-host') || '';
  const tenantId = normalizeTenantId(reqHeaders.get('x-tenant-id') || (rawHost.includes('flux') ? 'flux' : 'smmplan'));
  const isFlux = tenantId === 'flux';
  const siteName = getTenantSiteName(tenantId);
  const host = getTenantHost(tenantId, rawHost);
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const protocol = isLocal ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  const catalogResult = await getPublicCatalogAction(tenantId);
  const networks = catalogResult.success && catalogResult.data ? catalogResult.data : [];

  // Parallel fetch all category services across all networks to eliminate N+1 latency
  const allCategoryEntries = networks.flatMap((net) =>
    net.categories.map((cat) => ({ net, cat }))
  );

  const categoryServicesResults = await Promise.all(
    allCategoryEntries.map(async ({ net, cat }) => {
      try {
        const services = await getServicesByCategoryAction(cat.id, tenantId);
        const activeServices = services.filter((s) => s.pricePerUnitRub > 0);
        return { net, cat, activeServices };
      } catch {
        return { net, cat, activeServices: [] };
      }
    })
  );

  let categoryIdCounter = 1;
  const categoryXmlList: string[] = [];
  const offerXmlList: string[] = [];
  const networkIdMap = new Map<string, number>();

  // 1. Build parent network categories
  for (const net of networks) {
    const parentCatId = categoryIdCounter++;
    networkIdMap.set(net.slug, parentCatId);
    categoryXmlList.push(`<category id="${parentCatId}">${escapeXml(cleanEmoji(net.name))}</category>`);
  }

  // 2. Build sub-categories and offers filtered by Quality Gate (>= 3 active services)
  for (const entry of categoryServicesResults) {
    if (entry.activeServices.length >= 3) {
      const parentCatId = networkIdMap.get(entry.net.slug);
      const catId = categoryIdCounter++;
      categoryXmlList.push(
        `<category id="${catId}"${parentCatId ? ` parentId="${parentCatId}"` : ''}>${escapeXml(cleanEmoji(entry.cat.name))}</category>`
      );

      for (const s of entry.activeServices) {
        if (!s.slug) continue;
        const offerUrl = `${baseUrl}/services/${entry.net.slug}/${entry.cat.slug}/${s.slug}`;
        const offerPrice = s.pricePerUnitRub.toFixed(4);
        const rawDescription = s.description
          ? `${cleanEmoji(s.description.slice(0, 300))}`
          : `Быстрый и безопасный заказ ${cleanEmoji(s.name)} на платформе ${siteName}. Без паролей, автостарт, гарантия 30 дней.`;

        offerXmlList.push(`
      <offer id="${escapeXml(String(s.numericId || s.id))}" available="true">
        <url>${escapeXml(offerUrl)}</url>
        <price>${offerPrice}</price>
        <currencyId>RUR</currencyId>
        <categoryId>${catId}</categoryId>
        <name>${escapeXml(cleanEmoji(s.name))}</name>
        <description>${escapeXml(rawDescription)}</description>
        <param name="Единица измерения">1 штука</param>
        <param name="Минимальный заказ">${s.minQty}</param>
        <param name="Максимальный заказ">${s.maxQty}</param>
        <param name="Гарантия">30 дней Refill</param>
        <param name="Автозапуск">Да (до 30 сек)</param>
        <param name="Капельная подача">Drip-Feed</param>
        <param name="Фискализация">Чек 54-ФЗ НДС 22%</param>
      </offer>`);
      }
    }
  }

  const dateStr = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${dateStr}">
  <shop>
    <name>${escapeXml(siteName)}</name>
    <company>${escapeXml(siteName)}</company>
    <url>${escapeXml(baseUrl)}</url>
    <currencies>
      <currency id="RUR" rate="1"/>
    </currencies>
    <categories>
      ${categoryXmlList.join('\n      ')}
    </categories>
    <offers>${offerXmlList.join('')}
    </offers>
  </shop>
</yml_catalog>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}
