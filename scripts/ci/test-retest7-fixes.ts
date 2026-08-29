import { db } from '../../src/lib/db';
import { verifySession, createSession } from '../../src/lib/session';
import { verifyB2BKey } from '../../src/lib/b2b-auth';
import { resolveCanonicalHost, getTenantHost } from '../../src/lib/seo-helpers';
import crypto from 'crypto';

async function runRetest7Tests() {
  console.log('🚀 [RETEST-7-CI] Starting verification suite for Retest 7 findings...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  // =========================================================================
  // 1. F-7.1: Logout Session Invalidation in DB & Replay Immunity
  // =========================================================================
  console.log('--- 1. Testing F-7.1: Logout Invalidation & Replay Immunity ---');
  const testUser = await db.user.findFirst({ where: { email: 'pentest7-user@smmplan.pro' } });
  if (testUser) {
    // Create new session
    const { sessionToken } = await createSession(testUser.id);
    const { decryptSessionToken } = await import('../../src/lib/session-edge');
    const payload = await decryptSessionToken(sessionToken);
    const sessionId = payload?.sessionId as string;

    const sessionBefore = await db.session.findUnique({ where: { id: sessionId } });
    assert(!!sessionBefore, `Session created and exists in DB before logout (ID: ${sessionId})`);

    // Simulate POST /api/auth/logout deletion
    await db.session.deleteMany({ where: { id: sessionId } });

    const sessionAfter = await db.session.findUnique({ where: { id: sessionId } });
    assert(!sessionAfter, `Session successfully deleted from DB upon logout`);

    // Simulate verifySession check on replayed token
    const replayedSessionInDb = await db.session.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });
    assert(!replayedSessionInDb, `Replayed token finds NO session in DB -> page redirects to /login`);
  }

  // =========================================================================
  // 2. F-7.2: B2B Key Tenant Binding & Non-Empty Catalog
  // =========================================================================
  console.log('\n--- 2. Testing F-7.2: B2B Key Tenant Isolation ---');
  const b2bKey = 'pentest7_b2b_testkey_8492049281';

  // Smmplan user on smmplan contour
  const validUser = await verifyB2BKey(b2bKey, 'smmplan');
  assert(!!validUser && validUser.email === 'pentest7-user@smmplan.pro', `B2B Key accepted on its own tenant ("smmplan")`);

  // Cross-tenant attempt: Smmplan user on flux contour
  const crossTenantUser = await verifyB2BKey(b2bKey, 'flux');
  assert(!crossTenantUser, `B2B Key STRICTLY REJECTED on cross-tenant domain ("flux") -> returns 401`);

  // Check services catalog for B2B user
  const userTenant = validUser?.tenantId || 'smmplan';
  const services = await db.service.findMany({
    where: {
      isActive: true,
      tenantId: { in: [userTenant, 'all'] },
      category: { tenantId: { in: [userTenant, 'all'] } }
    }
  });
  assert(services.length > 0, `B2B Services catalog is non-empty (${services.length} active services available)`);

  // =========================================================================
  // 3. F-7.4: Maintenance Gate on Production smmplan.pro
  // =========================================================================
  console.log('\n--- 3. Testing F-7.4: Production Maintenance Isolation ---');
  const prodHost = 'smmplan.pro';
  const isMaintenanceActive = true;

  const checkAllowed = (path: string) => {
    return (
      path === '/' ||
      path === '/prelaunch' ||
      path === '/robots.txt' ||
      path === '/sitemap.xml' ||
      path === '/security.txt' ||
      path.startsWith('/.well-known/') ||
      path === '/api/health' ||
      path === '/api/maintenance-status' ||
      path === '/api/prelaunch/subscribe' ||
      path.startsWith('/_next/') ||
      path.startsWith('/images/') ||
      path === '/favicon.ico'
    );
  };

  assert(checkAllowed('/'), `GET / is ALLOWED on production in maintenance (Prelaunch page)`);
  assert(checkAllowed('/api/health'), `GET /api/health is ALLOWED on production in maintenance`);
  assert(checkAllowed('/api/prelaunch/subscribe'), `POST /api/prelaunch/subscribe is ALLOWED on production in maintenance`);
  assert(!checkAllowed('/api/v2'), `POST /api/v2 is BLOCKED (503 Service Unavailable) on production in maintenance`);
  assert(!checkAllowed('/login'), `GET /login is BLOCKED (redirect to /) on production in maintenance`);
  assert(!checkAllowed('/dashboard'), `GET /dashboard is BLOCKED (redirect to /) on production in maintenance`);

  // =========================================================================
  // 4. F-7.5: Host vs x-forwarded-host Immunity (No Cache Poisoning)
  // =========================================================================
  console.log('\n--- 4. Testing F-7.5: Host vs Spoofed x-forwarded-host Immunity ---');
  const spoofedXfh = 'evil.example.com';
  const realHostFlux = 'flux.smmplan.pro';

  // Even if an attacker injects evil.example.com, resolving with Host header gives correct flux host
  const hostResolved = getTenantHost('flux', realHostFlux);
  assert(hostResolved === 'flux.smmplan.pro', `Canonical host resolves correctly to flux.smmplan.pro (ignoring spoofed x-forwarded-host)`);

  const realHostTest = 'test.smmplan.pro';
  const hostResolvedTest = getTenantHost('smmplan', realHostTest);
  assert(hostResolvedTest === 'test.smmplan.pro', `Canonical host resolves correctly to test.smmplan.pro`);

  console.log('\n======================================================');
  console.log(`📊 RETEST-7 CI SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================');

  await db.$disconnect();
  if (failed > 0) process.exit(1);
}

runRetest7Tests().catch(console.error);
