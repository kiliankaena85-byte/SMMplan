import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createStaffMemberAction,
  toggleStaffActiveStatusAction,
  generateStaffMagicLinkAction,
  resetStaffPasswordAction,
} from '@/actions/admin/staff';

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    authToken: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/server/rbac', () => ({
  requireStaffPermission: vi.fn((_resource, _action, callback) => {
    // Default mock admin is OWNER
    const mockAdmin = {
      id: 'admin-owner-id',
      email: 'owner@smmplan.pro',
      role: 'OWNER',
      tenantId: 'smmplan',
      allowedTenants: ['smmplan', 'flux'],
    };
    return callback(mockAdmin);
  }),
}));

vi.mock('@/lib/admin-audit', () => ({
  auditAdminAwaitable: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/utils/ip', () => ({
  getClientIp: vi.fn().mockResolvedValue('127.0.0.1'),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth/password', () => ({
  hashPassword: vi.fn().mockImplementation((pwd) => Promise.resolve(`hashed_${pwd}`)),
}));

import { db } from '@/lib/db';
import { requireStaffPermission } from '@/lib/server/rbac';

describe('Staff Management Actions Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createStaffMemberAction', () => {
    it('rejects invalid email address', async () => {
      const result = await createStaffMemberAction({
        email: 'invalid-email',
        role: 'SUPPORT',
        supportLimitRubles: 500,
        allowedTenants: ['smmplan'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Некорректный email');
    });

    it('enforces Grant Ceiling: non-OWNER cannot create ADMIN or OWNER', async () => {
      vi.mocked(requireStaffPermission).mockImplementationOnce((_res, _act, callback) => {
        return callback({
          id: 'admin-manager-id',
          email: 'manager@smmplan.pro',
          role: 'ADMIN', // Not OWNER
          tenantId: 'smmplan',
          allowedTenants: ['smmplan'],
        } as any);
      });

      const result = await createStaffMemberAction({
        email: 'newadmin@smmplan.pro',
        role: 'ADMIN',
        supportLimitRubles: 500,
        allowedTenants: ['smmplan'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Только Владелец');
    });

    it('enforces Tenant Grant Ceiling: non-OWNER cannot assign brands outside their permissions', async () => {
      vi.mocked(requireStaffPermission).mockImplementationOnce((_res, _act, callback) => {
        return callback({
          id: 'admin-id',
          email: 'admin@smmplan.pro',
          role: 'MANAGER',
          tenantId: 'smmplan',
          allowedTenants: ['smmplan'], // only smmplan
        } as any);
      });

      const result = await createStaffMemberAction({
        email: 'support@smmplan.pro',
        role: 'SUPPORT',
        supportLimitRubles: 500,
        allowedTenants: ['smmplan', 'flux'], // tries to grant flux
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('вне ваших полномочий');
    });

    it('successfully creates a brand new staff member with password and tenant assignment', async () => {
      vi.mocked(db.user.findFirst).mockResolvedValueOnce(null);
      vi.mocked(db.user.create).mockResolvedValueOnce({
        id: 'new-staff-123',
        email: 'agent@smmplan.pro',
        role: 'SUPPORT',
      } as any);

      const result = await createStaffMemberAction({
        email: 'agent@smmplan.pro',
        role: 'SUPPORT',
        password: 'securePassword123!',
        supportLimitRubles: 1000,
        allowedTenants: ['smmplan', 'flux'],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error('Expected success');
      expect(result.userId).toBe('new-staff-123');
      expect(db.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'agent@smmplan.pro',
          tenantId: 'smmplan',
        },
      });
      expect(db.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'agent@smmplan.pro',
          role: 'SUPPORT',
          supportLimitCents: 100000,
          allowedTenants: ['smmplan', 'flux'],
          tenantId: 'smmplan',
          passwordHash: 'hashed_securePassword123!',
          isActive: true,
        }),
      });
    });

    it('successfully promotes an existing regular user to staff', async () => {
      vi.mocked(db.user.findFirst).mockResolvedValueOnce({
        id: 'existing-user-456',
        email: 'client@smmplan.pro',
        role: 'USER',
      } as any);
      vi.mocked(db.user.update).mockResolvedValueOnce({} as any);

      const result = await createStaffMemberAction({
        email: 'client@smmplan.pro',
        role: 'SUPPORT',
        supportLimitRubles: 300,
        allowedTenants: ['smmplan'],
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error('Expected success');
      expect(result.userId).toBe('existing-user-456');
      expect(db.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'client@smmplan.pro',
          tenantId: 'smmplan',
        },
      });
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'existing-user-456' },
        data: expect.objectContaining({
          role: 'SUPPORT',
          supportLimitCents: 30000,
          allowedTenants: ['smmplan'],
          isActive: true,
        }),
      });
    });

    it('isolates user lookup by target tenantId to prevent cross-tenant collision', async () => {
      vi.mocked(db.user.findFirst).mockResolvedValueOnce(null);
      vi.mocked(db.user.create).mockResolvedValueOnce({
        id: 'flux-staff-789',
        email: 'flux-agent@smmplan.pro',
        role: 'SUPPORT',
      } as any);

      const result = await createStaffMemberAction({
        email: 'flux-agent@smmplan.pro',
        role: 'SUPPORT',
        supportLimitRubles: 500,
        allowedTenants: ['flux'],
        tenantId: 'flux',
      });

      expect(result.success).toBe(true);
      expect(db.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'flux-agent@smmplan.pro',
          tenantId: 'flux',
        },
      });
      expect(db.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'flux',
          }),
        })
      );
    });
  });

  describe('toggleStaffActiveStatusAction', () => {
    it('prevents self-suspension', async () => {
      const result = await toggleStaffActiveStatusAction({
        userId: 'admin-owner-id',
        isActive: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('собственный аккаунт');
    });

    it('prevents suspending an OWNER', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({
        id: 'other-owner-id',
        role: 'OWNER',
      } as any);

      const result = await toggleStaffActiveStatusAction({
        userId: 'other-owner-id',
        isActive: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Владельца платформы');
    });

    it('successfully activates/suspends an employee', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({
        id: 'staff-id',
        role: 'SUPPORT',
        isActive: true,
      } as any);
      vi.mocked(db.user.update).mockResolvedValueOnce({} as any);

      const result = await toggleStaffActiveStatusAction({
        userId: 'staff-id',
        isActive: false,
      });

      expect(result.success).toBe(true);
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'staff-id' },
        data: { isActive: false },
      });
    });
  });

  describe('generateStaffMagicLinkAction', () => {
    it('prevents non-owner from generating link for owner', async () => {
      vi.mocked(requireStaffPermission).mockImplementationOnce((_res, _act, callback) => {
        return callback({
          id: 'admin-id',
          role: 'ADMIN',
        } as any);
      });
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({
        id: 'owner-target-id',
        role: 'OWNER',
      } as any);

      const result = await generateStaffMagicLinkAction({
        userId: 'owner-target-id',
        redirectUrl: '/admin/dashboard',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Только Владелец');
    });

    it('successfully creates a 24h magic link for staff', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({
        id: 'staff-target-id',
        email: 'staff@smmplan.pro',
        role: 'SUPPORT',
        tenantId: 'smmplan',
      } as any);
      vi.mocked(db.authToken.create).mockResolvedValueOnce({} as any);

      const result = await generateStaffMagicLinkAction({
        userId: 'staff-target-id',
        redirectUrl: '/admin/dashboard',
      });

      expect(result.success).toBe(true);
      if (!result.success) throw new Error('Expected success');
      expect(result.relativeLink).toContain('/api/auth/verify?token=');
      expect(result.staffEmail).toBe('staff@smmplan.pro');
      expect(db.authToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'staff-target-id',
          tenantId: 'smmplan',
        }),
      });
    });
  });

  describe('resetStaffPasswordAction', () => {
    it('validates password minimum length of 8 characters', async () => {
      const result = await resetStaffPasswordAction({
        userId: 'staff-target-id',
        newPassword: 'short',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('не менее 8 символов');
    });

    it('successfully resets password with scrypt hashing', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({
        id: 'staff-target-id',
        role: 'SUPPORT',
      } as any);
      vi.mocked(db.user.update).mockResolvedValueOnce({} as any);

      const result = await resetStaffPasswordAction({
        userId: 'staff-target-id',
        newPassword: 'newValidPassword2026!',
      });

      expect(result.success).toBe(true);
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'staff-target-id' },
        data: { passwordHash: 'hashed_newValidPassword2026!' },
      });
    });
  });
});
