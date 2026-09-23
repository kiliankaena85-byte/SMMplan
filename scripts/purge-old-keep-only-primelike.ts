/**
 * purge-old-keep-only-primelike.ts
 * 
 * 1. Находит 11 тестовых заказов, которые привязаны к старым услугам,
 *    и перепривязывает их к соответствующим новым услугам PrimeLike (или к первой новой услуге).
 * 2. Удаляет все 826 старых услуг (созданных до 2026-09-21).
 * 3. Удаляет пустые категории.
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

async function purgeOldServices() {
  console.log('🧹 Purging old pre-ERP services (keeping strictly PrimeLike master catalog)...\n');

  const cutoff = new Date('2026-09-21T00:00:00Z');

  // 1. Находим первую новую услугу для безопасного перелинкования заказов
  const firstNewService = await prisma.service.findFirst({
    where: { createdAt: { gte: cutoff } },
    select: { id: true, name: true }
  });

  if (!firstNewService) {
    console.error('❌ No new PrimeLike services found! Aborting purge.');
    return;
  }
  console.log(`📌 Fallback service for order FK: ${firstNewService.name} (${firstNewService.id})`);

  // 2. Находим старые услуги
  const oldServices = await prisma.service.findMany({
    where: { createdAt: { lt: cutoff } },
    select: { id: true, name: true }
  });

  console.log(`📋 Found ${oldServices.length} old services to delete.`);
  if (oldServices.length === 0) {
    console.log('No old services found. Nothing to delete.');
    return;
  }

  const oldIds = oldServices.map(s => s.id);

  // 3. Перелинковываем заказы, которые ссылаются на старые услуги
  const affectedOrders = await prisma.order.findMany({
    where: { serviceId: { in: oldIds } },
    select: { id: true, serviceId: true }
  });

  if (affectedOrders.length > 0) {
    console.log(`🔄 Re-linking ${affectedOrders.length} test orders to new service to satisfy FK constraint...`);
    await prisma.order.updateMany({
      where: { serviceId: { in: oldIds } },
      data: { serviceId: firstNewService.id }
    });
    console.log('✅ Orders successfully re-linked.');
  }

  // 4. Очищаем связанные записи старых услуг
  await prisma.serviceRoute.deleteMany({ where: { serviceId: { in: oldIds } } });
  await prisma.serviceDraft.deleteMany({ where: { serviceId: { in: oldIds } } });
  await prisma.servicePriceHistory.deleteMany({ where: { serviceId: { in: oldIds } } });
  await prisma.serviceCustomerAccess.deleteMany({ where: { serviceId: { in: oldIds } } });
  await prisma.serviceLinkCheck.deleteMany({ where: { serviceId: { in: oldIds } } });
  await prisma.serviceEditHistory.deleteMany({ where: { serviceId: { in: oldIds } } });
  await prisma.serviceSmartConfig.deleteMany({ where: { serviceId: { in: oldIds } } });

  // 5. Удаляем сами старые услуги
  const deletedServices = await prisma.service.deleteMany({
    where: { id: { in: oldIds } }
  });
  console.log(`🗑️  Deleted ${deletedServices.count} old services.`);

  // 6. Удаляем категории без услуг
  const categories = await prisma.category.findMany({
    include: { _count: { select: { services: true } } }
  });

  const emptyCategories = categories.filter(c => c._count.services === 0);
  console.log(`\n🗑️  Found ${emptyCategories.length} empty categories — deleting...`);

  let deletedCatCount = 0;
  for (const cat of emptyCategories) {
    await prisma.category.delete({ where: { id: cat.id } });
    deletedCatCount++;
  }
  console.log(`✅ Deleted ${deletedCatCount} empty categories.`);

  // 7. Удаляем соцсети без категорий (если такие есть)
  const networks = await prisma.network.findMany({
    include: { _count: { select: { categories: true } } }
  });
  const emptyNetworks = networks.filter(n => n._count.categories === 0);
  let deletedNetCount = 0;
  for (const net of emptyNetworks) {
    await prisma.network.delete({ where: { id: net.id } });
    deletedNetCount++;
  }
  if (deletedNetCount > 0) {
    console.log(`✅ Deleted ${deletedNetCount} empty networks.`);
  }

  // 8. Финальная статистика
  const finalProviders = await prisma.provider.count();
  const finalNetworks = await prisma.network.count();
  const finalCategories = await prisma.category.count();
  const finalServices = await prisma.service.count();
  const finalActive = await prisma.service.count({ where: { isActive: true } });

  const byProvider = await prisma.service.groupBy({
    by: ['providerId'],
    _count: { id: true }
  });
  const providers = await prisma.provider.findMany();
  const provMap = Object.fromEntries(providers.map(p => [p.id, p.name]));

  console.log('\n🎉 PURGE COMPLETED! Final database state (PrimeLike only):');
  console.log(`   🏢 Providers: ${finalProviders}`);
  console.log(`   🌐 Networks: ${finalNetworks}`);
  console.log(`   📂 Categories: ${finalCategories}`);
  console.log(`   📦 Total Services: ${finalServices}`);
  console.log(`   🟢 Active Services: ${finalActive}`);
  console.log('\nBreakdown by provider:');
  for (const b of byProvider) {
    console.log(`   • ${provMap[b.providerId] || 'Unknown'}: ${b._count.id} services`);
  }
}

purgeOldServices()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
