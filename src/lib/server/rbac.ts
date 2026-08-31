import { db } from "@/lib/db";
import { verifySession } from "@/lib/session";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { User, StaffRole, StaffPermission } from "@prisma/client";
import { handleServerError } from "@/utils/error-handler";

async function getSessionUserId(): Promise<string | null> {
  const sessionUser = await verifySession();
  return sessionUser ? sessionUser.userId : null;
}

export type StaffPermissionSection = 
  | 'clients'
  | 'orders'
  | 'catalog'
  | 'providers'
  | 'finance'
  | 'content'
  | 'support'
  | 'marketing'
  | 'analytics'
  | 'settings'
  | 'balance_requests'
  | 'balance_approvals'
  | 'balance_stats'
  | 'balance_policy'
  | 'tickets';

/**
 * Strict RBAC Wrapper for Server Actions
 * Protects actions based on the user's assigned StaffRole and granular permissions.
 */
export async function requireStaffPermission<T>(
  section: StaffPermissionSection | string,
  actionMode: 'view' | 'edit',
  action: (user: User, role?: StaffRole | null, tenantId?: string) => Promise<T>
): Promise<T | { success: false; error: string }> {
  try {
    const userId = await getSessionUserId();
    
    if (!userId) {
       console.warn("[RBAC] Blocked unauthorized attempt to execute Admin Action");
       return { success: false, error: "Unauthorized access" };
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        staffRole: {
          include: { permissions: true }
        }
      }
    });

    if (!user || user.role === 'BANNED' || user.role === 'USER') {
      console.warn(`[RBAC] Blocked unauthorized role "${user?.role}" for userId ${userId}`);
      return { success: false, error: "Forbidden: Administrator/Staff context required" };
    }

    const tenantId = user.tenantId ?? 'smmplan';

    // OWNER & ADMIN bypass
    if (user.role === 'OWNER' || user.role === 'ADMIN') {
      return await action(user, user.staffRole, tenantId);
    }

    // Requires StaffRole for granular permissions
    if (!user.staffRole) {
       console.error(`[RBAC] User ${userId} attempted to execute Admin Action without StaffRole.`);
       return { success: false, error: "Forbidden: Administrator/Staff context required" };
    }

    const normalizedSection = section.toUpperCase();
    const permission = user.staffRole.permissions.find(p => p.section.toUpperCase() === normalizedSection);
    
    if (!permission) {
        import('@/services/security/security-alert.service').then(({ SecurityAlertService }) => {
          SecurityAlertService.record({
            event: 'STAFF_PERMISSION_VIOLATION',
            severity: 'HIGH',
            tenantId,
            details: {
              staffUserId: user.id,
              staffEmail: user.email,
              role: user.role,
              targetSection: section,
              actionMode,
              reason: 'No permission entry for section'
            }
          }).catch(() => {});
        }).catch(() => {});
        return { success: false, error: `Forbidden: No permissions for section [${section}]` };
    }

    if (actionMode === 'edit' && !permission.canEdit) {
        import('@/services/security/security-alert.service').then(({ SecurityAlertService }) => {
          SecurityAlertService.record({
            event: 'STAFF_PERMISSION_VIOLATION',
            severity: 'HIGH',
            tenantId,
            details: {
              staffUserId: user.id,
              staffEmail: user.email,
              role: user.role,
              targetSection: section,
              actionMode,
              reason: 'No edit permission for section'
            }
          }).catch(() => {});
        }).catch(() => {});
        return { success: false, error: `Forbidden: Cannot modify [${section}]` };
    }

    if (actionMode === 'view' && !permission.canView && !permission.canEdit) {
        import('@/services/security/security-alert.service').then(({ SecurityAlertService }) => {
          SecurityAlertService.record({
            event: 'STAFF_PERMISSION_VIOLATION',
            severity: 'HIGH',
            tenantId,
            details: {
              staffUserId: user.id,
              staffEmail: user.email,
              role: user.role,
              targetSection: section,
              actionMode,
              reason: 'No view permission for section'
            }
          }).catch(() => {});
        }).catch(() => {});
        return { success: false, error: `Forbidden: Cannot view [${section}]` };
    }

    return await action(user, user.staffRole, tenantId);
  } catch (error: unknown) {
    console.error("[RBAC] Execution Error:", error);
    const localized = handleServerError(error);
    return { success: false, error: localized.message };
  }
}

