"use server";

import { db } from "@/lib/db";
import { verifySession } from "@/lib/session";

export async function activatePromoCodeAction(code: string) {
  const session = await verifySession();
  if (!session) throw new Error("Unauthorized");

  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) throw new Error("Введите промокод");

  return await db.$transaction(async (tx) => {
    const promo = await tx.promoCode.findUnique({ where: { code: cleanCode } });

    if (!promo || !promo.isActive) {
      throw new Error("Промокод недействителен или не существует");
    }

    if (promo.maxUses > 0 && promo.uses >= promo.maxUses) {
      throw new Error("Лимит использований промокода исчерпан");
    }

    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new Error("Срок действия промокода истёк");
    }

    // Check if user already used this promo code
    const alreadyUsed = await tx.ledgerEntry.findFirst({
      where: {
        userId: session.userId,
        reason: { contains: `Промокод: ${cleanCode}` }
      }
    });

    if (alreadyUsed) {
      throw new Error("Вы уже активировали этот промокод");
    }

    if (promo.type !== "VOUCHER") {
      throw new Error("Этот промокод дает скидку на заказы. Примените его при оформлении заказа на главной странице.");
    }

    if (promo.amount <= 0) {
      throw new Error("Этот промокод не содержит денежного бонуса");
    }

    // Activate voucher -> Add to balance
    await tx.user.update({
      where: { id: session.userId },
      data: { balance: { increment: promo.amount } }
    });

    await tx.promoCode.update({
      where: { id: promo.id },
      data: { uses: { increment: 1 } }
    });

    await tx.payment.create({
      data: {
        userId: session.userId,
        amount: promo.amount,
        currency: "RUB",
        status: "COMPLETED",
        gateway: "promo_code"
      }
    });

    await tx.ledgerEntry.create({
      data: {
        userId: session.userId,
        amount: promo.amount,
        reason: `Активация промокода: ${cleanCode} (Промокод: ${cleanCode})`,
        status: "APPROVED",
        idempotencyKey: `promo-${cleanCode}-${session.userId}`
      }
    });

    return { success: true, amount: promo.amount };
  });
}
