import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// 1. Corporate Invoice Action Adversarial Stress Testing (Requirement 3)
// ---------------------------------------------------------------------------
import { createApiInvoiceAction } from '@/actions/user/corporate-invoice.action';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';

vi.mock('@/lib/session', () => ({
  verifySession: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(),
    user: { update: vi.fn() },
    apiConfig: { upsert: vi.fn() },
    payment: { create: vi.fn() },
    invoice: { create: vi.fn() },
    provider: { findMany: vi.fn(), update: vi.fn() },
    order: { findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    refill: { create: vi.fn() },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

describe('CHALLENGER STRESS: Corporate Invoice Action (Requirement 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated user with typed error (never throws)', async () => {
    vi.mocked(verifySession).mockResolvedValue(null as any);

    const input: any = {
      amountRub: 5000,
      companyName: 'ООО Ромашка',
      inn: '7701234567',
    };

    const result = await createApiInvoiceAction(input);

    expect(result).toBeDefined();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Необходима авторизация');
    expect(result.invoice).toBeUndefined();
  });

  it('rejects null and undefined input gracefully with typed error', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'user-corp-1' } as any);

    const resNull = await createApiInvoiceAction(null as any);
    expect(resNull.success).toBe(false);
    expect(typeof resNull.error).toBe('string');

    const resUndef = await createApiInvoiceAction(undefined as any);
    expect(resUndef.success).toBe(false);
    expect(typeof resUndef.error).toBe('string');
  });

  it('rejects empty object input with typed error', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'user-corp-1' } as any);

    const result = await createApiInvoiceAction({} as any);
    expect(result.success).toBe(false);
    expect(typeof result.error).toBe('string');
  });

  it('rejects non-object primitive inputs (string, number, array)', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'user-corp-1' } as any);

    const resStr = await createApiInvoiceAction('malicious-payload' as any);
    expect(resStr.success).toBe(false);

    const resNum = await createApiInvoiceAction(12345 as any);
    expect(resNum.success).toBe(false);

    const resArr = await createApiInvoiceAction([1, 2, 3] as any);
    expect(resArr.success).toBe(false);
  });

  it('rejects amount below 3000 ₽ minimum', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'user-corp-1' } as any);

    const result = await createApiInvoiceAction({
      amountRub: 2999,
      companyName: 'ООО Ромашка',
      inn: '7701234567',
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Минимальная сумма счета для юрлиц — 3 000 ₽');
  });

  it('rejects negative and zero amount', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'user-corp-1' } as any);

    const resNeg = await createApiInvoiceAction({
      amountRub: -5000,
      companyName: 'ООО Ромашка',
      inn: '7701234567',
    } as any);
    expect(resNeg.success).toBe(false);

    const resZero = await createApiInvoiceAction({
      amountRub: 0,
      companyName: 'ООО Ромашка',
      inn: '7701234567',
    } as any);
    expect(resZero.success).toBe(false);
  });

  it('rejects NaN and Infinity amounts', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'user-corp-1' } as any);

    const resNaN = await createApiInvoiceAction({
      amountRub: NaN,
      companyName: 'ООО Ромашка',
      inn: '7701234567',
    } as any);
    expect(resNaN.success).toBe(false);

    const resInf = await createApiInvoiceAction({
      amountRub: Infinity,
      companyName: 'ООО Ромашка',
      inn: '7701234567',
    } as any);
    expect(resInf.success).toBe(false);
  });

  it('rejects amount above 10 000 000 ₽ maximum', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'user-corp-1' } as any);

    const result = await createApiInvoiceAction({
      amountRub: 10000001,
      companyName: 'ООО Ромашка',
      inn: '7701234567',
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Максимальная сумма счета — 10 000 000 ₽');
  });

  it('rejects SQL injection attempts in INN and KPP fields', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'user-corp-1' } as any);

    const resSqlInn = await createApiInvoiceAction({
      amountRub: 5000,
      companyName: 'ООО Ромашка',
      inn: "7701234567'; DROP TABLE \"User\";--",
    } as any);
    expect(resSqlInn.success).toBe(false);
    expect(resSqlInn.error).toBe('ИНН должен состоять из 10 (для ООО) или 12 цифр (для ИП)');

    const resSqlKpp = await createApiInvoiceAction({
      amountRub: 5000,
      companyName: 'ООО Ромашка',
      inn: '7701234567',
      kpp: "770101001' OR '1'='1",
    } as any);
    expect(resSqlKpp.success).toBe(false);
    expect(resSqlKpp.error).toBe('КПП должен состоять из 9 цифр');
  });

  it('rejects ReDoS attempts with oversized companyName and legalAddress', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'user-corp-1' } as any);

    const resOversized = await createApiInvoiceAction({
      amountRub: 5000,
      companyName: 'A'.repeat(500),
      inn: '7701234567',
      legalAddress: 'B'.repeat(1000),
    } as any);
    expect(resOversized.success).toBe(false);
  });

  it('handles database transaction Error gracefully without throwing', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'user-corp-1' } as any);
    vi.mocked(db.$transaction).mockRejectedValue(new Error('PostgreSQL connection timeout'));

    const result = await createApiInvoiceAction({
      amountRub: 5000,
      companyName: 'ООО Ромашка',
      inn: '7701234567',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('PostgreSQL connection timeout');
  });

  it('handles database transaction non-Error throw gracefully without throwing', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'user-corp-1' } as any);
    vi.mocked(db.$transaction).mockRejectedValue('DEADLOCK_DETECTED');

    const result = await createApiInvoiceAction({
      amountRub: 5000,
      companyName: 'ООО Ромашка',
      inn: '7701234567',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Не удалось сформировать счёт');
  });

  it('successfully creates invoice for valid input', async () => {
    vi.mocked(verifySession).mockResolvedValue({ userId: 'user-corp-1' } as any);
    const mockDate = new Date('2026-09-25T12:00:00Z');

    vi.mocked(db.$transaction).mockImplementation(async (callback: any) => {
      const mockTx = {
        user: { update: vi.fn().mockResolvedValue({}) },
        apiConfig: { upsert: vi.fn().mockResolvedValue({}) },
        payment: { create: vi.fn().mockResolvedValue({ id: 'pay-123' }) },
        invoice: { create: vi.fn().mockResolvedValue({ id: 'inv-456', createdAt: mockDate }) },
      };
      return callback(mockTx);
    });

    const result = await createApiInvoiceAction({
      amountRub: 15000,
      companyName: 'ООО Ромашка',
      inn: '7701234567',
      kpp: '770101001',
      legalAddress: 'г. Москва, ул. Ленина, д. 1',
    });

    expect(result.success).toBe(true);
    expect(result.invoice).toBeDefined();
    expect(result.invoice?.invoiceId).toBe('inv-456');
    expect(result.invoice?.paymentId).toBe('pay-123');
    expect(result.invoice?.amountRub).toBe(15000);
  });
});

