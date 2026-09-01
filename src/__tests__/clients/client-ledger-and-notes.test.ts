import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/server/rbac', () => ({
  requireStaffPermission: vi.fn(async (_section, _perm, callback) => {
    return callback({ id: 'staff_1', email: 'support@smmplan.pro', role: 'SUPPORT' }, 'SUPPORT', 'smmplan');
  }),
  requireAdmin: vi.fn(async (callback) => {
    return callback({ id: 'admin_1', email: 'admin@smmplan.pro', role: 'ADMIN' }, 'ADMIN', 'smmplan');
  }),
}));

import { 
  supportGoodwillCreditAction,
  clearClientNoteAction,
  updateClientNoteAction
} from '@/actions/admin/clients';
import { 
  SUPPORT_CREDIT_REASONS, 
  SUPPORT_DEBIT_REASONS 
} from '@/lib/constants/support-reasons';

describe('Client CRM, Ledger & Poka-Yoke Invariants', () => {
  it('should verify that CREDIT and DEBIT reasons are strictly segregated without overlap', () => {
    expect(SUPPORT_CREDIT_REASONS.length).toBeGreaterThanOrEqual(5);
    expect(SUPPORT_DEBIT_REASONS.length).toBeGreaterThanOrEqual(4);

    // No compensation/bonus/goodwill reasons in DEBIT
    for (const debitReason of SUPPORT_DEBIT_REASONS) {
      const lower = debitReason.toLowerCase();
      expect(lower.includes('компенсация')).toBe(false);
      expect(lower.includes('бонус')).toBe(false);
      expect(lower.includes('доброй воли')).toBe(false);
    }

    // All compensation reasons must belong to CREDIT
    const hasDelayCompensation = SUPPORT_CREDIT_REASONS.some(r => r.includes('задержку'));
    const hasProviderError = SUPPORT_CREDIT_REASONS.some(r => r.includes('провайдера'));
    expect(hasDelayCompensation).toBe(true);
    expect(hasProviderError).toBe(true);
  });

  it('should reject DEBIT operations containing compensation or bonus in reason (Server Poka-Yoke)', async () => {
    const formData = new FormData();
    formData.set('userId', 'user_test_123');
    formData.set('amount', '3000');
    formData.set('direction', 'DEBIT');
    formData.set('reason', 'Компенсация за задержку заказа');

    const result = await supportGoodwillCreditAction(formData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Недопустимая причина для списания');
    }
  });
});
