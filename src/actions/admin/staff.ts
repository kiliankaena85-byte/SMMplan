'use server';

import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/server/rbac';
import { auditAdminAwaitable } from '@/lib/admin-audit';
import { getClientIp } from '@/utils/ip';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import crypto from 'crypto';
import { hashPassword } from '@/lib/auth/password';

export interface StaffActivityHour {
  hour: number; // 0..23
  count: number;
  isNight: boolean;
}

export interface StaffMemberSummary {
  id: string;
  email: string;
  role: string;
  staffRoleId: string | null;
  staffRoleName?: string;
  supportLimitCents: number;
  supportSpentTodayCents: number;
  isActive: boolean;
  allowedTenants: string[];
  createdAt: string;
  
  // Work shift & activity metrics for the day
  firstActionAt: string | null;
  lastActionAt: string | null;
  totalActionsToday: number;
  ticketsRepliedToday: number;
  hasNightActivity: boolean;
  maxIdleMinutes: number;
  activityHours: StaffActivityHour[];
}

export interface HumanReadableLog {
  id: string;
  action: string;
  actionTitle: string;
  actionDescription: string;
  target: string;
  targetType: string;
  iconType: 'ticket' | 'order' | 'money' | 'role' | 'auth' | 'settings' | 'night' | 'generic';
  isNightActivity: boolean;
  createdAt: string;
  ipAddress: string | null;
  oldValue: string | null;
  newValue: string | null;
}

// Action Title mapping to human-readable Russian
function translateActionToRussian(action: string, target: string, targetType: string): {
  title: string;
  description: string;
  iconType: HumanReadableLog['iconType'];
} {
  switch (action) {
    case 'REPLY_TICKET':
      return {
        title: `Ответ на тикет #${target}`,
        description: `Сотрудник отправил сообщение в тикет клиента`,
        iconType: 'ticket',
      };
    case 'CLOSE_TICKET':
      return {
        title: `Закрытие тикета #${target}`,
        description: `Тикет успешно решен и переведен в архив`,
        iconType: 'ticket',
      };
    case 'UPDATE_ORDER_STATUS':
      return {
        title: `Смена статуса заказа #${target}`,
        description: `Обновлен статус выполнения заказа`,
        iconType: 'order',
      };
    case 'REFILL_ORDER':
      return {
        title: `Гарантийный докрут (Refill) #${target}`,
        description: `Запущен повторный докрут услуг по гарантии`,
        iconType: 'order',
      };
    case 'REFUND_ORDER':
      return {
        title: `Оформлен возврат по заказу #${target}`,
        description: `Средства возвращены на баланс клиента`,
        iconType: 'money',
      };
    case 'UPDATE_TRUST_BUDGET':
      return {
        title: `Изменение лимита доверия`,
        description: `Установлен суточный лимит компенсаций для сотрудника`,
        iconType: 'money',
      };
    case 'UPDATE_USER_ROLE':
      return {
        title: `Смена роли пользователя`,
        description: `Изменены права доступа в системе`,
        iconType: 'role',
      };
    case 'UPDATE_SERVICE_PRICE':
      return {
        title: `Изменение тарифа услуги #${target}`,
        description: `Обновлена розничная цена услуги в каталоге`,
        iconType: 'settings',
      };
    case 'QUARANTINE_RELEASE':
      return {
        title: `Снятие услуги #${target} с карантина`,
        description: `Услуга проверена и разблокирована для клиентов`,
        iconType: 'settings',
      };
    case 'LOGIN_ADMIN':
      return {
        title: `Вход в панель управления`,
        description: `Успешная авторизация в системе`,
        iconType: 'auth',
      };
    case 'LOGOUT_ADMIN':
      return {
        title: `Выход из системы`,
        description: `Завершение рабочей сессии`,
        iconType: 'auth',
      };
    case 'ADJUST_BALANCE':
      return {
        title: `Корректировка баланса клиента #${target}`,
        description: `Ручное начисление / списание средств`,
        iconType: 'money',
      };
    default:
      return {
        title: `Действие: ${action}`,
        description: `Цель: [${targetType}] #${target}`,
        iconType: 'generic',
      };
  }
}

