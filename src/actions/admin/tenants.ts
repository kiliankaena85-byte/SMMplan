'use server';

import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { auditAdminAwaitable } from '@/lib/admin-audit';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const ADMIN_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'];

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

async function getAdminEmail(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true }
  });
  return user?.email || 'admin@smmplan.pro';
}

export async function listTenantsAction() {
  const session = await verifySession();
  if (!session?.role || !ADMIN_ROLES.includes(session.role)) {
    return { success: false, error: 'Unauthorized', data: [] };
  }

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
}

export async function createTenantAction(formData: z.infer<typeof CreateTenantSchema>) {
  const session = await verifySession();
  if (!session?.role || !ADMIN_ROLES.includes(session.role)) {
    return { success: false, error: 'Доступ запрещен' };
  }

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
            siteDescription: `Оптовая B2B платформа продвижения в соцсетях ${name.trim()}`,
            welcomeMessage: `Добро пожаловать в ${name.trim()}! Ваш личный кабинет готов.`,
            taxRate: 6.0,
            isTestMode: false,
          }
        }
      }
    });

    const adminEmail = await getAdminEmail(session.userId);
    await auditAdminAwaitable({
      adminId: session.userId,
      adminEmail,
      action: 'TENANT_CREATE',
      target: tenant.id,
      targetType: 'Tenant',
      newValue: { name, slug: cleanSlug, domain: cleanDomain },
    });

    revalidatePath('/admin/tenants');
    return { success: true, data: tenant };
  } catch (error) {
    console.error('[TenantsAction] Failed to create tenant:', error);
    return { success: false, error: 'Ошибка создания тенанта в базе данных' };
  }
}

export async function updateTenantAction(formData: z.infer<typeof UpdateTenantSchema>) {
  const session = await verifySession();
  if (!session?.role || !ADMIN_ROLES.includes(session.role)) {
    return { success: false, error: 'Доступ запрещен' };
  }

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

    const adminEmail = await getAdminEmail(session.userId);
    await auditAdminAwaitable({
      adminId: session.userId,
      adminEmail,
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
}

export async function toggleTenantStatusAction(id: string, isActive: boolean) {
  const session = await verifySession();
  if (!session?.role || !ADMIN_ROLES.includes(session.role)) {
    return { success: false, error: 'Доступ запрещен' };
  }

  if ((id === 'smmplan' || id === 'flux') && !isActive) {
    return { success: false, error: 'Нельзя деактивировать системный базовый бренд' };
  }

  try {
    const updated = await db.tenant.update({
      where: { id },
      data: { isActive }
    });

    const adminEmail = await getAdminEmail(session.userId);
    await auditAdminAwaitable({
      adminId: session.userId,
      adminEmail,
      action: 'TENANT_STATUS_TOGGLE',
      target: id,
      targetType: 'Tenant',
      newValue: { isActive },
    });

    revalidatePath('/admin/tenants');
    return { success: true, data: updated };
  } catch (error) {
    console.error('[TenantsAction] Failed to toggle tenant status:', error);
    return { success: false, error: 'Ошибка изменения статуса тенанта' };
  }
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

    const adminEmail = await getAdminEmail(session.userId);
    await auditAdminAwaitable({
      adminId: session.userId,
      adminEmail,
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
