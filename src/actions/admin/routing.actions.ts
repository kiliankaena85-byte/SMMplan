'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/server/rbac';
import { revalidatePath } from 'next/cache';

const swapSchema = z.object({
  serviceId: z.string(),
  newRouteId: z.string(),
  reason: z.string().min(5, "Пожалуйста, укажите причину переключения (минимум 5 символов)"),
  understandRisk: z.boolean().refine(val => val === true, "Вы должны подтвердить понимание рисков")
});

async function getServiceRoutes(serviceId: string) {
  return requireStaffPermission('services', 'view', async (admin) => {
    const service = await db.service.findUnique({
      where: { id: serviceId },
      include: { provider: true }
    });
    
    if (!service) throw new Error("Услуга не найдена");

    const routes = await db.serviceRoute.findMany({
      where: { serviceId },
      include: { provider: true },
      orderBy: { priority: 'asc' }
    });

    return { service, routes };
  });
}

export async function previewHotSwap(serviceId: string, newRouteId: string) {
  return requireStaffPermission('services', 'edit', async (admin) => {
    const service = await db.service.findUnique({
      where: { id: serviceId },
      include: { provider: true }
    });
    if (!service) throw new Error("Услуга не найдена");

    const targetRoute = await db.serviceRoute.findUnique({
      where: { id: newRouteId },
      include: { provider: true }
    });
    if (!targetRoute) throw new Error("Целевой маршрут не найден");

    const recentOrders = await db.order.count({
      where: { 
        serviceId, 
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
      }
    });

    const existingActiveOrders = await db.order.count({
      where: {
        serviceId,
        status: { in: ['AWAITING_PAYMENT', 'PENDING', 'IN_PROGRESS'] }
      }
    });

    return {
      success: true,
      data: {
        currentProvider: service.provider?.name || "Unknown",
        targetProvider: targetRoute.provider.name,
        estimatedDailyOrders: recentOrders,
        unaffectedExistingOrders: existingActiveOrders,
        warning: "Внимание: Убедитесь, что лимиты (Min/Max) у нового провайдера совпадают с текущими настройками услуги."
      }
    };
  });
}

export async function executeHotSwap(input: z.infer<typeof swapSchema>) {
  return requireStaffPermission('services', 'edit', async (admin) => {
    const parsed = swapSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.errors[0].message);
    }

    const { serviceId, newRouteId, reason } = parsed.data;

    await db.$transaction(async (tx) => {
      const service = await tx.service.findUnique({
        where: { id: serviceId }
      });
      if (!service) throw new Error("Услуга не найдена");

      const targetRoute = await tx.serviceRoute.findUnique({
        where: { id: newRouteId }
      });
      if (!targetRoute) throw new Error("Маршрут не найден");
      if (!targetRoute.isActive) throw new Error("Целевой маршрут отключен");

      const oldProviderId = service.providerId;

      await tx.serviceRoute.updateMany({
        where: { serviceId, isPrimary: true },
        data: { isPrimary: false }
      });

      await tx.serviceRoute.update({
        where: { id: newRouteId },
        data: { isPrimary: true }
      });

      await tx.service.update({
        where: { id: serviceId },
        data: {
          providerId: targetRoute.providerId,
          externalId: targetRoute.providerServiceId
        }
      });

      await tx.routingAuditLog.create({
        data: {
          serviceId,
          action: 'SWAP',
          fromProviderId: oldProviderId,
          toProviderId: targetRoute.providerId,
          reason,
          adminId: admin.id
        }
      });
    });

    revalidatePath(`/admin/services/${serviceId}/routing`);
    revalidatePath('/admin/services');
    return { success: true };
  });
}
