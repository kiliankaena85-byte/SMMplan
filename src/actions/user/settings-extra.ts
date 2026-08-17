'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { getClientIp } from '@/utils/ip';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type {
  CompanyRequisitesInput,
  UpdateCompanyRequisitesResult,
  B2bWebhookInput,
  UpdateB2bWebhookResult,
  Confirm152FzConsentResult,
  ApiKeyActionResult,
} from './settings-extra.types';

const taxRequisitesSchema = z.object({
  companyName: z.string().max(255, 'Название компании не должно превышать 255 символов').nullable().optional(),
  inn: z.string().refine(val => !val || /^\d{10}$|^\d{12}$/.test(val.trim()), {
    message: 'ИНН должен содержать ровно 10 цифр (для организаций) или 12 цифр (для ИП)'
  }).nullable().optional(),
  kpp: z.string().refine(val => !val || /^\d{9}$/.test(val.trim()), {
    message: 'КПП должен содержать ровно 9 цифр'
  }).nullable().optional(),
  legalAddress: z.string().max(500, 'Юридический адрес не должен превышать 500 символов').nullable().optional(),
});

const b2bWebhookSchema = z.object({
  webhookUrl: z.string().refine(val => {
    if (!val || val.trim() === '') return true;
    try {
      const u = new URL(val.trim());
      return u.protocol === 'https:';
    } catch {
      return false;
    }
  }, { message: 'URL вебхука должен быть валидным и начинаться с https://' }).nullable().optional(),
  isWebhookActive: z.boolean().optional(),
});

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

  const parsed = taxRequisitesSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || 'Некорректные реквизиты',
    };
  }

  const companyName = parsed.data.companyName?.trim() || null;
  const inn = parsed.data.inn?.trim() || null;
  const kpp = parsed.data.kpp?.trim() || null;
  const legalAddress = parsed.data.legalAddress?.trim() || null;

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

/**
 * Alias wrapper for updateCompanyRequisitesAction.
 */
export async function updateCompanyRequisitesAction(
  data: CompanyRequisitesInput
): Promise<UpdateCompanyRequisitesResult> {
  const session = await verifySession();
  if (!session?.userId) {
    return { success: false, error: 'Авторизуйтесь для выполнения этого действия' };
  }
  const parsed = taxRequisitesSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message || 'Некорректные реквизиты' };
  }
  return updateTaxRequisitesAction(parsed.data);
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

  const parsed = b2bWebhookSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || 'Некорректный формат URL вебхука',
    };
  }

  const rawUrl = parsed.data.webhookUrl?.trim() || null;

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
  const session = await verifySession();
  if (!session?.userId) {
    return { success: false, error: 'Авторизуйтесь для выполнения этого действия' };
  }
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
