'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { getClientIp } from '@/utils/ip';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { SettingsProvider } from '@/lib/settings';
import type {
  TelegramBindDetailsResult,
  TelegramNotificationSettingsInput,
  TelegramNotificationSettingsResult,
  UnbindTelegramResult,
} from '../settings-extra.types';

const telegramNotificationsSchema = z.object({
  notifyOrders: z.boolean().optional(),
  notifyBalance: z.boolean().optional(),
  notifyTickets: z.boolean().optional(),
});

export async function getTelegramBindDetailsAction(): Promise<TelegramBindDetailsResult> {
  const session = await verifySession();
  if (!session?.userId) {
    return { success: false, error: 'Авторизуйтесь для выполнения этого действия' };
  }

  try {
    const tenantId = await SettingsProvider.getTenantId();
    const contactSettings = await SettingsProvider.getContactAndLegalSettings();
    let botUsername = contactSettings.TELEGRAM_SUPPORT_BOT;
    if (tenantId === 'flux') {
      botUsername = process.env.FLUX_TELEGRAM_BOT || 'smmflux_support_bot';
    }
    if (!botUsername) {
      botUsername = process.env.TELEGRAM_BOT_USERNAME || 'smmplan_support_bot';
    }
    botUsername = botUsername.replace(/^@/, '');

    const tokenStr = `tg_bind_${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.authToken.create({
      data: {
        token: tokenStr,
        userId: session.userId,
        expiresAt,
      },
    });

    const deepLink = `https://t.me/${botUsername}?start=${tokenStr}`;

    return {
      success: true,
      botUsername,
      bindToken: tokenStr,
      deepLink,
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('[getTelegramBindDetailsAction] Error:', message);
    return { success: false, error: 'Не удалось сгенерировать ссылку для привязки Telegram' };
  }
}

export async function updateTelegramNotificationSettingsAction(
  data: TelegramNotificationSettingsInput
): Promise<TelegramNotificationSettingsResult> {
  const session = await verifySession();
  if (!session?.userId) {
    return { success: false, error: 'Авторизуйтесь для выполнения этого действия' };
  }

  const parsed = telegramNotificationsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: 'Некорректные параметры уведомлений' };
  }

  try {
    const updatedUser = await db.user.update({
      where: { id: session.userId },
      data: {
        ...(typeof parsed.data.notifyOrders === 'boolean' && { telegramNotifyOrders: parsed.data.notifyOrders }),
        ...(typeof parsed.data.notifyBalance === 'boolean' && { telegramNotifyBalance: parsed.data.notifyBalance }),
        ...(typeof parsed.data.notifyTickets === 'boolean' && { telegramNotifyTickets: parsed.data.notifyTickets }),
      },
      select: {
        telegramNotifyOrders: true,
        telegramNotifyBalance: true,
        telegramNotifyTickets: true,
      },
    });

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/settings/notifications');
    return {
      success: true,
      telegramNotifyOrders: updatedUser.telegramNotifyOrders,
      telegramNotifyBalance: updatedUser.telegramNotifyBalance,
      telegramNotifyTickets: updatedUser.telegramNotifyTickets,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('[updateTelegramNotificationSettingsAction] Error:', message);
    return { success: false, error: 'Не удалось обновить настройки уведомлений' };
  }
}

export async function unbindTelegramAction(): Promise<UnbindTelegramResult> {
  const session = await verifySession();
  if (!session?.userId) {
    return { success: false, error: 'Авторизуйтесь для выполнения этого действия' };
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { telegramId: true, email: true },
    });

    if (!user?.telegramId) {
      return { success: true };
    }

    const previousTgId = user.telegramId;

    await db.user.update({
      where: { id: session.userId },
      data: { telegramId: null },
    });

    await db.adminAuditLog.create({
      data: {
        adminId: session.userId,
        adminEmail: user.email,
        action: 'USER_UNBIND_TELEGRAM',
        target: session.userId,
        targetType: 'USER',
        oldValue: JSON.stringify({ telegramId: previousTgId }),
        newValue: JSON.stringify({ telegramId: null }),
        ipAddress: await getClientIp(),
      },
    });

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/settings/notifications');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('[unbindTelegramAction] Error:', message);
    return { success: false, error: 'Не удалось отвязать Telegram аккаунт' };
  }
}
