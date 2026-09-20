'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type {
  ApiWebhookInput,
  UpdateApiWebhookResult,
} from '../settings-extra.types';

const apiWebhookSchema = z.object({
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

export async function updateApiWebhookAction(
  data: ApiWebhookInput
): Promise<UpdateApiWebhookResult> {
  const session = await verifySession();
  if (!session?.userId) {
    return { success: false, error: 'Авторизуйтесь для выполнения этого действия' };
  }

  const parsed = apiWebhookSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || 'Некорректный формат URL вебхука',
    };
  }

  try {
    const existingConfig = await db.apiConfig.findUnique({
      where: { userId: session.userId },
    });

    const rawUrl = parsed.data.webhookUrl !== undefined
      ? (parsed.data.webhookUrl?.trim() || null)
      : (existingConfig?.webhookUrl || null);

    let webhookSecret = existingConfig?.webhookSecret || null;

    if (data.regenerateSecret || !webhookSecret) {
      webhookSecret = crypto.randomBytes(24).toString('hex');
    }

    const isWebhookActive = data.isWebhookActive ?? (existingConfig?.isWebhookActive ?? (!!rawUrl));

    const updatedConfig = await db.apiConfig.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        isApiEnabled: true,
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

    revalidatePath('/dashboard/settings');
    return {
      success: true,
      webhookUrl: updatedConfig.webhookUrl,
      webhookSecret: updatedConfig.webhookSecret,
      isWebhookActive: updatedConfig.isWebhookActive,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('[updateApiWebhookAction] Error:', message);
    return { success: false, error: 'Не удалось сохранить настройки вебхука' };
  }
}
