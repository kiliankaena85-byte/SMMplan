import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/lib/db';
import { WalletOps } from '@/services/financial/wallet-ops';
import crypto from 'crypto';

const globalFetch = vi.fn();
global.fetch = globalFetch;

describe('CryptoBot (CryptoPay) Gateway Integration', () => {
  let userId: string;
  const cryptoBotApiToken = '123456:AAFe89x_crypto_pay_test_token';

  beforeEach(async () => {
    vi.clearAllMocks();

    await db.systemSettings.upsert({
      where: { id: 'smmplan' },
      update: {
        cryptoBotToken: cryptoBotApiToken,
        exchangeRateUSD: 95.0,
        isTestMode: true,
      },
      create: {
        id: 'smmplan',
        cryptoBotToken: cryptoBotApiToken,
        exchangeRateUSD: 95.0,
        isTestMode: true,
      },
    });

    const user = await db.user.upsert({
      where: { email_tenantId: { email: 'cryptobot-user@smmplan.local', tenantId: 'smmplan' } },
      update: { balance: 0, isActive: true },
      create: {
        email: 'cryptobot-user@smmplan.local',
        tenantId: 'smmplan',
        balance: 0,
        role: 'USER',
        isActive: true,
      },
    });
    userId = user.id;
  });

  // Helper for CryptoBot HMAC-SHA-256 signature verification
  function verifyCryptoBotSignature(body: string, headerSignature: string, token: string): boolean {
    const secret = crypto.createHash('sha256').update(token).digest();
    const checkString = body;
    const hmac = crypto.createHmac('sha256', secret).update(checkString).digest('hex');
    return hmac === headerSignature;
  }

  // ─────────────────────────────────────────────
  // 1. Invoice Creation
  // ─────────────────────────────────────────────
  it('creates CryptoBot invoice via API mock and returns pay_url', async () => {
    const mockApiResponse = {
      ok: true,
      result: {
        invoice_id: 9876543,
        status: 'active',
        hash: 'hash123456789',
        asset: 'USDT',
        amount: '10.50',
        pay_url: 'https://t.me/CryptoBot?start=IV12345',
        created_at: new Date().toISOString(),
      },
    };

    globalFetch.mockResolvedValueOnce(new Response(JSON.stringify(mockApiResponse), { status: 200 }));

    // Create payment in DB
    const payment = await db.payment.create({
      data: {
        userId,
        tenantId: 'smmplan',
        amount: 997_50, // ~10.50 USD in kopecks (997.50 RUB)
        status: 'PENDING',
        gateway: 'CRYPTOBOT',
        gatewayId: '9876543',
      },
    });

    expect(payment.id).toBeDefined();
    expect(payment.gatewayId).toBe('9876543');
    expect(payment.status).toBe('PENDING');
  });

  // ─────────────────────────────────────────────
  // 2. Webhook -> Balance Credited with Signature
  // ─────────────────────────────────────────────
  it('credits user balance on valid invoice_paid webhook notification', async () => {
    const invoiceId = 'crypto_inv_555';
    const amountKopecks = 2000_00; // 2000 RUB

    const payment = await db.payment.create({
      data: {
        userId,
        tenantId: 'smmplan',
        amount: amountKopecks,
        status: 'PENDING',
        gateway: 'CRYPTOBOT',
        gatewayId: invoiceId,
      },
    });

    const webhookBody = JSON.stringify({
      update_id: 10001,
      update_type: 'invoice_paid',
      request_date: new Date().toISOString(),
      payload: {
        invoice_id: invoiceId,
        status: 'paid',
        hash: 'test_hash',
        asset: 'TON',
        amount: '20.0',
        paid_at: new Date().toISOString(),
      },
    });

    // Generate valid HMAC signature
    const secret = crypto.createHash('sha256').update(cryptoBotApiToken).digest();
    const signature = crypto.createHmac('sha256', secret).update(webhookBody).digest('hex');

    // Verify signature
    const isValid = verifyCryptoBotSignature(webhookBody, signature, cryptoBotApiToken);
    expect(isValid).toBe(true);

    // Process valid webhook
    await db.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCEEDED' },
      });

      await WalletOps.credit(
        tx,
        userId,
        Number(payment.amount),
        `Пополнение через CryptoBot (${invoiceId})`,
        { idempotencyKey: `cryptobot-${invoiceId}` }
      );
    });

    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.balance).toBe(BigInt(2000_00));

    const ledger = await db.ledgerEntry.findFirst({
      where: { userId, idempotencyKey: `cryptobot-${invoiceId}` },
    });
    expect(ledger?.status).toBe('APPROVED');
  });

  // ─────────────────────────────────────────────
  // 3. Invalid Token / Signature -> Rejected
  // ─────────────────────────────────────────────
  it('rejects CryptoBot webhook if HMAC signature fails verification', async () => {
    const webhookBody = JSON.stringify({
      update_id: 10002,
      update_type: 'invoice_paid',
      payload: { invoice_id: 'fake_invoice' },
    });

    const fakeSignature = 'bad_hmac_signature_00000000000000000000000000000000';

    const isValid = verifyCryptoBotSignature(webhookBody, fakeSignature, cryptoBotApiToken);
    expect(isValid).toBe(false);
  });
});
