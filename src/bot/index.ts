/**
 * (c) 2024-2026 SMMplan. All rights reserved.
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
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { Scenes, session, Telegraf, Markup } from 'telegraf';
import { db } from '@/lib/db';
import { WalletOps } from '@/services/financial/wallet-ops';
import type { BotContext } from './types/bot-context';

// Scenes — only import wizards that have been migrated to Lite core
import { orderWizard, ORDER_WIZARD } from './scenes/order.wizard';
import { depositWizard, DEPOSIT_WIZARD } from './scenes/deposit.wizard';
import { referralWizard, REFERRAL_WIZARD } from './scenes/referral.wizard';

// ── BOT INSTANCE ──
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN || TOKEN === 'dummy_token') {
  console.warn('[Bot] TELEGRAM_BOT_TOKEN not set. Telegram bot will NOT start.');
}

export const bot = new Telegraf<BotContext>(TOKEN || 'dummy_token');

const botTenantId = process.env.BOT_TENANT_ID || 'smmplan';
const botSiteName = (botTenantId === 'flux' || botTenantId === 'lovable') ? 'SMMflux' : 'SMMplan';

// ── STAGE ──
const stage = new Scenes.Stage<BotContext>([
  orderWizard,
  depositWizard,
  referralWizard,
]);

// ── MIDDLEWARE ──
bot.use(session());
bot.use(stage.middleware());

// ── ERROR HANDLER ──
bot.catch(async (err: unknown, ctx: unknown) => {
  try {
    const errorObj = err as { response?: { description?: string }; message?: string };
    const description = errorObj?.response?.description || errorObj?.message || '';
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

    const contextObj = ctx as { updateType?: string; reply?: (text: string) => Promise<unknown> };
    console.error(`[Bot] ERROR [${contextObj?.updateType || 'unknown'}]:`, err);

    if (contextObj && typeof contextObj.reply === 'function') {
      await contextObj.reply('⚠️ Произошла техническая ошибка. Мы уже исправляем её.').catch(() => {});
    }
  } catch (e) {
    console.error('[Bot] Error in catch handler:', e);
  }
});

// ── KYC & SYBIL PROTECTION ──
bot.command('bind', async (ctx: BotContext) => {
  await ctx.reply(
    `🔗 <b>Привязка аккаунта ${botSiteName}</b>\n\n` +
    'Для безопасной привязки Telegram к вашему аккаунту без передачи телефонных номеров:\n\n' +
    `1. Авторизуйтесь на нашем сайте ${botSiteName}.\n` +
    '2. Перейдите в личный кабинет.\n' +
    '3. Нажмите кнопку <b>«Привязать Telegram»</b> и следуйте инструкции.', 
    { parse_mode: 'HTML' }
  );
});

// ── COMMANDS ──
bot.start(async (ctx: BotContext) => {
  if (!ctx.from) return;
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
          const consumedToken = await tx.authToken.updateMany({
            where: { id: bindToken.id, used: false },
            data: { used: true }
          });
          if (consumedToken.count === 0) {
            throw new Error("Токен привязки уже использован");
          }

          const tempUser = await tx.user.findFirst({ where: { telegramId: tgId, tenantId: botTenantId } });
          
          if (tempUser && tempUser.id !== webUserId) {
            // Merge: move tickets to main account
            await tx.ticket.updateMany({
              where: { userId: tempUser.id },
              data: { userId: webUserId }
            });
            
            // Merge other relational tables (excluding LedgerEntries because of block trigger)
            await tx.order.updateMany({ where: { userId: tempUser.id }, data: { userId: webUserId } });
            await tx.payment.updateMany({ where: { userId: tempUser.id }, data: { userId: webUserId } });
            await tx.invoice.updateMany({ where: { userId: tempUser.id }, data: { userId: webUserId } });
            await tx.auditLog.updateMany({ where: { userId: tempUser.id }, data: { userId: webUserId } });
            
            // 1.5. Balance Transfer to preserve financial integrity and keep ledger immutable
            if (tempUser.balance > BigInt(0)) {
              const amount = Number(tempUser.balance);
              const reasonDebit = `Списание баланса при авто-слиянии Telegram ${tempUser.email} с ${webUserId}`;
              const reasonCredit = `Перенос баланса со старого аккаунта Telegram ${tempUser.email}`;
              
              await WalletOps.charge(tx, tempUser.id, amount, reasonDebit, {
                idempotencyKey: `merge-debit-bot-${tempUser.id}-${webUserId}`
              });

              await WalletOps.credit(tx, webUserId, amount, reasonCredit, {
                idempotencyKey: `merge-credit-bot-${tempUser.id}-${webUserId}`
              });
            }
            
            // Re-assign telegramId and mark tempUser merged
            await tx.user.update({
              where: { id: tempUser.id },
              data: { 
                telegramId: null
              }
            });
          }

          // Link telegramId to web account
          await tx.user.update({
            where: { id: webUserId },
            data: { telegramId: tgId }
          });
        });

        return ctx.reply(
          '🎉 <b>Аккаунт успешно привязан!</b>\n\n' +
          'Теперь вы можете управлять заказами и балансом прямо через Telegram-бота.',
          {
            parse_mode: 'HTML',
            ...Markup.keyboard([
              ['🛍 Каталог услуг', '📦 Мои заказы'],
              ['💰 Пополнить', '👤 Профиль'],
              ['🆘 Поддержка', '👥 Рефералы']
            ]).resize()
          }
        );
      } catch (err: unknown) {
        console.error('[Bot Auth Bind] Transaction failed:', err);
        return ctx.reply(
          '❌ <b>Ошибка привязки</b>\n\n' +
          (err instanceof Error ? err.message : 'Не удалось привязать аккаунт. Попробуйте создать новую ссылку в личном кабинете.'),
          { parse_mode: 'HTML' }
        );
      }
    } else {
      return ctx.reply(
        '⚠️ <b>Ссылка недействительна</b>\n\n' +
        'Срок действия ссылки истек или она уже была использована. Получите новую ссылку на сайте.',
        { parse_mode: 'HTML' }
      );
    }
  }

  // Level 2: Referral start parameter (?start=ref_CODE)
  let referredByUserId: string | undefined;
  if (payload && payload.startsWith('ref_')) {
    const refCode = payload.replace('ref_', '');
    const referrer = await db.user.findFirst({
      where: { referralCode: refCode, tenantId: botTenantId }
    });
    if (referrer) {
      referredByUserId = referrer.id;
    }
  }

  // Auto-register or fetch user
  const emailStub = `tg_${tgId}@${botTenantId}.bot`;
  let user = await db.user.findFirst({ where: { telegramId: tgId, tenantId: botTenantId } });

  if (!user) {
    user = await db.user.upsert({
      where: { email_tenantId: { email: emailStub, tenantId: botTenantId } },
      update: { telegramId: tgId },
      create: {
        email: emailStub,
        telegramId: tgId,
        referredById: referredByUserId,
        tenantId: botTenantId,
      }
    });

    // Notify referrer
    if (referredByUserId) {
      const refUser = await db.user.findUnique({ where: { id: referredByUserId } });
      if (refUser?.telegramId) {
        bot.telegram.sendMessage(
          refUser.telegramId,
          `🎉 <b>Новый реферал!</b>\n\nПо вашей ссылке зарегистрировался новый пользователь.`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
      }
    }
  }

  let welcomeTpl =
    `👋 <b>Добро пожаловать в {siteName}!</b>\n\n` +
    `Платформа автоматического продвижения в социальных сетях.\n\n` +
    `💰 Ваш баланс: <b>{balance} ₽</b>\n\n` +
    `Выберите действие в меню ниже:`;

  try {
    const settings = await db.systemSettings.findFirst({ select: { telegramTemplates: true, welcomeMessage: true } });
    const templates = settings?.telegramTemplates as { welcome?: string } | null;
    if (templates?.welcome) {
      welcomeTpl = templates.welcome;
    } else if (settings?.welcomeMessage) {
      welcomeTpl = settings.welcomeMessage;
    }
  } catch { /* use default */ }

  const formattedWelcome = welcomeTpl
    .replace(/{siteName}/g, botSiteName)
    .replace(/{userName}/g, user.email?.split('@')[0] || 'Пользователь')
    .replace(/{balance}/g, (Number(user.balance) / 100).toFixed(2));

  const keyboard = await getDynamicKeyboard();
  return ctx.reply(formattedWelcome, {
    parse_mode: 'HTML',
    ...keyboard
  });
});

