/**
 * Benchmark Admin Database Performance
 * OmniSMM 1.0 Engineering Diagnostic Standard (postgres-query-doctor & nfr-performance-budget)
 * 
 * Measures raw database query latencies, parallel batch execution times,
 * PostgreSQL buffer cache / index hit ratios, and NFR performance budget compliance
 * across all admin panel views.
 */

import { db } from '../src/lib/db';

interface BenchmarkStat {
  min: number;
  max: number;
  mean: number;
  p50: number;
  p95: number;
  samples: number[];
  rowsReturned?: number;
  status: 'PASS' | 'WARN' | 'FAIL';
}

interface QueryResult {
  name: string;
  category: string;
  stat: BenchmarkStat;
  details?: string;
}

interface ScreenResult {
  screen: string;
  route: string;
  totalParallelStat: BenchmarkStat;
  queries: QueryResult[];
  nfrBudgetMs: number;
  status: 'PASS' | 'WARN' | 'FAIL';
}

// Helpers
function calculateStats(samples: number[], rowsReturned?: number, budgetMs: number = 30): BenchmarkStat {
  const sorted = [...samples].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || max;

  let status: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
  if (p95 > budgetMs * 2) {
    status = 'FAIL';
  } else if (p95 > budgetMs) {
    status = 'WARN';
  }

  return { min, max, mean, p50, p95, samples, rowsReturned, status };
}

async function measure<T>(fn: () => Promise<T>, runs = 10, budgetMs = 30): Promise<{ stat: BenchmarkStat; result: T }> {
  // 1 warm-up run
  const warmUpResult = await fn();

  const samples: number[] = [];
  let lastResult = warmUpResult;

  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    lastResult = await fn();
    const duration = performance.now() - start;
    samples.push(duration);
  }

  let rowsReturned: number | undefined;
  if (Array.isArray(lastResult)) {
    rowsReturned = lastResult.length;
  } else if (typeof lastResult === 'number') {
    rowsReturned = lastResult;
  } else if (lastResult && typeof lastResult === 'object' && '_count' in lastResult) {
    rowsReturned = 1;
  }

  return {
    stat: calculateStats(samples, rowsReturned, budgetMs),
    result: lastResult,
  };
}

async function getPostgresStats() {
  const cacheHit = await db.$queryRawUnsafe<Array<{ hit_ratio: string }>>(`
    SELECT 
      CASE 
        WHEN (sum(heap_blks_hit) + sum(heap_blks_read)) = 0 THEN '100.00'
        ELSE round((sum(heap_blks_hit)::numeric / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100), 2)::text
      END AS hit_ratio
    FROM pg_statio_user_tables;
  `);

  const indexUsage = await db.$queryRawUnsafe<Array<{ relname: string; idx_scan: bigint; seq_scan: bigint; pct_index: string }>>(`
    SELECT 
      relname,
      idx_scan,
      seq_scan,
      CASE 
        WHEN (idx_scan + seq_scan) = 0 THEN '100.00'
        ELSE round((idx_scan::numeric / (idx_scan + seq_scan) * 100), 2)::text
      END AS pct_index
    FROM pg_stat_user_tables
    WHERE relname IN ('User', 'Order', 'Service', 'LedgerEntry', 'AdminAuditLog', 'Ticket', 'Payment', 'Category', 'Network', 'Provider')
    ORDER BY (idx_scan + seq_scan) DESC;
  `);

  const tableSizes = await db.$queryRawUnsafe<Array<{ table_name: string; total_size: string; live_rows: bigint }>>(`
    SELECT 
      relname as table_name,
      pg_size_pretty(pg_total_relation_size(relid)) as total_size,
      n_live_tup as live_rows
    FROM pg_stat_user_tables
    ORDER BY pg_total_relation_size(relid) DESC
    LIMIT 10;
  `);

  const connections = await db.$queryRawUnsafe<Array<{ count: bigint; state: string }>>(`
    SELECT count(*), coalesce(state, 'connecting') as state
    FROM pg_stat_activity
    GROUP BY state;
  `);

  return {
    cacheHitRatio: cacheHit[0]?.hit_ratio || '100.00',
    indexUsage,
    tableSizes,
    connections,
  };
}

