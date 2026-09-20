import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_HOST || 'postgresql://postgres:postgres@localhost:5435/smmplan_lite?schema=public'
    }
  }
});

interface StandardApiService {
  service: string | number;
  name: string;
  type?: string;
  category?: string;
  rate: string;
  min: number | string;
  max: number | string;
  refill?: boolean;
  cancel?: boolean;
  description?: string;
}

function cleanDescription(rawDesc?: string): string {
  if (!rawDesc) return 'Качественная услуга продвижения с гарантией выполнения.';
  return rawDesc
    .replace(/vexboost|primelike|smmtoolbox|soc-rocket|stream-promotion|smmpanelus|smmprime/gi, '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

export async function syncProvider(providerNameOrCode: string) {
  console.log(`\n🔄 Syncing provider: ${providerNameOrCode}...`);

  const provider = await prisma.provider.findFirst({
    where: {
      OR: [
        { name: { equals: providerNameOrCode, mode: 'insensitive' } },
        { id: providerNameOrCode }
      ]
    }
  });

  if (!provider) {
    console.error(`❌ Provider not found: ${providerNameOrCode}`);
    return;
  }

  if (!provider.apiKey || provider.apiKey === 'PENDING_API_KEY') {
    console.warn(`⚠️ Provider ${provider.name} does not have an API key configured. Skipping API fetch.`);
    return;
  }

  console.log(`📡 Calling API for ${provider.name} (${provider.apiUrl})...`);

  try {
    const res = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        key: provider.apiKey,
        action: 'services'
      })
    });

    if (!res.ok) {
      console.error(`❌ HTTP Error ${res.status}: ${res.statusText}`);
      return;
    }

    const services: StandardApiService[] = await res.json();
    if (!Array.isArray(services)) {
      console.error('❌ Expected array of services from provider, got:', services);
      return;
    }

    console.log(`✅ Received ${services.length} services from provider API.`);

    const serviceMap = new Map<string, StandardApiService>();
    for (const s of services) {
      serviceMap.set(String(s.service), s);
    }

    // Find all services in our database mapped to this provider
    const dbServices = await prisma.service.findMany({
      where: { providerId: provider.id }
    });

    console.log(`📋 Found ${dbServices.length} pre-configured services in our database for ${provider.name}.`);

    let activatedCount = 0;
    for (const dbSvc of dbServices) {
      if (!dbSvc.externalId) continue;
      const apiSvc = serviceMap.get(dbSvc.externalId);
      if (!apiSvc) {
        console.warn(`   ⚠️ Service #${dbSvc.externalId} (${dbSvc.name}) not found in live API response.`);
        continue;
      }

      const rate = parseFloat(apiSvc.rate) || 0.0;
      const minQty = parseInt(String(apiSvc.min), 10) || dbSvc.minQty;
      const maxQty = parseInt(String(apiSvc.max), 10) || dbSvc.maxQty;
      const desc = apiSvc.description ? cleanDescription(apiSvc.description) : dbSvc.description;

      await prisma.service.update({
        where: { id: dbSvc.id },
        data: {
          rate,
          costPer1kRub: rate,
          minQty,
          maxQty,
          description: desc,
          isActive: true,
          isQuarantined: false,
          quarantineReason: null
        }
      });

      // Update ServiceRoute
      await prisma.serviceRoute.updateMany({
        where: {
          serviceId: dbSvc.id,
          providerId: provider.id
        },
        data: {
          isActive: true
        }
      });

      activatedCount++;
    }

    // Mark provider active
    await prisma.provider.update({
      where: { id: provider.id },
      data: { isActive: true }
    });

    console.log(`🎉 Provider ${provider.name} synced! Activated ${activatedCount}/${dbServices.length} services.`);
  } catch (err) {
    console.error(`❌ Exception syncing provider ${provider.name}:`, err);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const target = args[0] || '--all';

  if (target === '--all') {
    const providers = await prisma.provider.findMany();
    for (const p of providers) {
      if (p.apiKey && p.apiKey !== 'PENDING_API_KEY') {
        await syncProvider(p.id);
      }
    }
  } else {
    await syncProvider(target);
  }
}

if (require.main === module) {
  main().catch(console.error).finally(() => prisma.$disconnect());
}
