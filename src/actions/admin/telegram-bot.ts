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

// ─────────────────────────────────────────────────────────────
// ── ENTERPRISE TELEGRAM BOT & FEEDBACK CONFIGURATION & ACTIONS
// ─────────────────────────────────────────────────────────────

export type TelegramMenuButtonAction = 
  | 'CATALOG'       // 🛍 Каталог услуг
  | 'ORDERS'        // 📦 Мои заказы
  | 'REFILL'        // 💰 Пополнить
  | 'PROFILE'       // 👤 Профиль
  | 'SUPPORT'       // 🆘 Поддержка
  | 'REFERRALS'     // 👥 Рефералы
  | 'URL'           // 🌐 Внешняя ссылка
  | 'WEB_APP'       // 📱 Telegram Mini App
  | 'COMMAND'       // ⚡ Команда (/start, /help)
  | 'TEXT_REPLY';   // 💬 Быстрый текст / FAQ ответ

export interface TelegramMenuButton {
  id: string;
  label: string;
  action: TelegramMenuButtonAction;
  row: number;
  col: number;
  value?: string;
  isActive: boolean;
}

export const DEFAULT_TELEGRAM_MENU_BUTTONS: TelegramMenuButton[] = [
  { id: 'btn_1', label: '🛍 Каталог услуг', action: 'CATALOG', row: 0, col: 0, isActive: true },
  { id: 'btn_2', label: '📦 Мои заказы', action: 'ORDERS', row: 0, col: 1, isActive: true },
  { id: 'btn_3', label: '💰 Пополнить', action: 'REFILL', row: 1, col: 0, isActive: true },
  { id: 'btn_4', label: '👤 Профиль', action: 'PROFILE', row: 1, col: 1, isActive: true },
  { id: 'btn_5', label: '🆘 Поддержка', action: 'SUPPORT', row: 2, col: 0, isActive: true },
  { id: 'btn_6', label: '👥 Рефералы', action: 'REFERRALS', row: 2, col: 1, isActive: true },
];

export interface TelegramRatingReasonsConfig {
  negative: string[];
  neutral: string[];
  positive: string[];
}

export const DEFAULT_TELEGRAM_RATING_REASONS: TelegramRatingReasonsConfig = {
  negative: ['Долгий ответ', 'Проблема не решена', 'Грубость оператора', 'Технический сбой'],
  neutral: ['Долго решали', 'Неполный ответ', 'Сложный процесс', 'Мало информации'],
  positive: ['Быстрый ответ', 'Вежливый оператор', 'Проблема решена на 100%', 'Понятная инструкция', 'Отличный сервис']
};

export interface TelegramMessageTemplatesConfig {
  welcome: string;
  ticketClosedRating: string;
  ratingThanks: string;
  delayWarning: string;
  paymentIssue: string;
  serviceRefill: string;
  refundNotice: string;
}

export const DEFAULT_TELEGRAM_MESSAGE_TEMPLATES: TelegramMessageTemplatesConfig = {
  welcome: '👋 <b>Добро пожаловать в {siteName}!</b>\n\nПлатформа автоматического продвижения в социальных сетях.\n\n💰 Ваш баланс: <b>{balance} ₽</b>\n\nВыберите действие в меню ниже:',
  ticketClosedRating: '✅ <b>Ваш вопрос решён и тикет #{ticketId} закрыт.</b>\n\nПожалуйста, оцените качество работы службы поддержки:',
  ratingThanks: '⭐ <b>Спасибо за вашу оценку {stars}!</b>\n\nВаш отзыв помогает нам становиться лучше. Если у вас возникнут новые вопросы, просто напишите в этот чат.',
  delayWarning: '⏳ <b>Внимание: высокая нагрузка</b>\n\nВ связи с пиковой загрузкой время ответа оператора может составлять до 15 минут. Мы уже занимаемся вашим вопросом!',
  paymentIssue: '💳 <b>Вопрос по оплате заказа #{orderId}</b>\n\nМы проверяем статус платежа через банковский шлюз. Средства будут зачислены в течение нескольких минут.',
  serviceRefill: '🔄 <b>Гарантийная докрутка запущена</b>\n\nПо вашему заказу #{orderId} отправлен запрос поставщику на восстановление списанных показателей.',
  refundNotice: '💸 <b>Возврат средств оформлен</b>\n\nПо тикету #{ticketId} выполнен возврат на баланс в размере <b>{amount} ₽</b>.'
};

