const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const services = await prisma.service.findMany({
    where: { providerId: 'cmocp6mwk0000lmqn8g723caz' }
  });
  
  for (const s of services) {
    let newName = s.name;
    if (!newName.startsWith('[VexBoost]')) {
      newName = '[VexBoost] ' + newName;
      await prisma.service.update({
        where: { id: s.id },
        data: { name: newName }
      });
      console.log('Renamed:', newName);
    }
  }
}

main().finally(() => prisma.$disconnect());
