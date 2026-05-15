import { PrismaClient } from '@prisma/client';

/**
 * Global teardown script for Playwright tests.
 * This runs after all tests complete.
 * It connects directly to the DB and deletes test-generated data.
 */
async function globalTeardown() {
  console.log('[Playwright Teardown] Cleaning up database test records...');
  
  const prisma = new PrismaClient();

  try {
    // 1. Delete test orders
    const deletedOrders = await prisma.order.deleteMany({
      where: {
        OR: [
          { link: { contains: 'test' } },
          { link: { contains: 'e2e' } }
        ]
      }
    });
    console.log(`[Teardown] Deleted ${deletedOrders.count} test orders.`);

    // 2. Delete test payments
    const deletedPayments = await prisma.payment.deleteMany({
      where: {
        OR: [
          { gatewayId: { contains: 'test_' } },
          { gatewayId: { contains: 'mock_' } }
        ]
      }
    });
    console.log(`[Teardown] Deleted ${deletedPayments.count} test payments.`);

    // 3. Delete test tickets (by email containing test-guest or guest-test)
    // First find users, then delete their tickets
    const testUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'e2e-tester@test.com' } },
          { email: { contains: 'guest-test@example.com' } },
          { email: { contains: 'referral@test.com' } },
          { email: { contains: 'test' } }
        ]
      }
    });

    const testUserIds = testUsers.map(u => u.id);

    if (testUserIds.length > 0) {
      const deletedTickets = await prisma.ticket.deleteMany({
        where: {
          userId: { in: testUserIds }
        }
      });
      console.log(`[Teardown] Deleted ${deletedTickets.count} test tickets.`);

      // 3.4 Delete orders belonging to test users
      await prisma.order.deleteMany({
        where: { userId: { in: testUserIds } }
      });

      // 3.5 Delete test payments belonging to these users
      await prisma.payment.deleteMany({
        where: { userId: { in: testUserIds } }
      });

      // 3.6 Delete ledger entries for these users
      await prisma.ledgerEntry.deleteMany({
        where: { userId: { in: testUserIds } }
      });

      // 4. Delete test users
      // Because we use referential integrity, maybe delete other relations if any (like payments/orders already deleted above)
      const deletedUsersCount = await prisma.user.deleteMany({
        where: {
          id: { in: testUserIds }
        }
      });
      console.log(`[Teardown] Deleted ${deletedUsersCount.count} test users.`);
    }

  } catch (err) {
    console.error('[Playwright Teardown] Error during DB cleanup:', err);
  } finally {
    await prisma.$disconnect();
  }
}

export default globalTeardown;
