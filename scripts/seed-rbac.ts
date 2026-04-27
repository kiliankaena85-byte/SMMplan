/**
 * scripts/seed-rbac.ts
 * 
 * Idempotent seeder that establishes the baseline Staff Roles and granular StaffPermissions.
 * It also finds all existing Admins/Managers/Support staff missing a StaffRole and assigns them.
 * 
 * Usage: npx tsx scripts/seed-rbac.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ALL_SECTIONS = [
  'dashboard', 'clients', 'orders', 'refills', 'catalog', 'quarantine', 
  'tickets', 'finance', 'providers', 'marketing', 'pages', 'settings', 
  'features', 'queues'
];

async function main() {
  console.log('🌱 Starting RBAC seeding...');

  try {
    // 1. Ensure Roles Exist
    const adminRole = await prisma.staffRole.upsert({
      where: { name: 'Admin' },
      update: {},
      create: { name: 'Admin', description: 'Полный доступ ко всем модулям', isSystem: true }
    });

    const managerRole = await prisma.staffRole.upsert({
      where: { name: 'Manager' },
      update: {},
      create: { name: 'Manager', description: 'Менеджер платформы (без финансов)', isSystem: true }
    });

    const supportRole = await prisma.staffRole.upsert({
      where: { name: 'Support' },
      update: {},
      create: { name: 'Support', description: 'Старший модератор/Саппорт', isSystem: true }
    });

    // 2. Map Permissions (Idempotently)

    // ADMIN: All sections EDIT
    for (const section of ALL_SECTIONS) {
      await prisma.staffPermission.upsert({
        where: { roleId_section: { roleId: adminRole.id, section } },
        update: { canView: true, canEdit: true },
        create: { roleId: adminRole.id, section, canView: true, canEdit: true }
      });
    }

    // MANAGER: Most things EDIT, but exclude Finance, Security, Dev features
    const managerPermissions = [
      { section: 'dashboard', canView: true, canEdit: false },
      { section: 'clients', canView: true, canEdit: true },
      { section: 'orders', canView: true, canEdit: true },
      { section: 'refills', canView: true, canEdit: true },
      { section: 'catalog', canView: true, canEdit: true },
      { section: 'tickets', canView: true, canEdit: true },
      { section: 'marketing', canView: true, canEdit: true },
      { section: 'pages', canView: true, canEdit: true },
    ];
    for (const p of managerPermissions) {
      await prisma.staffPermission.upsert({
        where: { roleId_section: { roleId: managerRole.id, section: p.section } },
        update: { canView: p.canView, canEdit: p.canEdit },
        create: { roleId: managerRole.id, section: p.section, canView: p.canView, canEdit: p.canEdit }
      });
    }

    // SUPPORT: Tickets, Orders (View), Clients (View)
    const supportPermissions = [
      { section: 'dashboard', canView: true, canEdit: false },
      { section: 'clients', canView: true, canEdit: false },
      { section: 'orders', canView: true, canEdit: false },
      { section: 'refills', canView: true, canEdit: true },
      { section: 'tickets', canView: true, canEdit: true },
    ];
    for (const p of supportPermissions) {
      await prisma.staffPermission.upsert({
        where: { roleId_section: { roleId: supportRole.id, section: p.section } },
        update: { canView: p.canView, canEdit: p.canEdit },
        create: { roleId: supportRole.id, section: p.section, canView: p.canView, canEdit: p.canEdit }
      });
    }

    console.log('✅ Staff Roles and Permissions seeded successfully.');

    // 3. Link Existing Users
    type LegacyRoleSync = { stringRole: string, staffRoleId: string };
    const syncMap: LegacyRoleSync[] = [
      { stringRole: 'ADMIN', staffRoleId: adminRole.id },
      { stringRole: 'MANAGER', staffRoleId: managerRole.id },
      { stringRole: 'SUPPORT', staffRoleId: supportRole.id },
    ];

    let totalMigrated = 0;
    for (const sync of syncMap) {
      const result = await prisma.user.updateMany({
        where: { 
          role: sync.stringRole,
          staffRoleId: null // Only update users missing a StaffRole
        },
        data: {
          staffRoleId: sync.staffRoleId
        }
      });
      totalMigrated += result.count;
    }

    console.log(`✅ Migrated ${totalMigrated} legacy staff users to StaffRole relationships.`);

  } catch (error) {
    console.error('❌ Failed to seed RBAC:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
