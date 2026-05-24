import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const nets = await p.network.findMany({
    where: { isActive: true },
    include: {
      categories: {
        include: {
          _count: { select: { services: { where: { isActive: true } } } }
        }
      }
    }
  });

  console.log(`\n=== Catalog: ${nets.length} networks ===`);
  for (const n of nets) {
    const catInfo = n.categories
      .map(c => `  - Name: "${c.name}", Slug: "${c.slug}" (${c._count.services} active services)`)
      .join('\n');
    console.log(`\n${n.name} (${n.slug}):\n${catInfo || '  (no categories)'}`);
  }

  const totalServices = await p.service.count({ where: { isActive: true } });
  console.log(`\nTotal active services: ${totalServices}`);
}

main().then(() => p.$disconnect());
