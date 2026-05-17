/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 *
 * MIGRATED TO SMMPLAN LITE CORE (April 2026)
 * Removed: BullMQ queues, @/workers, @/lib/prisma, multi-project bots,
 *          startWebhookServer, SessionService, BotRegistry, CryptoService,
 *          RedisSessionStore, projectMiddleware, moderationMiddleware
 * Uses: db from @/lib/db, single-bot mode via TELEGRAM_BOT_TOKEN
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { Scenes, session, Telegraf, Markup } from 'telegraf';
import { db } from '@/lib/db';

// Scenes — only import wizards that have been migrated to Lite core
import { orderWizard, ORDER_WIZARD } from './scenes/order.wizard';
import { depositWizard, DEPOSIT_WIZARD } from './scenes/deposit.wizard';
import { referralWizard, REFERRAL_WIZARD } from './scenes/referral.wizard';
// import { catalogWizard } from './scenes/catalog.wizard';

// ── BOT INSTANCE ──
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN || TOKEN === 'dummy_token') {
  console.warn('[Bot] TELEGRAM_BOT_TOKEN not set. Telegram bot will NOT start.');
}

export const bot = new Telegraf(TOKEN || 'dummy_token');

// ── STAGE ──
const stage = new Scenes.Stage<Scenes.WizardContext>([
  orderWizard as any,
  depositWizard as any,
  referralWizard as any,
]);

// ── MIDDLEWARE ──
bot.use(session());
bot.use(stage.middleware() as any);

// ── ERROR HANDLER ──
bot.catch(async (err: any, ctx: any) => {
  try {
    const description = err?.response?.description || err?.message || '';
    // Ignore common non-critical Telegram errors
    if (
      description.includes('query is too old') ||
      description.includes('message to edit not found') ||
      description.includes('bot was blocked by the user') ||
      description.includes('user is deactivated') ||
      description.includes('chat not found') ||
      description.includes('message is not modified')
    ) {
      return;
    }

    console.error(`[Bot] ERROR [${ctx?.updateType || 'unknown'}]:`, err);

    if (ctx && typeof ctx.reply === 'function') {
      await ctx.reply('⚠️ Произошла техническая ошибка. Мы уже исправляем её.').catch(() => {});
    }
  } catch (e) {
    console.error('[Bot] Error in catch handler:', e);
  }
});

