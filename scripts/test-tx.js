const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const order = await prisma.order.findFirst({
    where: { status: 'AWAITING_PAYMENT' },
    include: { payment: true }
  });
  if (!order) return console.log('No order awaiting payment');
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      if (order.payment) {
        const updatedPayment = await tx.payment.update({
          where: { id: order.payment.id },
          data: {
            status: 'PENDING',
            gateway: 'yookassa',
            consentIp: '127.0.0.1',
            consentUserAgent: 'test'
          }
        });
        return { paymentId: updatedPayment.id };
      }

      const newPayment = await tx.payment.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          amount: order.charge,
          currency: 'RUB',
          status: 'PENDING',
          gateway: 'yookassa',
          consentIp: '127.0.0.1',
          consentUserAgent: 'test'
        }
      });
      return { paymentId: newPayment.id };
    });
    console.log('TX SUCCESS', result);
  } catch (e) {
    console.error('TX ERROR:', e);
  }
}
test().then(() => prisma.$disconnect());