export interface TelegramEnterpriseConfig {
  menuButtons: TelegramMenuButton[];
  ratingReasons: TelegramRatingReasonsConfig;
  templates: TelegramMessageTemplatesConfig;
}

/**
 * Retrieves the full Enterprise Telegram configuration (menu, reasons, templates)
 */
export async function getTelegramEnterpriseConfigAction(): Promise<{
  success: boolean;
  config?: TelegramEnterpriseConfig;
  error?: string;
}> {
  return requireStaffPermission('settings', 'view', async () => {
    try {
      const settings = await db.systemSettings.findFirst();
      const menuButtons = (settings?.telegramMenuConfig as unknown as TelegramMenuButton[]) || DEFAULT_TELEGRAM_MENU_BUTTONS;
      const ratingReasons = (settings?.telegramRatingReasons as unknown as TelegramRatingReasonsConfig) || DEFAULT_TELEGRAM_RATING_REASONS;
      const templates = (settings?.telegramTemplates as unknown as TelegramMessageTemplatesConfig) || DEFAULT_TELEGRAM_MESSAGE_TEMPLATES;

      return {
        success: true,
        config: {
          menuButtons: Array.isArray(menuButtons) && menuButtons.length > 0 ? menuButtons : DEFAULT_TELEGRAM_MENU_BUTTONS,
          ratingReasons: ratingReasons.negative ? ratingReasons : DEFAULT_TELEGRAM_RATING_REASONS,
          templates: templates.welcome ? templates : DEFAULT_TELEGRAM_MESSAGE_TEMPLATES,
        }
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Ошибка загрузки конфигурации: ${msg}` };
    }
  });
}

const saveMenuConfigSchema = z.array(
  z.object({
    id: z.string(),
    label: z.string().min(1, 'Название кнопки не может быть пустым').max(50),
    action: z.enum(['CATALOG', 'ORDERS', 'REFILL', 'PROFILE', 'SUPPORT', 'REFERRALS', 'URL', 'WEB_APP', 'COMMAND', 'TEXT_REPLY']),
    row: z.number().int().min(0).max(10),
    col: z.number().int().min(0).max(5),
    value: z.string().optional(),
    isActive: z.boolean(),
  })
);

/**
 * Saves custom Telegram Reply Keyboard & Menu Buttons
 */
export async function saveTelegramMenuConfigAction(buttons: TelegramMenuButton[]) {
  return requireStaffPermission('settings', 'edit', async (admin) => {
    const parsed = saveMenuConfigSchema.safeParse(buttons);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Некорректная структура кнопок' };
    }

    try {
      const settings = await db.systemSettings.findFirst();
      if (!settings) {
        return { success: false, error: 'Настройки системы не найдены' };
      }

      await db.systemSettings.update({
        where: { id: settings.id },
        data: { telegramMenuConfig: parsed.data as unknown as object },
      });

      const ipAddress = await getClientIp();
      await auditAdminAwaitable({
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'TELEGRAM_MENU_UPDATE',
        target: 'telegram_menu_config',
        targetType: 'SYSTEM_SETTINGS',
        ipAddress,
        newValue: { buttonCount: parsed.data.length }
      });

      revalidatePath('/admin/settings');
      return { success: true, message: 'Конфигурация кнопок меню успешно сохранена' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Ошибка сохранения кнопок: ${msg}` };
    }
  });
}

/**
 * Saves configurable CSAT Rating Reason tags
 */
