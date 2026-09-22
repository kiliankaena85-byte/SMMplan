/**
 * @file server-actions-zero-throw-fuzzer.test.ts
 * @description Automated Contract Fuzzing Suite for OmniSMM 1.0 Server Actions.
 *
 * Invariant (AGENTS.md Section 2):
 * Next.js App Router Server Actions must NEVER throw unhandled `throw new Error`.
 * All Server Actions MUST return a typed result `{ success: boolean, error?: string, ... }`
 * or wrap execution using `createSafeAction` from `@/lib/safe-action`.
 *
 * This test subjects key platform Server Actions across Auth, Financial, Support,
 * and Admin domains to an adversarial fuzzing corpus containing nullish inputs,
 * type confusion, numeric overflows, SQLi strings, XSS payloads, and malformed structures.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { createSafeAction } from '@/lib/safe-action';
import { createTopUpPaymentAction } from '@/actions/user/top-up.action';
import { requestMagicLink } from '@/actions/auth/request-magic-link';
import { loginWithPasswordAction } from '@/actions/auth/password-login';
import { registerWithPasswordAction } from '@/actions/auth/password-register';
import { refreshBalanceAction } from '@/actions/auth/refresh-balance';
import { reportPaymentIssueAction } from '@/actions/customer/payment-issue';
import {
  changeTicketStatus,
  adminManualTelegramBind,
  bulkRefillOrdersAction,
  bulkRefundOrdersAction,
} from '@/actions/support/ticket';
import { transferReferralBalanceAction } from '@/actions/user/referral.action';
import { getPaymentsAction, getPaymentDisputePackAction } from '@/actions/admin/finance/payments';
import { getLedgerAction } from '@/actions/admin/finance/ledger';
import { updateBalanceAction } from '@/actions/admin/users';

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({
    'x-tenant-id': 'smmplan',
    'x-real-ip': '127.0.0.1',
    'user-agent': 'Vitest Fuzz Test',
  })),
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) => ({ name, value: 'mock-cookie' })),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

/**
 * Adversarial fuzzing corpus covering boundaries, injection attempts, and corrupt formats.
 */
const FUZZ_VECTORS: unknown[] = [
  // 1. Primitive nullish & empty values
  undefined,
  null,
  '',
  '   ',
  // 2. Type confusion mutations
  0,
  -1,
  12345,
  true,
  false,
  NaN,
  Infinity,
  -Infinity,
  // 3. Number overflows & BigInt boundaries
  Number.MAX_SAFE_INTEGER,
  Number.MIN_SAFE_INTEGER,
  1e30,
  -1e30,
  999999999999999,
  // 4. SQL Injection payloads (SQLi)
  "' OR '1'='1",
  "'; DROP TABLE \"User\"; --",
  "1; SELECT pg_sleep(5); --",
  "admin' --",
  "' UNION SELECT null, null, null--",
  // 5. XSS & Script Injections
  "<script>alert('xss')</script>",
  "<img src=x onerror=alert(1)>",
  "javascript:alert(document.cookie)",
  // 6. Path traversal & OS injection
  "../../../../../../etc/passwd",
  "..\\..\\..\\..\\windows\\win.ini",
  "/dev/null",
  "\0\0\0\0\0",
  // 7. Malformed Unicode, emojis & buffer boundaries
  "🚀💥💀🔥\u0000\uFFFF\uD800",
  'A'.repeat(50_000), // Large string buffer
  // 8. Empty & corrupted polymorphic objects
  {},
  [],
  { id: null, amount: 'not-a-number', status: 9999 },
  { email: 'not-an-email', password: '', captchaToken: null },
  { __proto__: { admin: true } },
  { constructor: { prototype: { isAdmin: true } } },
];

/**
 * Asserts that a server action result conforms to the typed error contract:
 * - Did not throw / crash the process
 * - Result is an object with success: false (or has an error string)
 * - Error message does not leak raw database credentials or internal passwords
 */
function assertSafeTypedError(result: unknown, actionName: string) {
  expect(result, `${actionName} returned null or undefined`).toBeDefined();
  expect(typeof result, `${actionName} result must be an object`).toBe('object');
  expect(result, `${actionName} result was unexpectedly null`).not.toBeNull();

  const res = result as Record<string, unknown>;

  // Response must indicate failure via either success === false or an error property
  const isFailureIndicated =
    res.success === false ||
    typeof res.error === 'string' ||
    typeof res.message === 'string';

  expect(
    isFailureIndicated,
    `${actionName} did not indicate failure on adversarial input: ${JSON.stringify(result)}`
  ).toBe(true);

  // Security check: ensure no raw credentials leak in the client-facing error
  const stringified = JSON.stringify(result);
  expect(stringified).not.toContain('password');
  expect(stringified).not.toContain('postgres://');
  expect(stringified).not.toContain('postgresql://');
}

