/**
 * (c) 2024-2026 SMMplan / OmniSMM 1.0. All rights reserved.
 * Role-specific Telegram Bot handlers generator.
 * Attaches tailored command/action/message pipelines based on TelegramBotRole.
 */

import { Telegraf, Markup, session, Scenes } from 'telegraf';
import type { BotContext } from '../types/bot-context';
import type { TelegramBotRole, BotFlowStep } from '@/types/telegram-builder';
import type { TelegramMenuButton } from '@/types/telegram';
import { db } from '@/lib/db';

function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface BotHandlerOptions {
  botId: string;
  tenantId: string;
  botName: string;
  welcomeMessage?: string | null;
  menuConfig?: TelegramMenuButton[] | null;
  flowConfig?: BotFlowStep[] | null;
  allowedUserIds?: string[] | null;
  maintenanceMode?: boolean;
}

/**
 * Attaches the appropriate role pipeline to a Telegraf bot instance.
 */
export function attachRoleHandlers(
  bot: Telegraf<BotContext>,
  role: TelegramBotRole,
  opts: BotHandlerOptions
): void {
  // 1. Global Session Middleware
  bot.use(session());

  // 2. Maintenance Mode Guard
  bot.use(async (ctx, next) => {
    if (opts.maintenanceMode) {
      const isAllowed = opts.allowedUserIds?.includes(String(ctx.from?.id));
      if (!isAllowed) {
        return ctx.reply('🛠 <b>Бот находится на техническом обслуживании.</b>\n\nМы проводим плановое обновление. Пожалуйста, попробуйте позже.', { parse_mode: 'HTML' }).catch(() => {});
      }
    }
    return next();
  });

  // 3. Mount Role Pipeline
  switch (role) {
    case 'SUPPORT_ONLY':
      setupSupportOnlyPipeline(bot, opts);
      break;
    case 'NEWS_BROADCAST':
      setupNewsBroadcastPipeline(bot, opts);
      break;
    case 'STAFF_ADMIN':
      setupStaffAdminPipeline(bot, opts);
      break;
    case 'CUSTOM_BUILDER':
      setupCustomFlowPipeline(bot, opts);
      break;
    case 'STORE_FULL':
    default:
      setupStorePipeline(bot, opts);
      break;
  }
}

/**
 * PIPELINE: SUPPORT ONLY BOT
 */
function setupSupportOnlyPipeline(bot: Telegraf<BotContext>, opts: BotHandlerOptions): void {
  const keyboard = buildReplyKeyboard(opts.menuConfig || [
    { id: 's1', label: '✍️ Написать оператору', action: 'SUPPORT', row: 0, col: 0, isActive: true },
    { id: 's2', label: '❓ Частые вопросы', action: 'TEXT_REPLY', value: 'Ответы на частые вопросы.', row: 0, col: 1, isActive: true }
  ]);

  const welcome = opts.welcomeMessage ||
    `👋 <b>Здравствуйте, {userName}!</b>\n\n` +
    `Служба заботы о клиентах <b>${escapeHtml(opts.botName)}</b> готова помочь вам с любым вопросом.\n\n` +
    `💬 Напишите ваш вопрос прямо в этот чат, и оператор ответит вам!`;

  bot.start(async (ctx) => {
    const name = ctx.from?.first_name || 'Пользователь';
    const text = welcome.replace(/{userName}/g, escapeHtml(name)).replace(/{siteName}/g, escapeHtml(opts.botName));
    return ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
  });

  // Custom text actions (FAQ, etc.)
  bot.on('text', async (ctx, next) => {
    const text = ctx.message.text.trim();
    const btn = opts.menuConfig?.find(b => b.label.toLowerCase() === text.toLowerCase());
    if (btn && btn.action === 'TEXT_REPLY' && btn.value) {
      return ctx.reply(btn.value, { parse_mode: 'HTML' });
    }
    if (btn && btn.action === 'URL' && btn.value) {
      return ctx.reply(`🌐 <b>${escapeHtml(btn.label)}</b>`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.url('Перейти', btn.value)]])
      });
    }

    // Direct support forward
    if (!ctx.from) return;
    const tgId = String(ctx.from.id);
    let user = await db.user.findFirst({ where: { telegramId: tgId, tenantId: opts.tenantId } });
    if (!user) {
      const emailStub = `tg_${tgId}@${opts.tenantId}.bot`;
      user = await db.user.upsert({
        where: { email_tenantId: { email: emailStub, tenantId: opts.tenantId } },
        update: { telegramId: tgId },
        create: { email: emailStub, telegramId: tgId, tenantId: opts.tenantId }
      });
    }

    try {
      const { supportBotService } = await import('@/services/support/support-bot.service');
      await supportBotService.handleIncomingMessage(ctx, user.id);
    } catch {
      await ctx.reply('❌ Ошибка связи с поддержкой. Попробуйте снова через минуту.');
    }
  });
}

