import { describe, it, expect, vi } from 'vitest';
import { passwordPolicySchema } from '@/validators/password-policy';
import { passwordLoginSchema, passwordRegisterSchema } from '@/lib/validators/auth-schemas';
import { PromoValidatorService } from '@/services/promo/promo-validator.service';
import { activatePromoCodeAction } from '@/actions/user/promo';
import { db } from '@/lib/db';

vi.mock('@/lib/session', () => ({
  verifySession: vi.fn().mockResolvedValue({ userId: 'test-user-id', role: 'USER' }),
}));

describe('SPEC-2026-09-20: Password (6-128 chars) & Promocode (<= 64 chars) Limits', () => {
  describe('1. Password Policy (6 to 128 chars)', () => {
    it('rejects passwords shorter than 6 characters', () => {
      const result = passwordPolicySchema.safeParse('12345');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('6');
      }
    });

    it('accepts valid 6-character password', () => {
      const result = passwordPolicySchema.safeParse('Abc99!');
      expect(result.success).toBe(true);
    });

    it('accepts valid 128-character password', () => {
      const longPass = 'A1b!' + 'x'.repeat(124);
      expect(longPass.length).toBe(128);
      const result = passwordPolicySchema.safeParse(longPass);
      expect(result.success).toBe(true);
    });

    it('rejects passwords longer than 128 characters', () => {
      const tooLongPass = 'A1b!' + 'x'.repeat(125);
      expect(tooLongPass.length).toBe(129);
      const result = passwordPolicySchema.safeParse(tooLongPass);
      expect(result.success).toBe(false);
    });

    it('rejects common weak passwords (123456, qwerty, password)', () => {
      expect(passwordPolicySchema.safeParse('123456').success).toBe(false);
      expect(passwordPolicySchema.safeParse('qwerty').success).toBe(false);
      expect(passwordPolicySchema.safeParse('password').success).toBe(false);
    });

    it('rejects single repeating character password (e.g. "aaaaaa")', () => {
      expect(passwordPolicySchema.safeParse('aaaaaa').success).toBe(false);
    });

    it('allows passwordLoginSchema up to 128 characters without truncation', () => {
      const longPass = 'x'.repeat(128);
      const valid = passwordLoginSchema.safeParse({
        email: 'user@example.com',
        password: longPass,
      });
      expect(valid.success).toBe(true);

      const invalid = passwordLoginSchema.safeParse({
        email: 'user@example.com',
        password: 'x'.repeat(129),
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('2. Promo Code Length Limit (max 64 chars)', () => {
    it('PromoValidatorService accepts up to 64 character promo codes', async () => {
      const code64 = 'PROMO_' + 'A'.repeat(58);
      expect(code64.length).toBe(64);

      // Promo doesn't exist in DB, so it should return valid: false with standard message, NOT format error
      const res = await PromoValidatorService.validateCode(code64, 'usr_1');
      expect(res.error).not.toBe('Неверный формат промокода');
    });

    it('PromoValidatorService rejects promo codes longer than 64 characters immediately', async () => {
      const code65 = 'A'.repeat(65);
      const res = await PromoValidatorService.validateCode(code65, 'usr_1');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('Неверный формат промокода');
    });

    it('activatePromoCodeAction rejects promo codes longer than 64 characters before DB query', async () => {
      const code65 = 'B'.repeat(65);
      const res = await activatePromoCodeAction(code65);
      expect(res.success).toBe(false);
      expect(res.error).toContain('64');
    });
  });
});