interface DynamicMenuBtn {
  id: string;
  label: string;
  action: string;
  row: number;
  col: number;
  value?: string;
  isActive: boolean;
}

async function getDynamicKeyboard() {
  try {
    const settings = await db.systemSettings.findFirst({ select: { telegramMenuConfig: true } });
    const buttons = settings?.telegramMenuConfig as unknown as DynamicMenuBtn[] | null;
    if (Array.isArray(buttons) && buttons.length > 0) {
      const active = buttons.filter(b => b.isActive !== false);
      if (active.length > 0) {
        const rowMap = new Map<number, DynamicMenuBtn[]>();
        for (const btn of active) {
          const r = btn.row ?? 0;
          if (!rowMap.has(r)) rowMap.set(r, []);
          rowMap.get(r)!.push(btn);
        }
        const sortedRows = Array.from(rowMap.keys()).sort((a, b) => a - b);
        const grid: string[][] = [];
        for (const r of sortedRows) {
          const rowBtns = rowMap.get(r)!.sort((a, b) => (a.col ?? 0) - (b.col ?? 0));
          grid.push(rowBtns.map(b => b.label));
        }
        if (grid.length > 0) {
          return Markup.keyboard(grid).resize();
        }
      }
    }
  } catch { /* use default fallback */ }

  return Markup.keyboard([
    ['🛍 Каталог услуг', '📦 Мои заказы'],
    ['💰 Пополнить', '👤 Профиль'],
    ['🆘 Поддержка', '👥 Рефералы']
  ]).resize();
}