function getMskHour(date: Date): number {
  // Calculate hour in MSK (UTC+3)
  const mskTime = new Date(date.getTime() + 3 * 3600 * 1000);
  return mskTime.getUTCHours();
}

/**
 * Fetches all staff members with their 24h activity timeline and shift metrics in MSK time.
 */
export async function getStaffMembersWithMetrics(dateParam?: string, tenantParam?: string) {
  return requireStaffPermission('settings', 'view', async (admin) => {
    // Determine start and end of MSK day
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const mskNow = new Date(targetDate.getTime() + 3 * 3600 * 1000);
    const startOfDay = new Date(Date.UTC(mskNow.getUTCFullYear(), mskNow.getUTCMonth(), mskNow.getUTCDate(), -3, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(mskNow.getUTCFullYear(), mskNow.getUTCMonth(), mskNow.getUTCDate(), 20, 59, 59, 999));

    let cookieTenant: string | null = null;
    try {
      const { cookies } = await import('next/headers');
      const c = await cookies();
      cookieTenant = c.get('x_admin_tenant')?.value || null;
    } catch (cookieErr) {
      console.warn('[Staff] Could not read x_admin_tenant cookie in non-request context:', cookieErr);
    }

    const { resolveAdminTenantContext } = await import('@/utils/admin-tenant');
    const resolvedTenant = resolveAdminTenantContext(admin, tenantParam, cookieTenant);

    // Fetch all staff users (SUPPORT, MANAGER, ADMIN, OWNER or with staffRole)
    const staffUsers = await db.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { role: { in: ['SUPPORT', 'OPERATOR', 'MANAGER', 'ADMIN', 'OWNER'] } },
              { staffRoleId: { not: null } },
            ]
          },
          ...(resolvedTenant === 'all' ? [] : [{
            OR: [
              { tenantId: resolvedTenant },
              { allowedTenants: { has: resolvedTenant } }
            ]
          }])
        ]
      },
      include: {
        staffRole: true,
      },
      orderBy: [
        { role: 'asc' },
        { email: 'asc' },
      ],
    });

    // Fetch all audit logs for today for these staff members
    const staffIds = staffUsers.map((u) => u.id);
    const logsToday = await db.adminAuditLog.findMany({
      where: {
        adminId: { in: staffIds },
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group logs by staff member
    const logsByStaff = new Map<string, typeof logsToday>();
    for (const log of logsToday) {
      const list = logsByStaff.get(log.adminId) || [];
      list.push(log);
      logsByStaff.set(log.adminId, list);
    }

    const summaries: StaffMemberSummary[] = staffUsers.map((u) => {
      const userLogs = logsByStaff.get(u.id) || [];
      const totalActions = userLogs.length;

      // 24-hour activity distribution in MSK (UTC+3)
      const hoursMap = new Array<number>(24).fill(0);
      let ticketsReplied = 0;
      let hasNight = false;

      userLogs.forEach((log) => {
        const hour = getMskHour(log.createdAt);
        hoursMap[hour]++;

        // Night time in MSK: 23:00 to 06:00
        if (hour >= 23 || hour < 6) {
          hasNight = true;
        }

        if (log.action === 'REPLY_TICKET' || log.action === 'CLOSE_TICKET') {
          ticketsReplied++;
        }
      });

      const activityHours: StaffActivityHour[] = hoursMap.map((count, hour) => ({
        hour,
        count,
        isNight: hour >= 23 || hour < 6,
      }));

      // Calculate max idle gap between consecutive actions in minutes
      let maxIdle = 0;
      for (let i = 1; i < userLogs.length; i++) {
        const prevTime = new Date(userLogs[i - 1].createdAt).getTime();
        const currTime = new Date(userLogs[i].createdAt).getTime();
        const diffMinutes = Math.floor((currTime - prevTime) / 60000);
        if (diffMinutes > maxIdle) {
          maxIdle = diffMinutes;
        }
      }

      const firstAction = userLogs.length > 0 ? userLogs[0].createdAt.toISOString() : null;
      const lastAction = userLogs.length > 0 ? userLogs[userLogs.length - 1].createdAt.toISOString() : null;

      return {
        id: u.id,
        email: u.email,
        role: u.role,
        staffRoleId: u.staffRoleId,
        staffRoleName: u.staffRole?.name,
        supportLimitCents: u.supportLimitCents,
        supportSpentTodayCents: u.supportSpentTodayCents,
        isActive: u.isActive,
        allowedTenants: u.allowedTenants || [u.tenantId || 'smmplan'],
        createdAt: u.createdAt.toISOString(),
        firstActionAt: firstAction,
        lastActionAt: lastAction,
        totalActionsToday: totalActions,
        ticketsRepliedToday: ticketsReplied,
        hasNightActivity: hasNight,
        maxIdleMinutes: maxIdle,
        activityHours,
      };
    });

    return {
      success: true as const,
      data: summaries,
      date: startOfDay.toISOString().split('T')[0],
    };
  });
}

