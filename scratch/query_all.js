const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const services = await prisma.service.findMany({
    take: 10,
    include: {
      category: {
        include: {
          network: true
        }
      }
    }
  });
  console.log(JSON.stringify(services, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
