import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const emailsToCheck = [
    'admin@smmplan.test',
    'client@smmplan.test',
    'guest@smmplan.test',
    'art@artmspektr.ru'
  ];

  console.log('--- Checking Seed Users ---');
  for (const email of emailsToCheck) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      console.log(`✅ User found: ${email} (Role: ${user.role}, Balance: ${Number(user.balance) / 100} RUB)`);
    } else {
      console.log(`❌ User NOT found: ${email}`);
    }
  }

  console.log('\n--- Checking Providers ---');
  const providers = await prisma.provider.findMany();
  providers.forEach(p => {
    console.log(`- ID: ${p.id}, Name: ${p.name}, API URL: ${p.apiUrl}, IsActive: ${p.isActive}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
