/**
 * (c) 2026 SMMplan & OmniSMM 1.0.
 * Deterministic Prisma Seed Bridge for Admin Panel Audit Fixtures.
 */

export * from '../scripts/ci/seed-admin-audit-fixtures';
import { seedAdminAuditFixtures, prisma } from '../scripts/ci/seed-admin-audit-fixtures';

if (require.main === module) {
  seedAdminAuditFixtures()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
