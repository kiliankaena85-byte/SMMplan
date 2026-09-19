'use server';

import { db } from '@/lib/db';
import { auditAdmin, auditAdminAwaitable } from '@/lib/admin-audit';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStaffPermission } from '@/lib/server/rbac';
import { createRoleSchema } from '@/validators/admin.validators';
import { getClientIp } from '@/utils/ip';
import {
  createRoleAction,
  updateSingleRolePermissionAction,
  deleteRoleAction,
} from '@/actions/admin/roles';
import { RBAC_SECTIONS } from '@/lib/rbac-sections';

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

    // Self-modification guard
    if (userId === admin.id) {
      return { success: false as const, error: 'Запрещено изменять собственный лимит доверия' };
    }

    const target = await db.user.findUnique({ where: { id: userId } });
    if (!target) return { success: false as const, error: 'Пользователь не найден' };

    // Hierarchy Guard: Non-OWNER cannot change parameters of OWNER or ADMIN
    if (target.role === 'OWNER' && admin.role !== 'OWNER') {
      return { success: false as const, error: 'Запрещено изменять параметры Владельца' };
    }
    if (target.role === 'ADMIN' && admin.role !== 'OWNER') {
      return { success: false as const, error: 'Только Владелец может изменять параметры Администратора' };
    }

    await db.user.update({
      where: { id: userId },
      data: { supportLimitCents: limitCents },
    });

    const ipAddress = await getClientIp('unknown');
    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPDATE_TRUST_BUDGET',
      target: userId,
      targetType: 'USER',
      oldValue: { limit: target.supportLimitCents },
      newValue: { limit: limitCents },
      ipAddress
    });

    revalidatePath('/admin/settings');
    return { success: true as const };
  });
}

// ── Create Custom Staff Role ──
export async function createStaffRoleAction(formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  const parsed = createRoleSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message || 'Некорректные параметры' };
  }

  const { name, description } = parsed.data;

  // Canonical matrix: initialize all canonical sections with fail-safe defaults
  const permissions = RBAC_SECTIONS.map((sec) => ({
    section: sec.id,
    canView: false,
    canEdit: false,
  }));

  const res = await createRoleAction({
    name,
    description: description || '',
    permissions,
    allowedTenants: ['smmplan'],
  });

  if (!res.success) {
    return { success: false as const, error: res.error };
  }

  return { success: true as const, role: res.role };
}

// ── Toggle Granular Section Permissions ──
const updatePermissionsSchema = z.object({
  roleId: z.string().min(1, 'roleId обязателен'),
  section: z.string().min(1, 'section обязателен'),
  canView: z.boolean().default(false),
  canEdit: z.boolean().default(false),
});

export async function updateStaffRolePermissionsAction(formData: FormData) {
  const rawPayload = {
    roleId: formData.get('roleId'),
    section: formData.get('section'),
    canView: formData.get('canView') === 'true' || formData.get('canView') === 'on',
    canEdit: formData.get('canEdit') === 'true' || formData.get('canEdit') === 'on',
  };
  const parsed = updatePermissionsSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message || 'Некорректные параметры' };
  }

  const { roleId, section, canView, canEdit } = parsed.data;

  const res = await updateSingleRolePermissionAction({
    roleId,
    section,
    canView,
    canEdit,
  });

  if (!res.success) {
    return { success: false as const, error: res.error };
  }

  return { success: true as const };
}

// ── Delete Custom Staff Role ──
const deleteRoleSchema = z.object({
  roleId: z.string().min(1, 'roleId обязателен'),
});

export async function deleteStaffRoleAction(formData: FormData) {
  const parsed = deleteRoleSchema.safeParse({ roleId: formData.get('roleId') });
  if (!parsed.success) return { success: false as const, error: parsed.error.errors[0]?.message || 'Некорректные параметры' };
  const { roleId } = parsed.data;

  const res = await deleteRoleAction({ id: roleId });
  if (!res.success) {
    return { success: false as const, error: res.error };
  }

  return { success: true as const };
}

// ── Remove Staff Member (Demote to USER) ──
const removeStaffSchema = z.object({
  userId: z.string().min(1, 'userId обязателен'),
});

export async function removeStaffMemberAction(formData: FormData) {
  return requireStaffPermission('settings', 'edit', async (admin) => {
    const parsed = removeStaffSchema.safeParse({ userId: formData.get('userId') });
    if (!parsed.success) {
      return { success: false as const, error: 'Некорректные параметры' };
    }

    const { userId } = parsed.data;

    // SECURITY: Cannot demote yourself
    if (userId === admin.id) {
      return { success: false as const, error: 'Нельзя разжаловать самого себя' };
    }

    const target = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, staffRoleId: true },
    });

    if (!target) {
      return { success: false as const, error: 'Пользователь не найден' };
    }

    // SECURITY: Grant Ceiling — ADMIN cannot demote OWNERs or other ADMINs
    if (['OWNER', 'ADMIN'].includes(target.role) && admin.role !== 'OWNER') {
      return { success: false as const, error: 'Только Владелец может разжаловать Администраторов и Владельцев' };
    }

    // SECURITY: Only OWNER or ADMIN can demote staff
    if (!['OWNER', 'ADMIN'].includes(admin.role)) {
      return { success: false as const, error: 'Недостаточно прав для разжалования сотрудника' };
    }

    const ipAddress = await getClientIp('unknown');

    await db.user.update({
      where: { id: userId },
      data: {
        role: 'USER',
        staffRoleId: null,
      },
    });

    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'STAFF_DEMOTED',
      target: userId,
      targetType: 'USER',
      oldValue: { role: target.role, staffRoleId: target.staffRoleId, email: target.email },
      newValue: { role: 'USER', staffRoleId: null },
      ipAddress,
    });

    revalidatePath('/admin/settings');
    return { success: true as const };
  });
}