/**
 * Fetches chronological human-readable audit logs for a single staff member.
 */
export async function getStaffPersonalLogsAction(staffUserId: string, limit = 50) {
  return requireStaffPermission('settings', 'view', async () => {
    const logs = await db.adminAuditLog.findMany({
      where: { adminId: staffUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const readableLogs: HumanReadableLog[] = logs.map((log) => {
      const { title, description, iconType } = translateActionToRussian(
        log.action,
        log.target,
        log.targetType
      );

      const hour = new Date(log.createdAt).getHours();
      const isNight = hour >= 23 || hour < 6;

      return {
        id: log.id,
        action: log.action,
        actionTitle: title,
        actionDescription: description,
        target: log.target,
        targetType: log.targetType,
        iconType: isNight ? 'night' : iconType,
        isNightActivity: isNight,
        createdAt: log.createdAt.toISOString(),
        ipAddress: log.ipAddress,
        oldValue: log.oldValue,
        newValue: log.newValue,
      };
    });

    return {
      success: true as const,
      logs: readableLogs,
    };
  });
}

const updateStaffSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['SUPPORT', 'OPERATOR', 'MANAGER', 'ADMIN', 'OWNER', 'USER', 'BANNED']),
  staffRoleId: z.string().nullable().optional(),
  supportLimitRubles: z.number().min(0).max(100000),
  allowedTenants: z.array(z.string()).min(1, 'Сотрудник должен иметь доступ хотя бы к одной витрине').optional(),
});

function assertStaffTenantAccess(
  admin: { role: string; allowedTenants?: string[]; tenantId?: string | null },
  targetTenantId?: string | null
): { allowed: boolean; error?: string } {
  if (admin.role === 'OWNER') return { allowed: true };
  const adminAllowed = (admin.allowedTenants && admin.allowedTenants.length > 0)
    ? admin.allowedTenants
    : [admin.tenantId || 'smmplan'];
  if (targetTenantId && !adminAllowed.includes(targetTenantId)) {
    return { allowed: false, error: 'Запрещено управлять сотрудниками другого бренда' };
  }
  return { allowed: true };
}