describe('Server Actions Zero-Throw Contract Fuzzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. 🛡️ Safe Action Wrapper Contract Integrity (createSafeAction)', () => {
    const testSchema = z.object({
      id: z.string().uuid(),
      amount: z.number().positive(),
    });

    it('Guarantees typed error return on schema mismatch without throwing', async () => {
      for (const vector of FUZZ_VECTORS) {
        let threw = false;
        let response: any;
        try {
          response = await createSafeAction(testSchema, vector, async () => {
            return { ok: true };
          });
        } catch {
          threw = true;
        }

        expect(threw).toBe(false);
        expect(response.success).toBe(false);
        expect(typeof response.error).toBe('string');
        expect(response.error.length).toBeGreaterThan(0);
      }
    });

    it('Catches raw unhandled throw inside handler and converts to localized safe error', async () => {
      const errorThrowers = [
        () => { throw new Error('Database connection reset'); },
        () => { throw new TypeError('Cannot read properties of undefined'); },
        () => { throw 'Raw string exception'; },
        () => { throw { code: 'P2002', meta: { target: ['email'] } }; },
      ];

      for (const thrower of errorThrowers) {
        let threw = false;
        let response: any;
        try {
          response = await createSafeAction(null, {}, async () => {
            thrower();
          });
        } catch {
          threw = true;
        }

        expect(threw).toBe(false);
        expect(response.success).toBe(false);
        expect(typeof response.error).toBe('string');
      }
    });
  });

  describe('2. 💳 Top-Up & Payment Server Actions Fuzzing', () => {
    it('createTopUpPaymentAction never throws on corrupt amounts, gateways, and keys', async () => {
      for (const vector of FUZZ_VECTORS) {
        let threw = false;
        let result: any;
        try {
          result = await createTopUpPaymentAction(vector as any, vector as any, vector as any);
        } catch (e) {
          threw = true;
        }

        expect(threw, `createTopUpPaymentAction threw on input: ${JSON.stringify(vector)}`).toBe(false);
        assertSafeTypedError(result, 'createTopUpPaymentAction');
      }
    });

    it('reportPaymentIssueAction never throws on corrupt payment IDs', async () => {
      for (const vector of FUZZ_VECTORS) {
        let threw = false;
        let result: any;
        try {
          result = await reportPaymentIssueAction(vector as any);
        } catch {
          threw = true;
        }

        expect(threw, `reportPaymentIssueAction threw on input: ${JSON.stringify(vector)}`).toBe(false);
        assertSafeTypedError(result, 'reportPaymentIssueAction');
      }
    });
  });

  describe('3. 🔐 Auth & Session Server Actions Fuzzing', () => {
    it('requestMagicLink never throws on corrupt formData or non-FormData arguments', async () => {
      for (const vector of FUZZ_VECTORS) {
        let threw = false;
        let result: any;
        try {
          result = await requestMagicLink(undefined, vector as any);
        } catch {
          threw = true;
        }

        expect(threw, `requestMagicLink threw on input: ${JSON.stringify(vector)}`).toBe(false);
        assertSafeTypedError(result, 'requestMagicLink');
      }
    });

    it('loginWithPasswordAction never throws on corrupt formData arguments', async () => {
      for (const vector of FUZZ_VECTORS) {
        let threw = false;
        let result: any;
        try {
          result = await loginWithPasswordAction(undefined, vector as any);
        } catch {
          threw = true;
        }

        expect(threw, `loginWithPasswordAction threw on input: ${JSON.stringify(vector)}`).toBe(false);
        assertSafeTypedError(result, 'loginWithPasswordAction');
      }
    });

    it('registerWithPasswordAction never throws on corrupt formData arguments', async () => {
      for (const vector of FUZZ_VECTORS) {
        let threw = false;
        let result: any;
        try {
          result = await registerWithPasswordAction(undefined, vector as any);
        } catch {
          threw = true;
        }

        expect(threw, `registerWithPasswordAction threw on input: ${JSON.stringify(vector)}`).toBe(false);
        assertSafeTypedError(result, 'registerWithPasswordAction');
      }
    });

    it('refreshBalanceAction never throws on corrupt tenantId inputs', async () => {
      for (const vector of FUZZ_VECTORS) {
        let threw = false;
        let result: any;
        try {
          result = await refreshBalanceAction(vector as any);
        } catch {
          threw = true;
        }

        expect(threw, `refreshBalanceAction threw on input: ${JSON.stringify(vector)}`).toBe(false);
        assertSafeTypedError(result, 'refreshBalanceAction');
      }
    });
  });

  describe('4. 🎫 Support & Ticket Server Actions Fuzzing (Post-Modernization)', () => {
    it('changeTicketStatus never throws on corrupt formData', async () => {
      for (const vector of FUZZ_VECTORS) {
        let threw = false;
        let result: any;
        try {
          result = await changeTicketStatus(vector as any);
        } catch {
          threw = true;
        }

        expect(threw, `changeTicketStatus threw on input: ${JSON.stringify(vector)}`).toBe(false);
        assertSafeTypedError(result, 'changeTicketStatus');
      }
    });

    it('adminManualTelegramBind never throws on corrupt formData', async () => {
      for (const vector of FUZZ_VECTORS) {
        let threw = false;
        let result: any;
        try {
          result = await adminManualTelegramBind(vector as any);
        } catch {
          threw = true;
        }

        expect(threw, `adminManualTelegramBind threw on input: ${JSON.stringify(vector)}`).toBe(false);
        assertSafeTypedError(result, 'adminManualTelegramBind');
      }
    });

    it('bulkRefillOrdersAction never throws on malformed ticketId and orderIds', async () => {
      for (const vector of FUZZ_VECTORS) {
        let threw = false;
        let result: any;
        try {
          result = await bulkRefillOrdersAction(vector as any, vector as any);
        } catch {
          threw = true;
        }

        expect(threw, `bulkRefillOrdersAction threw on input: ${JSON.stringify(vector)}`).toBe(false);
        assertSafeTypedError(result, 'bulkRefillOrdersAction');
      }
    });

    it('bulkRefundOrdersAction never throws on malformed ticketId and orderIds', async () => {
      for (const vector of FUZZ_VECTORS) {
        let threw = false;
        let result: any;
        try {
          result = await bulkRefundOrdersAction(vector as any, vector as any);
        } catch {
          threw = true;
        }

        expect(threw, `bulkRefundOrdersAction threw on input: ${JSON.stringify(vector)}`).toBe(false);
        assertSafeTypedError(result, 'bulkRefundOrdersAction');
      }
    });
  });

  describe('5. 🤝 Referral & Financial Operations Fuzzing', () => {
    it('transferReferralBalanceAction never throws without active session', async () => {
      let threw = false;
      let result: any;
      try {
        result = await transferReferralBalanceAction();
      } catch {
        threw = true;
      }

      expect(threw).toBe(false);
      assertSafeTypedError(result, 'transferReferralBalanceAction');
    });

    it('getPaymentsAction never throws on adversarial search / pagination params', async () => {
      for (const vector of FUZZ_VECTORS) {
        let threw = false;
        let result: any;
        try {
          result = await getPaymentsAction(vector as any);
        } catch {
          threw = true;
        }

        expect(threw, `getPaymentsAction threw on input: ${JSON.stringify(vector)}`).toBe(false);
        assertSafeTypedError(result, 'getPaymentsAction');
      }
    });

    it('getLedgerAction never throws on adversarial search / pagination params', async () => {
      for (const vector of FUZZ_VECTORS) {
        let threw = false;
        let result: any;
        try {
          result = await getLedgerAction(vector as any);
        } catch {
          threw = true;
        }

        expect(threw, `getLedgerAction threw on input: ${JSON.stringify(vector)}`).toBe(false);
        assertSafeTypedError(result, 'getLedgerAction');
      }
    });

    it('getPaymentDisputePackAction never throws on malformed paymentId', async () => {
      for (const vector of FUZZ_VECTORS) {
        let threw = false;
        let result: any;
        try {
          result = await getPaymentDisputePackAction(vector as any);
        } catch {
          threw = true;
        }

        expect(threw, `getPaymentDisputePackAction threw on input: ${JSON.stringify(vector)}`).toBe(false);
        assertSafeTypedError(result, 'getPaymentDisputePackAction');
      }
    });

    it('updateBalanceAction never throws on corrupt formData', async () => {
      for (const vector of FUZZ_VECTORS) {
        let threw = false;
        let result: any;
        try {
          result = await updateBalanceAction(vector as any);
        } catch {
          threw = true;
        }

        expect(threw, `updateBalanceAction threw on input: ${JSON.stringify(vector)}`).toBe(false);
        assertSafeTypedError(result, 'updateBalanceAction');
      }
    });
  });
});
