import { hashPassword } from './src/lib/auth/password';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const hash = await hashPassword('password123');
  await prisma.user.upsert({
    where: { email: 'admin@smmplan.ru' },
    update: { passwordHash: hash, role: 'OWNER' },
    create: { email: 'admin@smmplan.ru', passwordHash: hash, role: 'OWNER' }
  });
  console.log('Admin user created');
}

main().catch(console.error).finally(() => prisma.$disconnect());
