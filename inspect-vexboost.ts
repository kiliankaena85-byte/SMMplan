import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const provider = await prisma.provider.findFirst({
    where: { name: 'VexBoost' },
    include: {
        services: {
            include: { category: true }
        }
    }
  });
  console.log(JSON.stringify(provider, null, 2));
}

main().finally(() => prisma.$disconnect())
