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
  await db.$transaction([
    db.user.update({
      where: { id: session.userId },
      data: {
        referralBalance: { decrement: user.referralBalance },
        balance: { increment: user.referralBalance }
      }
    }),
    db.payment.create({
      data: {
        userId: session.userId,
        amount: user.referralBalance,
        currency: "RUB",
        status: "COMPLETED",
        gateway: "referral_transfer"
      }
    })
  ]);

  return { success: true, amount: user.referralBalance };
}
