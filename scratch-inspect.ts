import { db } from './src/lib/db';

async function main() {
  const services = await db.service.findMany({
    where: {
      OR: [
        { name: { contains: '🎉' } },
        { name: { contains: '👍' } },
        { name: { contains: '🔥' } },
        { name: { contains: 'Реакции' } },
        { name: { contains: 'Эконом' } }
      ]
    },
    include: { category: true }
  });
  console.log('Found services with emojis/patterns:', services.map(s => ({
    id: s.id,
    numericId: s.numericId,
    name: s.name,
    categoryName: s.category.name,
    targetType: s.targetType,
    externalId: s.externalId
  })));
}

main().catch(console.error);
