'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/server/rbac';
import { revalidatePath } from 'next/cache';
import { SettingsProvider } from '@/lib/settings';
import { redis } from '@/lib/redis';
import { applyBeautifulRounding } from '@/lib/financial-constants';

const swapSchema = z.object({
  serviceId: z.string(),
  newRouteId: z.string(),
  reason: z.string().min(5, "Пожалуйста, укажите причину переключения (минимум 5 символов)"),
  understandRisk: z.boolean().refine(val => val === true, "Вы должны подтвердить понимание рисков")
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getServiceRoutes(serviceId: string) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

const addRouteSchema = z.object({
  serviceId: z.string(),
  providerId: z.string(),
  providerServiceId: z.string().regex(/^[a-zA-Z0-9_-]{1,50}$/, "Неверный формат внешнего ID"),
});

export async function addServiceRoute(input: z.infer<typeof addRouteSchema>) {
  return requireStaffPermission('services', 'edit', async (admin) => {
    const parsed = addRouteSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.errors[0].message);
    }
    const { serviceId, providerId, providerServiceId } = parsed.data;

    await db.$transaction(async (tx) => {
      const service = await tx.service.findUnique({ where: { id: serviceId } });
      if (!service) throw new Error("Услуга не найдена");

      const provider = await tx.provider.findUnique({ where: { id: providerId } });
      if (!provider || !provider.isActive) throw new Error("Провайдер не найден или отключен");

      const existingRoute = await tx.serviceRoute.findUnique({
        where: {
          serviceId_providerId: { serviceId, providerId }
        }
      });
      if (existingRoute) throw new Error("Маршрут для этого провайдера уже существует");

      const routesCount = await tx.serviceRoute.count({ where: { serviceId } });
      const isPrimary = routesCount === 0;

      const maxPriorityRoute = await tx.serviceRoute.findFirst({
        where: { serviceId },
        orderBy: { priority: 'desc' }
      });
      const priority = maxPriorityRoute ? maxPriorityRoute.priority + 1 : 0;

      await tx.serviceRoute.create({
        data: {
          serviceId,
          providerId,
          providerServiceId,
          isPrimary,
          isActive: true,
          priority,
          failoverMode: "manual"
        }
      });

      await tx.routingAuditLog.create({
        data: {
          serviceId,
          action: 'ADD_ROUTE',
          toProviderId: providerId,
          reason: `Добавлен маршрут (Внешний ID: ${providerServiceId})`,
          adminId: admin.id
        }
      });
    });

    revalidatePath(`/admin/services/${serviceId}/routing`);
    revalidatePath('/admin/services');
    return { success: true };
  });
}

export async function toggleRouteStatus(routeId: string) {
  return requireStaffPermission('services', 'edit', async (admin) => {
    let serviceId = '';
    await db.$transaction(async (tx) => {
      const route = await tx.serviceRoute.findUnique({ where: { id: routeId } });
      if (!route) throw new Error("Маршрут не найден");
      serviceId = route.serviceId;

      if (route.isPrimary) {
        throw new Error("Нельзя отключить Primary маршрут");
      }

      if (route.isActive) { // Turning off
        const activeRoutesCount = await tx.serviceRoute.count({
          where: { serviceId: route.serviceId, isActive: true }
        });
        if (activeRoutesCount <= 1) {
          throw new Error("Нельзя отключить единственный активный маршрут");
        }
      }

      await tx.serviceRoute.update({
        where: { id: routeId },
        data: { isActive: !route.isActive }
      });

      await tx.routingAuditLog.create({
        data: {
          serviceId: route.serviceId,
          action: 'TOGGLE_STATUS',
          reason: `Статус маршрута ${route.providerId} изменен на ${!route.isActive}`,
          adminId: admin.id
        }
      });
    });
    
    revalidatePath(`/admin/services/${serviceId}/routing`);
    return { success: true };
  });
}

export async function changeRoutePriority(routeId: string, direction: 'up' | 'down') {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return requireStaffPermission('services', 'edit', async (admin) => {
    let serviceId = '';
    await db.$transaction(async (tx) => {
      const route = await tx.serviceRoute.findUnique({ where: { id: routeId } });
      if (!route) throw new Error("Маршрут не найден");
      serviceId = route.serviceId;

      const siblingRoute = await tx.serviceRoute.findFirst({
        where: {
          serviceId: route.serviceId,
          priority: direction === 'up' ? { lt: route.priority } : { gt: route.priority }
        },
        orderBy: { priority: direction === 'up' ? 'desc' : 'asc' }
      });

      if (!siblingRoute) {
         return; // Cannot move further
      }

      await tx.serviceRoute.update({
        where: { id: route.id },
        data: { priority: siblingRoute.priority }
      });

      await tx.serviceRoute.update({
        where: { id: siblingRoute.id },
        data: { priority: route.priority }
      });
    });

    revalidatePath(`/admin/services/${serviceId}/routing`);
    return { success: true };
  });
}

