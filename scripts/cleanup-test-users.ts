import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const KEEP_EMAILS = ['nikita8888@inbox.ru', 'art@artmspektr.ru'];

async function main() {
  const isDryRun = !process.argv.includes('--confirm');

  console.log('==================================================');
  console.log(`РЕЖИМ ОЧИСТКИ БАЗЫ ДАННЫХ: ${isDryRun ? 'DRY-RUN (ТОЛЬКО СИМУЛЯЦИЯ)' : 'БОЕВОЕ УДАЛЕНИЕ (--confirm)'}`);
  console.log('==================================================\n');

  const keepUsers = await db.user.findMany({
    where: { email: { in: KEEP_EMAILS, mode: 'insensitive' } },
    select: { id: true, email: true, role: true, balance: true },
  });

  const foundEmails = new Set(keepUsers.map((u) => u.email.toLowerCase()));
  const missingEmails = KEEP_EMAILS.filter((e) => !foundEmails.has(e.toLowerCase()));

  if (missingEmails.length > 0) {
    throw new Error(
      `ОШИБКА: Не найдены сохраняемые пользователи: ${missingEmails.join(', ')}. Найдено записей: ${keepUsers.length}. Отмена операции для безопасности!`
    );
  }

  const keepUserIds = keepUsers.map((u) => u.id);

  console.log('Сохраняемые пользователи:');
  for (const u of keepUsers) {
    console.log(`  ✓ ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | Balance: ${Number(u.balance) / 100} ₽`);
  }

  const testUsers = await db.user.findMany({
    where: { id: { notIn: keepUserIds } },
    select: { id: true },
  });
  const testUserIds = testUsers.map((u) => u.id);

  console.log(`\nКоличество тестовых пользователей к удалению: ${testUserIds.length}`);

  if (testUserIds.length === 0) {
    console.log('Тестовые пользователи не найдены. База уже чиста.');
    return;
  }

  // Pre-calculate counts of dependent records
  const testOrders = await db.order.findMany({
    where: { userId: { in: testUserIds } },
    select: { id: true },
  });
  const testOrderIds = testOrders.map((o) => o.id);

  const testTickets = await db.ticket.findMany({
    where: { userId: { in: testUserIds } },
    select: { id: true },
  });
  const testTicketIds = testTickets.map((t) => t.id);

  const counts = {
    testUsers: testUserIds.length,
    testOrders: testOrderIds.length,
    testTickets: testTicketIds.length,
    ticketMessages: await db.ticketMessage.count({
      where: { OR: [{ ticketId: { in: testTicketIds } }, { orderId: { in: testOrderIds } }] },
    }),
    ticketFeedbacks: await db.ticketFeedback.count({
      where: { OR: [{ ticketId: { in: testTicketIds } }, { userId: { in: testUserIds } }] },
    }),
    refills: await db.refill.count({ where: { orderId: { in: testOrderIds } } }),
    userNotes: await db.userNote.count({
      where: {
        OR: [
          { userId: { in: testUserIds } },
          { authorId: { in: testUserIds } },
          { orderId: { in: testOrderIds } },
          { ticketId: { in: testTicketIds } },
        ],
      },
    }),
    payments: await db.payment.count({ where: { userId: { in: testUserIds } } }),
    ledgerEntries: await db.ledgerEntry.count({ where: { userId: { in: testUserIds } } }),
    staffShifts: await db.staffShift.count({
      where: { OR: [{ userId: { in: testUserIds } }, { substituteUserId: { in: testUserIds } }] },
    }),
    sessions: await db.session.count({ where: { userId: { in: testUserIds } } }),
    authTokens: await db.authToken.count({ where: { userId: { in: testUserIds } } }),
    auditLogs: await db.auditLog.count({ where: { userId: { in: testUserIds } } }),
    apiConfigs: await db.apiConfig.count({ where: { userId: { in: testUserIds } } }),
  };

  console.log('\nПлан удаления связанных данных:');
  console.log(`- Сообщения тикетов (TicketMessage): ${counts.ticketMessages}`);
  console.log(`- Отзывы по тикетам (TicketFeedback): ${counts.ticketFeedbacks}`);
  console.log(`- Тикеты (Ticket): ${counts.testTickets}`);
  console.log(`- Рефиллы заказов (Refill): ${counts.refills}`);
  console.log(`- Заметки операторов (UserNote): ${counts.userNotes}`);
  console.log(`- Заказы (Order): ${counts.testOrders}`);
  console.log(`- Платежи (Payment): ${counts.payments}`);
  console.log(`- Записи леджера (LedgerEntry): ${counts.ledgerEntries}`);
  console.log(`- Смены персонала (StaffShift): ${counts.staffShifts}`);
  console.log(`- Сессии (Session): ${counts.sessions}`);
  console.log(`- Токены авторизации (AuthToken): ${counts.authTokens}`);
  console.log(`- Аудит логи (AuditLog): ${counts.auditLogs}`);
  console.log(`- API конфиги (ApiConfig): ${counts.apiConfigs}`);
  console.log(`- Пользователи (User): ${counts.testUsers}`);

  if (isDryRun) {
    console.log('\n[DRY-RUN] Никаких изменений в базе данных НЕ произведено.');
    console.log('Для боевого выполнения запустите скрипт с флагом: --confirm');
    return;
  }

  // Боевое выполнение в единой транзакции
  console.log('\nВыполняется удаление в ACID-транзакции...');
  await db.$transaction(
    async (tx) => {
      // 1. Отвязать referral связи у пользователей
      await tx.user.updateMany({
        where: { referredById: { in: testUserIds } },
        data: { referredById: null },
      });

      // 2. Удалить сообщения тикетов
      if (testTicketIds.length > 0 || testOrderIds.length > 0) {
        await tx.ticketMessage.deleteMany({
          where: { OR: [{ ticketId: { in: testTicketIds } }, { orderId: { in: testOrderIds } }] },
        });
      }

      // 3. Удалить отзывы по тикетам
      if (testTicketIds.length > 0 || testUserIds.length > 0) {
        await tx.ticketFeedback.deleteMany({
          where: { OR: [{ ticketId: { in: testTicketIds } }, { userId: { in: testUserIds } }] },
        });
      }

      // 4. Удалить тикеты
      if (testUserIds.length > 0) {
        await tx.ticket.deleteMany({ where: { userId: { in: testUserIds } } });
      }

      // 5. Удалить рефиллы
      if (testOrderIds.length > 0) {
        await tx.refill.deleteMany({ where: { orderId: { in: testOrderIds } } });
      }

      // 6. Удалить заметки операторов
      await tx.userNote.deleteMany({
        where: {
          OR: [
            { userId: { in: testUserIds } },
            { authorId: { in: testUserIds } },
            { orderId: { in: testOrderIds } },
            { ticketId: { in: testTicketIds } },
          ],
        },
      });

      // 7. Удалить инциденты восстановления и компенсации, если есть
      await tx.orderRecoveryIncident.deleteMany({ where: { userId: { in: testUserIds } } });
      await tx.cxApologyCompensation.deleteMany({ where: { userId: { in: testUserIds } } });

      // 8. Удалить заказы тестовых пользователей
      if (testUserIds.length > 0) {
        await tx.order.deleteMany({ where: { userId: { in: testUserIds } } });
      }

      // 9. Удалить платежи тестовых пользователей
      if (testUserIds.length > 0) {
        await tx.payment.deleteMany({ where: { userId: { in: testUserIds } } });
      }

      // 10. Удалить леджер-записи тестовых пользователей
      if (testUserIds.length > 0) {
        await tx.ledgerEntry.deleteMany({ where: { userId: { in: testUserIds } } });
      }

      // 11. Удалить смены персонала
      await tx.staffShift.deleteMany({
        where: { OR: [{ userId: { in: testUserIds } }, { substituteUserId: { in: testUserIds } }] },
      });

      // 12. Удалить сессии и токены
      await tx.session.deleteMany({ where: { userId: { in: testUserIds } } });
      await tx.authToken.deleteMany({ where: { userId: { in: testUserIds } } });

      // 13. Удалить аудит логи тестовых пользователей
      await tx.auditLog.deleteMany({ where: { userId: { in: testUserIds } } });

      // 14. Удалить API конфиги
      await tx.apiConfig.deleteMany({ where: { userId: { in: testUserIds } } });

      // 15. Удалить самих пользователей
      const deleteResult = await tx.user.deleteMany({
        where: { id: { in: testUserIds } },
      });

      console.log(`\n✓ Успешно удалено ${deleteResult.count} пользователей.`);
    },
    { timeout: 60000 }
  );

  // Проверка после удаления
  const remainingCount = await db.user.count();
  const remainingUsers = await db.user.findMany({ select: { id: true, email: true, role: true } });
  console.log(`\nИтог: в базе осталось ${remainingCount} пользователей:`);
  for (const u of remainingUsers) {
    console.log(`  - ${u.email} (${u.role})`);
  }
}

main()
  .catch((e) => {
    console.error('Ошибка очистки:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
