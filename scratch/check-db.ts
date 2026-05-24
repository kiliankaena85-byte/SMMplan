import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const networks = await prisma.network.findMany({
    include: {
      categories: true
    }
  });
  console.log("DB NETWORKS:", JSON.stringify(networks, null, 2));
}

run();
