'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { getClientIp } from '@/utils/ip';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

export interface CompanyRequisitesInput {
  companyName?: string | null;
  inn?: string | null;
  kpp?: string | null;
  legalAddress?: string | null;
}

export interface UpdateCompanyRequisitesResult {
  success: boolean;
  error?: string;
}

/**
 * Updates tax/company B2B requisites (companyName, inn, kpp, legalAddress).
 */
export async function updateTaxRequisitesAction(
  data: CompanyRequisitesInput
): Promise<UpdateCompanyRequisitesResult> {
  const session = await verifySession();
  if (!session?.userId) {
    return { success: false, error: 'Авторизуйтесь для выполнения этого действия' };
  }

  const companyName = data.companyName?.trim() || null;
  const inn = data.inn?.trim() || null;
  const kpp = data.kpp?.trim() || null;
  const legalAddress = data.legalAddress?.trim() || null;

  // Validate ИНН if provided: 10 digits for orgs, 12 digits for IP / sole traders
  if (inn) {
    if (!/^\d{10}$|^\d{12}$/.test(inn)) {
      return {
        success: false,
        error: 'ИНН должен содержать ровно 10 цифр (для организаций) или 12 цифр (для ИП)',
      };
    }
  }

  // Validate КПП if provided: 9 digits (optional)
  if (kpp) {
    if (!/^\d{9}$/.test(kpp)) {
      return {
        success: false,
        error: 'КПП должен содержать ровно 9 цифр',
      };
    }
  }

  if (companyName && companyName.length > 255) {
    return { success: false, error: 'Название компании не должно превышать 255 символов' };
  }

  if (legalAddress && legalAddress.length > 500) {
    return { success: false, error: 'Юридический адрес не должен превышать 500 символов' };
  }

  try {
    await db.user.update({
      where: { id: session.userId },
      data: {
        companyName,
        inn,
        kpp,
        legalAddress,
      },
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('[updateTaxRequisitesAction] Error:', message);
    return { success: false, error: 'Не удалось сохранить реквизиты компании' };
  }
}

// Alias for backwards compatibility
export const updateCompanyRequisitesAction = updateTaxRequisitesAction;

export interface B2bWebhookInput {
  webhookUrl?: string | null;
  isWebhookActive?: boolean;
  regenerateSecret?: boolean;
}

export interface UpdateB2bWebhookResult {
  success: boolean;
  error?: string;
  webhookSecret?: string | null;
  webhookUrl?: string | null;
  isWebhookActive?: boolean;
}

/**
 * Updates B2B Webhook URL, connection status toggle (isWebhookActive), and manages webhookSecret in B2bConfig.
 */
export async function updateB2bWebhookAction(
  data: B2bWebhookInput
): Promise<UpdateB2bWebhookResult> {
  const session = await verifySession();
  if (!session?.userId) {
    return { success: false, error: 'Авторизуйтесь для выполнения этого действия' };
  }

  const rawUrl = data.webhookUrl?.trim() || null;

  if (rawUrl) {
    try {
      const parsedUrl = new URL(rawUrl);
      if (parsedUrl.protocol !== 'https:') {
        return {
          success: false,
          error: 'URL вебхука должен начинаться с https://',
        };
      }
    } catch {
      return {
        success: false,
        error: 'Некорректный формат URL вебхука. URL должен начинаться с https://',
      };
    }
  }

  try {
    const existingConfig = await db.b2bConfig.findUnique({
      where: { userId: session.userId },
    });

    let webhookSecret = existingConfig?.webhookSecret || null;

    if (data.regenerateSecret || !webhookSecret) {
      webhookSecret = crypto.randomBytes(24).toString('hex');
    }

    const isWebhookActive = data.isWebhookActive ?? (existingConfig?.isWebhookActive ?? (!!rawUrl));

    const updatedConfig = await db.b2bConfig.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        isB2b: true,
        prioritySupport: true,
        webhookUrl: rawUrl,
        webhookSecret,
        isWebhookActive,
      },
      update: {
        webhookUrl: rawUrl,
        webhookSecret,
        isWebhookActive,
      },
    });

    return {
      success: true,
      webhookUrl: updatedConfig.webhookUrl,
      webhookSecret: updatedConfig.webhookSecret,
      isWebhookActive: updatedConfig.isWebhookActive,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('[updateB2bWebhookAction] Error:', message);
    return { success: false, error: 'Не удалось сохранить настройки вебхука' };
  }
}

export interface Confirm152FzConsentResult {
  success: boolean;
  error?: string;
  tosAcceptedAt?: Date | string | null;
  tosAcceptedIp?: string | null;
}

/**
 * Records user's consent to 152-FZ Terms of Service & Privacy Policy.
 */
export async function confirm152FzConsentAction(): Promise<Confirm152FzConsentResult> {
  const session = await verifySession();
  if (!session?.userId) {
    return { success: false, error: 'Авторизуйтесь для выполнения этого действия' };
  }

  const clientIp = await getClientIp();
  const now = new Date();

  try {
    const updatedUser = await db.user.update({
      where: { id: session.userId },
      data: {
        tosAcceptedAt: now,
        tosAcceptedIp: clientIp,
      },
      select: {
        tosAcceptedAt: true,
        tosAcceptedIp: true,
      },
    });

    return {
      success: true,
      tosAcceptedAt: updatedUser.tosAcceptedAt,
      tosAcceptedIp: updatedUser.tosAcceptedIp,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('[confirm152FzConsentAction] Error:', message);
    return { success: false, error: 'Не удалось зафиксировать согласие 152-ФЗ' };
  }
}

export interface ApiKeyActionResult {
  success: boolean;
  apiKey?: string;
  error?: string;
}

/**
 * Generates initial B2B API Key, stores SHA-256 hash in User.apiKeyHash, and returns raw key ONLY ONCE.
 */
export async function generateApiKeyAction(): Promise<ApiKeyActionResult> {
  const session = await verifySession();
  if (!session?.userId) {
    return { success: false, error: 'Авторизуйтесь для выполнения этого действия' };
  }

  const rawKey = 'smm_' + crypto.randomBytes(32).toString('hex');
  const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

  try {
    await db.user.update({
      where: { id: session.userId },
      data: { apiKeyHash: hashedKey },
    });

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/settings/api');
    return { success: true, apiKey: rawKey };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('[generateApiKeyAction] Error:', message);
    return { success: false, error: 'Не удалось сгенерировать API-ключ' };
  }
}

/**
 * Resets existing API Key with a newly generated one, updating User.apiKeyHash with SHA-256 hash.
 */
export async function resetApiKeyAction(): Promise<ApiKeyActionResult> {
  return generateApiKeyAction();
}

/**
 * Revokes API Key by clearing User.apiKeyHash.
 */
export async function revokeApiKeyAction(): Promise<{ success: boolean; error?: string }> {
  const session = await verifySession();
  if (!session?.userId) {
    return { success: false, error: 'Авторизуйтесь для выполнения этого действия' };
  }

  try {
    await db.user.update({
      where: { id: session.userId },
      data: { apiKeyHash: null },
    });

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/settings/api');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('[revokeApiKeyAction] Error:', message);
    return { success: false, error: 'Не удалось отозвать API-ключ' };
  }
}
