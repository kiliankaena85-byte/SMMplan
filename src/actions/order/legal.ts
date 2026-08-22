'use server';

import { db as prisma } from "@/lib/db";
import { SettingsProvider } from "@/lib/settings";

/** @public Public legal document reader */
export async function getLegalDocumentAction(slug: string) {
  try {
    const post = await prisma.contentItem.findUnique({
      where: { slug },
      select: { title: true, contentHtml: true, isPublished: true },
    });

    if (!post) {
      return { success: false, error: "Документ не найден" };
    }

    if (!post.isPublished) {
      return { success: false, error: "Документ не опубликован" };
    }

    const settings = await SettingsProvider.getContactAndLegalSettings();
    const companyName = settings.COMPANY_NAME || 'ИП / ООО';
    const inn = settings.COMPANY_INN || 'Укажите ИНН';
    const ogrnip = settings.COMPANY_OGRNIP || 'Укажите ОГРНИП';
    const address = settings.COMPANY_ADDRESS || 'г. Москва';
    const email = settings.SUPPORT_EMAIL || 'support@smmplan.pro';
    const privacyEmail = settings.PRIVACY_EMAIL || 'privacy@smmplan.pro';
    const siteName = settings.SITE_NAME || 'SMMplan';

    let finalHtml = post.contentHtml || "";
    finalHtml = finalHtml
      .replace(/{{COMPANY_NAME}}/g, companyName)
      .replace(/{{COMPANY_INN}}/g, inn)
      .replace(/{{COMPANY_OGRNIP}}/g, ogrnip)
      .replace(/{{COMPANY_ADDRESS}}/g, address)
      .replace(/{{SUPPORT_EMAIL}}/g, email)
      .replace(/{{PRIVACY_EMAIL}}/g, privacyEmail)
      .replace(/{{SITE_NAME}}/g, siteName);

    return { success: true, data: { title: post.title, html: finalHtml } };
  } catch (e) {
    const err = e as Error;
    return { success: false, error: err.message || "Ошибка загрузки документа" };
  }
}