export async function deleteServiceRoute(routeId: string) {
  return requireStaffPermission('services', 'edit', async (admin) => {
    let serviceId = '';
    await db.$transaction(async (tx) => {
      const route = await tx.serviceRoute.findUnique({ where: { id: routeId } });
      if (!route) throw new Error("Маршрут не найден");
      serviceId = route.serviceId;

      if (route.isPrimary) {
        throw new Error("Нельзя удалить Primary маршрут. Сначала назначьте другой маршрут основным.");
      }

      const activeOrders = await tx.order.count({
        where: {
          serviceId: route.serviceId,
          providerId: route.providerId,
          status: { in: ['AWAITING_PAYMENT', 'PENDING', 'IN_PROGRESS'] }
        }
      });

      if (activeOrders > 0) {
        throw new Error(`Нельзя удалить маршрут: есть ${activeOrders} активных заказов у этого провайдера.`);
      }

      await tx.serviceRoute.delete({ where: { id: routeId } });

      await tx.routingAuditLog.create({
        data: {
          serviceId: route.serviceId,
          action: 'DELETE_ROUTE',
          reason: `Маршрут удален (Провайдер: ${route.providerId})`,
          adminId: admin.id
        }
      });
    });

    revalidatePath(`/admin/services/${serviceId}/routing`);
    return { success: true };
  });
}

export async function getProviderComparisonData(serviceId: string) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return requireStaffPermission('services', 'view', async (admin) => {
    const service = await db.service.findUnique({
      where: { id: serviceId },
      include: { category: true, provider: true }
    });
    if (!service) throw new Error("Услуга не найдена");

    const routes = await db.serviceRoute.findMany({
      where: { serviceId },
      include: { provider: true },
      orderBy: { priority: 'asc' }
    });

    const usdToRub = await SettingsProvider.getExchangeRateUSD();
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const comparisonData = await Promise.all(routes.map(async (route) => {
      // 1. Fetch SLA and ETA from orders in the last 7 days
      const routeOrders = await db.order.findMany({
        where: {
          serviceId,
          providerId: route.providerId,
          createdAt: { gte: last7Days }
        }
      });

      const terminalOrders = routeOrders.filter(o => ['COMPLETED', 'PARTIAL', 'CANCELED', 'ERROR'].includes(o.status));
      const totalTerminal = terminalOrders.length;
      const successful = routeOrders.filter(o => ['COMPLETED', 'PARTIAL'].includes(o.status)).length;
      const sla = totalTerminal > 0 ? (successful / totalTerminal) * 100 : 100.0;

      const completedOrders = routeOrders.filter(o => o.status === 'COMPLETED');
      let avgEtaSeconds = 0;
      if (completedOrders.length > 0) {
        const totalDuration = completedOrders.reduce((sum, o) => {
          const duration = (o.updatedAt.getTime() - o.createdAt.getTime()) / 1000;
          return sum + duration;
        }, 0);
        avgEtaSeconds = Math.round(totalDuration / completedOrders.length);
      }

      // 2. Fetch real-time provider rate and limits from Redis shadow catalog
      const cacheKey = `provider:${route.providerId}:catalog`;
      const cachedStr = await redis.get(cacheKey);
      let providerRate: number | null = null;
      let providerMinQty: number | null = null;
      let providerMaxQty: number | null = null;

      if (cachedStr) {
        try {
          const services = JSON.parse(cachedStr);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const s = services.find((x: any) => String(x.service) === String(route.providerServiceId));
          if (s) {
            providerRate = parseFloat(s.rate) || 0.0;
            providerMinQty = parseInt(s.min) || 0;
            providerMaxQty = parseInt(s.max) || 0;
          }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
          // ignore parsing error
        }
      }

      // 3. Fallback to DB properties if primary route and cache is missing/cold
      if (providerRate === null && route.isPrimary) {
        providerRate = service.rate;
        providerMinQty = service.minQty;
        providerMaxQty = service.maxQty;
      }

      // 4. Per-unit calculations
      let procurementRatePer1kUsd: number | null = null;
      let procurementRatePer1kRub: number | null = null;
      let procurementCostPerUnitUsd: number | null = null;
      let procurementCostPerUnitRub: number | null = null;
      let marginPerUnitRub: number | null = null;
      let markupPercent: number | null = null;

      if (providerRate !== null) {
        const currency = route.provider.balanceCurrency || 'USD';
        if (currency === 'RUB') {
          procurementRatePer1kRub = providerRate;
          procurementRatePer1kUsd = providerRate / usdToRub;
        } else {
          procurementRatePer1kUsd = providerRate;
          procurementRatePer1kRub = providerRate * usdToRub;
        }

        procurementCostPerUnitUsd = procurementRatePer1kUsd / 1000;
        procurementCostPerUnitRub = procurementRatePer1kRub / 1000;

        const retailPricePerUnitRub = applyBeautifulRounding(service.rate * service.markup * usdToRub) / 1000;
        marginPerUnitRub = retailPricePerUnitRub - procurementCostPerUnitRub;
        markupPercent = procurementCostPerUnitRub > 0 ? (marginPerUnitRub / procurementCostPerUnitRub) * 100 : 0;
      }

      // 5. Detect limit incompatibility
      let limitsMismatch = false;
      if (providerMinQty !== null && providerMaxQty !== null) {
        limitsMismatch = providerMinQty > service.minQty || providerMaxQty < service.maxQty;
      }

      return {
        routeId: route.id,
        providerId: route.providerId,
        providerName: route.provider.name,
        providerServiceId: route.providerServiceId,
        isPrimary: route.isPrimary,
        isActive: route.isActive,
        sla,
        avgEtaSeconds,
        providerMinQty,
        providerMaxQty,
        procurementRatePer1kUsd,
        procurementRatePer1kRub,
        procurementCostPerUnitUsd,
        procurementCostPerUnitRub,
        marginPerUnitRub,
        markupPercent,
        limitsMismatch
      };
    }));

    return {
      success: true as const,
      data: comparisonData
    };
  });
}