async function runBenchmark() {
  console.log('='.repeat(80));
  console.log('  OmniSMM 1.0 — Admin Panel Database Performance Benchmark');
  console.log('  Target NFR Budgets: Single Query P95 <= 30ms | Screen Batch P95 <= 200ms');
  console.log('='.repeat(80));
  console.log('\n[Phase 1] Collecting PostgreSQL Engine & Health Metrics...');

  const pgStats = await getPostgresStats();
  console.log(`- Buffer Cache Hit Ratio: ${pgStats.cacheHitRatio}%`);
  console.log('- Active DB Connections:');
  for (const c of pgStats.connections) {
    console.log(`  * ${c.state}: ${c.count}`);
  }
  console.log('- Top Tables by Disk Size:');
  for (const t of pgStats.tableSizes.slice(0, 5)) {
    console.log(`  * ${t.table_name}: ${t.total_size} (est. live rows: ${t.live_rows})`);
  }

  const screens: ScreenResult[] = [];

  // ──────────────────────────────────────────────────────────────────────────
  // SCREEN 0: COMMON ADMIN LAYOUT & RBAC (Executes on every admin page load)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n[Phase 2] Benchmarking Screen 0: Admin Layout & Navigation Guard...');
  const layoutQueries: QueryResult[] = [];

  const qStaff = await measure(async () => {
    return db.user.findFirst({
      where: { role: { in: ['OWNER', 'ADMIN', 'SUPPORT'] } },
      include: {
        staffRole: {
          include: {
            permissions: true,
          },
        },
      },
    });
  }, 10, 30);
  layoutQueries.push({ name: 'Staff User + Role + Permissions', category: 'Layout/RBAC', stat: qStaff.stat });

  const qSettings = await measure(async () => {
    return db.systemSettings.findFirst({
      where: { id: 'smmplan' },
    });
  }, 10, 30);
  layoutQueries.push({ name: 'System Settings (Environment Mode)', category: 'Layout/RBAC', stat: qSettings.stat });

  const qTicketBadge = await measure(async () => {
    return db.ticket.groupBy({
      by: ['status'],
      _count: true,
      where: { status: { in: ['OPEN', 'PENDING'] } },
    });
  }, 10, 30);
  layoutQueries.push({ name: 'Active Tickets Badge Count', category: 'Layout/RBAC', stat: qTicketBadge.stat });

  const layoutParallel = await measure(async () => {
    return Promise.all([
      db.user.findFirst({
        where: { role: { in: ['OWNER', 'ADMIN', 'SUPPORT'] } },
        include: { staffRole: { include: { permissions: true } } },
      }),
      db.systemSettings.findFirst({ where: { id: 'smmplan' } }),
      db.ticket.groupBy({ by: ['status'], _count: true, where: { status: { in: ['OPEN', 'PENDING'] } } }),
    ]);
  }, 10, 50);

  screens.push({
    screen: 'Common Admin Layout & RBAC',
    route: '/admin/* (Layout)',
    totalParallelStat: layoutParallel.stat,
    queries: layoutQueries,
    nfrBudgetMs: 50,
    status: layoutParallel.stat.status,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SCREEN 1: DASHBOARD (/admin/dashboard)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('[Phase 3] Benchmarking Screen 1: Dashboard (/admin/dashboard)...');
  const dashQueries: QueryResult[] = [];

  const qPayments = await measure(async () => {
    return db.payment.groupBy({
      by: ['gateway'],
      _sum: { amount: true },
      where: { status: 'SUCCEEDED', tenantId: 'smmplan' },
    });
  }, 10, 30);
  dashQueries.push({ name: 'Payment Gateways Revenue GroupBy', category: 'Dashboard', stat: qPayments.stat });

  const qOrderStats = await measure(async () => {
    return db.order.groupBy({
      by: ['status'],
      _count: true,
      where: { tenantId: 'smmplan' },
    });
  }, 10, 30);
  dashQueries.push({ name: 'Order Statuses GroupBy', category: 'Dashboard', stat: qOrderStats.stat });

  const qUserStats = await measure(async () => {
    return Promise.all([
      db.user.count({ where: { tenantId: 'smmplan' } }),
      db.user.aggregate({
        where: { tenantId: 'smmplan' },
        _sum: { balance: true, totalSpent: true },
      }),
    ]);
  }, 10, 30);
  dashQueries.push({ name: 'User Counts & Liability Sums', category: 'Dashboard', stat: qUserStats.stat });

  const qAudit = await measure(async () => {
    return db.adminAuditLog.findMany({
      where: { tenantId: 'smmplan' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  }, 10, 30);
  dashQueries.push({ name: 'Recent Audit Feed (5 records)', category: 'Dashboard', stat: qAudit.stat });

  const qRecentOrders = await measure(async () => {
    return db.order.findMany({
      where: { tenantId: 'smmplan' },
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true } },
        service: { select: { id: true, name: true, numericId: true } },
      },
    });
  }, 10, 30);
  dashQueries.push({ name: 'Recent Orders Feed (6 with relations)', category: 'Dashboard', stat: qRecentOrders.stat });

  const qTopSpenders = await measure(async () => {
    return db.user.findMany({
      where: { tenantId: 'smmplan' },
      orderBy: { totalSpent: 'desc' },
      take: 6,
      select: { id: true, email: true, totalSpent: true, balance: true },
    });
  }, 10, 30);
  dashQueries.push({ name: 'Top Spenders (6 users)', category: 'Dashboard', stat: qTopSpenders.stat });

  const qCatalogHealth = await measure(async () => {
    return db.service.groupBy({
      by: ['isQuarantined', 'cooldownReason'],
      _count: true,
      where: {
        OR: [
          { isQuarantined: true },
          { cooldownReason: 'ZOMBIE_AUTO_DISABLED' },
          { cooldownUntil: { gt: new Date() } },
        ],
      },
    });
  }, 10, 30);
  dashQueries.push({ name: 'Catalog Health Status GroupBy', category: 'Dashboard', stat: qCatalogHealth.stat });

  // Full Parallel Dashboard Load (as executed on page render)
  const dashParallel = await measure(async () => {
    return Promise.all([
      db.payment.groupBy({ by: ['gateway'], _sum: { amount: true }, where: { status: 'SUCCEEDED' } }),
      db.order.groupBy({ by: ['status'], _count: true }),
      db.user.count(),
      db.user.aggregate({ _sum: { balance: true, totalSpent: true } }),
      db.ticket.groupBy({ by: ['status'], _count: true }),
      db.service.count(),
      db.adminAuditLog.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
      db.user.findMany({ orderBy: { totalSpent: 'desc' }, take: 6 }),
      db.order.findMany({ take: 6, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, email: true } }, service: { select: { id: true, name: true } } } }),
      db.service.groupBy({ by: ['isQuarantined'], _count: true }),
    ]);
  }, 10, 150);

  screens.push({
    screen: 'Dashboard Overview',
    route: '/admin/dashboard',
    totalParallelStat: dashParallel.stat,
    queries: dashQueries,
    nfrBudgetMs: 150,
    status: dashParallel.stat.status,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SCREEN 2: ORDERS (/admin/orders)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('[Phase 4] Benchmarking Screen 2: Orders (/admin/orders)...');
  const orderQueries: QueryResult[] = [];

  const qNetworksTree = await measure(async () => {
    return db.network.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        categories: { select: { id: true, name: true, slug: true }, orderBy: { sort: 'asc' } },
      },
      orderBy: { sort: 'asc' },
    });
  }, 10, 30);
  orderQueries.push({ name: 'Networks & Categories Tree Filter', category: 'Orders', stat: qNetworksTree.stat });

  const qProvidersFilter = await measure(async () => {
    return db.provider.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }, 10, 30);
  orderQueries.push({ name: 'Active Providers Filter List', category: 'Orders', stat: qProvidersFilter.stat });

  const qOrdersList = await measure(async () => {
    return db.order.findMany({
      take: 50,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        user: { select: { id: true, email: true } },
        service: { select: { id: true, name: true, numericId: true, rate: true } },
        provider: { select: { id: true, name: true } },
        payment: { select: { id: true, gateway: true } },
      },
    });
  }, 10, 50);
  orderQueries.push({ name: 'Orders Page 1 (50 items + 4 relations)', category: 'Orders', stat: qOrdersList.stat });

  const qOrdersCount = await measure(async () => {
    return db.order.count();
  }, 10, 30);
  orderQueries.push({ name: 'Orders Total Count for Pagination', category: 'Orders', stat: qOrdersCount.stat });

  const ordersParallel = await measure(async () => {
    return Promise.all([
      db.network.findMany({ select: { id: true, name: true, slug: true, categories: { select: { id: true, name: true } } } }),
      db.provider.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
      db.order.findMany({
        take: 50,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          user: { select: { id: true, email: true } },
          service: { select: { id: true, name: true, numericId: true } },
          provider: { select: { id: true, name: true } },
        },
      }),
      db.order.count(),
    ]);
  }, 10, 100);

  screens.push({
    screen: 'Orders Registry',
    route: '/admin/orders',
    totalParallelStat: ordersParallel.stat,
    queries: orderQueries,
    nfrBudgetMs: 100,
    status: ordersParallel.stat.status,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SCREEN 3: CATALOG (/admin/catalog)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('[Phase 5] Benchmarking Screen 3: Catalog (/admin/catalog)...');
  const catQueries: QueryResult[] = [];

  const qServicesList = await measure(async () => {
    return db.service.findMany({
      take: 50,
      orderBy: { sortOrder: 'asc' },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            network: { select: { id: true, name: true, icon: true } },
          },
        },
        provider: { select: { id: true, name: true } },
      },
    });
  }, 10, 50);
  catQueries.push({ name: 'Services List (50 items + 3-level joins)', category: 'Catalog', stat: qServicesList.stat });

  const qServicesCount = await measure(async () => {
    return db.service.count();
  }, 10, 30);
  catQueries.push({ name: 'Services Total Count', category: 'Catalog', stat: qServicesCount.stat });

  const qCategoriesList = await measure(async () => {
    return db.category.findMany({
      select: { id: true, name: true, network: { select: { name: true } } },
      orderBy: { sort: 'asc' },
    });
  }, 10, 30);
  catQueries.push({ name: 'Categories List Filter', category: 'Catalog', stat: qCategoriesList.stat });

  const qMarkupAgg = await measure(async () => {
    return db.service.aggregate({
      _avg: { markup: true, rate: true },
      _min: { rate: true },
      _max: { rate: true },
      where: { isActive: true },
    });
  }, 10, 30);
  catQueries.push({ name: 'Catalog Markup Analytics Aggregate', category: 'Catalog', stat: qMarkupAgg.stat });

  const catParallel = await measure(async () => {
    return Promise.all([
      db.service.findMany({
        take: 50,
        orderBy: { sortOrder: 'asc' },
        include: {
          category: { select: { id: true, name: true, network: { select: { id: true, name: true } } } },
          provider: { select: { id: true, name: true } },
        },
      }),
      db.service.count(),
      db.category.findMany({ select: { id: true, name: true } }),
      db.service.aggregate({ _avg: { markup: true }, where: { isActive: true } }),
      db.provider.findMany({ select: { id: true, name: true } }),
      db.network.findMany({ select: { id: true, name: true } }),
    ]);
  }, 10, 100);

  screens.push({
    screen: 'Catalog & Services',
    route: '/admin/catalog',
    totalParallelStat: catParallel.stat,
    queries: catQueries,
    nfrBudgetMs: 100,
    status: catParallel.stat.status,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SCREEN 4: CLIENTS (/admin/clients)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('[Phase 6] Benchmarking Screen 4: Clients (/admin/clients)...');
  const clientQueries: QueryResult[] = [];

  const qClientsList = await measure(async () => {
    return db.user.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { orders: true, tickets: true },
        },
      },
    });
  }, 10, 40);
  clientQueries.push({ name: 'Users List (50 items + order/ticket counts)', category: 'Clients', stat: qClientsList.stat });

  const qClientsCount = await measure(async () => {
    return db.user.count();
  }, 10, 30);
  clientQueries.push({ name: 'Users Total Count', category: 'Clients', stat: qClientsCount.stat });

  const clientsParallel = await measure(async () => {
    return Promise.all([
      db.user.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { orders: true, tickets: true } } },
      }),
      db.user.count(),
      db.user.aggregate({ _sum: { balance: true, totalSpent: true } }),
    ]);
  }, 10, 80);

  screens.push({
    screen: 'Clients Registry',
    route: '/admin/clients',
    totalParallelStat: clientsParallel.stat,
    queries: clientQueries,
    nfrBudgetMs: 80,
    status: clientsParallel.stat.status,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SCREEN 5: TRANSACTIONS / LEDGER (/admin/transactions)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('[Phase 7] Benchmarking Screen 5: Transactions & Ledger (/admin/transactions)...');
  const txQueries: QueryResult[] = [];

  const qLedgerList = await measure(async () => {
    return db.ledgerEntry.findMany({
      take: 50,
      where: { tenantId: 'smmplan' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true } },
      },
    });
  }, 10, 40);
  txQueries.push({ name: 'Ledger Entries (50 items + user join)', category: 'Transactions', stat: qLedgerList.stat });

  const qLedgerCount = await measure(async () => {
    return db.ledgerEntry.count({ where: { tenantId: 'smmplan' } });
  }, 10, 30);
  txQueries.push({ name: 'Ledger Entries Total Count', category: 'Transactions', stat: qLedgerCount.stat });

  const qLedgerSums = await measure(async () => {
    return db.ledgerEntry.aggregate({
      where: { tenantId: 'smmplan' },
      _sum: { amount: true },
    });
  }, 10, 30);
  txQueries.push({ name: 'Ledger Financial Sum Aggregate', category: 'Transactions', stat: qLedgerSums.stat });

  const txParallel = await measure(async () => {
    return Promise.all([
      db.ledgerEntry.findMany({
        take: 50,
        where: { tenantId: 'smmplan' },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true } } },
      }),
      db.ledgerEntry.count({ where: { tenantId: 'smmplan' } }),
      db.ledgerEntry.aggregate({ where: { tenantId: 'smmplan' }, _sum: { amount: true } }),
    ]);
  }, 10, 80);

  screens.push({
    screen: 'Transactions & Ledger',
    route: '/admin/transactions',
    totalParallelStat: txParallel.stat,
    queries: txQueries,
    nfrBudgetMs: 80,
    status: txParallel.stat.status,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SCREEN 6: TICKETS (/admin/tickets)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('[Phase 8] Benchmarking Screen 6: Tickets Workspace (/admin/tickets)...');
  const ticketQueries: QueryResult[] = [];

  const qTicketsList = await measure(async () => {
    return db.ticket.findMany({
      take: 20,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { id: true, email: true } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
  }, 10, 40);
  ticketQueries.push({ name: 'Tickets Page 1 (20 items + user + last message)', category: 'Tickets', stat: qTicketsList.stat });

  const qTicketsStats = await measure(async () => {
    return db.ticket.groupBy({
      by: ['status'],
      _count: true,
    });
  }, 10, 30);
  ticketQueries.push({ name: 'Ticket Statuses GroupBy', category: 'Tickets', stat: qTicketsStats.stat });

  const ticketsParallel = await measure(async () => {
    return Promise.all([
      db.ticket.findMany({
        take: 20,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, email: true } },
          messages: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      }),
      db.ticket.count(),
      db.ticket.groupBy({ by: ['status'], _count: true }),
      db.supportTemplate.findMany({ take: 20 }),
    ]);
  }, 10, 80);

  screens.push({
    screen: 'Support Tickets Workspace',
    route: '/admin/tickets',
    totalParallelStat: ticketsParallel.stat,
    queries: ticketQueries,
    nfrBudgetMs: 80,
    status: ticketsParallel.stat.status,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SCREEN 7: ANALYTICS (/admin/analytics)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('[Phase 9] Benchmarking Screen 7: Analytics & Profitability (/admin/analytics)...');
  const analyticsQueries: QueryResult[] = [];

  const qFunnel = await measure(async () => {
    return Promise.all([
      db.analyticsEvent.count({ where: { event: { in: ['LINK_PASTED', 'link_pasted', 'page_view'] } } }),
      db.analyticsEvent.count({ where: { event: { in: ['SERVICE_SELECTED', 'service_selected'] } } }),
      db.analyticsEvent.count({ where: { event: { in: ['CHECKOUT_INITIATED', 'checkout_initiated'] } } }),
      db.analyticsEvent.count({ where: { event: { in: ['PAYMENT_CLICKED', 'payment_clicked'] } } }),
    ]);
  }, 10, 30);
  analyticsQueries.push({ name: 'Funnel Step Conversion Counts (4 counts)', category: 'Analytics', stat: qFunnel.stat });

  const qProfitability = await measure(async () => {
    return db.order.groupBy({
      by: ['serviceId'],
      where: { status: { notIn: ['AWAITING_PAYMENT', 'PENDING', 'ERROR'] } },
      _sum: { charge: true, providerCost: true },
      _count: { serviceId: true },
      orderBy: { serviceId: 'asc' },
      take: 50,
    });
  }, 10, 40);
  analyticsQueries.push({ name: 'Service Profitability GroupBy', category: 'Analytics', stat: qProfitability.stat });

  const analyticsParallel = await measure(async () => {
    return Promise.all([
      db.analyticsEvent.count({ where: { event: { in: ['LINK_PASTED', 'link_pasted'] } } }),
      db.analyticsEvent.count({ where: { event: { in: ['SERVICE_SELECTED'] } } }),
      db.analyticsEvent.count({ where: { event: { in: ['CHECKOUT_INITIATED'] } } }),
      db.analyticsEvent.count({ where: { event: { in: ['PAYMENT_CLICKED'] } } }),
      db.order.groupBy({
        by: ['serviceId'],
        _sum: { charge: true, providerCost: true },
        _count: { serviceId: true },
        orderBy: { serviceId: 'asc' },
        take: 50,
      }),
    ]);
  }, 10, 80);

  screens.push({
    screen: 'Analytics & Profitability',
    route: '/admin/analytics',
    totalParallelStat: analyticsParallel.stat,
    queries: analyticsQueries,
    nfrBudgetMs: 80,
    status: analyticsParallel.stat.status,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SCREEN 8: PROVIDERS (/admin/providers)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('[Phase 10] Benchmarking Screen 8: Providers (/admin/providers)...');
  const providerQueries: QueryResult[] = [];

  const qProvidersFull = await measure(async () => {
    return db.provider.findMany({
      include: {
        _count: { select: { services: true } },
        proxy: true,
      },
      orderBy: { name: 'asc' },
    });
  }, 10, 30);
  providerQueries.push({ name: 'Providers List (with service counts & proxies)', category: 'Providers', stat: qProvidersFull.stat });

  screens.push({
    screen: 'Providers Management',
    route: '/admin/providers',
    totalParallelStat: qProvidersFull.stat,
    queries: providerQueries,
    nfrBudgetMs: 50,
    status: qProvidersFull.stat.status,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SCREEN 9: SETTINGS & STAFF (/admin/settings, /admin/staff)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('[Phase 11] Benchmarking Screen 9: Settings & Staff (/admin/settings, /admin/staff)...');
  const settingsQueries: QueryResult[] = [];

  const qStaffList = await measure(async () => {
    return db.user.findMany({
      where: { role: { in: ['OWNER', 'ADMIN', 'SUPPORT', 'MANAGER'] } },
      include: {
        staffRole: {
          include: { permissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }, 10, 30);
  settingsQueries.push({ name: 'Staff Team List with Roles & Permissions', category: 'Settings/Staff', stat: qStaffList.stat });

  const qAllSettings = await measure(async () => {
    return db.systemSettings.findMany();
  }, 10, 30);
  settingsQueries.push({ name: 'All System Settings Entries', category: 'Settings/Staff', stat: qAllSettings.stat });

  const settingsParallel = await measure(async () => {
    return Promise.all([
      db.user.findMany({ where: { role: { in: ['OWNER', 'ADMIN', 'SUPPORT'] } }, include: { staffRole: { include: { permissions: true } } } }),
      db.systemSettings.findMany(),
      db.tenant.findMany(),
    ]);
  }, 10, 50);

  screens.push({
    screen: 'Settings & Staff Team',
    route: '/admin/settings & /admin/staff',
    totalParallelStat: settingsParallel.stat,
    queries: settingsQueries,
    nfrBudgetMs: 50,
    status: settingsParallel.stat.status,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SUMMARY REPORT & PRESENTATION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(100));
  console.log('                 OMNISMM 1.0 — DATABASE LOADING PERFORMANCE SUMMARY REPORT');
  console.log('='.repeat(100));
  console.log(
    'Screen / View Name'.padEnd(32) +
    'Route'.padEnd(28) +
    'P50 (ms)'.padStart(10) +
    'P95 (ms)'.padStart(10) +
    'Avg (ms)'.padStart(10) +
    'Budget'.padStart(10) +
    'Status'.padStart(10)
  );
  console.log('-'.repeat(110));

  for (const s of screens) {
    const icon = s.status === 'PASS' ? '🟢 PASS' : s.status === 'WARN' ? '🟡 WARN' : '🔴 FAIL';
    console.log(
      s.screen.padEnd(32) +
      s.route.padEnd(28) +
      s.totalParallelStat.p50.toFixed(2).padStart(10) +
      s.totalParallelStat.p95.toFixed(2).padStart(10) +
      s.totalParallelStat.mean.toFixed(2).padStart(10) +
      (s.nfrBudgetMs + 'ms').padStart(10) +
      icon.padStart(10)
    );
  }

  console.log('-'.repeat(110));

  console.log('\n' + '='.repeat(110));
  console.log('                          INDIVIDUAL QUERY BREAKDOWN & TIMINGS');
  console.log('='.repeat(110));
  console.log(
    'Query Description'.padEnd(46) +
    'Rows'.padStart(6) +
    'Min (ms)'.padStart(10) +
    'P50 (ms)'.padStart(10) +
    'P95 (ms)'.padStart(10) +
    'Max (ms)'.padStart(10) +
    'Status'.padStart(10)
  );
  console.log('-'.repeat(102));

  let totalQueries = 0;
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  for (const s of screens) {
    console.log(`\n▶ [${s.screen}] (${s.route})`);
    for (const q of s.queries) {
      totalQueries++;
      if (q.stat.status === 'PASS') passCount++;
      else if (q.stat.status === 'WARN') warnCount++;
      else failCount++;

      const icon = q.stat.status === 'PASS' ? '🟢 PASS' : q.stat.status === 'WARN' ? '🟡 WARN' : '🔴 FAIL';
      const rows = q.stat.rowsReturned !== undefined ? String(q.stat.rowsReturned) : '-';
      console.log(
        ('  * ' + q.name).padEnd(46) +
        rows.padStart(6) +
        q.stat.min.toFixed(2).padStart(10) +
        q.stat.p50.toFixed(2).padStart(10) +
        q.stat.p95.toFixed(2).padStart(10) +
        q.stat.max.toFixed(2).padStart(10) +
        icon.padStart(10)
      );
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`Total Queries Measured: ${totalQueries}`);
  console.log(`- PASS (P95 <= 30ms):  ${passCount} (${((passCount / totalQueries) * 100).toFixed(1)}%)`);
  console.log(`- WARN (P95 <= 60ms):  ${warnCount}`);
  console.log(`- FAIL (P95 > 60ms):   ${failCount}`);
  console.log('='.repeat(80));

  // Save report data for documentation
  const reportPayload = {
    timestamp: new Date().toISOString(),
    postgresStats: pgStats,
    screens,
    summary: { totalQueries, passCount, warnCount, failCount },
  };

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  fs.writeFileSync(
    'scripts/admin-db-performance-results.json',
    JSON.stringify(reportPayload, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2),
    'utf8'
  );
  console.log('\n✅ Detailed benchmark results saved to scripts/admin-db-performance-results.json');
}

runBenchmark()
  .catch((err) => {
    console.error('Benchmark error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });
