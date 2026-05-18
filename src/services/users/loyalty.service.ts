import { db } from '@/lib/db';

export class LoyaltyService {
  /**
   * Retrieves the current referral percentage for a user.
   * Can evaluate Tiered logic based on LTV or Pioneer badges.
   */
  static async getReferralPercent(userId: string, projectId?: string): Promise<number> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { totalSpent: true, createdAt: true }
    });

    if (!user) return 10;

    // Tiered logic base: 
    // Pioneer Boost (First 30 days of platform launch etc):
    const isPioneer = user.createdAt.getTime() < new Date('2026-05-01').getTime();
    if (isPioneer) return 20;

    // Standard LTV volume tier logic
    if (user.totalSpent >= 5000_00) return 15; // 15% for VIPs

    return 10; // Default 10%
  }

  /**
   * Awards a commission to the referrer when a referred user makes a deposit.
   * Safe to run inside an existing PostgreSQL transaction.
   */
  static async awardCommission(tx: any, referredUserId: string, depositAmountCents: number, orderId: string): Promise<void> {
    const user = await tx.user.findUnique({
      where: { id: referredUserId },
      select: { referredById: true }
    });

    if (!user || !user.referredById) return;

    // Cycle protection: Check if the referrer was referred by the current user (Cyclic loop attack)
    const referrer = await tx.user.findUnique({
      where: { id: user.referredById },
      select: { referredById: true }
    });

    if (referrer && referrer.referredById === referredUserId) {
        console.warn(`[SECURITY] Cyclic referral detected between ${referredUserId} and ${user.referredById}. Commission rejected.`);
        return;
    }

    const percent = await this.getReferralPercent(user.referredById);
    
    const commissionCents = Math.round((depositAmountCents * percent) / 100);
    if (commissionCents <= 0) return;

    // Create pending commission record
    await tx.commission.create({
      data: {
        orderId,
        referrerId: user.referredById,
        amount: commissionCents,
        status: 'PENDING'
      }
    });

    // Increment referrer's pending referral balance
    await tx.user.update({
      where: { id: user.referredById },
      data: { referralBalance: { increment: commissionCents } }
    });

    // Log the event for the user
    await tx.auditLog.create({
      data: {
        userId: user.referredById,
        action: 'REFERRAL_COMMISSION',
        details: `Получена комиссия ${percent}% (${commissionCents / 100} руб) за пополнение от привлеченного пользователя.`
      }
    });
  }

  /**
   * Confirms a pending commission when an order completes.
   * Moves it from PENDING to CONFIRMED.
   */
  static async confirmCommission(tx: any, orderId: string): Promise<void> {
    const commissions = await tx.commission.findMany({
      where: { orderId, status: 'PENDING' }
    });

    for (const comm of commissions) {
      await tx.commission.update({
        where: { id: comm.id },
        data: { status: 'CONFIRMED' }
      });
      // The amount is already in referralBalance. No need to increment it again.
      // But we can create an audit log.
      await tx.auditLog.create({
        data: {
          userId: comm.referrerId,
          action: 'REFERRAL_CONFIRMED',
          details: `Комиссия за заказ переведена в статус подтвержденной.`
        }
      });
    }
  }

  /**
   * Reverses a pending commission if the order fails.
   * Moves it from PENDING to REVERSED and decrements referralBalance.
   */
  static async reverseCommission(tx: any, orderId: string): Promise<void> {
    const commissions = await tx.commission.findMany({
      where: { orderId, status: 'PENDING' }
    });

    for (const comm of commissions) {
      await tx.commission.update({
        where: { id: comm.id },
        data: { status: 'REVERSED' }
      });
      
      // Withdraw the amount from the referrer's referral balance
      await tx.user.update({
        where: { id: comm.referrerId },
        data: { referralBalance: { decrement: comm.amount } }
      });

      await tx.auditLog.create({
        data: {
          userId: comm.referrerId,
          action: 'REFERRAL_REVERSED',
          details: `Комиссия отозвана из-за отмены/ошибки заказа.`
        }
      });
    }
  }
}
