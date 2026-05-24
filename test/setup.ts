import { beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { db } from '@/lib/db';

// Mock admin audit module globally to prevent concurrent background DB writes from causing deadlocks during TRUNCATE.
vi.mock('@/lib/admin-audit', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/admin-audit')>();
  const { db } = await import('@/lib/db');
  
  return {
    ...original,
    auditAdmin: (params: any) => {
      // In testing, we turn fire-and-forget into a tracked promise that we can await before each TRUNCATE.
      const promise = db.adminAuditLog.create({
        data: {
          adminId: params.adminId,
          adminEmail: params.adminEmail,
          action: params.action,
          target: params.target,
          targetType: params.targetType,
          oldValue: original.safeSerialize(params.oldValue),
          newValue: original.safeSerialize(params.newValue),
          ipAddress: params.ipAddress ?? null,
        },
      }).catch((err) => {
        console.error('[AdminAudit Mock] Failed to write log:', err);
      });

      const g = globalThis as any;
      g.__pendingAuditPromises = g.__pendingAuditPromises || [];
      g.__pendingAuditPromises.push(promise);
    },
    auditAdminAwaitable: async (params: any) => {
      return db.adminAuditLog.create({
        data: {
          adminId: params.adminId,
          adminEmail: params.adminEmail,
          action: params.action,
          target: params.target,
          targetType: params.targetType,
          oldValue: original.safeSerialize(params.oldValue),
          newValue: original.safeSerialize(params.newValue),
          ipAddress: params.ipAddress ?? null,
        },
      });
    }
  };
});

beforeAll(async () => {
  // OMNI-AUDIT: Block accidental truncation of the development database
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.includes('test') && !dbUrl.includes('smmplan_test')) {
    throw new Error(
      `[FATAL] Accidental DB wipe protection triggered! ` +
      `DATABASE_URL points to a non-test database: "${dbUrl}". ` +
      `Vitest was about to truncate your entire development database. ` +
      `Please run tests using "npm run test" or ensure "dotenv -e .env.test" is active.`
    );
  }

  // Terminate other active connections to avoid lock-wait deadlocks with zombie connections
  try {
    await db.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = current_database() 
        AND pid <> pg_backend_pid();
    `);
  } catch (err) {
    // Ignore errors if the database is in a state where pg_stat_activity isn't queried or user lacks permission
  }

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
      await db.systemSettings.upsert({
        where: { id: "global" },
        update: {
          taxRate: 6.0,
          opexMonthly: 0,
          maintenanceMode: false,
          isTestMode: false,
          siteName: "Smmplan",
          siteDescription: "",
          exchangeRateUSD: 95.0
        },
        create: {
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

afterEach(async () => {
  const promises = (globalThis as any).__pendingAuditPromises || [];
  if (promises.length > 0) {
    await Promise.all(promises);
    (globalThis as any).__pendingAuditPromises = [];
  }
});

afterAll(async () => {
  await db.$disconnect();
});
