import { db as prisma } from '../src/lib/db';

const templates = [
  {
    shortcut: 'hello',
    label: '👋 Приветствие',
    category: 'GENERAL',
    sort: 1,
    text: 'Здравствуйте, {user_name}! Спасибо за обращение в поддержку Smmplan. Чем могу помочь?',
  },
  {
    shortcut: 'link',
    label: '🔗 Запрос ссылки',
    category: 'ORDER',
    sort: 2,
    text: 'Пожалуйста, отправьте прямую ссылку на ваш профиль/пост, чтобы мы могли проверить заказ #{order_id}.',
  },
  {
    shortcut: 'delay',
    label: '⏳ Задержка',
    category: 'ORDER',
    sort: 3,
    text: 'Ваш заказ #{order_id} ({service_name}) находится в работе. На данный момент наблюдается небольшая задержка у провайдера. Пожалуйста, ожидайте — заказ будет выполнен в течение указанного срока.',
  },
  {
    shortcut: 'restart',
    label: '🔄 Перезапуск',
    category: 'ORDER',
    sort: 4,
    text: 'Мы перезапустили ваш заказ #{order_id}. Обновлённый статус: {order_status}. Если проблема сохранится, сообщите нам.',
  },
  {
    shortcut: 'refund',
    label: '💰 Возврат',
    category: 'PAYMENT',
    sort: 5,
    text: 'Средства по заказу #{order_id} были возвращены на ваш баланс. Вы можете использовать их для нового заказа или запросить вывод.',
  },
  {
    shortcut: 'wait',
    label: '⏰ Ожидание ответа',
    category: 'GENERAL',
    sort: 6,
    text: 'Ожидаем вашего ответа. Если у вас остались вопросы — напишите, мы на связи.',
  },
  {
    shortcut: 'escalate',
    label: '📞 Эскалация',
    category: 'GENERAL',
    sort: 7,
    text: 'Я передал ваш запрос старшему специалисту. Он свяжется с вами в ближайшее время. Номер обращения: {ticket_id}.',
  },
  {
    shortcut: 'close',
    label: '✅ Закрытие',
    category: 'GENERAL',
    sort: 8,
    text: 'Рады, что смогли помочь! Если появятся новые вопросы — обращайтесь, мы всегда на связи. Хорошего дня, {user_name}!',
  },
] as const;

async function main() {
  console.log('🌱 Seeding support templates...\n');

  for (const template of templates) {
    const result = await prisma.supportTemplate.upsert({
      where: { shortcut: template.shortcut },
      update: {
        label: template.label,
        text: template.text,
        category: template.category,
        sort: template.sort,
      },
      create: {
        shortcut: template.shortcut,
        label: template.label,
        text: template.text,
        category: template.category,
        sort: template.sort,
      },
    });

    console.log(`  ✅ ${result.label} (shortcut: "${result.shortcut}")`);
  }

  console.log(`\n🎉 Done! Total templates seeded: ${templates.length}`);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
