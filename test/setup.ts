import { beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { db } from '@/lib/db';

beforeAll(() => {
  // Provide test encryption key so EncryptionService doesn't fail
  process.env.APP_ENCRYPTION_KEY = '0000000000000000000000000000000000000000000000000000000000000000';
  
  // Use the default Docker port for Redis
  process.env.REDIS_URL = 'redis://127.0.0.1:6379';
  
  // Mock external fetch to avoid real network requests to YooKassa/CryptoBot
  vi.stubGlobal('fetch', vi.fn());

  // Mock Next.js Cache invalidation methods to prevent 'static generation store missing' errors natively
  vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    unstable_cache: (fn: any) => fn
  }));
});

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function resetTestDb() {
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const tablenames = await db.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations';
      `;
      
      const tables = tablenames
          .map(({ tablename }) => `"${tablename}"`)
          .join(', ');

      if (tables.length > 0) {
        await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`);
      }

      // Pre-create singleton settings to avoid P2002 race conditions in getCached
      await db.systemSettings.create({
        data: {
          id: "global",
          taxRate: 6.0,
          opexMonthly: 0,
          maintenanceMode: false,
          isTestMode: false,
          siteName: "Smmplan",
          siteDescription: "",
          exchangeRateUSD: 95.0
        }
      });
      
      return;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isTransient =
        /deadlock|write conflict|could not serialize|timeout/i.test(msg);

      if (!isTransient || attempt === MAX_RETRIES) {
        throw error;
      }

      await sleep(100 * attempt);
    }
  }
}

beforeEach(async () => {
  await resetTestDb();
});

afterAll(async () => {
  await db.$disconnect();
});
