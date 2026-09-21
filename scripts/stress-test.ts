import Module from 'module';
const originalRequire = Module.prototype.require;
// @ts-ignore
Module.prototype.require = function (id: string) {
  if (id === 'server-only') return {};
  return originalRequire.apply(this, arguments as any);
};
try {
  require.cache[require.resolve('server-only')] = {
    id: require.resolve('server-only'),
    filename: require.resolve('server-only'),
    loaded: true,
    exports: {},
  } as any;
} catch {}

import fs from 'fs';
import { randomUUID } from 'crypto';

function getDatasourceUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) {
    url = 'postgresql://postgres:postgres@127.0.0.1:5435/smmplan_lite?schema=public';
  }
  const isInsideDocker = fs.existsSync('/.dockerenv');
  if (!isInsideDocker && url.includes('@db:')) {
    url = url.replace('@db:5432', '@127.0.0.1:5435').replace('@db:', '@127.0.0.1:5435');
  }
  return url;
}

if (!process.env.REDIS_URL || process.env.REDIS_URL.includes('@redis:')) {
  if (!fs.existsSync('/.dockerenv')) {
    process.env.REDIS_URL = (process.env.REDIS_URL || 'redis://:SmmP1anR3dis2026Secure!@127.0.0.1:6379')
      .replace('@redis:', '@127.0.0.1:');
  }
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: getDatasourceUrl() } },
});

