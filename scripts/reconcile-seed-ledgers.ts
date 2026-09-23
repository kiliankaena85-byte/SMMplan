import { PrismaClient } from '@prisma/client';
import fs from 'fs';

function getDatasourceUrl(): string {
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

const db = new PrismaClient({
  datasources: { db: { url: getDatasourceUrl() } },
});

async function main() {
  console.log('Reconciling initial balances and ledger entries for seed/test accounts...');

  const targets = [
    {
      userId: 'cmu1d1e9p0001tqe8y5drz5nh', // admin@example.com
      amount: 10000000n,
      reason: 'Initial system administrative reserve allocation',
      idempotencyKey: 'init-admin-reserve-001',
    },
    {
      userId: 'cuid_audit_admin_user_000000001', // admin.audit@smmplan.pro
      amount: 10000000n,
      reason: 'Audit fixture initial admin reserve allocation',
      idempotencyKey: 'audit-seed-admin-ledger-001',
    },
    {
      userId: 'cuid_audit_client_user_00000001', // client.audit@smmplan.pro (has 150000, needs +1350000)
      amount: 1350000n,
      reason: 'Audit fixture client balance alignment',
      idempotencyKey: 'audit-seed-client-ledger-adj-001',
    },
    {
      userId: 'cmu5q5j1i0000w8xz78vlfdhy', // smoke-test-live-1789661339041@smmplan.pro (has 10000, balance 60000)
      amount: 50000n,
      reason: 'Smoke test user initial wallet funding',
      idempotencyKey: 'smoke-test-initial-deposit-1789661339041',
    },
    {
      userId: 'cmu5qgmso0000oytq1no3pmkn', // smoke-test-live-1789661857123@smmplan.pro (has 10000, balance 60000)
      amount: 50000n,
      reason: 'Smoke test user initial wallet funding',
      idempotencyKey: 'smoke-test-initial-deposit-1789661857123',
    },
    {
      userId: 'cmu1tlyk50005ql9sljkymmi1', // client-e2e-1789425279796@smmplan.local (has 0, balance 500000)
      amount: 500000n,
      reason: 'E2E test fixture initial wallet funding',
      idempotencyKey: 'e2e-fixture-initial-deposit-1789425279796',
    },
  ];

  for (const t of targets) {
    const user = await db.user.findUnique({ where: { id: t.userId } });
    if (!user) {
      console.log(`User ${t.userId} not found, skipping.`);
      continue;
    }

    const existingEntry = await db.ledgerEntry.findFirst({
      where: { idempotencyKey: t.idempotencyKey },
    });

    if (!existingEntry) {
      await db.ledgerEntry.create({
        data: {
          userId: t.userId,
          amount: t.amount,
          reason: t.reason,
          status: 'APPROVED',
          transactionType: 'PAYMENT',
          tenantId: user.tenantId || 'smmplan',
          idempotencyKey: t.idempotencyKey,
        },
      });
      console.log(`Created ledger entry for user ${user.email} (${t.amount} cents).`);
    } else {
      console.log(`Entry ${t.idempotencyKey} already exists.`);
    }
  }

  console.log('Done reconciling seed entries.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