bot.command('shop', async (ctx: BotContext) => {
  try {
    const networks = await db.network.findMany({
      where: { isActive: true },
      orderBy: { sort: 'asc' }
    });

    if (networks.length === 0) {
      return ctx.reply('🛍 Каталог услуг временно недоступен.');
    }

    const buttons = networks.map((n: { id: string; name: string }) => [Markup.button.callback(n.name, `cat_net_${n.id}`)]);

    await ctx.reply('🛍 <b>Каталог услуг</b>\nВыберите социальную сеть:', {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons)
    });
  } catch (err) {
    console.error('[Bot Catalog] Error:', err);
    await ctx.reply('Произошла ошибка при загрузке каталога.');
  }
});

bot.hears('🛍 Каталог услуг', async (ctx: BotContext) => {
  try {
    const networks = await db.network.findMany({
      where: { isActive: true },
      orderBy: { sort: 'asc' }
    });

    if (networks.length === 0) {
      return ctx.reply('🛍 Каталог услуг временно недоступен.');
    }

    const buttons = networks.map((n: { id: string; name: string }) => [Markup.button.callback(n.name, `cat_net_${n.id}`)]);

    await ctx.reply('🛍 <b>Каталог услуг</b>\nВыберите социальную сеть:', {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons)
    });
  } catch (err) {
    console.error('[Bot Catalog] Error:', err);
    await ctx.reply('Произошла ошибка при загрузке каталога.');
  }
});

