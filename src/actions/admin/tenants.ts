'use server';

import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { requireStaffPermission } from '@/lib/server/rbac';
import { auditAdminAwaitable } from '@/lib/admin-audit';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { normalizeTenantId } from '@/lib/tenant-resolver-edge';
import { sendAdminAlert } from '@/lib/notifications';

const CreateTenantSchema = z.object({
  name: z.string().min(2, 'Название бренда должно быть не менее 2 символов').max(60),
  slug: z.string()
    .min(2, 'Идентификатор slug должен быть не менее 2 символов')
    .max(30)
    .regex(/^[a-z0-9-]+$/, 'Slug может содержать только строчные латинские буквы, цифры и дефис'),
  domain: z.string()
    .min(3, 'Доменное имя должно быть указано')
    .max(100)
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, 'Укажите корректный домен (например, smmflux.ru)'),
  customDomain: z.string().max(100).optional().nullable(),
  themeVariant: z.enum(['classic', 'vibrant', 'minimal']).default('classic'),
});

const UpdateTenantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(60),
  domain: z.string().min(3).max(100),
  customDomain: z.string().max(100).optional().nullable(),
  isActive: z.boolean(),
});

export async function listTenantsAction() {
  return requireStaffPermission('settings', 'view', async () => {
    try {
      const tenants = await db.tenant.findMany({
        orderBy: { createdAt: 'asc' },
        include: {
          systemSettings: {
            select: {
              siteName: true,
              siteDescription: true,
              siteLogoUrl: true,
              siteFaviconUrl: true,
              isTestMode: true,
              maintenanceMode: true,
            }
          }
        }
      });

      return { success: true, data: tenants };
    } catch (error) {
      console.error('[TenantsAction] Failed to list tenants:', error);
      return { success: false, error: 'Не удалось загрузить список брендов', data: [] };
    }
  });
}

export async function createTenantAction(formData: z.infer<typeof CreateTenantSchema>) {
  return requireStaffPermission('settings', 'edit', async (staffUser) => {
    const parsed = CreateTenantSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Невалидные данные' };
    }

    const { name, slug, domain, customDomain } = parsed.data;
    const cleanDomain = domain.toLowerCase().trim();
    const cleanSlug = slug.toLowerCase().trim();

    // Check unique constraints
    const existing = await db.tenant.findFirst({
      where: {
        OR: [
          { slug: cleanSlug },
          { domain: cleanDomain }
        ]
      }
    });

    if (existing) {
      return { success: false, error: 'Бренд с таким slug или доменом уже зарегистрирован' };
    }

    try {
      const tenant = await db.tenant.create({
        data: {
          id: cleanSlug,
          slug: cleanSlug,
          name: name.trim(),
          domain: cleanDomain,
          customDomain: customDomain?.toLowerCase().trim() || null,
          isActive: true,
          systemSettings: {
            create: {
              siteName: name.trim(),
              siteDescription: `Оптовая платформа продвижения в соцсетях ${name.trim()}`,
              welcomeMessage: `Добро пожаловать в ${name.trim()}! Ваш личный кабинет готов.`,
              taxRate: 6.0,
              isTestMode: false,
            }
          }
        }
      });

      await auditAdminAwaitable({
        adminId: staffUser.id,
        adminEmail: staffUser.email,
        action: 'TENANT_CREATE',
        target: tenant.id,
        targetType: 'Tenant',
        newValue: { name, slug: cleanSlug, domain: cleanDomain },
      });

      sendAdminAlert(
        `🏢 <b>СОЗДАН НОВЫЙ ТЕНАНТ / БРЕНД</b>\n` +
        `<b>Название:</b> ${name}\n` +
        `<b>Slug / ID:</b> <code>${cleanSlug}</code>\n` +
        `<b>Домен:</b> <code>${cleanDomain}</code>\n` +
        `<b>Сотрудник:</b> ${staffUser.email}`,
        'INFO',
        cleanSlug
      );

      revalidatePath('/admin/tenants');
      return { success: true, data: tenant };
    } catch (error) {
      console.error('[TenantsAction] Failed to create tenant:', error);
      return { success: false, error: 'Ошибка создания тенанта в базе данных' };
    }
  });
}

