import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Terminating other database connections to smmplan_test...');
    const result = await prisma.$queryRaw`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = 'smmplan_test' AND pid <> pg_backend_pid()
    `;
    console.log('Result:', result);
  } catch (error) {
    console.error('Error terminating backends:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
