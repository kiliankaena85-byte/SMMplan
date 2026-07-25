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
  | 'balance_policy';

/**
 * Strict RBAC Wrapper for Server Actions
 * Protects actions based on the user's assigned StaffRole and granular permissions.
 */
export async function requireStaffPermission<T>(
  section: StaffPermissionSection | string,
  actionMode: 'view' | 'edit',
  action: (user: User, role?: StaffRole | null) => Promise<T>
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

    // OWNER & ADMIN bypass
    if (user.role === 'OWNER' || user.role === 'ADMIN') {
      return await action(user, user.staffRole);
    }

    // Requires StaffRole for granular permissions
    if (!user.staffRole) {
       console.error(`[RBAC] User ${userId} attempted to execute Admin Action without StaffRole.`);
       return { success: false, error: "Forbidden: Administrator/Staff context required" };
    }

    const normalizedSection = section.toUpperCase();
    const permission = user.staffRole.permissions.find(p => p.section.toUpperCase() === normalizedSection);
    
    if (!permission) {
        return { success: false, error: `Forbidden: No permissions for section [${section}]` };
    }

    if (actionMode === 'edit' && !permission.canEdit) {
        return { success: false, error: `Forbidden: Cannot modify [${section}]` };
    }

    if (actionMode === 'view' && !permission.canView && !permission.canEdit) {
        return { success: false, error: `Forbidden: Cannot view [${section}]` };
    }

    return await action(user, user.staffRole);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("[RBAC] Execution Error:", error);
    const localized = handleServerError(error);
    return { success: false, error: localized.message };
  }
}

// W3-3 SECURITY FIX: Strict guard for OWNER-only operations (e.g. settings changes, ownership transfers)
export async function requireOwnerPermission<T>(
  action: (user: User) => Promise<T>
): Promise<T | { success: false; error: string }> {
  try {
    const userId = await getSessionUserId();
    if (!userId) return { success: false, error: "Unauthorized access" };

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: "Forbidden: User not found" };

    if (user.role !== 'OWNER') {
       console.warn(`[RBAC] User ${userId} attempted to execute OWNER Action but has role ${user.role}`);
       return { success: false, error: "Forbidden: OWNER context required" };
    }

    return await action(user);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
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
    select: { id: true, role: true }
  });

  if (!user || !allowedRoles.includes(user.role)) {
    // We seamlessly redirect unauthorized (SUPPORT) roles to their home workspace
    redirect('/admin/orders');
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
    redirect('/dashboard/new-order');
  }

  const normalizedSection = section.toUpperCase();
  const permission = user.staffRole.permissions.find(p => p.section.toUpperCase() === normalizedSection);

  if (!permission || (!permission.canView && !permission.canEdit)) {
    const fallbackPermission = user.staffRole.permissions.find(p => p.canView || p.canEdit);
    if (fallbackPermission) {
      const sec = fallbackPermission.section.toLowerCase();
      redirect(`/admin/${sec}`);
    } else {
      redirect('/dashboard/new-order');
    }
  }

  return user;
}