async function runStressTest() {
  console.log('--- STARTING PAYMENT IDEMPOTENCY & CONCURRENCY STRESS TEST ---');

  // Dynamic imports after server-only mock has loaded into require.cache
  const { checkoutAction } = await import('../src/actions/order/checkout');

  // 1. Setup a test victim user with limited balance (100 RUB = 10,000 CENTS)
  const email = `stress-victim-${randomUUID()}@test.com`;
  const victim = await prisma.user.create({
    data: {
      email,
      balance: BigInt(10000), // 100 RUB limit
      tenantId: 'smmplan',
      isActive: true,
      role: 'USER',
    }
  });

  await prisma.ledgerEntry.create({
    data: {
      userId: victim.id,
      amount: BigInt(10000),
      reason: 'Stress test victim initial balance funding',
      status: 'APPROVED',
      transactionType: 'PAYMENT',
      tenantId: 'smmplan',
      idempotencyKey: `stress-init-${victim.id}`,
    }
  });

  const provider = await prisma.provider.create({
    data: {
      name: `stress-provider-${randomUUID()}`,
      apiUrl: 'http://localhost',
      apiKey: 'test',
    }
  });

  const category = await prisma.category.create({
    data: {
      name: `stress-cat-${randomUUID()}`,
    }
  });

  const service = await prisma.service.create({
    data: {
      name: 'Stress Test Service',
      numericId: Math.floor(Math.random() * 1000000),
      providerId: provider.id,
      categoryId: category.id,
      externalId: 'stress-ext-999',
      rate: 1.0,
      markup: 2.0,
      minQty: 10,
      maxQty: 1000,
      isActive: true,
      tenantId: 'smmplan',
    }
  });

  const { marketingService } = await import('../src/services/marketing.service');
  const pricing = await marketingService.calculatePrice(null, service.id, service.minQty);
  const costPerOrderCents = BigInt(pricing.totalCents);
  const maxPossibleOrders = Number(BigInt(10000) / costPerOrderCents);

  console.log(`Victim ${email} created with 100 RUB (10,000 cents) balance.`);
  console.log(`Order cost: ${costPerOrderCents} cents (${Number(costPerOrderCents) / 100} RUB). Max possible orders: ${maxPossibleOrders}.`);
  console.log('Spawning 500 concurrent checkout attempts to stress-test Serializable isolation...');

  // Configure environment for authenticated test session
  const prevAppEnv = process.env.APP_ENV;
  const prevNodeEnv = process.env.NODE_ENV;
  const prevDevAutoLogin = process.env.DEV_AUTO_LOGIN;
  const prevDevBypassEmail = process.env.DEV_BYPASS_EMAIL;
  const prevMockSmtp = process.env.DEV_MOCK_SMTP;

  process.env.APP_ENV = 'test';
  process.env.NODE_ENV = 'test';
  process.env.DEV_AUTO_LOGIN = 'true';
  process.env.DEV_BYPASS_EMAIL = victim.email;
  process.env.DEV_MOCK_SMTP = 'true';

  let successCount = 0;
  let failCount = 0;

  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    // Suppress expected safe action rejection noise during high-concurrency race
    const first = args[0];
    if (typeof first === 'string' && first.includes('[SAFE_ACTION_ERROR]')) return;
    if (first && typeof first === 'object' && ('name' in first || 'message' in first)) return;
    originalConsoleError(...args);
  };

  try {
    const promises = Array.from({ length: 500 }).map(async (_, i) => {
      try {
        const idempotencyKey = `stress-chk-${String(i).padStart(6, '0')}-${victim.id.slice(0, 10)}`;
        const res = await checkoutAction({
          serviceId: service.id,
          link: 'https://stress.test',
          quantity: service.minQty,
          email: victim.email,
          gateway: 'balance',
          idempotencyKey,
        });
        if (res.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    });

    const startTime = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - startTime;

    console.log(`\n--- STRESS TEST RESULTS (${duration}ms) ---`);
    console.log(`Successful Orders: ${successCount} (max mathematically possible: ${maxPossibleOrders})`);
    console.log(`Rejected Orders:   ${failCount}`);

    const postVictim = await prisma.user.findUnique({ where: { id: victim.id } });
    const ledgerAgg = await prisma.ledgerEntry.aggregate({
      where: { userId: victim.id },
      _sum: { amount: true },
    });

    const expectedBalance = BigInt(ledgerAgg._sum.amount || 0);
    const actualBalance = BigInt(postVictim?.balance || 0);

    console.log(`Final victim balance:   ${actualBalance} CENTS`);
    console.log(`Ledger aggregate sum:   ${expectedBalance} CENTS`);
    console.log(`Ledger drift:           ${expectedBalance - actualBalance} CENTS`);

    if (actualBalance < BigInt(0)) {
      console.error('❌ CRITICAL FAILURE: Balance dropped below zero! Concurrency locks failed.');
      process.exit(1);
    } else if (actualBalance !== expectedBalance) {
      console.error('❌ CRITICAL FAILURE: Balance diverges from ledger entries! Double spend detected.');
      process.exit(1);
    } else if (successCount > maxPossibleOrders) {
      console.error(`❌ CRITICAL FAILURE: More orders succeeded than possible (${successCount} > ${maxPossibleOrders})! Double spend.`);
      process.exit(1);
    } else {
      console.log('✅ PASS: Serializable isolation & atomic balance guards completely prevented double spend.');
    }
  } finally {
    // Restore console.error and environment
    console.error = originalConsoleError;
    process.env.APP_ENV = prevAppEnv;
    process.env.NODE_ENV = prevNodeEnv;
    process.env.DEV_AUTO_LOGIN = prevDevAutoLogin;
    process.env.DEV_BYPASS_EMAIL = prevDevBypassEmail;
    process.env.DEV_MOCK_SMTP = prevMockSmtp;

    // Cleanup: LedgerEntry is immutable by PostgreSQL trigger (P0001)
    try {
      await prisma.user.update({
        where: { id: victim.id },
        data: { isDeleted: true, isActive: false },
      });
      await prisma.order.deleteMany({ where: { userId: victim.id } });
      await prisma.service.delete({ where: { id: service.id } });
      await prisma.category.delete({ where: { id: category.id } });
      await prisma.provider.delete({ where: { id: provider.id } });
    } catch (cleanErr) {
      console.warn('[Stress] Notice during cleanup:', (cleanErr as Error).message);
    }
  }
}

runStressTest()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
