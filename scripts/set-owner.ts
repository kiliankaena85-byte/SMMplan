import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetEmail = process.argv[2] || 'nikita8888@inbox.ru';
  const result = await prisma.user.updateMany({
    where: { email: targetEmail },
    data: { role: 'OWNER', allowedTenants: ['smmplan', 'flux'] },
  });
  console.log(`Обновлено ${result.count} записей для ${targetEmail} до роли OWNER.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