bot.hears('👤 Профиль', async (ctx: BotContext) => {
  if (!ctx.from) return;
  const tgId = String(ctx.from.id);
  const user = await db.user.findFirst({ where: { telegramId: tgId, tenantId: botTenantId } });
  if (!user) return ctx.reply('Используйте /start для регистрации.');

  const orderCount = await db.order.count({ where: { userId: user.id } });

  const text =
    `👤 <b>Ваш профиль</b>\n\n` +
    `🆔 ID: <code>${user.id.slice(0, 8)}</code>\n` +
    `💰 Баланс: <b>${(Number(user.balance) / 100).toFixed(2)} ₽</b>\n` +
    `📦 Всего заказов: <b>${orderCount}</b>\n` +
    `👥 Реферальный код: <code>${user.referralCode || '—'}</code>`;

  await ctx.reply(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('💰 Пополнить баланс', 'deposit')],
      [Markup.button.callback('👥 Реферальная программа', 'referral')]
    ])
  });
});

// Inline buttons from profile
bot.action('deposit', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  return ctx.scene.enter(DEPOSIT_WIZARD);
});
bot.action('referral', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  return ctx.scene.enter(REFERRAL_WIZARD);
});
bot.action('shop', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  try {
    const networks = await db.network.findMany({
      where: { isActive: true },
      orderBy: { sort: 'asc' }
    });
    const buttons = networks.map((n: { id: string; name: string }) => [Markup.button.callback(n.name, `cat_net_${n.id}`)]);
    await ctx.reply('🛍 <b>Каталог услуг</b>\nВыберите социальную сеть:', {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons)
    });
  } catch (err) {
    console.error('[Bot Shop Action] Error:', err);
  }
});
bot.action('my_orders', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  if (!ctx.from) return;
  const tgId = String(ctx.from.id);
  const user = await db.user.findFirst({ where: { telegramId: tgId, tenantId: botTenantId } });
  if (!user) return;
  const orders = await db.order.findMany({
    where: { userId: user.id },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { service: { select: { name: true } } }
  });
  if (orders.length === 0) {
    return ctx.reply('📦 У вас пока нет заказов.');
  }
  let text = '📦 <b>Последние заказы:</b>\n\n';
  for (const o of orders) {
    text += `#${o.numericId} — ${o.service?.name || 'Услуга'}\n` +
      `   ${o.quantity} шт. | ${(Number(o.charge) / 100).toFixed(2)}₽ | ${o.status}\n\n`;
  }
  await ctx.reply(text, { parse_mode: 'HTML' });
});

// ── CATALOG NAVIGATION ──
bot.action('cat_back_networks', async (ctx: BotContext) => {
  try {
    const networks = await db.network.findMany({
      where: { isActive: true },
      orderBy: { sort: 'asc' }
    });
    const buttons = networks.map((n: { id: string; name: string }) => [Markup.button.callback(n.name, `cat_net_${n.id}`)]);
    await ctx.answerCbQuery();
    await ctx.editMessageText('🛍 <b>Каталог услуг</b>\nВыберите социальную сеть:', {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons)
    }).catch(() => {});
  } catch (err) {
    console.error('[Bot Catalog Back Networks] Error:', err);
    await ctx.answerCbQuery('Произошла ошибка');
  }
});

// Callback handler: Select Network -> Show Categories
bot.action(/^cat_net_(.+)$/, async (ctx: BotContext) => {
  if (!ctx.match) return;
  const netId = ctx.match[1];
  try {
    const network = await db.network.findUnique({ where: { id: netId } });
    if (!network) return ctx.answerCbQuery('Социальная сеть не найдена');

    const categories = await db.category.findMany({
      where: {
        networkId: netId,
        services: { some: { isActive: true } }
      },
      orderBy: { sort: 'asc' }
    });

    if (categories.length === 0) {
      return ctx.answerCbQuery('В этой соцсети пока нет доступных категорий');
    }

    const buttons = categories.map((c: { id: string; name: string }) => [Markup.button.callback(c.name, `cat_ctg_${c.id}`)]);
    buttons.push([Markup.button.callback('⬅️ Назад к списку сетей', 'cat_back_networks')]);

    await ctx.answerCbQuery();
    await ctx.editMessageText(`🛍 <b>Каталог: ${network.name}</b>\nВыберите категорию услуг:`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons)
    }).catch(() => {});
  } catch (err) {
    console.error('[Bot Catalog Network Select] Error:', err);
    await ctx.answerCbQuery('Произошла ошибка');
  }
});

