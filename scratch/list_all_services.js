const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const services = await prisma.service.findMany({
    select: {
      id: true,
      numericId: true,
      name: true,
      rate: true,
      markup: true,
      minQty: true,
      maxQty: true,
      isActive: true,
      category: {
        select: {
          name: true,
          network: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });
  console.log(`Total services: ${services.length}`);
  services.forEach(s => {
    console.log(`[${s.category?.network?.name || 'No Net'}] ${s.category?.name || 'No Cat'} - ID: ${s.numericId} | ${s.name} | Rate: ${s.rate} | Markup: ${s.markup} | Qty: ${s.minQty}-${s.maxQty}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
