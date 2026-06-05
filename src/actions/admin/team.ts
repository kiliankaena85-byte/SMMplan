'use server';

import { db } from '@/lib/db';
import { auditAdmin, auditAdminAwaitable } from '@/lib/admin-audit';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStaffPermission } from '@/lib/server/rbac';
import { createRoleSchema } from '@/validators/admin.validators';
import { getClientIp } from '@/utils/ip';

const limitSchema = z.object({
  userId: z.string().min(1),
  limit: z.coerce.number().int().min(0, "Лимит не может быть отрицательным").max(10000000, "Превышен максимальный лимит доверия (100 тыс. рублей)"),
});

// ── Update Trust Budget Cents ──
export async function updateSupportLimit(formData: FormData) {
  return requireStaffPermission('settings', 'edit', async (admin) => {
    // Only OWNER and ADMIN can change limits
    if (!['OWNER', 'ADMIN'].includes(admin.role)) {
      return { success: false as const, error: 'Только Владелец или Админ могут менять лимиты доверия' };
    }

    const payload = Object.fromEntries(formData.entries());
    const parsed = limitSchema.safeParse(payload);
    
    if (!parsed.success) {
      return { success: false as const, error: 'Некорректные параметры' };
    }

    const { userId, limit: limitCents } = parsed.data;

    const target = await db.user.findUnique({ where: { id: userId } });
    if (!target) return { success: false as const, error: 'Пользователь не найден' };

    await db.user.update({
      where: { id: userId },
      data: { supportLimitCents: limitCents },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPDATE_TRUST_BUDGET',
      target: userId,
      targetType: 'USER',
      oldValue: { limit: target.supportLimitCents },
      newValue: { limit: limitCents },
    });

    revalidatePath('/admin/settings');
    return { success: true as const };
  });
}

// ── Create Custom Staff Role ──
export async function createStaffRoleAction(formData: FormData) {
  return requireStaffPermission('settings', 'edit', async (admin) => {
    // SECURITY: Only OWNER can manage roles definitions
    if (admin.role !== 'OWNER') {
      return { success: false as const, error: 'Только Владелец может создавать кастомные роли' };
    }

    const payload = Object.fromEntries(formData.entries());
    const parsed = createRoleSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.errors[0]?.message || 'Некорректные параметры' };
    }

    const { name, description } = parsed.data;

    // Check unique name
    const existing = await db.staffRole.findUnique({ where: { name } });
    if (existing) {
      return { success: false as const, error: 'Роль с таким названием уже существует' };
    }

    const ipAddress = await getClientIp('unknown');

    // Create Role + Default empty Permissions (Fail-Safe Defaults)
    const newRole = await db.$transaction(async (tx) => {
      const role = await tx.staffRole.create({
        data: {
          name,
          description: description || '',
          isSystem: false,
        }
      });

      const sections = ['orders', 'finance', 'catalog', 'settings'];
      await tx.staffPermission.createMany({
        data: sections.map(sec => ({
          roleId: role.id,
          section: sec,
          canView: false,
          canEdit: false,
        }))
      });

      return role;
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'CREATE_STAFF_ROLE',
      target: newRole.id,
      targetType: 'ROLE',
      newValue: { name: newRole.name, description: newRole.description },
      ipAddress
    });

    revalidatePath('/admin/settings');
    return { success: true as const };
  });
}

// ── Toggle Granular Section Permissions ──
export async function updateStaffRolePermissionsAction(formData: FormData) {
  return requireStaffPermission('settings', 'edit', async (admin) => {
    // SECURITY: Only OWNER can edit permissions
    if (admin.role !== 'OWNER') {
      return { success: false as const, error: 'Только Владелец может изменять права ролей' };
    }

    const roleId = formData.get('roleId') as string;
    const section = formData.get('section') as string;
    const canViewVal = formData.get('canView') === 'true' || formData.get('canView') === 'on';
    const canEditVal = formData.get('canEdit') === 'true' || formData.get('canEdit') === 'on';

    if (!roleId || !section) {
      return { success: false as const, error: 'Некорректные параметры' };
    }

    const role = await db.staffRole.findUnique({ where: { id: roleId } });
    if (!role) {
      return { success: false as const, error: 'Роль не найдена' };
    }

    const ipAddress = await getClientIp('unknown');

    const existingPermission = await db.staffPermission.findUnique({
      where: { roleId_section: { roleId, section } }
    });

    await db.staffPermission.upsert({
      where: { roleId_section: { roleId, section } },
      update: {
        canView: canViewVal,
        canEdit: canEditVal
      },
      create: {
        roleId,
        section,
        canView: canViewVal,
        canEdit: canEditVal
      }
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPDATE_STAFF_ROLE_PERMISSIONS',
      target: roleId,
      targetType: 'ROLE',
      oldValue: existingPermission ? { canView: existingPermission.canView, canEdit: existingPermission.canEdit } : {},
      newValue: { section, canView: canViewVal, canEdit: canEditVal },
      ipAddress
    });

    revalidatePath('/admin/settings');
    return { success: true as const };
  });
}

// ── Delete Custom Staff Role ──
export async function deleteStaffRoleAction(formData: FormData) {
  return requireStaffPermission('settings', 'edit', async (admin) => {
    // SECURITY: Only OWNER can delete roles
    if (admin.role !== 'OWNER') {
      return { success: false as const, error: 'Только Владелец может удалять роли' };
    }

    const roleId = formData.get('roleId') as string;
    if (!roleId) return { success: false as const, error: 'Некорректные параметры' };

    const role = await db.staffRole.findUnique({ where: { id: roleId } });
    if (!role) return { success: false as const, error: 'Роль не найдена' };

    if (role.isSystem) {
      return { success: false as const, error: 'Нельзя удалять системные роли' };
    }

    const ipAddress = await getClientIp('unknown');

    await db.staffRole.delete({ where: { id: roleId } });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'DELETE_STAFF_ROLE',
      target: roleId,
      targetType: 'ROLE',
      oldValue: { name: role.name },
      newValue: {},
      ipAddress
    });

    revalidatePath('/admin/settings');
    return { success: true as const };
  });
}
