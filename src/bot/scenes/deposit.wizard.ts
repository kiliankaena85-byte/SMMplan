/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 *
 * MIGRATED TO SMMPLAN LITE CORE (April 2026)
 */
import { Scenes, Markup } from 'telegraf';
import { db } from '@/lib/db';
import { UnifiedPaymentService } from '@/services/financial/unified-payment.service';

export const DEPOSIT_WIZARD = 'deposit-wizard';

/**
 * Resolve Lite User from Telegram context.
 */
async function resolveUser(tgId: number) {
  return db.user.findFirst({
    where: { telegramId: String(tgId) }
  });
}

// ──────────────────────────────────────────────────────────────
// WIZARD DEFINITION
// ──────────────────────────────────────────────────────────────
export const depositWizard = new Scenes.WizardScene(
  DEPOSIT_WIZARD,

  // ШАГ 1: Запрос суммы
  async (ctx: any) => {
    ctx.wizard.state.depositData = {};
    await ctx.reply('💰 <b>Пополнение баланса</b>\n\nВведите сумму пополнения в рублях (от 100 до 500 000):', {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена', 'cancel_deposit')]])
    });
    return ctx.wizard.next();
  },

  // ШАГ 2: Обработка суммы и выбор метода
  async (ctx: any) => {
    if (!ctx.message?.text) {
      return ctx.reply('❌ Пожалуйста, введите число.');
    }
    
    const amount = parseInt(ctx.message.text.replace(/\D/g, ''), 10);
    if (isNaN(amount) || amount < 100 || amount > 500000) {
      return ctx.reply('❌ Сумма должна быть от 100 до 500 000 руб. Введите корректную сумму:');
    }

    ctx.wizard.state.depositData.amount = amount;

    await ctx.reply(
      `Вы указали сумму: <b>${amount.toLocaleString('ru-RU')} ₽</b>\n\nВыберите способ оплаты:`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('💳 Банковская карта / СБП', 'pay_yookassa')],
          [Markup.button.callback('🪙 Криптовалюта (USDT, TON...)', 'pay_cryptobot')],
          [Markup.button.callback('❌ Отмена', 'cancel_deposit')]
        ])
      }
    );
    return ctx.wizard.next();
  },

  // ШАГ 3: Заглушка, обрабатываемая через .action()
  async (_ctx: any) => { return; }
);

// ──────────────────────────────────────────────────────────────
// SCENE GUARD & ACTIONS
// ──────────────────────────────────────────────────────────────
depositWizard.use(async (ctx: any, next: any) => {
  if (ctx.callbackQuery) {
    const data = ctx.callbackQuery.data;
    if (['pay_yookassa', 'pay_cryptobot', 'cancel_deposit'].includes(data)) {
      return next();
    }
  }
  if (ctx.message?.text?.startsWith('/') && ctx.message?.text !== '/cancel') {
    await ctx.scene.leave();
    return next();
  }
  return next();
});

depositWizard.action('cancel_deposit', async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('❌ Пополнение отменено.');
  return ctx.scene.leave();
});

depositWizard.action(/pay_(yookassa|cryptobot)/, async (ctx: any) => {
  const gateway = ctx.match[1] as 'yookassa' | 'cryptobot';
  const amount = ctx.wizard.state.depositData?.amount;
  const tgId = ctx.from.id;

  if (!amount) {
    await ctx.reply('❌ Ошибка сессии. Попробуйте снова.');
    return ctx.scene.leave();
  }

  try {
    const user = await resolveUser(tgId);
    if (!user) {
      await ctx.reply('❌ Пользователь не найден. Используйте /start для регистрации.');
      return ctx.scene.leave();
    }

    await ctx.editMessageText('🔄 Создаю платеж, подождите...');

    const res = await UnifiedPaymentService.createPayment(
      undefined,
      user.id,
      amount,
      `Пополнение баланса Smmplan (TG)`,
      { source: 'BOT', type: 'deposit' },
      gateway
    );

    if (res.success && res.confirmationUrl) {
      await ctx.editMessageText(
        `💳 <b>ССЫЛКА ДЛЯ ОПЛАТЫ</b>\n────────────────────\n` +
        `Сумма: <b>${amount.toLocaleString('ru-RU')} ₽</b>\n` +
        `Шлюз: <b>${gateway === 'yookassa' ? 'YooKassa' : 'CryptoBot'}</b>\n\n` +
        `<i>Нажмите кнопку ниже для перехода к оплате. Баланс будет пополнен автоматически.</i>`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.url('↗️ ОПЛАТИТЬ', res.confirmationUrl)],
            [Markup.button.callback('❌ Отмена', 'cancel_deposit')]
          ])
        }
      );
    } else {
      await ctx.editMessageText(`❌ <b>Ошибка при создании платежа.</b>\n${res.error || 'Попробуйте позже.'}`, { parse_mode: 'HTML' });
    }
  } catch (e: any) {
    console.error('[DepositWizard] Error:', e);
    await ctx.reply('❌ Произошла техническая ошибка. Попробуйте позже.');
  }
  return ctx.scene.leave();
});
