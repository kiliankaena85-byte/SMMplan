import { PrismaClient } from '@prisma/client';
import { providerService } from './src/services/providers/provider.service';
import { redis } from './src/lib/redis';

const prisma = new PrismaClient();

async function run() {
  const p = await prisma.provider.findFirst();
  if (p) {
      console.log('Fetching from provider:', p.id);
      const instance = await providerService.getProviderInstance(p);
      const services = await instance.getServices();
      const cacheKey = `provider:${p.id}:shadow_catalog`;
      await redis.set(cacheKey, JSON.stringify(services), 'EX', 86400);
      console.log('Saved to shadow catalog. Count:', services.length);
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
