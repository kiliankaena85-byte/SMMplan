/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 *
 * MIGRATED TO SMMPLAN LITE CORE (April 2026)
 */
import { Scenes, Markup } from 'telegraf';
import { db } from '@/lib/db';

export const REFERRAL_WIZARD = 'referral-wizard';

async function resolveUser(tgId: number) {
  return db.user.findFirst({
    where: { telegramId: String(tgId) },
    select: { id: true, referralCode: true, referralBalance: true, _count: { select: { referrals: true } } }
  });
}

// ──────────────────────────────────────────────────────────────
// WIZARD DEFINITION
// ──────────────────────────────────────────────────────────────
export const referralWizard = new Scenes.WizardScene(
  REFERRAL_WIZARD,

  // ШАГ 1: Показать статистику и ссылку
  async (ctx: any) => {
    const tgId = ctx.from.id;
    const user = await resolveUser(tgId);

    if (!user) {
      await ctx.reply('❌ Пользователь не найден. Используйте /start для регистрации.');
      return ctx.scene.leave();
    }

    if (!user.referralCode) {
      const newCode = Array.from(Array(8), () => Math.floor(Math.random() * 36).toString(36)).join('').toUpperCase();
      await db.user.update({
        where: { id: user.id },
        data: { referralCode: newCode }
      });
      user.referralCode = newCode;
    }

    const host = process.env.NEXT_PUBLIC_APP_URL || 'https://smmplan.ru';
    const link = `${host}/?ref=${user.referralCode}`;
    const earned = (user.referralBalance ?? 0) / 100;
    const refsCount = user._count?.referrals ?? 0;

    await ctx.reply(
      `👥 <b>Реферальная программа</b>\n\n` +
      `Приглашайте друзей и получайте <b>15%</b> с каждого их заказа пожизненно!\n\n` +
      `🔗 <b>Ваша ссылка:</b>\n<code>${link}</code>\n\n` +
      `📊 <b>Ваша статистика:</b>\n` +
      `• Приглашено: <b>${refsCount} чел.</b>\n` +
      `• Заработано: <b>${earned.toFixed(2)} ₽</b>\n\n` +
      `<i>Для вывода средств на основной баланс используйте веб-интерфейс.</i>`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.url('Перейти в личный кабинет', `${host}/dashboard/referrals`)],
          [Markup.button.callback('❌ Закрыть', 'close_ref')]
        ])
      }
    );
    return ctx.wizard.next();
  },

  async (_ctx: any) => { return; }
);

referralWizard.use(async (ctx: any, next: any) => {
  if (ctx.callbackQuery?.data === 'close_ref') {
    await ctx.answerCbQuery();
    await ctx.deleteMessage().catch(() => {});
    return ctx.scene.leave();
  }
  await ctx.scene.leave();
  return next();
});
