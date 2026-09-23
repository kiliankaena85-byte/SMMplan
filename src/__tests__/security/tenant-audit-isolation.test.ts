import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    adminAuditLog: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/server/rbac', () => ({
  requireStaffPermission: vi.fn((section, action, fn) => {
    return fn({
      id: 'admin_1',
      role: 'ADMIN',
      tenantId: 'smmplan',
      allowedTenants: ['smmplan'],
    });
  }),
}));

import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/server/rbac';
import { getStaffMembersWithMetrics, getStaffPersonalLogsAction } from '@/actions/admin/staff';

describe('Item 1: Multi-Tenant Audit Data Leak Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1.1 getStaffMembersWithMetrics applies tenantId filter on adminAuditLog query', async () => {
    (db.user.findMany as any).mockResolvedValue([
      { id: 'staff_1', email: 'staff1@smmplan.pro', role: 'SUPPORT', tenantId: 'smmplan', allowedTenants: ['smmplan'], createdAt: new Date() },
    ]);
    (db.adminAuditLog.findMany as any).mockResolvedValue([]);

    const res = await getStaffMembersWithMetrics(undefined, 'smmplan');

    expect(res.success).toBe(true);
    expect(db.adminAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          adminId: { in: ['staff_1'] },
          tenantId: 'smmplan',
        }),
      })
    );
  });

  it('1.2 getStaffPersonalLogsAction blocks access (403) when requesting staff from different tenant', async () => {
    (db.user.findUnique as any).mockResolvedValue({
      id: 'staff_flux',
      role: 'SUPPORT',
      tenantId: 'flux',
      allowedTenants: ['flux'],
    });

    const res = await getStaffPersonalLogsAction('staff_flux', 50, 'smmplan');

    expect(res.success).toBe(false);
    expect(res.error).toContain('403 Forbidden');
    expect(db.adminAuditLog.findMany).not.toHaveBeenCalled();
  });

  it('1.3 getStaffPersonalLogsAction applies tenantId filter when staff member belongs to caller tenant', async () => {
    (db.user.findUnique as any).mockResolvedValue({
      id: 'staff_same',
      role: 'SUPPORT',
      tenantId: 'smmplan',
      allowedTenants: ['smmplan'],
    });
    (db.adminAuditLog.findMany as any).mockResolvedValue([]);

    const res = await getStaffPersonalLogsAction('staff_same', 50, 'smmplan');

    expect(res.success).toBe(true);
    expect(db.adminAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          adminId: 'staff_same',
          tenantId: 'smmplan',
        }),
      })
    );
  });
});
