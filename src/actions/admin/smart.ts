'use server';

import { requireStaffPermission } from '@/lib/server/rbac';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auditAdmin } from '@/lib/admin-audit';
import { getClientIp } from '@/utils/ip';
import { redis } from '@/lib/redis';

export async function getSmartCampaigns(page: number = 1, limit: number = 20) {
  return requireStaffPermission('orders', 'view', async () => {
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      db.smartCampaign.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true } },
          service: { select: { name: true, category: { select: { name: true } } } },
          tasks: { select: { status: true } },
        },
      }),
      db.smartCampaign.count(),
    ]);

    const formattedCampaigns = campaigns.map((campaign) => {
      const totalTasks = campaign.tasks.length;
      const completedTasks = campaign.tasks.filter((t) => t.status === 'COMPLETED').length;

      return {
        id: campaign.id,
        userEmail: campaign.user.email,
        serviceName: campaign.service.name,
        categoryName: campaign.service.category?.name || 'Без категории',
        link: campaign.link,
        totalQuantity: campaign.totalQuantity,
        totalDays: campaign.totalDays,
        status: campaign.status,
        isTestMode: campaign.isTestMode,
        createdAt: campaign.createdAt,
        progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        tasksCount: totalTasks,
        completedTasksCount: completedTasks,
      };
    });

    return { success: true, data: { campaigns: formattedCampaigns, total, pages: Math.ceil(total / limit) } };
  });
}

export async function updateCampaignStatus(campaignId: string, status: 'RUNNING' | 'PAUSED') {
  return requireStaffPermission('orders', 'edit', async (admin) => {
    const campaign = await db.smartCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error('Кампания не найдена');
    }

    if (campaign.status === 'COMPLETED' || campaign.status === 'ERROR') {
      throw new Error('Нельзя изменить статус завершенной или ошибочной кампании');
    }

    const updated = await db.smartCampaign.update({
      where: { id: campaignId },
      data: { status },
    });

    const ipAddress = await getClientIp();
    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SMART_DRIP_STATUS_CHANGE',
      target: campaignId,
      targetType: 'ORDER',
      oldValue: { status: campaign.status },
      newValue: { status },
      ipAddress,
    });

    revalidatePath('/admin/smart');
    return { success: true, data: updated };
  });
}

export async function getServiceConfigs() {
  return requireStaffPermission('catalog', 'view', async () => {
    const services = await db.service.findMany({
      orderBy: { name: 'asc' },
      include: {
        category: { select: { name: true, network: { select: { name: true } } } },
        smartConfig: true,
      },
    });

    return { success: true, data: services };
  });
}

export async function updateServiceConfig(
  serviceId: string,
  data: {
    isEnabled: boolean;
    isTestMode: boolean;
    minChunk: number;
    maxChunk: number;
    markup: number;
  }
) {
  return requireStaffPermission('catalog', 'edit', async (admin) => {
    const service = await db.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new Error('Услуга не найдена');
    }

    const oldConfig = await db.serviceSmartConfig.findUnique({
      where: { serviceId },
    });

    const updatedConfig = await db.serviceSmartConfig.upsert({
      where: { serviceId },
      update: {
        isEnabled: data.isEnabled,
        isTestMode: data.isTestMode,
        minChunk: data.minChunk,
        maxChunk: data.maxChunk,
        markup: data.markup,
      },
      create: {
        serviceId,
        isEnabled: data.isEnabled,
        isTestMode: data.isTestMode,
        minChunk: data.minChunk,
        maxChunk: data.maxChunk,
        markup: data.markup,
      },
    });

    const ipAddress = await getClientIp();
    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SERVICE_SMART_CONFIG_UPDATE',
      target: serviceId,
      targetType: 'CATALOG',
      oldValue: oldConfig || {},
      newValue: updatedConfig,
      ipAddress,
    });

    revalidatePath('/admin/smart');
    return { success: true, data: updatedConfig };
  });
}

export async function getSmartGlobalStatus() {
  return requireStaffPermission('settings', 'view', async () => {
    const disabled = (await redis.get('smart:disabled')) === 'true';
    return { success: true, disabled };
  });
}

export async function toggleSmartGlobalStatus(disabled: boolean) {
  return requireStaffPermission('settings', 'edit', async (admin) => {
    await redis.set('smart:disabled', String(disabled));

    const ipAddress = await getClientIp();
    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SMART_GLOBAL_TOGGLE',
      target: 'global',
      targetType: 'SETTINGS',
      oldValue: { disabled: !disabled },
      newValue: { disabled },
      ipAddress,
    });

    revalidatePath('/admin/smart');
    return { success: true, disabled };
  });
}
