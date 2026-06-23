import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@127.0.0.1:5433/smmplan_test'
    }
  }
});

async function main() {
  const schemas = ['public', 'teamwork_reviewer_flow'];
  for (const schema of schemas) {
    try {
      const res: any = await prisma.$queryRawUnsafe(`SELECT count(*) FROM "${schema}"."Service"`);
      console.log(`Schema ${schema} Service count:`, res[0].count);
    } catch (e: any) {
      console.log(`Schema ${schema} failed:`, e.message);
    }
  }
  await prisma.$disconnect();
}

main().catch(console.error);
