import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import type { NormalizedServiceBlueprint } from './extract-erp-blueprint';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_HOST || 'postgresql://postgres:postgres@localhost:5435/smmplan_lite?schema=public'
    }
  }
});

interface ProviderSeedDef {
  code: string;
  name: string;
  apiUrl: string;
  envKeyName: string;
  defaultKey: string;
  isActive: boolean;
}

const PROVIDERS_REGISTRY: ProviderSeedDef[] = [
  {
    code: 'vexboost',
    name: 'Vexboost',
    apiUrl: 'https://vexboost.ru/api/v2',
    envKeyName: 'VEXBOOST_API_KEY',
    defaultKey: process.env.VEXBOOST_API_KEY || process.env.PROVIDER_KEY_VEXBOOST || 'NrgY6iwm34j6JwDVwdSqGpCLQ7DzPpdWWP3UQzfRTNhuW42UkvoOZ6GsDCfD',
    isActive: true
  },
  {
    code: 'smm_panelus',
    name: 'SMM Panel US',
    apiUrl: 'https://smmpanelus.com/api/v2',
    envKeyName: 'PROVIDER_KEY_SMMPANELUS',
    defaultKey: process.env.PROVIDER_KEY_SMMPANELUS || process.env.SMM_PANELUS_API_KEY || '62c587ccc0b54a28f35d3840b93c72b8',
    isActive: true
  },
  {
    code: 'stream_promotion',
    name: 'Stream Promotion',
    apiUrl: 'https://stream-promotion.ru/api/v2',
    envKeyName: 'PROVIDER_KEY_STREAM_PROMOTION',
    defaultKey: process.env.PROVIDER_KEY_STREAM_PROMOTION || process.env.STREAM_PROMOTION_API_KEY || 'pB7LK6auFhmsuntExn9gYvgo5myeDmS4',
    isActive: true
  },
  {
    code: 'soc_rocket',
    name: 'Soc Rocket',
    apiUrl: 'https://soc-rocket.ru/api/v2',
    envKeyName: 'PROVIDER_KEY_SOC_ROCKET',
    defaultKey: process.env.PROVIDER_KEY_SOC_ROCKET || process.env.SOC_ROCKET_API_KEY || 'a4rhzjHA6oirPXVDVYth5ENDgERTgoOi',
    isActive: true
  },
  {
    code: 'smmprime',
    name: 'SMM Prime',
    apiUrl: 'https://smmprime.com/api/v2',
    envKeyName: 'PROVIDER_KEY_SMMPRIME',
    defaultKey: process.env.PROVIDER_KEY_SMMPRIME || process.env.SMMPRIME_API_KEY || 'fdca04c435054be29eb5b487dbd336b7',
    isActive: true
  },
  {
    code: 'prosmm-shop',
    name: 'ProSMM Shop',
    apiUrl: 'https://prosmm-shop.com/api/v2',
    envKeyName: 'PROVIDER_KEY_PROSMM_SHOP',
    defaultKey: process.env.PROVIDER_KEY_PROSMM_SHOP || process.env.PROSMM_SHOP_API_KEY || '4ecef90f16dea697ef32404efe293ba1',
    isActive: true
  },
  {
    code: 'karandash',
    name: 'Karandash',
    apiUrl: 'https://panel.karandash.im/api/v2',
    envKeyName: 'PROVIDER_KEY_KARANDASH',
    defaultKey: process.env.PROVIDER_KEY_KARANDASH || 'PENDING_API_KEY',
    isActive: false
  },
  {
    code: 'partner.soc',
    name: 'Soc Proof',
    apiUrl: 'https://soc-proof.su/api/v2',
    envKeyName: 'PROVIDER_KEY_SOC_PROOF',
    defaultKey: process.env.PROVIDER_KEY_SOC_PROOF || 'PENDING_API_KEY',
    isActive: false
  },
  {
    code: 'likedrom',
    name: 'Likedrom',
    apiUrl: 'https://likedrom.com/api/v2',
    envKeyName: 'PROVIDER_KEY_LIKEDROM',
    defaultKey: process.env.PROVIDER_KEY_LIKEDROM || 'PENDING_API_KEY',
    isActive: false
  },
  {
    code: 'web_smm',
    name: 'Web SMM',
    apiUrl: 'https://web-smm.ru/api/v2',
    envKeyName: 'PROVIDER_KEY_WEB_SMM',
    defaultKey: 'PENDING_API_KEY',
    isActive: false
  },
  {
    code: 's_smm',
    name: 'S-SMM',
    apiUrl: 'https://s-smm.ru/api/v2',
    envKeyName: 'PROVIDER_KEY_S_SMM',
    defaultKey: 'PENDING_API_KEY',
    isActive: false
  },
  {
    code: 'prm4u',
    name: 'PRM4U',
    apiUrl: 'https://prm4u.com/api/v2',
    envKeyName: 'PROVIDER_KEY_PRM4U',
    defaultKey: 'PENDING_API_KEY',
    isActive: false
  },
  {
    code: 'smmrise_com',
    name: 'SMM Rise',
    apiUrl: 'https://smmrise.com/api/v2',
    envKeyName: 'PROVIDER_KEY_SMMRISE',
    defaultKey: 'PENDING_API_KEY',
    isActive: false
  },
  {
    code: 'boost_like',
    name: 'Boost Like',
    apiUrl: 'https://boost-like.ru/api/v2',
    envKeyName: 'PROVIDER_KEY_BOOST_LIKE',
    defaultKey: 'PENDING_API_KEY',
    isActive: false
  },
  {
    code: 'toplike_io',
    name: 'Toplike',
    apiUrl: 'https://toplike.io/api/v2',
    envKeyName: 'PROVIDER_KEY_TOPLIKE',
    defaultKey: 'PENDING_API_KEY',
    isActive: false
  }
];

