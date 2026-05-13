import { db } from '@/lib/db';

interface FinancialMetrics {
  revenueGross: number; // Изначально принесенные деньги
  refunds: number; // Отмененные деньги, возвращенные балансами
  cogs: number; // Оплачено провайдерам (COGS)
  gatewayFees: number; // Комиссии шлюзов (ЮKassa, CryptoBot)
  revenueNet: number; // Выручка минус возвраты и комиссии шлюзов
  marginGross: number; // Net Revenue - COGS
  taxes: number;
  opex: number;
  profitNet: number; // Margin - Taxes - OPEX
  marginPercentage: number;
}

class AccountingService {
  async getMetrics(startDate?: Date, endDate?: Date): Promise<FinancialMetrics> {
    const whereClause: any = {};
    if (startDate && endDate) {
      whereClause.createdAt = { gte: startDate, lte: endDate };
    }

    // 1. Calculate Revenue and Gateway Fees (All payments SUCCEEDED)
    const paymentGroups = await db.payment.groupBy({
      by: ['gateway'],
      _sum: { amount: true },
      where: {
        ...whereClause,
        status: 'SUCCEEDED'
      }
    });
    
    let revenueGross = 0;
    let gatewayFees = 0;

    for (const group of paymentGroups) {
      const amount = Number(group._sum.amount || 0);
      revenueGross += amount;
      
      if (group.gateway === 'yookassa') {
        gatewayFees += amount * 0.035; // ЮKassa берет ~3.5%
      } else if (group.gateway === 'cryptobot') {
        gatewayFees += amount * 0.01; // CryptoBot берет ~1%
      }
    }
    
    gatewayFees = Math.round(gatewayFees);

    // 2. Calculate Refunds (For canceled/partial orders. We deduce this from the Order remains logic)
    // Actually, refunds are already added back to User.balance, but to track them strictly:
    // We can infer refunds = Order charge - (COGS / providerCost if we knew it).
    // Or we keep it simple: refund = (remains / quantity) * charge
    const refundedOrders = await db.order.findMany({
      where: {
        ...whereClause,
        status: { in: ['PARTIAL', 'CANCELED'] }
      }
    });

    let refunds = 0;
    for (const order of refundedOrders) {
      if (order.quantity > 0 && order.remains > 0) {
        const { calculatePartialRefund } = await import('@/utils/refund');
        refunds += calculatePartialRefund(order);
      } else if (order.status === 'CANCELED') {
        refunds += Number(order.charge);
      }
    }

    // 3. Calculate COGS (Provider Costs for confirmed part)
    const orders = await db.order.findMany({
      where: {
        ...whereClause,
        status: { notIn: ['AWAITING_PAYMENT', 'PENDING', 'ERROR'] }
      }
    });

    let cogs = 0;
    for (const order of orders) {
      // If partial, the providerCost recorded might be for the FULL quantity initially.
      // E.g., we set providerCost = 50 for 1000 items. If remains is 100, actual COGS is 45.
      if (order.quantity > 0) {
        const deliveredQty = order.quantity - order.remains;
        cogs += Math.round((deliveredQty / order.quantity) * Number(order.providerCost));
      }
    }

    const revenueNet = revenueGross - refunds - gatewayFees;
    const marginGross = revenueNet - cogs;

    // 4. Calculate Taxes and OPEX
    const settings = await db.systemSettings.findUnique({ where: { id: 'global' } });
    const taxRate = settings?.taxRate || 6.0;
    const opex = settings?.opexMonthly || 0.0;

    const taxes = Math.round((marginGross > 0 ? marginGross : 0) * (taxRate / 100));
    const profitNet = marginGross - taxes - opex;
    const marginPercentage = revenueNet > 0 ? (marginGross / revenueNet) * 100 : 0;

    return {
      revenueGross,
      refunds,
      gatewayFees,
      revenueNet,
      cogs,
      marginGross,
      taxes,
      opex,
      profitNet,
      marginPercentage
    };
  }

  async getSettings() {
    let settings = await db.systemSettings.findUnique({ where: { id: 'global' } });
    if (!settings) {
      settings = await db.systemSettings.create({
        data: { id: 'global', taxRate: 6.0, opexMonthly: 0.0 }
      });
    }
    return settings;
  }

  async updateSettings(taxRate: number, opexMonthly: number) {
    return db.systemSettings.upsert({
      where: { id: 'global' },
      update: { taxRate, opexMonthly },
      create: { id: 'global', taxRate, opexMonthly }
    });
  }
}

export const accountingService = new AccountingService();