// Callback handler: Select Category -> Show Services
bot.action(/^cat_ctg_(.+)$/, async (ctx: BotContext) => {
  if (!ctx.match) return;
  const catId = ctx.match[1];
  try {
    const category = await db.category.findUnique({
      where: { id: catId },
      include: { network: true }
    });
    if (!category) return ctx.answerCbQuery('Категория не найдена');

    const { SettingsProvider } = await import('@/lib/settings');
    const { calculatePricePerUnit, formatPricePerUnit } = await import('./utils/formatter');
    const usdToRub = await SettingsProvider.getExchangeRateUSD();

    const services = await db.service.findMany({
      where: { categoryId: catId, isActive: true },
      orderBy: { rate: 'asc' },
      select: { id: true, name: true, rate: true, markup: true, providerCurrency: true }
    });

    if (services.length === 0) {
      return ctx.answerCbQuery('В этой категории пока нет доступных тарифов');
    }

    const buttons = services.map((s: { id: string; name: string; rate: number; markup: number; providerCurrency: string }) => {
      const pricePerUnit = calculatePricePerUnit(s, usdToRub);
      const label = `${s.name} — ${formatPricePerUnit(pricePerUnit)} ₽ / шт`;
      return [Markup.button.callback(label, `order_svc_${s.id}`)];
    });
    buttons.push([Markup.button.callback('⬅️ Назад к категориям', `cat_back_net_${category.networkId}`)]);

    await ctx.answerCbQuery();
    await ctx.editMessageText(`🛍 <b>Каталог: ${category.network?.name} / ${category.name}</b>\nВыберите услугу для оформления заказа:`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons)
    }).catch(() => {});
  } catch (err) {
    console.error('[Bot Catalog Category Select] Error:', err);
    await ctx.answerCbQuery('Произошла ошибка');
  }
});

// Callback handler: Back to categories from service confirmation
bot.action(/^cat_back_net_(.+)$/, async (ctx: BotContext) => {
  if (!ctx.match) return;
  const netId = ctx.match[1];
  try {
    const network = await db.network.findUnique({ where: { id: netId } });
    if (!network) return ctx.answerCbQuery('Социальная сеть не найдена');

    const categories = await db.category.findMany({
      where: {
        networkId: netId,
        services: { some: { isActive: true } }
      },
      orderBy: { sort: 'asc' }
    });

    const buttons = categories.map((c: { id: string; name: string }) => [Markup.button.callback(c.name, `cat_ctg_${c.id}`)]);
    buttons.push([Markup.button.callback('⬅️ Назад к списку сетей', 'cat_back_networks')]);

    await ctx.answerCbQuery();
    await ctx.editMessageText(`🛍 <b>Каталог: ${network.name}</b>\nВыберите категорию услуг:`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons)
    }).catch(() => {});
  } catch (err) {
    console.error('[Bot Catalog Back Net] Error:', err);
    await ctx.answerCbQuery('Произошла ошибка');
  }
});

// Inline handler: Start order wizard with pre-selected service
bot.action(/^order_svc_(.+)$/, async (ctx: BotContext) => {
  if (!ctx.match) return;
  const serviceId = ctx.match[1];
  const service = await db.service.findUnique({
    where: { id: serviceId },
    include: {
      category: {
        include: {
          network: true
        }
      }
    }
  });
  if (!service) return ctx.answerCbQuery('Услуга не найдена');
  await ctx.answerCbQuery();
  return ctx.scene.enter(ORDER_WIZARD, { preSelectedService: service });
});

