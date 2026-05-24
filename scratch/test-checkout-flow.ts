import { checkoutAction } from '../src/actions/order/checkout';
import { db } from '../src/lib/db';

async function testFlow() {
  console.log('🚀 Starting Integration Test: Checkout MediaGroup Flow...');
  
  const serviceId = 'cmpf2zjtp002w6at3npxa4vuy'; // Telegram Просмотры
  const email = 'test-mediagroup@smmplan.test';
  
  const testService = await db.service.findUnique({ where: { id: serviceId } });
  if (!testService) {
    console.error('❌ Test Service not found in DB! Seed must be run first.');
    process.exit(1);
  }
  
  console.log(`Using Service: ${testService.name} (Rate: ${testService.rate}, Markup: ${testService.markup})`);
  
  const mainLink = 'https://t.me/durov/248';
  const secondaryLink = 'https://t.me/durov/250';
  const qty = 1000;
  
  console.log('\n--- 1. Testing SINGLE order flow (Normal) ---');
  const singleRes = await checkoutAction({
    serviceId,
    link: mainLink,
    quantity: qty,
    email,
    gateway: 'yookassa'
  });
  
  if (!singleRes.success) {
    console.error('❌ Single order creation failed:', singleRes.error);
    process.exit(1);
  }
  
  console.log('✅ Single order checkout initial response:', singleRes.data);
  const singlePaymentId = singleRes.data?.paymentId;
  
  if (singlePaymentId) {
    const singleOrders = await db.order.findMany({
      where: { paymentId: singlePaymentId }
    });
    console.log(`Created ${singleOrders.length} order(s) for single checkout.`);
    if (singleOrders.length !== 1) {
      console.error('❌ Expected exactly 1 order, found:', singleOrders.length);
      process.exit(1);
    }
    console.log(`Order Link: ${singleOrders[0].link}, Charge: ${singleOrders[0].charge} cents`);
  }
  
  console.log('\n--- 2. Testing DUAL order flow (Telegram MediaGroup) ---');
  const mediaGroupRes = await checkoutAction({
    serviceId,
    link: mainLink,
    mediaGroupUrl: secondaryLink,
    quantity: qty,
    email,
    gateway: 'yookassa'
  });
  
  if (!mediaGroupRes.success) {
    console.error('❌ MediaGroup checkout failed:', mediaGroupRes.error);
    process.exit(1);
  }
  
  console.log('✅ MediaGroup checkout initial response:', mediaGroupRes.data);
  const mediaGroupPaymentId = mediaGroupRes.data?.paymentId;
  
  if (!mediaGroupPaymentId) {
    console.error('❌ No payment ID returned for MediaGroup checkout!');
    process.exit(1);
  }
  
  const mediaGroupOrders = await db.order.findMany({
    where: { paymentId: mediaGroupPaymentId },
    orderBy: { createdAt: 'asc' }
  });
  
  console.log(`Created ${mediaGroupOrders.length} order(s) for MediaGroup checkout.`);
  
  if (mediaGroupOrders.length !== 2) {
    console.error(`❌ Expected exactly 2 orders, found: ${mediaGroupOrders.length}`);
    process.exit(1);
  }
  
  const [order1, order2] = mediaGroupOrders;
  
  console.log(`Order 1: ID=${order1.id}, Link=${order1.link}, Charge=${order1.charge} cents`);
  console.log(`Order 2: ID=${order2.id}, Link=${order2.link}, Charge=${order2.charge} cents`);
  
  if (order1.link !== mainLink) {
     console.error(`❌ Order 1 link mismatch! Expected ${mainLink}, got ${order1.link}`);
     process.exit(1);
  }
  
  if (order2.link !== secondaryLink) {
     console.error(`❌ Order 2 link mismatch! Expected ${secondaryLink}, got ${order2.link}`);
     process.exit(1);
  }
  
  const payment = await db.payment.findUnique({
    where: { id: mediaGroupPaymentId }
  });
  
  if (!payment) {
     console.error('❌ Payment not found in database!');
     process.exit(1);
  }
  
  console.log(`Payment Amount: ${payment.amount} cents`);
  const expectedTotal = order1.charge + order2.charge;
  if (payment.amount !== expectedTotal) {
     console.error(`❌ Payment amount mismatch! Expected ${expectedTotal} cents, got ${payment.amount} cents`);
     process.exit(1);
  }
  
  console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! MediaGroup Order Splitting works flawlessly! ✅');
}

testFlow()
  .catch(err => {
    console.error('❌ Unexpected error during test execution:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