// ── COMMANDS ──
bot.start(async (ctx: any) => {
  const tgId = String(ctx.from.id);
  const payload = ctx.payload;

  // Level 1: Smart Bind Protocol
  if (payload && payload.startsWith('tg_bind_')) {
    const bindToken = await db.authToken.findUnique({
      where: { token: payload }
    });

    if (bindToken && !bindToken.used && bindToken.expiresAt > new Date()) {
      const webUserId = bindToken.userId;

      try {
        await db.$transaction(async (tx) => {
          await tx.authToken.update({
            where: { id: bindToken.id },
            data: { used: true }
          });

          const tempUser = await tx.user.findFirst({ where: { telegramId: tgId } });
          
          if (tempUser && tempUser.id !== webUserId) {
            // Merge: move tickets to main account
            await tx.ticket.updateMany({
              where: { userId: tempUser.id },
              data: { userId: webUserId }
            });
            
            // Delete temp user if it's a pure bot stub
            if (tempUser.email.startsWith('tg_')) {
              // Delete dependencies first if needed, but tickets are moved, sessions deleted by cascade
              await tx.user.delete({ where: { id: tempUser.id } });
            } else {
              await tx.user.update({ where: { id: tempUser.id }, data: { telegramId: null } });
            }
          }

          // Bind to Web User
          await tx.user.update({
            where: { id: webUserId },
            data: { telegramId: tgId }
          });
        });

        await ctx.reply(
          `✅ <b>Telegram успешно привязан!</b>\n\n` +
          `Оператор службы поддержки теперь видит вашу историю заказов. Чем я могу помочь?`,
          { parse_mode: 'HTML' }
        );
      } catch (err) {
        console.error('[Bot Bind] Merge error:', err);
        await ctx.reply('⚠️ Произошла ошибка при привязке аккаунта. Пожалуйста, обратитесь в поддержку.');
      }
      return;
    } else {
      await ctx.reply('❌ Ссылка для привязки недействительна или устарела. Пожалуйста, авторизуйтесь на сайте и нажмите кнопку поддержки снова.');
      // Continue normal flow just in case
    }
  }

  // Upsert user by telegramId
  let user = await db.user.findFirst({ where: { telegramId: tgId } });
  if (!user) {
    // P1.3 Anti-Fraud: Global rate limit for Telegram Bot Registrations (Max 100 per hour)
    const { RateLimitService } = await import('@/services/core/rate-limit.service');
    const isGlobalAllowed = await RateLimitService.check('auth:register:telegram_global', 100, 3600);
    
    if (!isGlobalAllowed) {
      console.warn(`[Anti-Fraud] Global Telegram registration limit exceeded. Blocked tgId: ${tgId}`);
      return ctx.reply('⚠️ Регистрация временно приостановлена из-за высокой нагрузки. Попробуйте позже.');
    }

    user = await db.user.upsert({
      where: { email: `tg_${tgId}@smmplan.bot` },
      update: { telegramId: tgId },
      create: {
        email: `tg_${tgId}@smmplan.bot`,
        telegramId: tgId,
      }
    });
  }

  if (payload === 'support') {
    await ctx.reply(
      `🎧 <b>Служба поддержки Smmplan</b>\n\n` +
      `Просто напишите ваш вопрос, отправьте фото или голосовое сообщение прямо в этот чат, и оператор ответит вам здесь же.`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [
            [{ text: '🛍 Каталог' }, { text: '📦 Мои заказы' }],
            [{ text: '💰 Пополнить' }, { text: '🆘 Поддержка' }],
            [{ text: '👥 Рефералы' }]
          ],
          resize_keyboard: true,
        }
      }
    );
    return;
  }

  await ctx.reply(
    `👋 <b>Добро пожаловать в Smmplan!</b>\n\n` +
    `💰 Ваш баланс: <b>${(Number(user.balance) / 100).toFixed(2)}₽</b>\n\n` +
    `Используйте меню ниже:`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: [
          [{ text: '🛍 Каталог' }, { text: '📦 Мои заказы' }],
          [{ text: '💰 Пополнить' }, { text: '🆘 Поддержка' }],
          [{ text: '👥 Рефералы' }]
        ],
        resize_keyboard: true,
      }
    }
  );
});

bot.hears('🛍 Каталог', async (ctx: any) => {
  // Show list of active services as simple buttons
  const services = await db.service.findMany({
    where: { isActive: true },
    take: 20,
    orderBy: { numericId: 'asc' },
    select: { id: true, name: true, minQty: true, maxQty: true, isDripFeedEnabled: true }
  });
  if (services.length === 0) return ctx.reply('😔 Каталог пока пуст.');

  const buttons = services.map((s: any) => [Markup.button.callback(s.name, `order_svc_${s.id}`)]);
  await ctx.reply('🛍 <b>Каталог услуг:</b>\nВыберите услугу для заказа:', {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons)
  });
});

// Inline handler: Start order wizard with pre-selected service
bot.action(/^order_svc_(.+)$/, async (ctx: any) => {
  const serviceId = ctx.match[1];
  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service) return ctx.answerCbQuery('Услуга не найдена');
  await ctx.answerCbQuery();
  return ctx.scene.enter(ORDER_WIZARD, { preSelectedService: service });
});

