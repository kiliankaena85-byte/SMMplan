"use server";

import { db } from "@/lib/db";
import { verifySession } from "@/lib/session";

export async function transferReferralBalanceAction() {
  const session = await verifySession();
  if (!session) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { referralBalance: true, balance: true }
  });

  if (!user) throw new Error("Учетная запись не найдена");
  if (!user.referralBalance || user.referralBalance <= 0) {
    throw new Error("Нет средств для перевода");
  }

  // Atomically transfer referral balance to main balance
  const transferAmount = user.referralBalance;
  
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.userId },
      data: {
        referralBalance: { decrement: transferAmount },
        balance: { increment: transferAmount }
      }
    });

    await tx.payment.create({
      data: {
        userId: session.userId,
        amount: transferAmount,
        currency: "RUB",
        status: "COMPLETED",
        gateway: "referral_transfer"
      }
    });

    // Financial Integrity: LedgerEntry MUST mirror every balance change
    await tx.ledgerEntry.create({
      data: {
        userId: session.userId,
        amount: transferAmount,
        reason: `Перевод реферального баланса на основной`,
        status: 'APPROVED',
        idempotencyKey: `referral-transfer-${session.userId}-${Date.now()}`
      }
    });
  });

  return { success: true, amount: transferAmount };
}
