'use server';

import { requireStaffPermission } from '@/lib/server/rbac';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auditAdminAwaitable } from '@/lib/admin-audit';
import { getClientIp } from '@/utils/ip';
import { z } from 'zod';

export interface TelegramBotDiagnostics {
  success: boolean;
  pingMs?: number;
  daemonRunning?: boolean;
  heartbeatAgeMs?: number;
  bot?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
    can_join_groups: boolean;
    can_read_all_group_messages: boolean;
    supports_inline_queries: boolean;
  };
  webhook?: {
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    last_error_date?: number;
    last_error_message?: string;
  };
  stats?: {
    linkedUsersCount: number;
    telegramTicketsCount: number;
    totalOrdersCount: number;
  };
  error?: string;
}

/**
 * Retrieves comprehensive Telegram Bot diagnostics and database metrics
 */
export async function getTelegramBotDiagnosticsAction(): Promise<TelegramBotDiagnostics> {
  return requireStaffPermission('settings', 'view', async () => {
    let token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || token === 'dummy_token') {
      try {
        const { VaultService } = await import('@/lib/vault');
        const settings = await db.systemSettings.findFirst();
        if (settings?.telegramBotToken) {
          const decrypted = VaultService.decrypt(settings.telegramBotToken);
          if (decrypted && decrypted.trim().length > 10) {
            token = decrypted.trim();
          }
        }
      } catch (err) {
        console.warn('[TelegramBot] Failed to read token from DB:', err);
      }
    }

    if (!token || token === 'dummy_token') {
      return {
        success: false,
        daemonRunning: false,
        error: 'Токен бота не настроен (ни в .env, ни в базе данных)'
      };
    }

    try {
      const startTime = Date.now();
      
      let daemonRunning = false;
      let heartbeatAgeMs: number | undefined;
      try {
        const { redis } = await import('@/lib/redis');
        const lastHb = await redis.get('bot:heartbeat');
        if (lastHb) {
          const age = Date.now() - parseInt(lastHb, 10);
          if (age < 65_000) {
            daemonRunning = true;
            heartbeatAgeMs = age;
          }
        }
      } catch { /* ignore */ }
      
      const [getMeRes, webhookRes, linkedUsersCount, telegramTicketsCount, totalOrdersCount] = await Promise.all([
        fetch(`https://api.telegram.org/bot${token}/getMe`, { cache: 'no-store' }),
        fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, { cache: 'no-store' }),
        db.user.count({ where: { telegramId: { not: null } } }),
        db.ticket.count({ where: { source: 'TELEGRAM' } }),
        db.order.count(),
      ]);

      const pingMs = Date.now() - startTime;
      const getMeData = await getMeRes.json();
      const webhookData = await webhookRes.json();

      if (!getMeData.ok) {
        return {
          success: false,
          daemonRunning: false,
          error: getMeData.description || 'Не удалось получить статус бота'
        };
      }

      return {
        success: true,
        pingMs,
        daemonRunning,
        heartbeatAgeMs,
        bot: getMeData.result,
        webhook: webhookData.ok ? webhookData.result : undefined,
        stats: {
          linkedUsersCount,
          telegramTicketsCount,
          totalOrdersCount,
        }
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Ошибка связи с Telegram API: ${msg}` };
    }
  });
}

/**
 * Deletes any webhook and clears pending updates
 */
export async function resetTelegramWebhookAction() {
  return requireStaffPermission('settings', 'edit', async (admin) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || token === 'dummy_token') {
      return { success: false, error: 'TELEGRAM_BOT_TOKEN не задан' };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`, {
        method: 'POST',
        cache: 'no-store'
      });
      const data = await res.json();

      if (data.ok) {
        const ipAddress = await getClientIp();
        await auditAdminAwaitable({
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'TELEGRAM_WEBHOOK_RESET',
          target: 'telegram_bot',
          targetType: 'SYSTEM_SETTINGS',
          ipAddress
        });

        revalidatePath('/admin/settings');
        return { success: true, message: 'Вебхук и зависшие апдейты успешно сброшены. Бот переведен в режим Polling.' };
      }
      return { success: false, error: data.description || 'Не удалось сбросить вебхук' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Ошибка: ${msg}` };
    }
  });
}

const sendTestAlertSchema = z.object({
  chatId: z.string().trim().min(1, 'Укажите Chat ID'),
  message: z.string().trim().min(1, 'Введите текст сообщения').max(1000),
});

/**
 * Sends a test alert message to an admin or tester chat
 */
export async function sendTelegramTestAlertAction(formData: FormData) {
  return requireStaffPermission('settings', 'view', async () => {
    const parsed = sendTestAlertSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Некорректные параметры' };
    }

    const { chatId, message } = parsed.data;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || token === 'dummy_token') {
      return { success: false, error: 'TELEGRAM_BOT_TOKEN не задан' };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🔔 <b>Тестовое уведомление из админ-панели SMMplan</b>\n\n${message}\n\n<i>Отправлено: ${new Date().toLocaleString('ru-RU')}</i>`,
          parse_mode: 'HTML'
        }),
        cache: 'no-store'
      });

      const data = await res.json();
      if (data.ok) {
        return { success: true, message: `Сообщение успешно отправлено в чат ${chatId}!` };
      }
      return { success: false, error: data.description || 'Telegram API отклонил отправку' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Ошибка отправки: ${msg}` };
    }
  });
}
