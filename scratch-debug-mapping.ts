import { SmartAnalyzerLogic } from './src/services/providers/smart-analyzer.logic';
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const s = await prisma.service.findFirst({
      where: {
        externalId: '23471'
      },
      include: {
        category: {
          include: {
            network: true
          }
        }
      }
    });

    if (!s) {
      console.log('Service 23471 not found');
      return;
    }

    console.log('=== Service Details ===');
    console.log('ID:', s.id);
    console.log('Ext ID:', s.externalId);
    console.log('Name:', s.name);
    console.log('Description:', s.description);
    console.log('Category Name:', s.category?.name);
    console.log('Category ID:', s.categoryId);

    // Let's see how smart analyzer logic detects it:
    // When we seed or import, we pass the original category name from provider, e.g. from Vexboost/HQ-SMM.
    // Let's check what category was passed or if we can run it
    const detected = SmartAnalyzerLogic.detectSync(s.name, s.description || '', s.category?.name || '');
    console.log('\n=== Re-Analysis ===');
    console.log('Detected Category:', detected.category);
    console.log('Detected TargetType:', detected.targetType);
    console.log('Detected CustomDataType:', detected.customDataType);

  } finally {
    await prisma.$disconnect();
  }
}

main();