export async function saveTelegramRatingReasonsAction(reasons: TelegramRatingReasonsConfig) {
  return requireStaffPermission('settings', 'edit', async (admin) => {
    if (!reasons.negative?.length || !reasons.neutral?.length || !reasons.positive?.length) {
      return { success: false, error: 'Каждая категория должна содержать хотя бы одну причину оценки' };
    }

    try {
      const settings = await db.systemSettings.findFirst();
      if (!settings) {
        return { success: false, error: 'Настройки системы не найдены' };
      }

      await db.systemSettings.update({
        where: { id: settings.id },
        data: { telegramRatingReasons: reasons as unknown as object },
      });

      const ipAddress = await getClientIp();
      await auditAdminAwaitable({
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'TELEGRAM_RATING_REASONS_UPDATE',
        target: 'telegram_rating_reasons',
        targetType: 'SYSTEM_SETTINGS',
        ipAddress
      });

      revalidatePath('/admin/settings');
      return { success: true, message: 'Теги причин оценок успешно сохранены' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Ошибка сохранения причин: ${msg}` };
    }
  });
}

/**
 * Saves configurable message templates
 */
export async function saveTelegramTemplatesAction(templates: TelegramMessageTemplatesConfig) {
  return requireStaffPermission('settings', 'edit', async (admin) => {
    try {
      const settings = await db.systemSettings.findFirst();
      if (!settings) {
        return { success: false, error: 'Настройки системы не найдены' };
      }

      await db.systemSettings.update({
        where: { id: settings.id },
        data: { telegramTemplates: templates as unknown as object },
      });

      const ipAddress = await getClientIp();
      await auditAdminAwaitable({
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'TELEGRAM_TEMPLATES_UPDATE',
        target: 'telegram_templates',
        targetType: 'SYSTEM_SETTINGS',
        ipAddress
      });

      revalidatePath('/admin/settings');
      return { success: true, message: 'Шаблоны сообщений успешно сохранены' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Ошибка сохранения шаблонов: ${msg}` };
    }
  });
}

export interface TicketFeedbackStats {
  totalCount: number;
  avgScore: number;
  scoreBreakdown: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  topReasons: { reason: string; count: number }[];
}

export interface TicketFeedbackItem {
  id: string;
  ticketId: string;
  ticketSubject: string;
  userId: string;
  userEmail: string;
  score: number;
  reasons: string[];
  comment?: string | null;
  source: string;
  createdAt: string;
}

/**
 * Retrieves aggregate CSAT statistics from TicketFeedback
 */
export async function getTicketFeedbackStatsAction(): Promise<{
  success: boolean;
  stats?: TicketFeedbackStats;
  error?: string;
}> {
  return requireStaffPermission('settings', 'view', async () => {
    try {
      const feedbacks = await db.ticketFeedback.findMany({
        select: {
          score: true,
          reasons: true,
        }
      });

      const totalCount = feedbacks.length;
      if (totalCount === 0) {
        return {
          success: true,
          stats: {
            totalCount: 0,
            avgScore: 5.0,
            scoreBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            topReasons: []
          }
        };
      }

      let sumScore = 0;
      const scoreBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const reasonsMap: Record<string, number> = {};

      for (const fb of feedbacks) {
        sumScore += fb.score;
        if (fb.score >= 1 && fb.score <= 5) {
          scoreBreakdown[fb.score as 1 | 2 | 3 | 4 | 5]++;
        }
        if (Array.isArray(fb.reasons)) {
          for (const r of fb.reasons) {
            reasonsMap[r] = (reasonsMap[r] || 0) + 1;
          }
        }
      }

      const avgScore = Number((sumScore / totalCount).toFixed(2));
      const topReasons = Object.entries(reasonsMap)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      return {
        success: true,
        stats: {
          totalCount,
          avgScore,
          scoreBreakdown,
          topReasons
        }
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Ошибка получения статистики: ${msg}` };
    }
  });
}

/**
 * Retrieves paginated feedback list for admin CRM
 */
export async function getTicketFeedbackListAction(params?: {
  page?: number;
  pageSize?: number;
  score?: number;
}): Promise<{
  success: boolean;
  items?: TicketFeedbackItem[];
  total?: number;
  page?: number;
  error?: string;
}> {
  return requireStaffPermission('settings', 'view', async () => {
    try {
      const page = Math.max(1, params?.page || 1);
      const pageSize = Math.min(50, Math.max(5, params?.pageSize || 15));
      const where: Record<string, unknown> = {};

      if (params?.score && params.score >= 1 && params.score <= 5) {
        where.score = params.score;
      }

      const [total, items] = await Promise.all([
        db.ticketFeedback.count({ where }),
        db.ticketFeedback.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            ticket: { select: { subject: true } },
            user: { select: { email: true } }
          }
        })
      ]);

      const formatted: TicketFeedbackItem[] = items.map(item => ({
        id: item.id,
        ticketId: item.ticketId,
        ticketSubject: item.ticket?.subject || 'Без темы',
        userId: item.userId,
        userEmail: item.user?.email || 'Неизвестно',
        score: item.score,
        reasons: item.reasons || [],
        comment: item.comment,
        source: item.source,
        createdAt: item.createdAt.toISOString()
      }));

      return {
        success: true,
        items: formatted,
        total,
        page
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Ошибка загрузки отзывов: ${msg}` };
    }
  });
}

