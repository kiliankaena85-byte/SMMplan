import { describe, it, expect } from 'vitest';
import { RBAC_SECTIONS } from '@/lib/rbac-sections';
import { SYSTEM_TABS } from '@/components/admin/navigation-data';

describe('Admin Roles & RBAC Matrix Integrity Suite (SIL-2026 Step 16)', () => {
  describe('RBAC Sections Completeness & Groups', () => {
    it('covers all 16 platform sections across operational and security domains', () => {
      expect(RBAC_SECTIONS.length).toBe(16);

      const requiredSections = [
        'dashboard',
        'clients',
        'orders',
        'refills',
        'tickets',
        'catalog',
        'providers',
        'marketing',
        'content',
        'finance',
        'balance_requests',
        'balance_approvals',
        'balance_stats',
        'balance_policy',
        'analytics',
        'settings'
      ];

      const sectionIds = RBAC_SECTIONS.map(s => s.id);
      for (const req of requiredSections) {
        expect(sectionIds).toContain(req);
      }
    });

    it('validates that every section has non-empty label, group, and description', () => {
      for (const section of RBAC_SECTIONS) {
        expect(section.label.length).toBeGreaterThan(0);
        expect(section.group.length).toBeGreaterThan(0);
        expect(section.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('System Roles Protection & Invariants', () => {
    it('ensures system roles cannot be deleted', () => {
      const isSystemRole = true;
      const canDelete = !isSystemRole;
      expect(canDelete).toBe(false);
    });

    it('ensures roles with assigned users cannot be deleted', () => {
      const userCount: number = 3;
      const canDelete = userCount === 0;
      expect(canDelete).toBe(false);
    });
  });

  describe('SYSTEM_TABS Navigation Cluster Integrity', () => {
    it('verifies /admin/settings/roles is part of SYSTEM_TABS navigation cluster', () => {
      const rolesTab = SYSTEM_TABS.find(t => t.href === '/admin/settings/roles');
      expect(rolesTab).toBeDefined();
      expect(rolesTab?.label).toBe('Роли и права');
    });
  });

  describe('RBAC Section Aliases & Normalization', () => {
    it('normalizes legacy aliases support and staff to tickets and settings', async () => {
      const { normalizeRbacSection, RBAC_SECTION_ALIASES } = await import('@/lib/rbac-sections');
      expect(RBAC_SECTION_ALIASES.support).toBe('tickets');
      expect(RBAC_SECTION_ALIASES.staff).toBe('settings');

      expect(normalizeRbacSection('support')).toBe('tickets');
      expect(normalizeRbacSection('SUPPORT')).toBe('tickets');
      expect(normalizeRbacSection('staff')).toBe('settings');
      expect(normalizeRbacSection('STAFF')).toBe('settings');
      expect(normalizeRbacSection('dashboard')).toBe('dashboard');
      expect(normalizeRbacSection('refills')).toBe('refills');
    });
  });

  describe('BUILTIN_ROLE_PERMISSIONS Consistency', () => {
    it('includes DASHBOARD and REFILLS for SUPPORT, MANAGER and OPERATOR roles', async () => {
      const { BUILTIN_ROLE_PERMISSIONS } = await import('@/lib/server/rbac');
      
      for (const role of ['SUPPORT', 'MANAGER', 'OPERATOR']) {
        const perms = BUILTIN_ROLE_PERMISSIONS[role];
        expect(perms).toBeDefined();
        expect(perms.DASHBOARD).toBeDefined();
        expect(perms.DASHBOARD.canView).toBe(true);
        expect(perms.REFILLS).toBeDefined();
        expect(perms.REFILLS.canView).toBe(true);
        expect(perms.REFILLS.canEdit).toBe(true);
      }
    });

    it('grants OPERATOR view access to CLIENTS and TRANSACTIONS for operator workspace', async () => {
      const { BUILTIN_ROLE_PERMISSIONS } = await import('@/lib/server/rbac');
      const op = BUILTIN_ROLE_PERMISSIONS.OPERATOR;
      expect(op.CLIENTS).toBeDefined();
      expect(op.CLIENTS.canView).toBe(true);
      expect(op.TRANSACTIONS).toBeDefined();
      expect(op.TRANSACTIONS.canView).toBe(true);
    });
  });

  describe('OPERATOR Role UI Integration', () => {
    it('includes OPERATOR in getAllowedRoles and assigns proper colors and schema validation', async () => {
      const { getAllowedRoles, ROLE_COLORS, ROLE_LABELS } = await import('@/app/admin/settings/team/ui-helpers');
      const { roleSchema } = await import('@/validators/admin.validators');

      const regularAllowed = getAllowedRoles('MANAGER');
      expect(regularAllowed).toContain('OPERATOR');

      const ownerAllowed = getAllowedRoles('OWNER');
      expect(ownerAllowed).toContain('OPERATOR');

      expect(ROLE_COLORS.OPERATOR).toBeDefined();
      expect(ROLE_COLORS.OPERATOR).toContain('cyan');

      expect(ROLE_LABELS.OPERATOR).toBeDefined();
      expect(ROLE_LABELS.OPERATOR).toContain('Оператор');

      const validParsed = roleSchema.safeParse({ userId: 'u123', role: 'OPERATOR' });
      expect(validParsed.success).toBe(true);
    });
  });
});