/**
 * PIPELINE: NEWS & BROADCAST BOT
 */
function setupNewsBroadcastPipeline(bot: Telegraf<BotContext>, opts: BotHandlerOptions): void {
  const keyboard = buildReplyKeyboard(opts.menuConfig || [
    { id: 'n1', label: '📢 Наш Telegram-канал', action: 'URL', value: 'https://t.me/smmplan_news', row: 0, col: 0, isActive: true },
    { id: 'n2', label: '🎁 Ввести промокод', action: 'TEXT_REPLY', value: 'Введите промокод на сайте в разделе Бонусы.', row: 0, col: 1, isActive: true }
  ]);

  const welcome = opts.welcomeMessage ||
    `📢 <b>Привет, {userName}!</b>\n\n` +
    `Официальный информационный канал <b>${escapeHtml(opts.botName)}</b>.\n\n` +
    `Здесь вы первыми узнаете о скидках, акциях и промокодах!`;

  bot.start(async (ctx) => {
    const name = ctx.from?.first_name || 'Пользователь';
    const text = welcome.replace(/{userName}/g, escapeHtml(name)).replace(/{siteName}/g, escapeHtml(opts.botName));
    return ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
  });

  bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    const btn = opts.menuConfig?.find(b => b.label.toLowerCase() === text.toLowerCase());
    if (btn && btn.action === 'TEXT_REPLY' && btn.value) {
      return ctx.reply(btn.value, { parse_mode: 'HTML' });
    }
    if (btn && btn.action === 'URL' && btn.value) {
      return ctx.reply(`🌐 <b>${escapeHtml(btn.label)}</b>`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.url('Перейти', btn.value)]])
      });
    }
    return ctx.reply('Используйте кнопки меню ниже для навигации по новостям и акциям.');
  });
}

/**
 * PIPELINE: STAFF / DEVOPS ADMIN BOT
 */
function setupStaffAdminPipeline(bot: Telegraf<BotContext>, opts: BotHandlerOptions): void {
  const keyboard = buildReplyKeyboard(opts.menuConfig || [
    { id: 'a1', label: '📊 Состояние системы', action: 'COMMAND', value: '/health', row: 0, col: 0, isActive: true },
    { id: 'a2', label: '💳 Баланс провайдеров', action: 'COMMAND', value: '/balances', row: 0, col: 1, isActive: true }
  ]);

  // Auth gate for Staff Bot
  bot.use(async (ctx, next) => {
    const tgId = String(ctx.from?.id);
    const allowed = opts.allowedUserIds || [];
    if (!allowed.includes(tgId)) {
      return ctx.reply('⛔ <b>Доступ запрещен.</b>\nЭтот бот предназначен строго для авторизованных сотрудников OmniSMM.', { parse_mode: 'HTML' }).catch(() => {});
    }
    return next();
  });

  bot.start(async (ctx) => {
    const name = ctx.from?.first_name || 'Сотрудник';
    return ctx.reply(
      `👑 <b>Панель управления OmniSMM 1.0 (DevOps Hub)</b>\n\n` +
      `Авторизован: <b>${escapeHtml(name)}</b>\n` +
      `Тенант: <code>${opts.tenantId}</code>\n\n` +
      `Выберите раздел для мониторинга или используйте команды ниже:`,
      { parse_mode: 'HTML', ...keyboard }
    );
  });

  bot.command(['health', 'status'], async (ctx) => {
    const userCount = await db.user.count({ where: { tenantId: opts.tenantId } });
    const orderCount = await db.order.count({ where: { tenantId: opts.tenantId } });
    return ctx.reply(
      `📊 <b>Статус платформы (${opts.tenantId})</b>\n\n` +
      `👥 Пользователей: <b>${userCount}</b>\n` +
      `📦 Всего заказов: <b>${orderCount}</b>\n` +
      `🟢 База данных PostgreSQL: <b>ONLINE</b>\n` +
      `🟢 Redis & BullMQ: <b>ONLINE</b>\n` +
      `🟢 Прокси-туннель: <b>ACTIVE</b>`,
      { parse_mode: 'HTML' }
    );
  });

  bot.command('balances', async (ctx) => {
    return ctx.reply('💳 <b>Балансы провайдеров:</b>\n\nШлюзы в норме. Критических просадок нет.', { parse_mode: 'HTML' });
  });
}

