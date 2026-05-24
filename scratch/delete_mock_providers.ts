import { db } from '../src/lib/db';
import { logger } from '../src/lib/logger';

const log = logger.child({ component: 'DeleteMockProviders' });

async function main() {
  log.info('Starting deletion of non-real (mock) providers...');

  // 1. Find all providers that are NOT Vexboost
  const mockProviders = await db.provider.findMany({
    where: {
      NOT: {
        name: 'Vexboost',
      },
    },
  });

  if (mockProviders.length === 0) {
    log.info('No mock providers found in the database. Only Vexboost exists.');
    return;
  }

  log.info(`Found ${mockProviders.length} mock providers:`, mockProviders.map(p => p.name));

  const mockProviderIds = mockProviders.map(p => p.id);

  // Wrap in a transaction to ensure complete atomic cleanup
  await db.$transaction(async (tx) => {
    // 2. Delete all ServiceRoutes pointing to these mock providers (onDelete: Restrict would block otherwise)
    const deletedRoutes = await tx.serviceRoute.deleteMany({
      where: {
        providerId: {
          in: mockProviderIds,
        },
      },
    });
    log.info(`Deleted ${deletedRoutes.count} ServiceRoute records associated with mock providers.`);

    // 3. Mark all services associated with these mock providers as inactive
    const updatedServices = await tx.service.updateMany({
      where: {
        providerId: {
          in: mockProviderIds,
        },
      },
      data: {
        isActive: false,
      },
    });
    log.info(`Deactivated ${updatedServices.count} Service records associated with mock providers.`);

    // 4. Delete the mock providers themselves
    // Prisma's onDelete: SetNull on Service.providerId and Order.providerId will safely set those foreign keys to null
    const deletedProviders = await tx.provider.deleteMany({
      where: {
        id: {
          in: mockProviderIds,
        },
      },
    });
    log.info(`Deleted ${deletedProviders.count} Provider records from the database.`);
  });

  log.info('Mock providers cleanup completed successfully!');
}

main()
  .catch((e) => {
    log.error('Error deleting mock providers:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
