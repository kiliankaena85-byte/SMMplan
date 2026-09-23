import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedStaffUserWithPermissions } from '@/lib/server/rbac';
import { db } from '@/lib/db';
import * as tenantContext from '@/lib/tenant-context';

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/session', () => ({
  verifySession: vi.fn().mockResolvedValue(null),
}));

describe('RBAC Cached Staff Lookup Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches staff user with permissions using runWithTenantBypass', async () => {
    const mockStaffUser = {
      id: 'staff-user-1',
      email: 'staff@smmplan.pro',
      role: 'SUPPORT',
      tenantId: 'smmplan',
      staffRole: {
        id: 'role-1',
        name: 'Senior Support',
        permissions: [
          { id: 'perm-1', section: 'TICKETS', canView: true, canEdit: true },
          { id: 'perm-2', section: 'ORDERS', canView: true, canEdit: false },
        ],
      },
    };

    vi.mocked(db.user.findUnique).mockResolvedValue(mockStaffUser as any);
    const bypassSpy = vi.spyOn(tenantContext, 'runWithTenantBypass');

    const result = await getCachedStaffUserWithPermissions('staff-user-1');

    expect(bypassSpy).toHaveBeenCalledWith('RBAC cached staff lookup', expect.any(Function));
    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'staff-user-1' },
      include: {
        staffRole: {
          include: { permissions: true },
        },
      },
    });
    expect(result).toEqual(mockStaffUser);
  });

  it('returns null when staff user is not found', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);

    const result = await getCachedStaffUserWithPermissions('non-existent-user');

    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'non-existent-user' },
      include: {
        staffRole: {
          include: { permissions: true },
        },
      },
    });
    expect(result).toBeNull();
  });
});
