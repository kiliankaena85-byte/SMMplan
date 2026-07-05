import { requireStaffPermission } from '@/lib/server/rbac';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { User, StaffRole } from '@prisma/client';

export const OPERATOR_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'];

/**
 * Resolves current operator staff context using existing session/auth patterns.
 */
export async function getOperatorContext() {
  const session = await verifySession();
  if (!session) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: {
      staffRole: {
        include: { permissions: true }
      }
    }
  });

  if (!user || !OPERATOR_ROLES.includes(user.role)) {
    return null;
  }

  return { user, staffRole: user.staffRole };
}

/**
 * Enforces operator role check and redirects safely to login if unauthorized.
 */
export async function enforceOperatorAccess() {
  const context = await getOperatorContext();
  if (!context) {
    redirect('/login');
  }
  return context;
}

/**
 * Thin wrapper over requireStaffPermission to protect operator server actions.
 */
export async function requireOperatorPermission<T>(
  section: string,
  actionMode: 'view' | 'edit',
  action: (user: User, role?: StaffRole | null) => Promise<T>
) {
  return requireStaffPermission(section, actionMode, action);
}
