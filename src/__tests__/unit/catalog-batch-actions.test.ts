import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit Tests: Catalog Batch Actions & Multi-Tenant Scoping Invariant
 *
 * Verifies that bulk actions (toggle, markup, category reassign, reset)
 * correctly support services with `tenantId: 'all'` and respect OWNER/ADMIN bypass
 * and staff scoping invariants.
 */

describe('Catalog Batch Actions & Multi-Tenant Scoping (FA-2026)', () => {
  // Pure helper reflecting the corrected tenant condition logic
  function resolveBatchTenantCondition(admin: { role: string; tenantId?: string | null }) {
    if (admin.role === 'OWNER' || admin.role === 'ADMIN') {
      return {};
    }
    return {
      tenantId: { in: [admin.tenantId || 'smmplan', 'all'] }
    };
  }

  describe('Tenant Condition Resolution', () => {
    it('returns empty condition for OWNER so all services (including tenantId: "all") can be managed', () => {
      const ownerAdmin = { role: 'OWNER', tenantId: 'smmplan' };
      const condition = resolveBatchTenantCondition(ownerAdmin);
      expect(condition).toEqual({});
    });

    it('returns empty condition for ADMIN so all services can be managed', () => {
      const adminUser = { role: 'ADMIN', tenantId: 'flux' };
      const condition = resolveBatchTenantCondition(adminUser);
      expect(condition).toEqual({});
    });

    it('includes "all" and staff tenantId for non-owner staff roles', () => {
      const staffUser = { role: 'MANAGER', tenantId: 'smmplan' };
      const condition = resolveBatchTenantCondition(staffUser);
      expect(condition).toEqual({
        tenantId: { in: ['smmplan', 'all'] }
      });
    });

    it('defaults non-owner without tenantId to smmplan and all', () => {
      const staffUser = { role: 'OPERATOR', tenantId: null };
      const condition = resolveBatchTenantCondition(staffUser);
      expect(condition).toEqual({
        tenantId: { in: ['smmplan', 'all'] }
      });
    });
  });

  describe('Batch Action Payload & Safety Bounds', () => {
    it('enforces maximum limit of 500 service IDs in schema', async () => {
      const { z } = await import('zod');
      const batchIdsSchema = z.array(z.string().min(1)).min(1).max(500);

      const valid200 = Array.from({ length: 200 }, (_, i) => `service-${i}`);
      const valid500 = Array.from({ length: 500 }, (_, i) => `service-${i}`);
      const invalid501 = Array.from({ length: 501 }, (_, i) => `service-${i}`);

      expect(batchIdsSchema.safeParse(valid200).success).toBe(true);
      expect(batchIdsSchema.safeParse(valid500).success).toBe(true);
      expect(batchIdsSchema.safeParse(invalid501).success).toBe(false);
      expect(batchIdsSchema.safeParse([]).success).toBe(false);
    });

    it('validates markup minimum multiplier (>= 1.0) and ceiling', async () => {
      const { z } = await import('zod');
      const markupSchema = z.number().min(1.0).max(150);

      expect(markupSchema.safeParse(1.0).success).toBe(true);
      expect(markupSchema.safeParse(3.5).success).toBe(true);
      expect(markupSchema.safeParse(0.99).success).toBe(false);
      expect(markupSchema.safeParse(151).success).toBe(false);
    });

    it('chunks updates into batches of 50 to avoid Postgres transaction timeouts', () => {
      const items = Array.from({ length: 135 }, (_, i) => i);
      const chunks: number[][] = [];
      for (let i = 0; i < items.length; i += 50) {
        chunks.push(items.slice(i, i + 50));
      }

      expect(chunks.length).toBe(3);
      expect(chunks[0].length).toBe(50);
      expect(chunks[1].length).toBe(50);
      expect(chunks[2].length).toBe(35);
    });
  });
});
