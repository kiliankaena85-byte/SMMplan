import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import {
  calculateSafetyFloorCents,
  MAX_TOTAL_DISCOUNT,
  TOTAL_MANDATORY_DEDUCTIONS,
  applyBeautifulRounding,
} from '@/lib/financial-constants';
import { SettingsProvider } from '@/lib/settings';

export type PricingResult = {
  totalCents: number;
  originalTotalCents: number;
  discountCents: number;
  discountPercent: number;
  providerCostCents: number;
  safetyFloorCents: number;
  tier: string;
};

class MarketingService {
  /**
   * Evaluates volume discount tier based on total spent.
   * Returns generic tier names and their respective percent discount.
   */
  getVolumeTier(totalSpentCents: number): { name: string; discountPercent: number } {
    if (totalSpentCents >= 100_000_00) { // 1m RUB
      return { name: 'PLATINUM', discountPercent: 15.0 };
    }
    if (totalSpentCents >= 25_000_00) { // 250k RUB
      return { name: 'GOLD', discountPercent: 10.0 };
    }
    if (totalSpentCents >= 5_000_00) { // 50k RUB
      return { name: 'SILVER', discountPercent: 5.0 };
    }
    if (totalSpentCents >= 1_000_00) { // 10k RUB
      return { name: 'BRONZE', discountPercent: 2.0 };
    }
    return { name: 'REGULAR', discountPercent: 0.0 };
  }

  /**
   * Calculates the final price for an order, applying the maximum available discount
   * between User Volume Tier, User Personal Discount, and Promo Code.
   * 
   * SAFETY GUARANTEES (ported from Legacy Smmplan):
   * 1. MAX_TOTAL_DISCOUNT cap — скидки не могут превысить 30%
   * 2. Safety Floor — итоговая цена никогда не падает ниже
   *    cost × (1 + 100%) / (1 − 14.5%) ≈ cost × 2.34
   *    (покрывает: УСН 6% + НДС 5% + Эквайринг 3.5% + 100% наценка)
   */
  async calculatePrice(
    userId: string | null | undefined,
    serviceId: string,
    quantity: number,
    promoCodeStr?: string | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    preloadedContext?: { user?: any | null, service?: any | null }
  ): Promise<PricingResult> {
    let user = null;
    if (userId) {
      user = preloadedContext && preloadedContext.user !== undefined 
          ? preloadedContext.user 
          : await db.user.findUnique({ where: { id: userId } });
    }

    const service = preloadedContext && preloadedContext.service !== undefined
        ? preloadedContext.service
        : await db.service.findUnique({ where: { id: serviceId } });
        
    if (!service) throw new Error('Service not found');

    if (quantity < service.minQty || quantity > service.maxQty) {
      throw new Error(`Quantity must be between ${service.minQty} and ${service.maxQty}`);
    }

    const usdToRub = await SettingsProvider.getExchangeRateUSD();
    const serviceExchangeRate = service.providerCurrency === 'RUB' ? 1.0 : usdToRub;

    // 1. Calculate base original price in Cents (Convert USD provider rate to RUB Cents)
    const providerCostPer1000Cents = service.rate * serviceExchangeRate * 100;
    const providerCostCents = quantity > 0
      ? Math.max(1, Math.ceil((providerCostPer1000Cents / 1000) * quantity))
      : Math.ceil((providerCostPer1000Cents / 1000) * quantity);

    // Apply the same Beautiful Rounding logic used in the Catalog to ensure price parity
    const rawRetailPer1000Rub = service.rate * service.markup * serviceExchangeRate;
    const beautifulRetailPer1000Rub = applyBeautifulRounding(rawRetailPer1000Rub);
    const originalTotalCents = quantity > 0
      ? Math.max(1, Math.ceil((beautifulRetailPer1000Rub * 100 / 1000) * quantity))
      : Math.ceil((beautifulRetailPer1000Rub * 100 / 1000) * quantity);

    // 2. Discover available discounts
    const volumeTier = user ? this.getVolumeTier(Number(user.totalSpent)) : { name: 'REGULAR', discountPercent: 0.0 };
    let promoDiscountPercent = 0.0;
    const promoFixedDiscountCents = 0;
    
    if (promoCodeStr) {
      const promo = await db.promoCode.findUnique({ where: { code: promoCodeStr } });
      if (promo && promo.isActive && (promo.maxUses === 0 || promo.uses < promo.maxUses)) {
        if (!promo.expiresAt || promo.expiresAt > new Date()) {
          if (promo.type === 'VOUCHER') {
            throw new Error('VOUCHER_USE_BALANCE: Это ваучер на пополнение баланса. Активируйте его в разделе «Мой баланс», а затем оплатите заказ с баланса.');
          } else {
            promoDiscountPercent = promo.discountPercent;
          }
        }
      }
    }

    // 3. Find the maximum discount available to prevent margin squeeze
    // (We do not stack them additively — we take the single best discount)
    let maxDiscountPercent = Math.max(
      user?.personalDiscount || 0,
      volumeTier.discountPercent,
      promoDiscountPercent
    );

    // 3a. [SAFETY] Hard ceiling on total discount — prevents stacking exploits
    if (maxDiscountPercent > MAX_TOTAL_DISCOUNT) {
      maxDiscountPercent = MAX_TOTAL_DISCOUNT;
    }

    // 4. Calculate Final Cents
    const percentDiscountCents = Math.round((originalTotalCents * maxDiscountPercent) / 100);
    const voucherCents = promoFixedDiscountCents;

    let discountCents = percentDiscountCents + voucherCents;
    let totalCents = originalTotalCents - discountCents;

    // 5. [SAFETY FLOOR] Never sell below break-even after taxes & gateway fees.
    const safetyFloorCents = calculateSafetyFloorCents(providerCostCents);
    if (totalCents < safetyFloorCents) {
      totalCents = safetyFloorCents;
      // Recalculate true discount applied so receipts match the actual charge
      discountCents = originalTotalCents - totalCents;
    }

    // Always accurately report the applied discount percentage for UI/Analytics
    const finalDiscountPercent = originalTotalCents > 0 ? Math.round((discountCents / originalTotalCents) * 100) : 0;

    return {
      totalCents,
      originalTotalCents,
      discountCents,
      discountPercent: finalDiscountPercent,
      providerCostCents,
      safetyFloorCents,
      tier: volumeTier.name,
    };
  }

