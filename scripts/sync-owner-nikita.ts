import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'nikita8888@inbox.ru';

  console.log(`[SyncOwner] Синхронизация владельца: ${email}...`);

  // 1. Проверяем аккаунт на smmplan
  let smmplanUser = await prisma.user.findFirst({
    where: { email, tenantId: 'smmplan' },
  });

  if (!smmplanUser) {
    console.log('[SyncOwner] Создание аккаунта на smmplan...');
    smmplanUser = await prisma.user.create({
      data: {
        email,
        role: 'OWNER',
        tenantId: 'smmplan',
        allowedTenants: ['smmplan', 'flux'],
        balance: BigInt(1000000), // 10 000.00 ₽
        isActive: true,
        isEmailVerified: true,
        isDeleted: false,
        tosAcceptedAt: new Date(),
      },
    });
  } else {
    console.log('[SyncOwner] Обновление аккаунта на smmplan...');
    smmplanUser = await prisma.user.update({
      where: { id: smmplanUser.id },
      data: {
        role: 'OWNER',
        allowedTenants: ['smmplan', 'flux'],
        isActive: true,
        isDeleted: false,
        isEmailVerified: true,
      },
    });
  }

  console.log(`✓ SMMplan: ${smmplanUser.email} (ID: ${smmplanUser.id}, Role: ${smmplanUser.role})`);

  // 2. Проверяем / создаем аккаунт на flux
  let fluxUser = await prisma.user.findFirst({
    where: { email, tenantId: 'flux' },
  });

  if (!fluxUser) {
    console.log('[SyncOwner] Создание синхронизированного аккаунта на flux...');
    fluxUser = await prisma.user.create({
      data: {
        email,
        role: 'OWNER',
        tenantId: 'flux',
        allowedTenants: ['smmplan', 'flux'],
        passwordHash: smmplanUser.passwordHash,
        balance: BigInt(1000000), // 10 000.00 ₽
        isActive: true,
        isEmailVerified: true,
        isDeleted: false,
        tosAcceptedAt: new Date(),
      },
    });
  } else {
    console.log('[SyncOwner] Обновление аккаунта на flux...');
    fluxUser = await prisma.user.update({
      where: { id: fluxUser.id },
      data: {
        role: 'OWNER',
        allowedTenants: ['smmplan', 'flux'],
        passwordHash: smmplanUser.passwordHash ?? fluxUser.passwordHash,
        isActive: true,
        isDeleted: false,
        isEmailVerified: true,
      },
    });
  }

  console.log(`✓ SMMflux: ${fluxUser.email} (ID: ${fluxUser.id}, Role: ${fluxUser.role})`);

  console.log('\n🎉 Пользователь nikita8888@inbox.ru успешно настроен как OWNER на обоих сайтах!');
}

main()
  .catch((e) => {
    console.error('Ошибка синхронизации:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
