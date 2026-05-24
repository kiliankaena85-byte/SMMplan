import { PrismaClient } from '@prisma/client';
import { providerService } from '../src/services/providers/provider.service';

const prisma = new PrismaClient();

async function main() {
  const dbProvider = await prisma.provider.findFirst({ where: { name: 'Vexboost' } });
  if (!dbProvider) {
    console.error('No Vexboost provider found in database.');
    return;
  }

  const provider = await providerService.getProviderInstance(dbProvider);
  const balance = await provider.getBalance();
  console.log('Vexboost API Response:');
  console.log('Balance Info:', balance);

  const services = await provider.getServices();
  console.log(`\nServices Count: ${services.length}`);
  if (services.length > 0) {
    console.log('Sample service rate details from API:');
    console.log(`- ID: ${services[0].service}`);
    console.log(`- Name: "${services[0].name}"`);
    console.log(`- Category: "${services[0].category}"`);
    console.log(`- Rate: ${services[0].rate}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
