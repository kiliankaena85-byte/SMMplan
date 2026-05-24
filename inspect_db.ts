import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('=== LATEST 5 PAYMENTS ===');
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: { select: { email: true } },
        orders: { select: { id: true, numericId: true, charge: true, quantity: true, service: { select: { name: true, rate: true, markup: true } } } }
      }
    });

    for (const p of payments) {
      console.log(`Payment ID: ${p.id}`);
      console.log(`  User: ${p.user.email}`);
      console.log(`  Amount (Cents): ${p.amount.toString()} (${Number(p.amount) / 100} RUB)`);
      console.log(`  Gateway: ${p.gateway}`);
      console.log(`  Status: ${p.status}`);
      console.log(`  Checkout URL: ${p.checkoutUrl}`);
      console.log(`  Created At: ${p.createdAt}`);
      console.log('  Orders:');
      for (const o of p.orders) {
        console.log(`    Order #${o.numericId}: Qty ${o.quantity}, Charge Cents ${o.charge.toString()} (${Number(o.charge) / 100} RUB)`);
        if (o.service) {
          console.log(`      Service: ${o.service.name}, Rate ${o.service.rate}, Markup ${o.service.markup}`);
        } else {
          console.log(`      Service: NULL`);
        }
      }
      console.log('----------------------------');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
