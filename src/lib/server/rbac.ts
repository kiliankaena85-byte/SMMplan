import { db } from "@/lib/db";
import { verifySession } from "@/lib/session";
import { User, StaffRole, StaffPermission } from "@prisma/client";

async function getSessionUserId(): Promise<string | null> {
  const sessionUser = await verifySession();
  return sessionUser ? sessionUser.userId : null;
}

/**
 * Strict RBAC Wrapper for Server Actions
 * Protects actions based on the user's assigned StaffRole and granular permissions.
 */
export async function requireStaffPermission<T>(
  section: string,
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

    if (!user) {
      return { success: false, error: "Forbidden: User not found" };
    }

    // OWNER bypass
    if (user.role === 'OWNER') {
        return await action(user, user.staffRole);
    }

    // Requires StaffRole for granular permissions
    if (!user.staffRole) {
       console.error(`[RBAC] User ${userId} attempted to execute Admin Action without StaffRole.`);
       return { success: false, error: "Forbidden: Administrator/Staff context required" };
    }

    const permission = user.staffRole.permissions.find(p => p.section === section);
    
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
  } catch (error: any) {
    console.error("[RBAC] Execution Error:", error);
    return { success: false, error: "Internal Server Error during execution" };
  }
}

/**
 * Legacy Higher Order Component / Wrapper for Server Actions
 * Maintained temporarily for routes not yet migrated to granular permissions.
 */
export async function requireAdmin<T>(
  action: (admin: User) => Promise<T>
): Promise<T | { success: false; error: string }> {
  try {
    const userId = await getSessionUserId();
    
    if (!userId) {
       return { success: false, error: "Unauthorized access" };
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
       return { success: false, error: "Forbidden: Administrator context required" };
    }

    return await action(user);
  } catch (error: any) {
    return { success: false, error: "Internal Server Error during execution" };
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