// W3-3 SECURITY FIX: Strict guard for OWNER-only operations (e.g. settings changes, ownership transfers)
export async function requireOwnerPermission<T>(
  action: (user: User, tenantId?: string) => Promise<T>
): Promise<T | { success: false; error: string }> {
  try {
    const userId = await getSessionUserId();
    if (!userId) return { success: false, error: "Unauthorized access" };

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: "Forbidden: User not found" };

    const tenantId = user.tenantId ?? 'smmplan';

    if (user.role !== 'OWNER') {
       console.warn(`[RBAC] User ${userId} attempted to execute OWNER Action but has role ${user.role}`);
       import('@/services/security/security-alert.service').then(({ SecurityAlertService }) => {
         SecurityAlertService.record({
           event: 'UNAUTHORIZED_OWNER_ACTION_ATTEMPT',
           severity: 'CRITICAL',
           tenantId,
           details: {
             staffUserId: user.id,
             staffEmail: user.email,
             role: user.role,
             reason: 'Non-owner attempted OWNER-only action'
           }
         }).catch(() => {});
       }).catch(() => {});
       return { success: false, error: "Forbidden: OWNER context required" };
    }

    return await action(user, tenantId);
  } catch (error: unknown) {
    console.error("[RBAC] Execution Error:", error);
    const localized = handleServerError(error);
    return { success: false, error: localized.message };
  }
}



import { redirect } from "next/navigation";

/**
 * Validates the user's role against the allowed list.
 * Meant to be executed strictly at the top level of Server Components (page.tsx, layout.tsx).
 * Throws a redirect standard exception if the user is unauthorized.
 */
export async function enforcePageRole(allowedRoles: string[]) {
  const userId = await getSessionUserId();
  
  if (!userId) {
    redirect('/login');
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isDeleted: true, isActive: true, tenantId: true }
  });

  if (!user || user.isDeleted || !user.isActive) {
    redirect('/login');
  }

  if (!allowedRoles.includes(user.role)) {
    redirect('/admin/forbidden');
  }

  return user;
}

/**
 * Validates the user's granular StaffRole permissions for a specific section.
 * Meant to be executed in Server Components.
 */
export async function enforceSectionAccess(section: string) {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect('/login');
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      staffRole: {
        include: { permissions: true }
      }
    }
  });

  if (!user || user.role === 'BANNED' || user.role === 'USER' || user.isDeleted || !user.isActive) {
    redirect('/login');
  }

  // OWNER & ADMIN bypass
  if (user.role === 'OWNER' || user.role === 'ADMIN') {
    return user;
  }

  if (!user.staffRole) {
    redirect('/admin/forbidden');
  }

  const normalizedSection = section.toUpperCase();
  const permission = user.staffRole.permissions.find(p => p.section.toUpperCase() === normalizedSection);

  if (!permission || (!permission.canView && !permission.canEdit)) {
    redirect('/admin/forbidden');
  }

  return user;
}

/**
 * AUD-09 (4.1): coarse layout gate — passes if the user has access to ANY of
 * the given sections. Individual pages under the layout then enforce their own
 * specific section (e.g. /admin/providers/** requires 'providers', while the
 * nested import wizard requires 'catalog').
 *
 * OWNER & ADMIN bypass as usual.
 */
export async function enforceAnySectionAccess(sections: string[]) {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect('/login');
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      staffRole: {
        include: { permissions: true }
      }
    }
  });

  if (!user || user.role === 'BANNED' || user.role === 'USER' || user.isDeleted || !user.isActive) {
    redirect('/login');
  }

  // OWNER & ADMIN bypass
  if (user.role === 'OWNER' || user.role === 'ADMIN') {
    return user;
  }

  if (!user.staffRole) {
    redirect('/admin/forbidden');
  }

  const normalizedSections = sections.map(s => s.toUpperCase());
  const hasAny = user.staffRole.permissions.some(p =>
    normalizedSections.includes(p.section.toUpperCase()) && (p.canView || p.canEdit)
  );

  if (!hasAny) {
    redirect('/admin/forbidden');
  }

  return user;
}
