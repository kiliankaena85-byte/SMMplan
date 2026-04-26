import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const services = await prisma.service.findMany({
    include: {
        provider: true
    }
  });
  console.dir(services, { depth: null });
}

main().finally(() => prisma.$disconnect())
