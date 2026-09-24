'use server';

import { db as prisma } from "@/lib/db";
import { SettingsProvider } from "@/lib/settings";
import { unstable_cache } from "next/cache";
import { normalizeTenantId } from "@/lib/tenant-resolver-edge";
import { sanitizeArticleHtml, escapeHtml } from "@/lib/sanitize";

export interface LegalDocumentResult {
  title: string;
  html: string;
}

/**
 * Cached multi-tenant reader for legal documents.
 * Eliminates database queries and regex parsing on repeated visits.
 */
export async function getCachedLegalDoc(
  slug: string, 
  rawTenantId: string = 'smmplan'
): Promise<LegalDocumentResult | null> {
  const tenantId = normalizeTenantId(rawTenantId);

  return unstable_cache(
    async () => {
      let title: string | null = null;
      let rawHtml: string | null = null;

      try {
        const post = await prisma.contentItem.findUnique({
          where: { slug },
          select: { title: true, contentHtml: true, isPublished: true },
        });
        if (post && post.isPublished && post.contentHtml) {
          title = post.title;
          rawHtml = post.contentHtml;
        }
      } catch {
        // Fallback to static legal files
      }

      if (!rawHtml) {
        const { getLegalFallback } = await import('@/data/legal-fallbacks');
        const fallback = getLegalFallback(slug);
        if (fallback) {
          title = fallback.title;
          rawHtml = fallback.html;
        }
      }

      if (!rawHtml || !title) {
        return null;
      }

      const isFlux = tenantId === 'flux';
      const settings = await SettingsProvider.getContactAndLegalSettings(tenantId);
      const defaultCompanyName = isFlux ? 'SMMflux' : 'SMMplan';
      const companyName = settings.COMPANY_NAME || defaultCompanyName;
      const inn = settings.COMPANY_INN || '';
      const ogrnip = settings.COMPANY_OGRNIP || '';
      const address = settings.COMPANY_ADDRESS || '';
      const email = isFlux ? (settings.SUPPORT_EMAIL || 'support@smmflux.ru') : (settings.SUPPORT_EMAIL || 'support@smmplan.pro');
      const privacyEmail = isFlux ? (settings.PRIVACY_EMAIL || 'privacy@smmflux.ru') : (settings.PRIVACY_EMAIL || 'privacy@smmplan.pro');
      const siteName = isFlux ? 'SMMflux' : (settings.SITE_NAME || 'SMMplan');
      const telegramBot = settings.TELEGRAM_SUPPORT_BOT 
        ? (settings.TELEGRAM_SUPPORT_BOT.startsWith('@') ? settings.TELEGRAM_SUPPORT_BOT : `@${settings.TELEGRAM_SUPPORT_BOT}`) 
        : (isFlux ? '@smmflux_support_bot' : '@smmplan_support_bot');

      let finalHtml = rawHtml;

      // Zero-Home-Address Disclosure Invariant (152-ФЗ / ст. 9 ЗоЗПП):
      if (!address.trim()) {
        finalHtml = finalHtml.replace(/<p><strong>Адрес:<\/strong>\s*\{\{COMPANY_ADDRESS\}\}<\/p>\s*/g, '');
        finalHtml = finalHtml.replace(/<p><strong>Адрес:<\/strong>[\s\S]*?<\/p>/g, '');
      }

      finalHtml = finalHtml
        .replaceAll('{{COMPANY_NAME}}', escapeHtml(companyName))
        .replaceAll('{{COMPANY_INN}}', escapeHtml(inn || '—'))
        .replaceAll('{{COMPANY_OGRNIP}}', escapeHtml(ogrnip || '—'))
        .replaceAll('{{COMPANY_ADDRESS}}', escapeHtml(address))
        .replaceAll('{{SUPPORT_EMAIL}}', escapeHtml(email))
        .replaceAll('{{PRIVACY_EMAIL}}', escapeHtml(privacyEmail))
        .replaceAll('{{SITE_NAME}}', escapeHtml(siteName))
        .replaceAll('{{TELEGRAM_BOT}}', escapeHtml(telegramBot));

      return {
        title,
        html: sanitizeArticleHtml(finalHtml)
      };
    },
    [`cached-legal-doc-v2-${slug}-${tenantId}`],
    { revalidate: 3600, tags: ['legal', `legal-${tenantId}`, `legal-${slug}`] }
  )();
}

/** @public Public legal document reader */
export async function getLegalDocumentAction(slug: string, customTenantId?: string) {
  try {
    let resolvedTenantId = customTenantId;
    if (!resolvedTenantId) {
      const { headers } = await import('next/headers');
      const reqHeaders = await headers().catch(() => null);
      resolvedTenantId = normalizeTenantId(reqHeaders?.get('x-tenant-id')) || 'smmplan';
    }

    const doc = await getCachedLegalDoc(slug, resolvedTenantId);
    if (!doc) {
      return { success: false, error: "Документ не найден" };
    }

    return { success: true, data: doc };
  } catch (e) {
    const err = e as Error;
    return { success: false, error: err.message || "Ошибка загрузки документа" };
  }
}

export const getLegalDocument = getLegalDocumentAction;
