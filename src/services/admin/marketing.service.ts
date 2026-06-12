import { db } from '@/lib/db';

export const adminMarketingService = {
  // ── PromoCodes ──
  async listPromoCodes() {
    const promoCodes = await db.promoCode.findMany({
      include: { usages: true },
      orderBy: { createdAt: 'desc' },
    });
    return promoCodes.map(promo => ({
      ...promo,
      usages: promo.usages.map(usage => ({
        ...usage,
        discountCents: Number(usage.discountCents),
        revenueCents: Number(usage.revenueCents),
        profitCents: Number(usage.profitCents),
      }))
    }));
  },

  async createPromoCode(data: {
    code: string;
    type: 'DISCOUNT' | 'VOUCHER';
    discountPercent?: number;
    amount?: number;
    maxUses: number;
    expiresAt?: Date | null;
    description?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    budgetCents?: number;
    isSuspicious?: boolean;
  }) {
    return db.promoCode.create({
      data: {
        code: data.code.toUpperCase(),
        type: data.type,
        discountPercent: data.discountPercent || 0,
        amount: data.amount || 0,
        maxUses: data.maxUses,
        expiresAt: data.expiresAt,
        isActive: true,
        description: data.description,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        budgetCents: data.budgetCents || 0,
        isSuspicious: data.isSuspicious || false,
      },
    });
  },

  async togglePromoCode(id: string, isActive: boolean) {
    return db.promoCode.update({
      where: { id },
      data: { isActive },
    });
  },

  async deletePromoCode(id: string) {
    return db.promoCode.delete({
      where: { id },
    });
  },

  // ── Referrals & Commissions ──
  async getReferralStats() {
    const totalCommissions = await db.commission.aggregate({
      _sum: { amount: true },
      where: { status: 'PAID' },
    });

    const pendingCommissions = await db.commission.aggregate({
      _sum: { amount: true },
      where: { status: 'PENDING' },
    });

    return {
      totalPaidOut: totalCommissions._sum.amount || 0,
      totalPending: pendingCommissions._sum.amount || 0,
    };
  },

  async getReferralChartData() {
    // Fetch last 6 months of paid commissions
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const commissions = await db.commission.findMany({
      where: { 
        status: 'PAID',
        updatedAt: { gte: sixMonthsAgo }
      },
      select: { amount: true, updatedAt: true },
    });

    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const monthlyData: Record<string, number> = {};
    
    // Initialize last 6 months with 0
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      monthlyData[months[d.getMonth()]] = 0;
    }

    for (const commission of commissions) {
      const month = months[commission.updatedAt.getMonth()];
      if (monthlyData[month] !== undefined) {
        monthlyData[month] += Number(commission.amount);
      }
    }

    return Object.keys(monthlyData).map(month => ({
      name: month,
      total: monthlyData[month] / 100
    }));
  },

  async listTopReferrers() {
    // Find users with the highest referral balance or most referrals
    return db.user.findMany({
      where: { referralBalance: { gt: 0 } },
      orderBy: { referralBalance: 'desc' },
      take: 50,
      select: {
        id: true,
        email: true,
        referralCode: true,
        referralBalance: true,
        _count: {
          select: { referrals: true, commissions: true },
        },
      },
    });
  },

  async processPayout(userId: string, adminId: string, amountToPayCents: number) {
    // Transaction to move referral balance to main balance
    return db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found');
      if (user.referralBalance < amountToPayCents) {
        throw new Error('Insufficient referral balance');
      }
      
      if (user.referralBalance !== amountToPayCents) {
        throw new Error('Partial payouts are not supported to maintain financial data integrity. Payout amount must exactly match the full referral balance.');
      }

      // Deduct from referral
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          referralBalance: { decrement: amountToPayCents },
          balance: { increment: amountToPayCents },
        },
      });

      if (updatedUser.referralBalance < 0) {
        throw new Error('Insufficient referral balance. Concurrent payout detected.');
      }

      // Mark all pending commissions for this user as PAID (simplified approach, or we could leave them as is if we just treat balance as an aggregate container)
      await tx.commission.updateMany({
        where: { referrerId: userId, status: 'PENDING' },
        data: { status: 'PAID' },
      });

      // Financial Integrity: LedgerEntry MUST mirror every balance change
      await tx.ledgerEntry.create({
        data: {
          userId,
          adminId: adminId,
          amount: amountToPayCents,
          reason: `Выплата реферального баланса (admin payout)`,
          status: 'APPROVED',
          idempotencyKey: `referral-payout-${userId}-${Date.now()}`
        },
      });

      // Audit Log
      await tx.adminAuditLog.create({
        data: {
          adminId: adminId,
          adminEmail: 'System', // Will map to real in action
          action: 'REFERRAL_PAYOUT',
          target: userId,
          targetType: 'USER',
          newValue: JSON.stringify({ amount: amountToPayCents, newBalance: updatedUser.balance.toString() }),
        },
      });

      return updatedUser;
    });
  },
};
