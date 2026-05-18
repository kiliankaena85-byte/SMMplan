"use server";

import { db } from "@/lib/db";
import { verifySession } from "@/lib/session";
import { WalletOps } from "@/services/financial/wallet-ops";
import { RateLimitService } from "@/services/core/rate-limit.service";

export async function activatePromoCodeAction(code: string) {
  const session = await verifySession();
  if (!session) throw new Error("Unauthorized");

  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) throw new Error("Введите промокод");

  // Rate Limit: Prevent brute-force guessing
  // NOTE: Rate limit is consumed *outside* the transaction.
  // This is intentional anti-brute-force behavior, meaning a failed transaction (e.g. race condition)
  // still consumes a rate limit token.
  const isAllowed = await RateLimitService.checkCustomKey(`promo_activate_user:${session.userId}`, 5, 60);
  if (!isAllowed) {
    throw new Error("Слишком много попыток. Пожалуйста, подождите минуту.");
  }

  // Bounded retry loop for Serialization Failures (P2034)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const promo = await tx.promoCode.findUnique({ where: { code: cleanCode } });

        if (!promo || !promo.isActive) {
          throw new Error("Промокод недействителен или не существует");
        }

        if (promo.expiresAt && promo.expiresAt < new Date()) {
          throw new Error("Срок действия промокода истёк");
        }

        if (promo.type !== "VOUCHER") {
          throw new Error("Этот промокод дает скидку на заказы. Примените его при оформлении заказа на главной странице.");
        }

        if (promo.amount <= 0) {
          throw new Error("Этот промокод не содержит денежного бонуса");
        }

        // Check if user already used this promo code (using DB-level idempotency key)
        const idempotencyKey = `promo-${cleanCode}-${session.userId}`;
        const alreadyUsed = await tx.ledgerEntry.findUnique({
          where: { idempotencyKey }
        });

        if (alreadyUsed) {
          throw new Error("Вы уже активировали этот промокод");
        }

        // Optimistic Concurrency Control (OCC) for usage limits
        const updatedPromo = await tx.promoCode.updateMany({
          where: { 
            id: promo.id,
            ...(promo.maxUses > 0 ? { uses: { lt: promo.maxUses } } : {})
          },
          data: { uses: { increment: 1 } }
        });

        if (updatedPromo.count === 0) {
          throw new Error("Лимит использований промокода исчерпан");
        }

        // Activate voucher -> Add to balance via WalletOps
        const reason = `Активация ваучера: ${cleanCode}`;
        await WalletOps.credit(tx, session.userId, promo.amount, reason, { idempotencyKey });

        return { success: true, amount: promo.amount };
      }, { isolationLevel: 'Serializable' });
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('idempotencyKey')) {
        throw new Error("Вы уже активировали этот промокод");
      }
      if (error.code === 'P2034' && attempt < 2) {
        continue; // Retry on serialization failure
      }
      if (error.code === 'P2034') {
        throw new Error("Транзакция в обработке, пожалуйста, попробуйте еще раз.");
      }
      throw error;
    }
  }
}
