import { SignJWT } from 'jose';
import { getEncodedKey } from '../src/lib/session-edge';
import { db } from '../src/lib/db';

interface RouteTiming {
  name: string;
  path: string;
  statusCode: number;
  ttfbMs: number;
  totalMs: number;
  bodyBytes: number;
  status: 'PASS' | 'WARN' | 'FAIL';
}

async function main() {
  console.log('='.repeat(80));
  console.log('  OmniSMM 1.0 — Live Admin Panel SSR & Database Loading Audit');
  console.log('  Container: http://127.0.0.1:3000 | Target Budget: TTFB <= 200ms');
  console.log('='.repeat(80));

  // 1. Find or create an owner user session
  const owner = await db.user.findFirst({
    where: { role: { in: ['OWNER', 'ADMIN'] } },
    select: { id: true, email: true, role: true, tenantId: true },
  });

  if (!owner) {
    throw new Error('No OWNER or ADMIN user found in database!');
  }

  console.log(`\nAuthenticated Operator: ${owner.email} (${owner.role})`);

  // Sign JWT session token
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const token = await new SignJWT({
    userId: owner.id,
    role: owner.role,
    tenantId: owner.tenantId || 'smmplan',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getEncodedKey());

  const routes = [
    { name: 'Dashboard Overview', path: '/admin/dashboard' },
    { name: 'Orders Registry', path: '/admin/orders' },
    { name: 'Catalog & Services', path: '/admin/catalog' },
    { name: 'Clients Registry', path: '/admin/clients' },
    { name: 'Transactions & Ledger', path: '/admin/transactions' },
    { name: 'Tickets Workspace', path: '/admin/tickets' },
    { name: 'Analytics & Profitability', path: '/admin/analytics' },
    { name: 'Providers Management', path: '/admin/providers' },
    { name: 'Settings Management', path: '/admin/settings' },
  ];

  const cookieHeader = `session_token=${token}; __Host-session_token=${token}; x_admin_tenant=smmplan`;

  // Warm-up request to wake up V8 JIT & Next.js cache
  try {
    await fetch('http://127.0.0.1:3000/admin/dashboard', {
      headers: {
        Cookie: cookieHeader,
        'User-Agent': 'Benchmark/1.0',
        'x-tenant-id': 'smmplan',
      },
    });
  } catch (e) {
    console.warn('Warmup request failed:', e);
  }

  const results: RouteTiming[] = [];

  for (const r of routes) {
    // 3 runs per route for stable averaging
    const runs: Array<{ ttfb: number; total: number; size: number; status: number }> = [];

    for (let i = 0; i < 3; i++) {
      const start = performance.now();
      const res = await fetch(`http://127.0.0.1:3000${r.path}`, {
        headers: {
          Cookie: cookieHeader,
          'User-Agent': 'Benchmark/1.0',
          'x-tenant-id': 'smmplan',
        },
      });
      const ttfb = performance.now() - start;
      const text = await res.text();
      const total = performance.now() - start;

      runs.push({
        ttfb,
        total,
        size: Buffer.byteLength(text),
        status: res.status,
      });
    }

    const avgTtfb = runs.reduce((s, x) => s + x.ttfb, 0) / runs.length;
    const avgTotal = runs.reduce((s, x) => s + x.total, 0) / runs.length;
    const lastRun = runs[runs.length - 1];

    let status: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
    if (lastRun.status !== 200 || avgTtfb > 500) {
      status = 'FAIL';
    } else if (avgTtfb > 200) {
      status = 'WARN';
    }

    results.push({
      name: r.name,
      path: r.path,
      statusCode: lastRun.status,
      ttfbMs: avgTtfb,
      totalMs: avgTotal,
      bodyBytes: lastRun.size,
      status,
    });
  }

  console.log('\n' + '='.repeat(90));
  console.log(
    'Admin Screen Name'.padEnd(30) +
    'HTTP Path'.padEnd(24) +
    'HTTP'.padStart(6) +
    'TTFB (ms)'.padStart(12) +
    'Total (ms)'.padStart(12) +
    'Size (KB)'.padStart(12) +
    'Status'.padStart(10)
  );
  console.log('-'.repeat(90));

  for (const res of results) {
    const icon = res.status === 'PASS' ? '🟢 PASS' : res.status === 'WARN' ? '🟡 WARN' : '🔴 FAIL';
    console.log(
      res.name.padEnd(30) +
      res.path.padEnd(24) +
      String(res.statusCode).padStart(6) +
      res.ttfbMs.toFixed(1).padStart(12) +
      res.totalMs.toFixed(1).padStart(12) +
      (res.bodyBytes / 1024).toFixed(1).padStart(12) +
      icon.padStart(10)
    );
  }
  console.log('-'.repeat(90));

  const report = {
    timestamp: new Date().toISOString(),
    operator: owner.email,
    routes: results,
  };

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  fs.writeFileSync('scripts/admin-live-ttfb-results.json', JSON.stringify(report, null, 2), 'utf8');
  console.log('\n✅ Live SSR TTFB results saved to scripts/admin-live-ttfb-results.json');
}

main()
  .catch(console.error)
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });
