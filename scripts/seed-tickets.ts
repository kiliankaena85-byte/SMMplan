import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding mock tickets...');

  // 1. Get or create a user
  let user = await prisma.user.findFirst({ where: { role: 'USER' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'test_client@example.com',
        role: 'USER',
        balance: 150000,
        totalSpent: 450000,
      },
    });
  }

  // Clear existing tickets for this user to avoid clutter
  await prisma.ticket.deleteMany({
    where: { userId: user.id },
  });

  // Ticket 1: Active issue (OPEN)
  const ticket1 = await prisma.ticket.create({
    data: {
      userId: user.id,
      subject: 'Заказ #4521 завис в статусе В работе',
      status: 'OPEN',
      source: 'WEB',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      messages: {
        create: [
          {
            sender: 'USER',
            text: 'Здравствуйте! Я заказал подписчиков вчера, статус "В работе", но ничего не происходит. Можете проверить?',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
          },
          {
            sender: 'STAFF',
            text: 'Здравствуйте! Сейчас проверю информацию по вашему заказу. Минутку.',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 23.5),
          },
          {
            sender: 'INTERNAL',
            text: 'Провайдер #3 висит (VexBoost). Надо сделать отмену через их API и вернуть на баланс. Либо подождать еще час.',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 23.4),
          },
          {
            sender: 'STAFF',
            text: 'Связался с провайдером. В данный момент наблюдаются задержки на серверах Instagram. Мы можем либо подождать 2-3 часа, либо я могу отменить заказ и вернуть средства на баланс. Что предпочитаете?',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 23.3),
          },
          {
            sender: 'USER',
            text: 'Давайте подождем пару часов. Если не пойдет, тогда отменим.',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
          },
        ],
      },
    },
  });

  // Ticket 2: Awaiting user reply (PENDING)
  const ticket2 = await prisma.ticket.create({
    data: {
      userId: user.id,
      subject: 'Вопрос по пополнению через USDT',
      status: 'PENDING',
      source: 'TELEGRAM',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
      messages: {
        create: [
          {
            sender: 'USER',
            text: 'Пытаюсь пополнить через Cryptobot, но не открывается ссылка. Выдает ошибку 404.',
            mediaUrl: 'sample-error.jpg',
            mediaType: 'image',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
          },
          {
            sender: 'STAFF',
            text: 'Приветствуем! Подскажите, вы используете VPN? Попробуйте отключить его, либо скопируйте ссылку напрямую в браузер без перехода через Telegram.',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 47.5),
          },
        ],
      },
    },
  });

  // Ticket 3: Closed ticket
  const ticket3 = await prisma.ticket.create({
    data: {
      userId: user.id,
      subject: 'Сбой в накрутке лайков',
      status: 'CLOSED',
      source: 'WEB',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120), // 5 days ago
      resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 100),
      messages: {
        create: [
          {
            sender: 'USER',
            text: 'Накрутили только половину лайков на пост, заказ числится как выполненный.',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120),
          },
          {
            sender: 'STAFF',
            text: 'Здравствуйте! Передаем информацию в технический отдел.',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 119),
          },
          {
            sender: 'STAFF',
            text: 'Средства за невыполненную часть заказа возвращены на ваш баланс (150 ₽). Приносим извинения за неудобства.',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 100),
          },
          {
            sender: 'USER',
            text: 'Спасибо, деньги пришли.',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 99),
          },
        ],
      },
    },
  });

  console.log('✅ Tickets seeded successfully!');
  console.log(`Open: ${ticket1.id}`);
  console.log(`Pending: ${ticket2.id}`);
  console.log(`Closed: ${ticket3.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
