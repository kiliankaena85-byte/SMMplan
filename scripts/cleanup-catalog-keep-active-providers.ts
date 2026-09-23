/**
 * cleanup-catalog-keep-active-providers.ts
 * 
 * Удаляет все услуги и провайдеров БЕЗ реальных API-ключей.
 * Оставляет только 6 провайдеров с активными ключами.
 * После удаления услуг — удаляет «пустые» категории без услуг.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_HOST || 'postgresql://postgres:postgres@localhost:5435/smmplan_lite?schema=public'
    }
  }
});

// Провайдеры С ключами — оставляем
const ACTIVE_PROVIDER_NAMES = [
  'Vexboost',
  'Soc Rocket',
  'SMM Prime',
  'Stream Promotion',
  'ProSMM Shop',
  'SMM Panel US',
];

async function cleanup() {
  console.log('🧹 Starting catalog cleanup — keeping only providers with API keys...\n');

  // 1. Получить всех провайдеров
  const allProviders = await prisma.provider.findMany();
  console.log(`📋 Total providers in DB: ${allProviders.length}`);

  const activeNames = ACTIVE_PROVIDER_NAMES.map(n => n.toLowerCase());
  const toDelete = allProviders.filter(p => !activeNames.includes(p.name.toLowerCase()));
  const toKeep = allProviders.filter(p => activeNames.includes(p.name.toLowerCase()));

  console.log(`✅ Keeping ${toKeep.length} providers: ${toKeep.map(p => p.name).join(', ')}`);
  console.log(`🗑️  Deleting ${toDelete.length} providers without keys: ${toDelete.map(p => p.name).join(', ')}\n`);

  // 2. Для каждого провайдера без ключа — удалить услуги + маршруты
  let deletedServices = 0;
  let deletedRoutes = 0;

  for (const provider of toDelete) {
    // Сначала удаляем ServiceRoute
    const routesDeleted = await prisma.serviceRoute.deleteMany({
      where: { providerId: provider.id }
    });
    deletedRoutes += routesDeleted.count;

    // Теперь удаляем услуги этого провайдера
    const servicesDeleted = await prisma.service.deleteMany({
      where: { providerId: provider.id }
    });
    deletedServices += servicesDeleted.count;

    // Удаляем провайдера
    await prisma.provider.delete({ where: { id: provider.id } });
    console.log(`   🗑️  Deleted provider "${provider.name}": ${servicesDeleted.count} services, ${routesDeleted.count} routes`);
  }

  console.log(`\n✅ Providers deleted: ${toDelete.length}`);
  console.log(`✅ Services deleted: ${deletedServices}`);
  console.log(`✅ ServiceRoutes deleted: ${deletedRoutes}`);

  // 3. Удалить «пустые» категории (без единой услуги)
  const categories = await prisma.category.findMany({
    include: { _count: { select: { services: true } } }
  });

  const emptyCategories = categories.filter(c => c._count.services === 0);
  console.log(`\n🗑️  Found ${emptyCategories.length} empty categories (no services) — deleting...`);

  let deletedCategories = 0;
  for (const cat of emptyCategories) {
    await prisma.category.delete({ where: { id: cat.id } });
    deletedCategories++;
  }
  console.log(`✅ Empty categories deleted: ${deletedCategories}`);

  // 4. Финальная статистика
  const finalProviders = await prisma.provider.count();
  const finalActiveProviders = await prisma.provider.count({ where: { isActive: true } });
  const finalNetworks = await prisma.network.count();
  const finalCategories = await prisma.category.count();
  const finalServices = await prisma.service.count();
  const finalActiveServices = await prisma.service.count({ where: { isActive: true } });
  const finalQuarantined = await prisma.service.count({ where: { isQuarantined: true } });

  console.log('\n🎉 CLEANUP COMPLETED! Final DB state:');
  console.log(`   🏢 Providers: ${finalProviders} (${finalActiveProviders} active)`);
  console.log(`   🌐 Networks: ${finalNetworks}`);
  console.log(`   📂 Categories: ${finalCategories}`);
  console.log(`   📦 Services total: ${finalServices}`);
  console.log(`   🟢 Active services: ${finalActiveServices}`);
  console.log(`   🔒 Quarantined services: ${finalQuarantined}`);
}

cleanup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