  /**
   * Applies the use of a promo code atomically if required.
   */
  async consumePromoCode(tx: Prisma.TransactionClient, promoCodeStr?: string | null) {
    if (!promoCodeStr) return;

    const promo = await tx.promoCode.findUnique({ where: { code: promoCodeStr } });
    
    if (!promo || !promo.isActive) {
      throw new Error('Промокод недействителен');
    }
    if (promo.type === 'VOUCHER') {
      throw new Error('VOUCHER_USE_BALANCE: Ваучер не может быть применён к заказу напрямую.');
    }
    if (promo.maxUses > 0 && promo.uses >= promo.maxUses) {
      throw new Error('Лимит использований промокода исчерпан');
    }
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new Error('Срок действия промокода истёк');
    }

    const updatedPromo = await tx.promoCode.update({
      where: { id: promo.id },
      data: { uses: { increment: 1 } }
    });

    if (updatedPromo.maxUses > 0 && updatedPromo.uses > updatedPromo.maxUses) {
      throw new Error('Лимит использований промокода исчерпан');
    }
  }

  /**
   * Evaluates volume discount for an array of services and formats them for B2B API Standards.
   * Protects pricing from dropping below the safety floor.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getB2BFormattedServices(user: any, services: any[]) {
    const volumeTier = this.getVolumeTier(user.totalSpent);
    let maxDiscountPercent = Math.max(user.personalDiscount || 0, volumeTier.discountPercent);

    // Apply hard ceiling
    if (maxDiscountPercent > MAX_TOTAL_DISCOUNT) {
      maxDiscountPercent = MAX_TOTAL_DISCOUNT;
    }

    const usdToRub = await SettingsProvider.getExchangeRateUSD();

    return services.map(s => {
      const sExchangeRate = s.providerCurrency === 'RUB' ? 1.0 : usdToRub;
      // 1. Calculate original rate in normal currency format (RUB, not cents)
      const originalRatePer1000 = s.rate * s.markup * sExchangeRate;
      
      // 2. Apply highest applicable discount
      const discountVal = (originalRatePer1000 * maxDiscountPercent) / 100;
      let finalRatePer1000 = originalRatePer1000 - discountVal;

      // 3. Safety Floor: never below cost × 2.34 (covers taxes + gateway + 100% margin) in RUB
      const safetyFloor = (s.rate * sExchangeRate * (1 + 1.0)) / (1 - TOTAL_MANDATORY_DEDUCTIONS);
      if (finalRatePer1000 < safetyFloor) {
        finalRatePer1000 = safetyFloor;
      }

      // 4. Return standard API v2 compliant object
      return {
        service: s.numericId,
        name: s.name,
        type: 'Default',
        category: s.category.name,
        // Ensure rate matches the Smmplan schema (not cents) formatted strictly to 4 decimals
        rate: Number(finalRatePer1000).toFixed(4),
        min: s.minQty.toString(),
        max: s.maxQty.toString(),
        dripfeed: s.isDripFeedEnabled,
        refill: s.isRefillEnabled,
        cancel: s.isCancelEnabled
      };
    });
  }
}


export const marketingService = new MarketingService();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function logPromoCodeUsageIfNeeded(tx: any, orderId: string, userId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      promoCodeId: true,
      discountCents: true,
      charge: true,
      providerCost: true,
    },
  });

  if (!order || !order.promoCodeId) {
    return;
  }

  // Check if PromoCodeUsage already exists for this orderId to prevent duplicate logging
  const existingUsage = await tx.promoCodeUsage.findUnique({
    where: { orderId },
  });

  if (existingUsage) {
    return;
  }

  // Query the PromoCode model for isSuspicious
  const promo = await tx.promoCode.findUnique({
    where: { id: order.promoCodeId },
    select: {
      isSuspicious: true,
    },
  });

  const isSuspicious = promo?.isSuspicious ?? false;

  // Create a PromoCodeUsage record under the transaction tx
  await tx.promoCodeUsage.create({
    data: {
      promoCodeId: order.promoCodeId,
      userId,
      orderId,
      discountCents: order.discountCents,
      revenueCents: order.charge,
      profitCents: order.charge - order.providerCost,
      isSuspicious,
    },
  });
}