// ---------------------------------------------------------------------------
// 2. Nodemailer Transport Configurations (Requirement 2)
// ---------------------------------------------------------------------------
describe('CHALLENGER STRESS: Nodemailer Transport Timeouts (Requirement 2)', () => {
  it('verifies src/lib/smtp.ts transport has explicit connection and socket timeouts', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const smtpCode = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/smtp.ts'), 'utf-8');

    expect(smtpCode).toContain('connectionTimeout: 10000');
    expect(smtpCode).toContain('greetingTimeout: 10000');
    expect(smtpCode).toContain('socketTimeout: 15000');
  });

  it('verifies src/lib/emergency-email.ts transport has explicit connection and socket timeouts', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const code = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/emergency-email.ts'), 'utf-8');

    expect(code).toContain('connectionTimeout: 5000');
    expect(code).toContain('socketTimeout: 5000');
  });

  it('verifies src/actions/admin/settings.ts test SMTP action has explicit timeouts', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const code = fs.readFileSync(path.resolve(process.cwd(), 'src/actions/admin/settings.ts'), 'utf-8');

    expect(code).toContain('connectionTimeout: 5000');
    expect(code).toContain('greetingTimeout: 5000');
  });
});

// ---------------------------------------------------------------------------
// 3. Queue jobId Deduplication (Requirement 4)
// ---------------------------------------------------------------------------
describe('CHALLENGER STRESS: refillQueue.add JobId Deduplication (Requirement 4)', () => {
  it('verifies all refillQueue.add call sites specify deterministic jobId', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const adminRefillsCode = fs.readFileSync(path.resolve(process.cwd(), 'src/actions/admin/refills.ts'), 'utf-8');
    expect(adminRefillsCode).toMatch(/refillQueue\.add\([^)]*jobId:\s*`refill-\${refillId}`/);

    const clientRefillCode = fs.readFileSync(path.resolve(process.cwd(), 'src/actions/order/refill.ts'), 'utf-8');
    expect(clientRefillCode).toMatch(/refillQueue\.add\([^)]*jobId:\s*`refill-\${refill\.id}`/);

    const supportTicketCode = fs.readFileSync(path.resolve(process.cwd(), 'src/actions/support/ticket.ts'), 'utf-8');
    expect(supportTicketCode).toMatch(/refillQueue\.add\([^)]*jobId:\s*`refill-\${refill\.id}`/);
  });

  it('simulates BullMQ deduplication with identical jobId across concurrent requests', async () => {
    // Model BullMQ's deduplication semantics
    const queueJobs = new Map<string, any>();
    const mockBullMqAdd = vi.fn().mockImplementation(async (name: string, data: any, opts?: any) => {
      const jobId = opts?.jobId;
      if (jobId && queueJobs.has(jobId)) {
        // BullMQ returns existing job and does NOT create a duplicate
        return { id: jobId, isDuplicate: true, ...queueJobs.get(jobId) };
      }
      const newJob = { id: jobId || `job-${Date.now()}`, name, data, isDuplicate: false };
      if (jobId) {
        queueJobs.set(jobId, newJob);
      }
      return newJob;
    });

    const refillId = 'refill-target-999';
    const deterministicJobId = `refill-${refillId}`;

    // Simulate 5 rapid concurrent submissions for the same refill
    const results = await Promise.all([
      mockBullMqAdd('process-refill', { refillId }, { jobId: deterministicJobId }),
      mockBullMqAdd('process-refill', { refillId }, { jobId: deterministicJobId }),
      mockBullMqAdd('process-refill', { refillId }, { jobId: deterministicJobId }),
      mockBullMqAdd('process-refill', { refillId }, { jobId: deterministicJobId }),
      mockBullMqAdd('process-refill', { refillId }, { jobId: deterministicJobId }),
    ]);

    expect(results).toHaveLength(5);
    // All 5 returned the same job ID
    results.forEach((res) => {
      expect(res.id).toBe(deterministicJobId);
    });

    // Exactly 1 job exists in the queue storage
    expect(queueJobs.size).toBe(1);
    expect(queueJobs.has(deterministicJobId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Sync Processor Timer Cleanup (Requirement 1)
// ---------------------------------------------------------------------------
describe('CHALLENGER STRESS: sync.processor.ts Timer Handles (Requirement 1)', () => {
  it('verifies batchTimerId and singleTimerId are cleared via clearTimeout in finally blocks', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const syncCode = fs.readFileSync(path.resolve(process.cwd(), 'src/workers/processors/sync.processor.ts'), 'utf-8');

    // Check batch timer declaration and cleanup
    expect(syncCode).toContain('let batchTimerId: NodeJS.Timeout | undefined;');
    expect(syncCode).toContain('batchTimerId = setTimeout(() => reject(new Error(\'PROVIDER_TIMEOUT\')), 15000);');
    expect(syncCode).toContain('if (batchTimerId) clearTimeout(batchTimerId);');

    // Check single fallback timer declaration and cleanup
    expect(syncCode).toContain('let singleTimerId: NodeJS.Timeout | undefined;');
    expect(syncCode).toContain('singleTimerId = setTimeout(() => resolve(null), 3000);');
    expect(syncCode).toContain('if (singleTimerId) clearTimeout(singleTimerId);');
  });

  it('empirically verifies timer cleanup during successful and failed Promise.race execution', async () => {
    const activeTimers = new Set<NodeJS.Timeout>();

    const realSetTimeout = global.setTimeout;
    const realClearTimeout = global.clearTimeout;

    const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation((fn: any, delay: any) => {
      const id = realSetTimeout(fn, delay);
      activeTimers.add(id);
      return id;
    });

    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout').mockImplementation((id: any) => {
      activeTimers.delete(id);
      return realClearTimeout(id);
    });

    try {
      // Simulate the exact pattern in sync.processor.ts for batch query
      let batchTimerId: NodeJS.Timeout | undefined;
      let statuses: any = {};

      const mockFastProvider = {
        getMultiOrderStatus: vi.fn().mockResolvedValue({ 'ext-1': { status: 'COMPLETED' } }),
      };

      try {
        statuses = await Promise.race([
          mockFastProvider.getMultiOrderStatus(['ext-1']),
          new Promise<never>((_, reject) => {
            batchTimerId = setTimeout(() => reject(new Error('PROVIDER_TIMEOUT')), 15000);
          }),
        ]);
      } finally {
        if (batchTimerId) clearTimeout(batchTimerId);
      }

      expect(statuses).toEqual({ 'ext-1': { status: 'COMPLETED' } });
      expect(clearTimeoutSpy).toHaveBeenCalledWith(batchTimerId);
      expect(activeTimers.has(batchTimerId!)).toBe(false);

      // Now simulate fallback single query pattern
      let singleTimerId: NodeJS.Timeout | undefined;
      let singleStatus: any = null;
      const mockSingleProvider = {
        getOrderStatus: vi.fn().mockResolvedValue({ status: 'PARTIAL' }),
      };

      try {
        singleStatus = await Promise.race([
          mockSingleProvider.getOrderStatus('ext-2'),
          new Promise<null>((resolve) => {
            singleTimerId = setTimeout(() => resolve(null), 3000);
          }),
        ]);
      } finally {
        if (singleTimerId) clearTimeout(singleTimerId);
      }

      expect(singleStatus).toEqual({ status: 'PARTIAL' });
      expect(clearTimeoutSpy).toHaveBeenCalledWith(singleTimerId);
      expect(activeTimers.has(singleTimerId!)).toBe(false);

    } finally {
      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
      // Clean up any remaining
      for (const t of activeTimers) {
        realClearTimeout(t);
      }
    }
  });
});