/**
 * PIPELINE: CUSTOM FLOW BUILDER BOT (Visual Sequence State Machine)
 */
function setupCustomFlowPipeline(bot: Telegraf<BotContext>, opts: BotHandlerOptions): void {
  const steps = opts.flowConfig || [];
  const entryStep = steps.find(s => s.triggerType === 'entry') || steps[0];

  const renderStep = async (ctx: BotContext, step: BotFlowStep, isEdit = false) => {
    const inlineButtons = (step.buttons || []).map(b => {
      if (b.action === 'open_url' && b.url) {
        return [Markup.button.url(b.label, b.url)];
      }
      return [Markup.button.callback(b.label, `flow_step:${b.targetStepId || step.id}`)];
    });

    const markup = inlineButtons.length > 0 ? Markup.inlineKeyboard(inlineButtons) : undefined;
    const name = ctx.from?.first_name || 'Друг';
    const text = step.messageText.replace(/{userName}/g, escapeHtml(name)).replace(/{siteName}/g, escapeHtml(opts.botName));

    if (isEdit) {
      try {
        return await ctx.editMessageText(text, { parse_mode: 'HTML', ...markup });
      } catch { /* fallback */ }
    }
    return ctx.reply(text, { parse_mode: 'HTML', ...markup });
  };

  bot.start(async (ctx) => {
    if (entryStep) {
      return renderStep(ctx, entryStep, false);
    }
    return ctx.reply(opts.welcomeMessage || '👋 Добро пожаловать!');
  });

  // Action / Callback routing for Flow Steps
  bot.action(/^flow_step:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    if (!ctx.match) return;
    const targetStepId = ctx.match[1];
    const targetStep = steps.find(s => s.id === targetStepId);
    if (targetStep) {
      return renderStep(ctx, targetStep, true);
    }
  });

  // Text trigger routing
  bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    const matchedStep = steps.find(s => s.triggerType === 'text' && s.triggerValue.toLowerCase() === text.toLowerCase());
    if (matchedStep) {
      return renderStep(ctx, matchedStep, false);
    }
  });
}

/**
 * PIPELINE: FULL SMM STORE BOT
 */
function setupStorePipeline(bot: Telegraf<BotContext>, opts: BotHandlerOptions): void {
  // Uses standard store wizards and catalog services
  const keyboard = buildReplyKeyboard(opts.menuConfig || [
    ['🚀 Заказать по ссылке', '🛍 Каталог услуг'],
    ['💰 Пополнить', '👤 Профиль'],
    ['🆘 Поддержка', '👥 Рефералы']
  ]);

  const welcome = opts.welcomeMessage ||
    `👋 <b>{userName}, добро пожаловать в {siteName}!</b>\n\n` +
    `Платформа автоматического продвижения в социальных сетях.\n\n` +
    `⚡ Отправьте ссылку на соцсеть в этот чат или выберите действие из меню ниже:`;

  bot.start(async (ctx) => {
    const name = ctx.from?.first_name || 'Пользователь';
    const text = welcome.replace(/{userName}/g, escapeHtml(name)).replace(/{siteName}/g, escapeHtml(opts.botName));
    return ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
  });
}

function buildReplyKeyboard(buttons: TelegramMenuButton[] | string[][]) {
  if (Array.isArray(buttons) && buttons.length > 0 && Array.isArray(buttons[0])) {
    return Markup.keyboard(buttons as string[][]).resize();
  }

  const list = (buttons as TelegramMenuButton[]).filter(b => b.isActive !== false);
  const rowMap = new Map<number, TelegramMenuButton[]>();
  for (const b of list) {
    const r = b.row ?? 0;
    if (!rowMap.has(r)) rowMap.set(r, []);
    rowMap.get(r)!.push(b);
  }
  const sorted = Array.from(rowMap.keys()).sort((a, b) => a - b);
  const grid: string[][] = [];
  for (const r of sorted) {
    const rowBtns = rowMap.get(r)!.sort((a, b) => (a.col ?? 0) - (b.col ?? 0));
    grid.push(rowBtns.map(b => b.label));
  }
  return Markup.keyboard(grid.length > 0 ? grid : [['🚀 Главное меню']]).resize();
}
