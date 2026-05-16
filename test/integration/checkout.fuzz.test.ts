import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { db } from '@/lib/db';
import { WalletOps } from '@/services/financial/wallet-ops';
import { PaymentGatewayFactory } from '@/services/financial/payment-gateway.service';

describe('Financial Fuzzing: Checkout & WalletOps', () => {
  let testUserId: string;

  beforeEach(async () => {
    // 1. Create User
    const user = await db.user.create({
       data: { email: `fuzz-${Date.now()}@test.com`, role: 'USER', balance: 1000000 }
    });
    testUserId = user.id;
  });

  it('Rejects invalid charge amounts (NaN, negative, fractional logic)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.double({ max: 0 }), // Zero or Negative
          fc.constant(Number.NaN), // NaN
          fc.constant(Number.POSITIVE_INFINITY),
          fc.constant(Number.NEGATIVE_INFINITY),
          fc.double({ min: 0.0001, max: 0.0049 }) // fractional pennies that round to 0 cents
        ),
        async (invalidAmount) => {
          let thrown = false;
          // Capture user balance before
          const preUser = await db.user.findUniqueOrThrow({ where: { id: testUserId } });

          try {
            await db.$transaction(async (tx) => {
               const amountCents = Math.round(invalidAmount * 100);
               await WalletOps.charge(tx, testUserId, amountCents, 'Fuzz Test');
            });
          } catch (e: any) {
            thrown = true;
          }

          expect(thrown).toBe(true);

          const checkUser = await db.user.findUnique({ where: { id: testUserId } });
          expect(checkUser?.balance).toBe(preUser.balance);
        }
      ),
      { numRuns: 50 } 
    );
  });

  it('PaymentGatewayFactory cleanly handles edge cases for amount formats', async () => {
    const gw = PaymentGatewayFactory.getGateway('yookassa');
    // Force YooKassa to run the real logic instead of mock by temporarily replacing NODE_ENV
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: 0.001, max: 0.009 }), // Extremely small fractions
        async (tinyAmount) => {
           let thrown = false;
           try {
              await gw.createPayment({
                  paymentId: 'test-123',
                  userId: testUserId,
                  amountRub: tinyAmount,
                  email: 'test@example.com',
                  successUrl: 'https://test.local',
                  description: 'Tiny fuzz test',
                  isTestMode: false
              });
           } catch (e) {
              thrown = true;
           }

           expect(thrown).toBe(true); 
        }
      ),
      { numRuns: 10 }
    );
    process.env.NODE_ENV = originalEnv;
  });
});
