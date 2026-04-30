'use server';

import { db } from '@/lib/db';
import { adminMarketingService } from '@/services/admin/marketing.service';
import { auditAdmin } from '@/lib/admin-audit';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStaffPermission } from '@/lib/server/rbac';

const promoCodeSchema = z.object({
  code: z.string().min(1).max(12),
  type: z.enum(['DISCOUNT', 'VOUCHER']),
  discountPercent: z.coerce.number().optional().default(0),
  amount: z.coerce.number().int().optional().default(0),
  maxUses: z.coerce.number().int().optional().default(1),
  expiresAt: z.string().optional().transform(v => v ? new Date(v) : null)
});

export async function createPromoCode(formData: FormData) {
  return requireStaffPermission('marketing', 'edit', async (admin) => {
    const payload = Object.fromEntries(formData.entries());
    const parsed = promoCodeSchema.safeParse(payload);
    
    if (!parsed.success) {
      return { 
        success: false as const, 
        error: 'Некорректные данные: ' + parsed.error.errors.map(e => e.message).join(', ') 
      };
    }

    const { code, type, discountPercent, amount, maxUses, expiresAt } = parsed.data;

    await adminMarketingService.createPromoCode({
      code,
      type,
      discountPercent,
      amount,
      maxUses,
      expiresAt,
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'PROMOCODE_CREATE',
      target: code.toUpperCase(),
      targetType: 'SETTINGS', // Promo codes are system settings
      newValue: { type, discountPercent, amount, maxUses, expiresAt }
    });

    revalidatePath('/admin/marketing');
    return { success: true as const };
  });
}

export async function togglePromoCode(id: string, isActive: boolean) {
  return requireStaffPermission('marketing', 'edit', async (admin) => {
    const promo = await db.promoCode.findUnique({ where: { id } });
    if (!promo) return { success: false as const, error: 'Промокод не найден' };

    await adminMarketingService.togglePromoCode(id, isActive);
    
    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: isActive ? 'PROMOCODE_ENABLE' : 'PROMOCODE_DISABLE',
      target: promo.code,
      targetType: 'SETTINGS',
    });

    revalidatePath('/admin/marketing');
    return { success: true as const };
  });
}

export async function deletePromoCode(id: string) {
  return requireStaffPermission('marketing', 'edit', async (admin) => {
    const promo = await db.promoCode.findUnique({ where: { id } });
    if (!promo) return { success: false as const, error: 'Промокод не найден' };

    await adminMarketingService.deletePromoCode(id);
    
    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'PROMOCODE_DELETE',
      target: promo.code,
      targetType: 'SETTINGS',
    });

    revalidatePath('/admin/marketing');
    return { success: true as const };
  });
}

export async function processReferralPayout(userId: string, amount: number) {
  return requireStaffPermission('marketing', 'edit', async (admin) => {
    await adminMarketingService.processPayout(userId, admin.id, amount);
    
    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'REFERRAL_PAYOUT',
      target: userId,
      targetType: 'USER',
      newValue: { amountCents: amount },
    });

    revalidatePath('/admin/marketing');
    return { success: true as const };
  });
}
