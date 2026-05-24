import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('==================================================');
  console.log('📊 SMMplan Customer & Order Intelligence (Big Data Audit)');
  console.log('==================================================\n');

  // 1. Core database stats
  const totalUsers = await prisma.user.count();
  const totalOrders = await prisma.order.count();
  const totalPayments = await prisma.payment.count();
  
  console.log(`📌 Базовые показатели:`);
  console.log(`   - Всего клиентов: ${totalUsers}`);
  console.log(`   - Всего заказов: ${totalOrders}`);
  console.log(`   - Всего платежей: ${totalPayments}\n`);

  // 2. Financial Metrics (convert cents/BigInt safely)
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      balance: true,
      totalSpent: true,
      companyName: true,
      inn: true,
      telegramId: true,
    }
  });

  let totalVolumeCents = 0n;
  let b2bCount = 0;
  let telegramConnectedCount = 0;
  
  users.forEach(u => {
    totalVolumeCents += BigInt(u.totalSpent);
    if (u.companyName || u.inn) b2bCount++;
    if (u.telegramId) telegramConnectedCount++;
  });

  const totalVolumeRub = Number(totalVolumeCents) / 100;
  const avgSpentRub = totalUsers > 0 ? (totalVolumeRub / totalUsers) : 0;

  console.log(`💰 Финансовые показатели:`);
  console.log(`   - Суммарный оборот (LTV): ${totalVolumeRub.toFixed(2)} ₽`);
  console.log(`   - Средний чек LTV на клиента: ${avgSpentRub.toFixed(2)} ₽`);
  console.log(`   - Доля B2B клиентов (компании с ИНН): ${b2bCount} (${totalUsers > 0 ? ((b2bCount / totalUsers) * 100).toFixed(1) : 0}%)`);
  console.log(`   - Клиенты с привязанным Telegram: ${telegramConnectedCount} (${totalUsers > 0 ? ((telegramConnectedCount / totalUsers) * 100).toFixed(1) : 0}%)\n`);

  // 3. User Segmentation by Spending (LTV)
  const sortedUsers = [...users].sort((a, b) => Number(b.totalSpent - a.totalSpent));
  
  console.log(`💎 Сегментация клиентов по тратам (LTV Tiers):`);
  const whales = sortedUsers.filter(u => Number(u.totalSpent) / 100 >= 1000); // 1000+ RUB
  const medium = sortedUsers.filter(u => {
    const s = Number(u.totalSpent) / 100;
    return s >= 100 && s < 1000;
  });
  const minnows = sortedUsers.filter(u => Number(u.totalSpent) / 100 < 100); // < 100 RUB

  console.log(`   - 🐳 "Киты" (>1,000 ₽ LTV): ${whales.length} клиентов (${totalUsers > 0 ? ((whales.length / totalUsers) * 100).toFixed(1) : 0}%)`);
  console.log(`   - 🐟 "Дельфины" (100–1,000 ₽ LTV): ${medium.length} клиентов (${totalUsers > 0 ? ((medium.length / totalUsers) * 100).toFixed(1) : 0}%)`);
  console.log(`   - 🦐 "Планктон" (<100 ₽ LTV): ${minnows.length} клиентов (${totalUsers > 0 ? ((minnows.length / totalUsers) * 100).toFixed(1) : 0}%)\n`);

  // Top 5 active clients by LTV
  console.log(`🏆 Топ-5 клиентов по объему LTV:`);
  sortedUsers.slice(0, 5).forEach((u, i) => {
    const spentRub = Number(u.totalSpent) / 100;
    const balanceRub = Number(u.balance) / 100;
    console.log(`   ${i + 1}. [${u.role}] ${u.email} | Траты: ${spentRub.toFixed(2)} ₽ | Баланс: ${balanceRub.toFixed(2)} ₽${u.companyName ? ` (B2B: ${u.companyName})` : ''}`);
  });
  console.log();

  // 4. Order Metrics (Network distribution, average charge)
  const orders = await prisma.order.findMany({
    include: {
      service: {
        include: {
          category: {
            include: {
              network: true
            }
          }
        }
      }
    }
  });

  const networkCounts: Record<string, { count: number; volumeCents: bigint }> = {};
  const statusCounts: Record<string, number> = {};
  let totalOrderChargeCents = 0n;

  orders.forEach(o => {
    totalOrderChargeCents += BigInt(o.charge);
    
    // Network aggregation
    const netName = o.service?.category?.network?.name || 'Unknown/Other';
    if (!networkCounts[netName]) {
      networkCounts[netName] = { count: 0, volumeCents: 0n };
    }
    networkCounts[netName].count++;
    networkCounts[netName].volumeCents += BigInt(o.charge);

    // Status aggregation
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });

  const avgOrderRub = totalOrders > 0 ? (Number(totalOrderChargeCents) / 100 / totalOrders) : 0;
  console.log(`📦 Анализ заказов:`);
  console.log(`   - Средняя стоимость одного заказа: ${avgOrderRub.toFixed(2)} ₽`);
  
  console.log(`\n🕸️ Распределение заказов по социальным сетям (Популярность каналов):`);
  Object.entries(networkCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([net, data]) => {
      const volRub = Number(data.volumeCents) / 100;
      const share = totalOrders > 0 ? ((data.count / totalOrders) * 100).toFixed(1) : 0;
      console.log(`   - ${net}: ${data.count} заказов (${share}%) | Оборот: ${volRub.toFixed(2)} ₽`);
    });

  console.log(`\n⚙️ Распределение заказов по статусам (Здоровье платформы):`);
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      const share = totalOrders > 0 ? ((count / totalOrders) * 100).toFixed(1) : 0;
      console.log(`   - ${status}: ${count} заказов (${share}%)`);
    });
  
  console.log('\n==================================================');
}

main()
  .catch(e => console.error('Ошибка анализа данных:', e))
  .finally(() => prisma.$disconnect());