export async function updateStaffMemberAction(input: z.infer<typeof updateStaffSchema>) {
  return requireStaffPermission('settings', 'edit', async (admin) => {
    const parsed = updateStaffSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || 'Некорректные параметры' };
    }

    // H-03 FIX 1: Prevent self-modification of role or limits
    if (admin.id === input.userId) {
      return { success: false as const, error: 'Запрещено изменять собственную роль или лимиты (Grant Ceiling)' };
    }

    const targetUser = await db.user.findUnique({ where: { id: input.userId } });
    if (!targetUser) {
      return { success: false as const, error: 'Сотрудник не найден' };
    }

    const tenantAccess = assertStaffTenantAccess(admin, targetUser.tenantId);
    if (!tenantAccess.allowed) {
      return { success: false as const, error: tenantAccess.error || 'Доступ запрещен' };
    }

    // H-03 FIX 2: Absolute protection for OWNER (cannot be demoted by anyone) and hierarchy guards
    if (targetUser.role === 'OWNER' && input.role !== 'OWNER') {
      return { success: false as const, error: 'Запрещено понижать роль Владельца платформы' };
    }
    if (targetUser.role === 'OWNER' && admin.role !== 'OWNER') {
      return { success: false as const, error: 'Запрещено изменять роль или параметры Владельца' };
    }
    if (targetUser.role === 'ADMIN' && admin.role !== 'OWNER') {
      return { success: false as const, error: 'Только Владелец может изменять профили Администраторов' };
    }
    // Staff roles (SUPPORT, MANAGER, OPERATOR, USER) cannot modify other staff members
    if (admin.role !== 'OWNER' && admin.role !== 'ADMIN') {
      return { success: false as const, error: 'У вас недостаточно прав для управления профилями сотрудников' };
    }

    // Only OWNER can promote to ADMIN/OWNER
    if (['ADMIN', 'OWNER'].includes(input.role) && admin.role !== 'OWNER') {
      return { success: false as const, error: 'Только Владелец может назначать Администраторов' };
    }

    // Multi-tenant boundary grant ceiling: staff cannot grant tenants outside their own allowedTenants
    if (input.allowedTenants && input.allowedTenants.length > 0) {
      if (admin.role !== 'OWNER') {
        const adminAllowed = (admin.allowedTenants && admin.allowedTenants.length > 0)
          ? admin.allowedTenants
          : [admin.tenantId || 'smmplan'];
        const hasUnauthorized = input.allowedTenants.some((t) => !adminAllowed.includes(t));
        if (hasUnauthorized) {
          return {
            success: false as const,
            error: 'Запрещено выдавать доступ к брендам, не входящим в ваши полномочия (Grant Ceiling)',
          };
        }
      }
    }

    const newLimitCents = Math.round(input.supportLimitRubles * 100);

    await db.user.update({
      where: { id: input.userId },
      data: {
        role: input.role,
        staffRoleId: input.staffRoleId || null,
        supportLimitCents: newLimitCents,
        ...(input.allowedTenants ? { allowedTenants: input.allowedTenants } : {}),
      },
    });

    const ipAddress = await getClientIp('unknown');
    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPDATE_USER_ROLE',
      target: input.userId,
      targetType: 'USER',
      oldValue: { role: targetUser.role, limit: targetUser.supportLimitCents },
      newValue: { role: input.role, limit: newLimitCents },
      ipAddress,
    });

    revalidatePath('/admin/staff');
    revalidatePath('/admin/settings');

    return { success: true as const };
  });
}

// ── Create New Staff Member or Promote Existing ──
const createStaffSchema = z.object({
  email: z.string().email('Некорректный email адрес'),
  role: z.enum(['SUPPORT', 'OPERATOR', 'MANAGER', 'ADMIN', 'OWNER']),
  staffRoleId: z.string().nullable().optional(),
  password: z.string().min(8, 'Пароль должен содержать минимум 8 символов').optional().or(z.literal('')),
  supportLimitRubles: z.number().min(0).max(100000).default(500),
  allowedTenants: z.array(z.string()).min(1, 'Выберите хотя бы один бренд').default(['smmplan', 'flux']),
  tenantId: z.string().optional(),
});

