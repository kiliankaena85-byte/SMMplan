import { db } from '../src/lib/db';

async function runExplainAnalyze() {
  console.log('='.repeat(80));
  console.log('  EXPLAIN (ANALYZE, BUFFERS) DIAGNOSTICS FOR CORE ADMIN QUERIES');
  console.log('='.repeat(80));

  // 1. Orders Page 1
  console.log('\n--- [1] Orders Table Pagination Query ---');
  const planOrders = await db.$queryRawUnsafe<Array<{ 'QUERY PLAN': string }>>(`
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT o.id, o."numericId", o.status, o.quantity, o.charge, o."createdAt", u.email, s.name as service_name
    FROM "Order" o
    LEFT JOIN "User" u ON o."userId" = u.id
    LEFT JOIN "Service" s ON o."serviceId" = s.id
    ORDER BY o."createdAt" DESC, o.id DESC
    LIMIT 50;
  `);
  for (const r of planOrders) {
    console.log(r['QUERY PLAN']);
  }

  // 2. Catalog Services List
  console.log('\n--- [2] Catalog Services 3-Level Join Query ---');
  const planCatalog = await db.$queryRawUnsafe<Array<{ 'QUERY PLAN': string }>>(`
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT s.id, s.name, s.rate, s.markup, s."sortOrder", c.name as cat_name, n.name as net_name, p.name as prov_name
    FROM "Service" s
    LEFT JOIN "Category" c ON s."categoryId" = c.id
    LEFT JOIN "Network" n ON c."networkId" = n.id
    LEFT JOIN "Provider" p ON s."providerId" = p.id
    ORDER BY s."sortOrder" ASC
    LIMIT 50;
  `);
  for (const r of planCatalog) {
    console.log(r['QUERY PLAN']);
  }

  // 3. Service Profitability GroupBy
  console.log('\n--- [3] Analytics Profitability GroupBy Query ---');
  const planProfit = await db.$queryRawUnsafe<Array<{ 'QUERY PLAN': string }>>(`
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT "serviceId", sum(charge) as total_charge, sum("providerCost") as total_cost, count(*) as orders_count
    FROM "Order"
    WHERE status NOT IN ('AWAITING_PAYMENT', 'PENDING', 'ERROR')
    GROUP BY "serviceId"
    ORDER BY "serviceId" ASC
    LIMIT 50;
  `);
  for (const r of planProfit) {
    console.log(r['QUERY PLAN']);
  }

  // 4. Ledger Table List
  console.log('\n--- [4] Ledger Entries Query ---');
  const planLedger = await db.$queryRawUnsafe<Array<{ 'QUERY PLAN': string }>>(`
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT l.id, l.amount, l."transactionType", l."createdAt", u.email
    FROM "LedgerEntry" l
    LEFT JOIN "User" u ON l."userId" = u.id
    WHERE l."tenantId" = 'smmplan'
    ORDER BY l."createdAt" DESC, l.id DESC
    LIMIT 50;
  `);
  for (const r of planLedger) {
    console.log(r['QUERY PLAN']);
  }

  // 5. Audit Log Feed
  console.log('\n--- [5] Admin Audit Log Feed ---');
  const planAudit = await db.$queryRawUnsafe<Array<{ 'QUERY PLAN': string }>>(`
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT id, action, details, "createdAt"
    FROM "AdminAuditLog"
    WHERE "tenantId" = 'smmplan'
    ORDER BY "createdAt" DESC
    LIMIT 5;
  `);
  for (const r of planAudit) {
    console.log(r['QUERY PLAN']);
  }
}

runExplainAnalyze()
  .catch(console.error)
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });
