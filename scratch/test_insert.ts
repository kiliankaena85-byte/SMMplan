import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('--- DB TEST START ---');
    const network = await prisma.network.create({
      data: {
        name: 'Test Network ' + Date.now(),
        slug: 'test-net-' + Date.now(),
      }
    });
    console.log('Created Network:', network.id);

    const categoryId = 'test-cat-' + Date.now();
    const category = await prisma.category.create({
      data: {
        id: categoryId,
        name: 'Test Category',
        networkId: network.id,
      }
    });
    console.log('Created Category in DB:', category.id);

    // Verify it exists in DB
    const foundCat = await prisma.category.findUnique({ where: { id: categoryId } });
    console.log('Found Category in DB:', foundCat);

    const serviceId = 'test-svc-' + Date.now();
    const service = await prisma.service.create({
      data: {
        id: serviceId,
        name: 'Test Service',
        categoryId: category.id,
        rate: 1.0,
        markup: 10.0,
        minQty: 10,
        maxQty: 100,
        isActive: true,
      }
    });
    console.log('Created Service in DB:', service.id);
    
    // Clean up
    await prisma.service.delete({ where: { id: serviceId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.network.delete({ where: { id: network.id } });
    console.log('Cleanup completed successfully!');
  } catch (error) {
    console.error('Error during step-by-step insert:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