export async function createStaffMemberAction(input: z.infer<typeof createStaffSchema>) {
  return requireStaffPermission('settings', 'edit', async (admin) => {
    const parsed = createStaffSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || 'Некорректные параметры' };
    }

    const cleanEmail = parsed.data.email.toLowerCase().trim();

    // Grant Ceiling: only OWNER can create ADMIN or OWNER
    if (['ADMIN', 'OWNER'].includes(parsed.data.role) && admin.role !== 'OWNER') {
      return { success: false as const, error: 'Только Владелец платформы может назначать Администраторов и Владельцев' };
    }

    // Tenant grant ceiling check
    if (admin.role !== 'OWNER') {
      const adminAllowed = (admin.allowedTenants && admin.allowedTenants.length > 0)
        ? admin.allowedTenants
        : [admin.tenantId || 'smmplan'];
      const hasUnauthorized = parsed.data.allowedTenants.some((t) => !adminAllowed.includes(t));
      if (hasUnauthorized) {
        return { success: false as const, error: 'Запрещено выдавать доступ к брендам вне ваших полномочий' };
      }
    }

    const limitCents = Math.round(parsed.data.supportLimitRubles * 100);
    const passwordHash = parsed.data.password ? await hashPassword(parsed.data.password) : null;
    const targetTenant = parsed.data.tenantId || parsed.data.allowedTenants[0] || admin.tenantId || 'smmplan';

    // Check if user already exists in target tenant (Multi-tenant invariant)
    const existing = await db.user.findFirst({
      where: {
        email: cleanEmail,
        tenantId: targetTenant,
      },
    });

    let userId: string;

    if (existing) {
      if (existing.role === 'OWNER' && admin.role !== 'OWNER') {
        return { success: false as const, error: 'Запрещено изменять профиль Владельца' };
      }

      await db.user.update({
        where: { id: existing.id },
        data: {
          role: parsed.data.role,
          staffRoleId: parsed.data.staffRoleId || null,
          supportLimitCents: limitCents,
          allowedTenants: parsed.data.allowedTenants,
          isActive: true,
          isDeleted: false,
          ...(passwordHash ? { passwordHash } : {}),
        },
      });
      userId = existing.id;
    } else {
      const newUser = await db.user.create({
        data: {
          email: cleanEmail,
          role: parsed.data.role,
          staffRoleId: parsed.data.staffRoleId || null,
          supportLimitCents: limitCents,
          allowedTenants: parsed.data.allowedTenants,
          tenantId: targetTenant,
          passwordHash,
          isActive: true,
          isDeleted: false,
          isEmailVerified: true,
          tosAcceptedAt: new Date(),
        },
      });
      userId = newUser.id;
    }

    const ipAddress = await getClientIp('unknown');
    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: existing ? 'STAFF_PROMOTED' : 'STAFF_CREATED',
      target: userId,
      targetType: 'USER',
      newValue: { email: cleanEmail, role: parsed.data.role, limit: limitCents },
      ipAddress,
    });

    revalidatePath('/admin/staff');
    revalidatePath('/admin/settings');

    return { success: true as const, userId };
  });
}

// ── Toggle Active / Suspended Status ──
const toggleActiveSchema = z.object({
  userId: z.string().min(1),
  isActive: z.boolean(),
});

export async function toggleStaffActiveStatusAction(input: z.infer<typeof toggleActiveSchema>) {
  return requireStaffPermission('settings', 'edit', async (admin) => {
    const parsed = toggleActiveSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: 'Некорректные параметры' };
    }

    if (admin.id === parsed.data.userId) {
      return { success: false as const, error: 'Запрещено блокировать собственный аккаунт' };
    }

    const target = await db.user.findUnique({ where: { id: parsed.data.userId } });
    if (!target) {
      return { success: false as const, error: 'Сотрудник не найден' };
    }

    const tenantAccess = assertStaffTenantAccess(admin, target.tenantId);
    if (!tenantAccess.allowed) {
      return { success: false as const, error: tenantAccess.error || 'Доступ запрещен' };
    }

    if (target.role === 'OWNER') {
      return { success: false as const, error: 'Запрещено изменять статус Владельца платформы' };
    }
    if (target.role === 'ADMIN' && admin.role !== 'OWNER') {
      return { success: false as const, error: 'Только Владелец может изменять статус Администраторов' };
    }

    await db.user.update({
      where: { id: parsed.data.userId },
      data: { isActive: parsed.data.isActive },
    });

    const ipAddress = await getClientIp('unknown');
    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: parsed.data.isActive ? 'STAFF_ACTIVATED' : 'STAFF_SUSPENDED',
      target: parsed.data.userId,
      targetType: 'USER',
      oldValue: { isActive: target.isActive },
      newValue: { isActive: parsed.data.isActive },
      ipAddress,
    });

    revalidatePath('/admin/staff');
    revalidatePath('/admin/settings');

    return { success: true as const };
  });
}