export async function updateTenantAction(formData: z.infer<typeof UpdateTenantSchema>) {
  return requireStaffPermission('settings', 'edit', async (staffUser) => {
    const parsed = UpdateTenantSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Невалидные данные' };
    }

    const { id, name, domain, customDomain, isActive } = parsed.data;

    try {
      const oldTenant = await db.tenant.findUnique({ where: { id } });
      if (!oldTenant) {
        return { success: false, error: 'Тенант не найден' };
      }

      const updated = await db.tenant.update({
        where: { id },
        data: {
          name: name.trim(),
          domain: domain.toLowerCase().trim(),
          customDomain: customDomain?.toLowerCase().trim() || null,
          isActive,
        }
      });

      await auditAdminAwaitable({
        adminId: staffUser.id,
        adminEmail: staffUser.email,
        action: 'TENANT_UPDATE',
        target: id,
        targetType: 'Tenant',
        oldValue: { name: oldTenant.name, domain: oldTenant.domain, isActive: oldTenant.isActive },
        newValue: { name, domain, isActive },
      });

      revalidatePath('/admin/tenants');
      return { success: true, data: updated };
    } catch (error) {
      console.error('[TenantsAction] Failed to update tenant:', error);
      return { success: false, error: 'Ошибка обновления тенанта' };
    }
  });
}

export async function toggleTenantStatusAction(id: string, isActive: boolean) {
  return requireStaffPermission('settings', 'edit', async (staffUser) => {
    if ((id === 'smmplan' || id === 'flux') && !isActive) {
      return { success: false, error: 'Нельзя деактивировать системный базовый бренд' };
    }

    try {
      const updated = await db.tenant.update({
        where: { id },
        data: { isActive }
      });

      await auditAdminAwaitable({
        adminId: staffUser.id,
        adminEmail: staffUser.email,
        action: 'TENANT_STATUS_TOGGLE',
        target: id,
        targetType: 'Tenant',
        newValue: { isActive },
      });

      sendAdminAlert(
        `🚨 <b>СТАТУС ТЕНАНТА ИЗМЕНЁН</b>\n` +
        `<b>Тенант:</b> <code>${id}</code>\n` +
        `<b>Статус:</b> ${isActive ? '🟢 АКТИВЕН' : '🔴 ДЕАКТИВИРОВАН'}\n` +
        `<b>Сотрудник:</b> ${staffUser.email}`,
        isActive ? 'INFO' : 'CRITICAL',
        id
      );

      revalidatePath('/admin/tenants');
      return { success: true, data: updated };
    } catch (error) {
      console.error('[TenantsAction] Failed to toggle tenant status:', error);
      return { success: false, error: 'Ошибка изменения статуса тенанта' };
    }
  });
}

export async function toggleTenantMaintenanceAction(id: string, maintenanceMode: boolean) {
  return requireStaffPermission('settings', 'edit', async (staffUser) => {
    try {
      const { SettingsProvider } = await import('@/lib/settings');
      await SettingsProvider.setMaintenanceMode(maintenanceMode, id);

      await auditAdminAwaitable({
        adminId: staffUser.id,
        adminEmail: staffUser.email,
        action: 'TENANT_MAINTENANCE_TOGGLE',
        target: id,
        targetType: 'Tenant',
        newValue: { maintenanceMode },
      });

      revalidatePath('/admin/tenants');
      revalidatePath('/', 'layout');
      return { success: true };
    } catch (error) {
      console.error('[TenantsAction] Failed to toggle tenant maintenance:', error);
      return { success: false, error: 'Ошибка переключения режима техработ' };
    }
  });
}

export async function deleteTenantAction(id: string) {
  const session = await verifySession();
  if (!session || session.role !== 'OWNER') {
    return { success: false, error: 'Удаление брендов доступно только Владельцу (OWNER)' };
  }

  if (id === 'smmplan' || id === 'flux') {
    return { success: false, error: 'Запрещено удалять системные базовые бренды (smmplan, flux)' };
  }

  try {
    await db.tenant.delete({ where: { id } });

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { email: true }
    });

    await auditAdminAwaitable({
      adminId: session.userId,
      adminEmail: user?.email || 'owner@smmplan.pro',
      action: 'TENANT_DELETE',
      target: id,
      targetType: 'Tenant',
    });

    revalidatePath('/admin/tenants');
    return { success: true };
  } catch (error) {
    console.error('[TenantsAction] Failed to delete tenant:', error);
    return { success: false, error: 'Ошибка удаления тенанта (проверьте связанные данные)' };
  }
}

/**
 * Explicit and secure Server Action for switching the active administrative tenant.
 * Sets the x_admin_tenant cookie on the server side and invalidates the layout cache.
 */
export async function switchAdminTenantAction(tenantId: string) {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: 'Необходима авторизация' };
  }

  const STAFF_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT', 'OPERATOR'];
  if (!session.role || !STAFF_ROLES.includes(session.role)) {
    return { success: false, error: 'Доступ запрещён: требуется роль сотрудника' };
  }

  const normalized = normalizeTenantId(tenantId) || 'smmplan';
  const cookieStore = await cookies();
  cookieStore.set('x_admin_tenant', normalized, {
    path: '/',
    maxAge: 31536000, // 1 year
    sameSite: 'lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
  });

  revalidatePath('/admin', 'layout');
  revalidatePath('/', 'layout');

  return { success: true, tenantId: normalized };
}
