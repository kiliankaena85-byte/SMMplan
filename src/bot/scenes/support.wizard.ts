/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 *
 * MIGRATED TO SMMPLAN LITE CORE (April 2026)
 */
import { Scenes, Markup } from 'telegraf';
import { db } from '@/lib/db';

export const SUPPORT_WIZARD = 'support-wizard';

async function resolveUser(tgId: number) {
  return db.user.findFirst({
    where: { telegramId: String(tgId) }
  });
}

// ──────────────────────────────────────────────────────────────
// WIZARD DEFINITION
// ──────────────────────────────────────────────────────────────
export const supportWizard = new Scenes.WizardScene(
  SUPPORT_WIZARD,

  // ШАГ 1: Запрос темы
  async (ctx: any) => {
    ctx.wizard.state.ticketData = {};
    await ctx.reply(
      '🆘 <b>Создание тикета в поддержку</b>\n\n' +
      'Пожалуйста, опишите вашу проблему <b>одним сообщением</b>. ' +
      'Постарайтесь указать ID заказа (если проблема с заказом) и все важные детали.\n\n' +
      'Напишите ваш текст ниже:',
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена', 'cancel_ticket')]])
      }
    );
    return ctx.wizard.next();
  },

  // ШАГ 2: Обработка сообщения
  async (ctx: any) => {
    if (!ctx.message?.text) {
      return ctx.reply('❌ Пожалуйста, отправьте текстовое сообщение или нажмите "Отмена".', {
        ...Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена', 'cancel_ticket')]])
      });
    }

    const text = ctx.message.text.trim();
    if (text.length < 10) {
      return ctx.reply('❌ Ваше сообщение слишком короткое. Опишите проблему подробнее:');
    }

    ctx.wizard.state.ticketData.text = text;
    const tgId = ctx.from.id;

    try {
      const user = await resolveUser(tgId);
      if (!user) {
        await ctx.reply('❌ Пользователь не найден. Используйте /start для регистрации.');
        return ctx.scene.leave();
      }

      await ctx.reply('🔄 Создаю тикет...');

      const ticket = await db.ticket.create({
        data: {
          userId: user.id,
          subject: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          status: 'OPEN',
          messages: {
            create: {
              sender: 'USER',
              text: text
            }
          }
        }
      });

      await ctx.reply(
        `✅ <b>Тикет #${ticket.id.substring(ticket.id.length - 6).toUpperCase()} создан!</b>\n\n` +
        `Мы уже получили ваше обращение и скоро ответим. Вы можете отслеживать статус тикета в веб-интерфейсе.`,
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      console.error('[SupportWizard] Error creating ticket:', e);
      await ctx.reply('❌ Произошла техническая ошибка. Пожалуйста, напишите нам на email: support@smmplan.ru');
    }

    return ctx.scene.leave();
  }
);

// ──────────────────────────────────────────────────────────────
// SCENE GUARD
// ──────────────────────────────────────────────────────────────
supportWizard.use(async (ctx: any, next: any) => {
  if (ctx.callbackQuery?.data === 'cancel_ticket') {
    await ctx.answerCbQuery();
    await ctx.editMessageText('❌ Создание тикета отменено.');
    return ctx.scene.leave();
  }
  if (ctx.message?.text?.startsWith('/') && ctx.message?.text !== '/cancel') {
    await ctx.scene.leave();
    return next();
  }
  return next();
});