// ── Generate One-Time Magic Link for Staff ──
const staffMagicLinkSchema = z.object({
  userId: z.string().min(1),
  redirectUrl: z.string().optional().default('/admin/dashboard'),
});

export async function generateStaffMagicLinkAction(input: z.infer<typeof staffMagicLinkSchema>) {
  return requireStaffPermission('settings', 'edit', async (admin) => {
    const parsed = staffMagicLinkSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: 'Некорректные параметры' };
    }

    const target = await db.user.findUnique({ where: { id: parsed.data.userId } });
    if (!target) {
      return { success: false as const, error: 'Сотрудник не найден' };
    }

    const tenantAccess = assertStaffTenantAccess(admin, target.tenantId);
    if (!tenantAccess.allowed) {
      return { success: false as const, error: tenantAccess.error || 'Доступ запрещен' };
    }

    if (target.role === 'OWNER' && admin.role !== 'OWNER') {
      return { success: false as const, error: 'Только Владелец может генерировать ссылки для Владельца' };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours TTL
    const clientIp = await getClientIp('127.0.0.1');

    await db.authToken.create({
      data: {
        userId: target.id,
        token: hashedToken,
        tenantId: target.tenantId || 'smmplan',
        expiresAt,
        ipIssued: clientIp,
        userAgentIssued: 'Staff Hub Generator',
      },
    });

    const redirectPath = parsed.data.redirectUrl || '/admin/dashboard';
    const relativeLink = `/api/auth/verify?token=${rawToken}&redirect=${encodeURIComponent(redirectPath)}`;

    return {
      success: true as const,
      relativeLink,
      rawToken,
      expiresAt: expiresAt.toISOString(),
      staffEmail: target.email,
    };
  });
}

// ── Reset / Set Staff Password ──
const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(8, 'Пароль должен быть не менее 8 символов'),
});

export async function resetStaffPasswordAction(input: z.infer<typeof resetPasswordSchema>) {
  return requireStaffPermission('settings', 'edit', async (admin) => {
    const parsed = resetPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || 'Некорректные параметры' };
    }

    const target = await db.user.findUnique({ where: { id: parsed.data.userId } });
    if (!target) {
      return { success: false as const, error: 'Сотрудник не найден' };
    }

    const resetTenantAccess = assertStaffTenantAccess(admin, target.tenantId);
    if (!resetTenantAccess.allowed) {
      return { success: false as const, error: resetTenantAccess.error || 'Доступ запрещен' };
    }

    if (target.role === 'OWNER' && admin.role !== 'OWNER') {
      return { success: false as const, error: 'Только Владелец может сбрасывать пароль Владельца' };
    }
    if (target.role === 'ADMIN' && admin.role !== 'OWNER') {
      return { success: false as const, error: 'Только Владелец может изменять пароли Администраторов' };
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);

    await db.user.update({
      where: { id: parsed.data.userId },
      data: { passwordHash },
    });

    const ipAddress = await getClientIp('unknown');
    await auditAdminAwaitable({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'STAFF_PASSWORD_RESET',
      target: parsed.data.userId,
      targetType: 'USER',
      ipAddress,
    });

    return { success: true as const };
  });
}