bot.hears('💰 Пополнить', async (ctx: BotContext) => {
  return ctx.scene.enter(DEPOSIT_WIZARD);
});
bot.hears('🆘 Поддержка', async (ctx: BotContext) => {
  await ctx.reply(
    '🎧 <b>Я всегда на связи!</b>\n\n' +
    'Просто напишите ваш вопрос, отправьте фото или голосовое сообщение прямо в этот чат, и оператор ответит вам здесь же.',
    { parse_mode: 'HTML' }
  );
});
bot.hears('👥 Рефералы', async (ctx: BotContext) => {
  return ctx.scene.enter(REFERRAL_WIZARD);
});
bot.hears('📦 Мои заказы', async (ctx: BotContext) => {
  if (!ctx.from) return;
  const tgId = String(ctx.from.id);
  const user = await db.user.findFirst({ where: { telegramId: tgId, tenantId: botTenantId } });
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

// ── CSAT RATING CALLBACK ──
bot.action(/^rate:([^:]+):(\d+)$/, async (ctx: BotContext) => {
  if (!ctx.match) return;
  try {
    await ctx.answerCbQuery('Оценка принята!').catch(() => {});
    const ticketId = ctx.match[1];
    const score = Math.max(1, Math.min(5, Number(ctx.match[2])));

    try {
      const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
      if (ticket) {
        const newTags = Array.from(new Set([...(ticket.tags || []), `CSAT_${score}_STAR`]));
        await db.ticket.update({
          where: { id: ticketId },
          data: { tags: newTags }
        });

        await db.ticketFeedback.upsert({
          where: { ticketId },
          create: {
            ticketId,
            userId: ticket.userId,
            score,
            source: 'TELEGRAM',
            tenantId: ticket.tenantId || botTenantId,
            reasons: []
          },
          update: {
            score
          }
        });
      }
    } catch (dbErr) {
      console.error('[Bot] Error saving CSAT feedback to DB:', dbErr);
    }

    // Determine reason options
    let reasonList: string[] = [];
    try {
      const settings = await db.systemSettings.findFirst({ select: { telegramRatingReasons: true } });
      const cfg = settings?.telegramRatingReasons as { negative?: string[]; neutral?: string[]; positive?: string[] } | null;
      if (score <= 2) reasonList = cfg?.negative || ['Долгий ответ', 'Проблема не решена', 'Грубость оператора', 'Технический сбой'];
      else if (score === 3) reasonList = cfg?.neutral || ['Долго решали', 'Неполный ответ', 'Сложный процесс', 'Мало информации'];
      else reasonList = cfg?.positive || ['Быстрый ответ', 'Вежливый оператор', 'Проблема решена на 100%', 'Понятная инструкция', 'Отличный сервис'];
    } catch {
      reasonList = score <= 2 ? ['Долгий ответ', 'Проблема не решена'] : ['Быстро и вежливо', 'Вопрос решен'];
    }

    const stars = '⭐'.repeat(score);
    const reasonButtons = reasonList.slice(0, 4).map((r, idx) => [
      Markup.button.callback(r, `fb_rsn:${ticketId}:${idx}`)
    ]);
    reasonButtons.push([Markup.button.callback('✨ Пропустить', `fb_done:${ticketId}`)]);

    await ctx.editMessageText(
      `⭐ <b>Спасибо за оценку ${stars} (${score}/5)!</b>\n\nУточните, пожалуйста, что именно повлияло на вашу оценку:`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(reasonButtons)
      }
    ).catch(() => {});
  } catch (e) {
    console.error('[Bot] Rating action error:', e);
  }
});

// ── CSAT REASON CALLBACK ──
bot.action(/^fb_rsn:([^:]+):(\d+)$/, async (ctx: BotContext) => {
  if (!ctx.match) return;
  try {
    await ctx.answerCbQuery('Принято!').catch(() => {});
    const ticketId = ctx.match[1];
    const reasonIdx = Number(ctx.match[2]);

    let selectedReason = 'Качественный сервис';
    let thanksText = '⭐ <b>Спасибо за ваш отзыв!</b>\n\nВаш отзыв помогает нам становиться лучше. Если у вас возникнут новые вопросы, просто напишите в этот чат.';

    try {
      const settings = await db.systemSettings.findFirst({ select: { telegramRatingReasons: true, telegramTemplates: true } });
      const fb = await db.ticketFeedback.findUnique({ where: { ticketId } });
      const cfg = settings?.telegramRatingReasons as { negative?: string[]; neutral?: string[]; positive?: string[] } | null;
      const tpl = settings?.telegramTemplates as { ratingThanks?: string } | null;
      if (tpl?.ratingThanks) thanksText = tpl.ratingThanks;

      const score = fb?.score || 5;
      let reasonList: string[] = [];
      if (score <= 2) reasonList = cfg?.negative || [];
      else if (score === 3) reasonList = cfg?.neutral || [];
      else reasonList = cfg?.positive || [];

      if (reasonList[reasonIdx]) {
        selectedReason = reasonList[reasonIdx];
      }

      if (fb) {
        const updatedReasons = Array.from(new Set([...(fb.reasons || []), selectedReason]));
        await db.ticketFeedback.update({
          where: { ticketId },
          data: { reasons: updatedReasons }
        });
      }
    } catch (err) {
      console.error('[Bot] Error saving feedback reason:', err);
    }

    thanksText = thanksText
      .replace(/{stars}/g, '⭐'.repeat(5))
      .replace(/{reasons}/g, selectedReason);

    await ctx.editMessageText(
      `✅ <b>Отзыв принят: «${selectedReason}»</b>\n\n${thanksText}`,
      { parse_mode: 'HTML' }
    ).catch(() => {});
  } catch (e) {
    console.error('[Bot] Reason action error:', e);
  }
});

// ── CSAT SKIP REASON CALLBACK ──
bot.action(/^fb_done:([^:]+)$/, async (ctx: BotContext) => {
  if (!ctx.match) return;
  try {
    await ctx.answerCbQuery().catch(() => {});
    let thanksText = '⭐ <b>Спасибо за вашу оценку!</b>\n\nЕсли у вас возникнут новые вопросы, просто напишите в этот чат.';
    try {
      const settings = await db.systemSettings.findFirst({ select: { telegramTemplates: true } });
      const tpl = settings?.telegramTemplates as { ratingThanks?: string } | null;
      if (tpl?.ratingThanks) thanksText = tpl.ratingThanks.replace(/{stars}/g, '⭐⭐⭐⭐⭐');
    } catch { /* use default */ }

    await ctx.editMessageText(thanksText, { parse_mode: 'HTML' }).catch(() => {});
  } catch (e) {
    console.error('[Bot] Done action error:', e);
  }
});

// ── CATCH-ALL (SUPPORT DIRECT CHAT MODE) ──
bot.on(['text', 'photo', 'voice', 'document', 'video', 'sticker', 'video_note', 'location'], async (ctx: BotContext) => {
  // 1. Check if user sent an unsupported format
  const msg = ctx.message as Record<string, unknown> | undefined;
  if (msg && (msg.video || msg.sticker || msg.video_note || msg.location)) {
    return ctx.reply('⚠️ К сожалению, мы не можем просматривать стикеры, кружочки или геолокации. Пожалуйста, отправьте текст, скриншот (фото) или голосовое сообщение.');
  }

  // 2. Resolve or Auto-Create User for Telegram Support
  if (!ctx.from) return;
  const tgId = String(ctx.from.id);
  let user = await db.user.findFirst({ where: { telegramId: tgId, tenantId: botTenantId } });
  if (!user) {
    const emailStub = `tg_${tgId}@${botTenantId}.bot`;
    user = await db.user.upsert({
      where: { email_tenantId: { email: emailStub, tenantId: botTenantId } },
      update: { telegramId: tgId },
      create: {
        email: emailStub,
        telegramId: tgId,
        tenantId: botTenantId,
      }
    });
  }

  try {
    const { supportBotService } = await import('@/services/support/support-bot.service');
    await supportBotService.handleIncomingMessage(ctx, user.id);
  } catch (e: unknown) {
    console.error('[Bot] Catch-all Support Error:', e);
    await ctx.reply('❌ Ошибка при отправке сообщения в поддержку.').catch(() => {});
  }
});

// ── LAUNCH ──
let isBotLaunched = false;

export async function launchBot() {
  if (isBotLaunched) {
    console.info('[Bot] Bot instance is already running.');
    return;
  }

  let activeToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!activeToken || activeToken === 'dummy_token') {
    try {
      const { VaultService } = await import('@/lib/vault');
      const settings = await db.systemSettings.findFirst();
      if (settings?.telegramBotToken) {
        const decrypted = VaultService.decrypt(settings.telegramBotToken);
        if (decrypted && decrypted.trim().length > 10) {
          activeToken = decrypted.trim();
          process.env.TELEGRAM_BOT_TOKEN = activeToken;
          (bot as unknown as { token: string }).token = activeToken;
          (bot.telegram as unknown as { token: string }).token = activeToken;
        }
      }
    } catch (dbErr) {
      console.warn('[Bot] Failed to read token from DB:', dbErr);
    }
  }

  if (!activeToken || activeToken === 'dummy_token') {
    console.warn('[Bot] TELEGRAM_BOT_TOKEN not set in .env or DB. Telegram bot will NOT start.');
    return;
  }

  isBotLaunched = true;

  try {
    console.info('[Bot] Deleting any lingering webhook...');
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    
    const me = await bot.telegram.getMe();
    console.info(`[Bot] ✅ Telegram bot @${me.username} (ID: ${me.id}) initialized.`);

    // Heartbeat for Docker healthcheck and Admin UI status monitor
    try {
      const { redis } = await import('@/lib/redis');
      await redis.set('bot:heartbeat', Date.now(), 'EX', 60).catch(() => {});
      setInterval(() => {
        redis.set('bot:heartbeat', Date.now(), 'EX', 60).catch(() => {});
      }, 30_000);
    } catch (redisErr) {
      console.warn('[Bot] Redis heartbeat setup skipped:', redisErr);
    }

    bot.launch({ dropPendingUpdates: true }).then(() => {
      console.info('[Bot] Polling terminated.');
    }).catch((e: unknown) => {
      console.error('[Bot] ❌ Polling loop error:', e instanceof Error ? e.message : String(e));
    });

    console.info(`[Bot] 🚀 Telegram bot @${me.username} is now actively polling for updates!`);
  } catch (e: unknown) {
    console.error('[Bot] ❌ Failed to launch:', e instanceof Error ? e.message : String(e));
  }
}

if (process.env.NODE_ENV !== 'test' && !process.env.NEXT_PHASE && process.env.SKIP_BOT !== 'true') {
  launchBot();
}

/**
 * --- GRACEFUL SHUTDOWN ---
 * Handles SIGTERM/SIGINT signals from Docker/PM2/tini
 */
async function handleShutdown(signal: string) {
  console.info(`[Bot] --- Signal ${signal} received. Graceful shutdown ---`);
  try {
    bot.stop(signal);
  } catch (err: unknown) {
    console.error('[Bot] Error stopping bot:', err);
  }
  process.exit(0);
}

process.once('SIGINT', () => handleShutdown('SIGINT'));
process.once('SIGTERM', () => handleShutdown('SIGTERM'));