bot.hears('💰 Пополнить', async (ctx: any) => {
  return ctx.scene.enter(DEPOSIT_WIZARD);
});
bot.hears('🆘 Поддержка', async (ctx: any) => {
  await ctx.reply(
    '🎧 <b>Я всегда на связи!</b>\n\n' +
    'Просто напишите ваш вопрос, отправьте фото или голосовое сообщение прямо в этот чат, и оператор ответит вам здесь же.',
    { parse_mode: 'HTML' }
  );
});
bot.hears('👥 Рефералы', async (ctx: any) => {
  return ctx.scene.enter(REFERRAL_WIZARD);
});
bot.hears('📦 Мои заказы', async (ctx: any) => {
  const tgId = String(ctx.from.id);
  const user = await db.user.findFirst({ where: { telegramId: tgId } });
  if (!user) return ctx.reply('Используйте /start для регистрации.');

  const orders = await db.order.findMany({
    where: { userId: user.id },
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { service: { select: { name: true } } }
  });

  if (orders.length === 0) {
    return ctx.reply('📦 У вас пока нет заказов.');
  }

  const statusEmoji: Record<string, string> = {
    'PENDING': '🕐', 'IN_PROGRESS': '🔄', 'COMPLETED': '✅',
    'PARTIAL': '⚠️', 'CANCELED': '❌', 'ERROR': '🔴',
    'AWAITING_PAYMENT': '💳', 'PROVISIONING': '⏳'
  };

  let text = '📦 <b>Ваши последние заказы:</b>\n\n';
  for (const o of orders) {
    const emoji = statusEmoji[o.status] || '❓';
    text += `${emoji} #${o.numericId} — ${o.service?.name || 'Услуга'}\n` +
      `   ${o.quantity} шт. | ${(Number(o.charge) / 100).toFixed(2)}₽ | ${o.status}\n\n`;
  }

  await ctx.reply(text, { parse_mode: 'HTML' });
});

// ── CATCH-ALL (SUPPORT DIRECT CHAT MODE) ──
bot.on(['text', 'photo', 'voice', 'document', 'video', 'sticker', 'video_note', 'location'], async (ctx: any, next: any) => {
  // 1. Check if user sent an unsupported format
  if (ctx.message?.video || ctx.message?.sticker || ctx.message?.video_note || ctx.message?.location) {
    return ctx.reply('⚠️ К сожалению, мы не можем просматривать стикеры, кружочки или геолокации. Пожалуйста, отправьте текст, скриншот (фото) или голосовое сообщение.');
  }

  // 2. Resolve User
  const tgId = String(ctx.from.id);
  const user = await db.user.findFirst({ where: { telegramId: tgId } });
  if (!user) return next();

  try {
    const { supportBotService } = await import('@/services/support/support-bot.service');
    await supportBotService.handleIncomingMessage(ctx, user.id);
  } catch (e: any) {
    console.error('[Bot] Catch-all Support Error:', e);
    await ctx.reply('❌ Ошибка при отправке сообщения в поддержку.').catch(() => {});
  }
});

// ── LAUNCH ──
if (process.env.NODE_ENV !== 'test' && !process.env.NEXT_PHASE && process.env.SKIP_BOT !== 'true') {
  if (TOKEN && TOKEN !== 'dummy_token') {
    bot.launch().then(() => {
      console.info('[Bot] ✅ Telegram bot launched successfully');
    }).catch((e: any) => {
      console.error('[Bot] ❌ Failed to launch:', e.message);
    });
  }
}

/**
 * --- GRACEFUL SHUTDOWN ---
 * Handles SIGTERM/SIGINT signals from Docker/PM2/tini
 */
async function handleShutdown(signal: string) {
  console.info(`[Bot] --- Signal ${signal} received. Graceful shutdown ---`);

  try {
    // 1. Stop the Telegram bot polling
    if (bot) {
      console.info('[Bot] Stopping bot polling...');
      bot.stop(signal);
    }

    // 2. Close database connection pool
    try {
      await db.$disconnect();
      console.info('[Bot] Prisma connection pool closed.');
    } catch (e) {
      console.error('[Bot] Error disconnecting Prisma:', e);
    }

    console.info('[Bot] --- All processes stopped. Exiting. ---');
    process.exit(0);
  } catch (err) {
    console.error('[Bot] Error during graceful shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