interface VexboostApiService {
  service: string | number;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: number | string;
  max: number | string;
  refill: boolean;
  cancel: boolean;
  description?: string;
}

function transliterate(str: string): string {
  const ru: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    ' ': '-', '_': '-'
  };
  return str.toLowerCase().split('').map(char => ru[char] || (/[a-z0-9]/.test(char) ? char : '')).join('').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function fetchVexboostServices(apiKey: string, apiUrl: string): Promise<Map<string, VexboostApiService>> {
  console.log('📡 Fetching live services catalog from Vexboost API...');
  const map = new Map<string, VexboostApiService>();
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        key: apiKey,
        action: 'services'
      })
    });
    if (!res.ok) {
      console.error(`❌ Vexboost API error: ${res.status} ${res.statusText}`);
      return map;
    }
    const data: VexboostApiService[] = await res.json();
    for (const s of data) {
      map.set(String(s.service), s);
    }
    console.log(`✅ Loaded ${map.size} live services from Vexboost API.`);
  } catch (err) {
    console.error('❌ Failed to fetch from Vexboost API:', err);
  }
  return map;
}

function cleanDescription(rawDesc?: string): string {
  if (!rawDesc) return 'Качественная услуга продвижения с гарантией выполнения.';
  return rawDesc
    .replace(/vexboost/gi, '')
    .replace(/primelike/gi, '')
    .replace(/smmtoolbox/gi, '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

async function deploy() {
  console.log('🚀 Deploying Master Catalog into smmplan_lite...');

  // 1. Seed / Upsert Providers
  console.log('\n🏢 1. Registering 15 Providers in DB...');
  const providerDbMap = new Map<string, string>(); // code -> providerId

  for (const p of PROVIDERS_REGISTRY) {
    const existing = await prisma.provider.findFirst({
      where: {
        OR: [
          { name: p.name },
          { name: p.code }
        ]
      }
    });

    let providerId: string;
    if (existing) {
      const updated = await prisma.provider.update({
        where: { id: existing.id },
        data: {
          name: p.name,
          apiUrl: p.apiUrl,
          apiKey: p.defaultKey !== 'PENDING_API_KEY' ? p.defaultKey : existing.apiKey,
          isActive: p.isActive || existing.isActive
        }
      });
      providerId = updated.id;
      console.log(`   🔄 Provider updated: ${p.name} (${p.isActive ? 'Active' : 'Pending Key'})`);
    } else {
      const created = await prisma.provider.create({
        data: {
          name: p.name,
          apiUrl: p.apiUrl,
          apiKey: p.defaultKey,
          isActive: p.isActive
        }
      });
      providerId = created.id;
      console.log(`   ➕ Provider created: ${p.name} (${p.isActive ? 'Active' : 'Pending Key'})`);
    }
    providerDbMap.set(p.code, providerId);
    providerDbMap.set(p.name.toLowerCase(), providerId);
  }

  // 2. Fetch Vexboost Live API Catalog
  const vexboostId = providerDbMap.get('vexboost');
  const vexboostDef = PROVIDERS_REGISTRY.find(p => p.code === 'vexboost')!;
  const vexboostLiveCatalog = await fetchVexboostServices(vexboostDef.defaultKey, vexboostDef.apiUrl);

  // 3. Load Blueprint
  const blueprintPath = path.resolve(__dirname, 'data', 'master-services-blueprint.json');
  if (!fs.existsSync(blueprintPath)) {
    console.error('❌ master-services-blueprint.json not found!');
    return;
  }
  const blueprint: NormalizedServiceBlueprint[] = JSON.parse(fs.readFileSync(blueprintPath, 'utf-8'));
  console.log(`\n📦 2. Importing ${blueprint.length} Master Services from Blueprint...`);

  // Cache networks and categories
  const networks = await prisma.network.findMany({ include: { categories: true } });
  const categoryLookup = new Map<string, string>(); // "networkSlug:categoryNameLowerCase" -> categoryId

  for (const net of networks) {
    for (const cat of net.categories) {
      categoryLookup.set(`${net.slug}:${cat.name.toLowerCase()}`, cat.id);
    }
  }

  let activeCount = 0;
  let quarantinedCount = 0;
  let updatedCount = 0;
  let createdCount = 0;

  for (const item of blueprint) {
    const catKey = `${item.network.slug}:${item.category.name.toLowerCase()}`;
    const categoryId = categoryLookup.get(catKey);

    if (!categoryId) {
      console.warn(`⚠️ Category not found in DB: ${item.network.name} -> ${item.category.name}`);
      continue;
    }

    const providerId = providerDbMap.get(item.service.providerName) || vexboostId!;
    const isVexboost = item.service.providerName === 'vexboost';

    let rate = 0.0;
    let costPer1kRub = 0.0;
    let minQty = 10;
    let maxQty = 100000;
    let isActive = false;
    let isQuarantined = true;
    let quarantineReason: string | null = `Ожидает ввода API-ключа провайдера ${item.service.providerName}`;
    let description = `Услуга ${item.service.name}. Быстрое и качественное выполнение.`;

    if (isVexboost) {
      const liveSvc = vexboostLiveCatalog.get(item.service.providerServiceId);
      if (liveSvc) {
        rate = parseFloat(liveSvc.rate) || 0.0;
        costPer1kRub = rate;
        minQty = parseInt(String(liveSvc.min), 10) || 10;
        maxQty = parseInt(String(liveSvc.max), 10) || 100000;
        isActive = true;
        isQuarantined = false;
        quarantineReason = null;
        description = cleanDescription(liveSvc.description);
        activeCount++;
      } else {
        rate = item.service.retailPriceRub * 0.5;
        costPer1kRub = rate;
        isActive = true;
        isQuarantined = false;
        quarantineReason = null;
        activeCount++;
      }
    } else {
      quarantinedCount++;
    }

    const markup = rate > 0 ? Number((item.service.retailPriceRub / rate).toFixed(2)) : 2.0;

    // Check existing service by providerId and externalId
    const existingSvc = await prisma.service.findFirst({
      where: {
        providerId,
        externalId: item.service.providerServiceId
      }
    });

    const baseSlug = `${item.network.slug}-${transliterate(item.service.name)}`;
    const uniqueSlug = existingSvc?.slug || `${baseSlug}-${item.service.providerServiceId}`;

    let serviceId: string;

    if (existingSvc) {
      const updated = await prisma.service.update({
        where: { id: existingSvc.id },
        data: {
          name: item.service.name,
          categoryId,
          rate,
          costPer1kRub,
          markup,
          pricePer1000Cents: item.service.retailPriceCents,
          targetType: item.service.targetType,
          customDataType: item.service.customDataType,
          linkPlaceholder: item.service.linkPlaceholder,
          linkHint: item.service.linkHint,
          qualityTier: item.service.qualityTier,
          minQty,
          maxQty,
          isActive,
          isQuarantined,
          quarantineReason,
          description,
          tenantId: 'all'
        }
      });
      serviceId = updated.id;
      updatedCount++;
    } else {
      const created = await prisma.service.create({
        data: {
          name: item.service.name,
          slug: uniqueSlug,
          categoryId,
          providerId,
          externalId: item.service.providerServiceId,
          rate,
          costPer1kRub,
          markup,
          pricePer1000Cents: item.service.retailPriceCents,
          targetType: item.service.targetType,
          customDataType: item.service.customDataType,
          linkPlaceholder: item.service.linkPlaceholder,
          linkHint: item.service.linkHint,
          qualityTier: item.service.qualityTier,
          minQty,
          maxQty,
          isActive,
          isQuarantined,
          quarantineReason,
          description,
          tenantId: 'all'
        }
      });
      serviceId = created.id;
      createdCount++;
    }

    // Upsert ServiceRoute
    const existingRoute = await prisma.serviceRoute.findUnique({
      where: {
        serviceId_providerId: {
          serviceId,
          providerId
        }
      }
    });

    if (existingRoute) {
      await prisma.serviceRoute.update({
        where: { id: existingRoute.id },
        data: {
          providerServiceId: item.service.providerServiceId,
          isPrimary: true,
          isActive
        }
      });
    } else {
      await prisma.serviceRoute.create({
        data: {
          serviceId,
          providerId,
          providerServiceId: item.service.providerServiceId,
          isPrimary: true,
          isActive
        }
      });
    }
  }

  console.log(`\n🎉 MASTER CATALOG DEPLOYMENT COMPLETED!`);
  console.log(`   ➕ Services Created: ${createdCount}`);
  console.log(`   🔄 Services Updated: ${updatedCount}`);
  console.log(`   🟢 Live Active Services (Vexboost): ${activeCount}`);
  console.log(`   🟡 Pending Key Services (Pre-configured): ${quarantinedCount}`);
  console.log(`   📊 Total Services in DB: ${await prisma.service.count()}`);
}

deploy()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
