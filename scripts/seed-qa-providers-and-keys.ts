import { PrismaClient } from '@prisma/client';
import { VaultService } from '../src/lib/vault';

const prisma = new PrismaClient();

const providersData = [
  {
    name: 'Soc-Rocket',
    apiUrl: 'https://soc-rocket.ru/api/v2',
    apiKey: 'emrNjCPOuNMYKmMcxvHb532Xix99uAxM',
    balanceCurrency: 'RUB',
    isActive: true,
  },
  {
    name: 'SMM Prime',
    apiUrl: 'https://smmprime.com/api/v2',
    apiKey: '6833e1ceef531d34e7442d492b8e1021',
    balanceCurrency: 'USD',
    isActive: true,
  },
  {
    name: 'Stream-Promotion',
    apiUrl: 'https://stream-promotion.ru/api/v2',
    apiKey: 'fGOsh7PtBk3Ckyq3UmqH6HVNYTC2gGTH',
    balanceCurrency: 'RUB',
    isActive: true,
  },
  {
    name: 'Likedrom',
    apiUrl: 'https://likedrom.com/api/v2',
    apiKey: '4f2aa7f20c56399b4790a4cd73f5b8c9',
    balanceCurrency: 'RUB',
    isActive: true,
  },
  {
    name: 'SMMPanelUS',
    apiUrl: 'https://smmpanelus.com/api/v2',
    apiKey: '758711b4ba2800cf4c5e1438f0146307',
    balanceCurrency: 'USD',
    isActive: true,
  },
  {
    name: 'Soc-Proof',
    apiUrl: 'https://soc-proof.su/api/v2',
    apiKey: 'a465d4013f1265153a2ca12bdd3cad06',
    balanceCurrency: 'RUB',
    isActive: true,
  },
  {
    name: 'Telegram Shop',
    apiUrl: 'https://telegram.shop/api/v2',
    apiKey: 'abcd6e54ff5b77a11dc8077074445e04',
    balanceCurrency: 'USD',
    isActive: true,
  },
  {
    name: 'VexBoost',
    apiUrl: 'https://vexboost.ru/api/v2',
    apiKey: '5jG8DOFkpi1302QMSrEnc46ViH558qamfsPScvoLD14w4f34yyVrogaoVtts',
    balanceCurrency: 'RUB',
    isActive: true,
  },
];

async function main() {
  console.log('🚀 Seeding QA Providers and Payment Settings into PostgreSQL...');

  // 1. Providers
  for (const prov of providersData) {
    const encryptedKey = VaultService.encrypt(prov.apiKey);
    const existing = await prisma.provider.findFirst({
      where: {
        OR: [{ name: prov.name }, { apiUrl: prov.apiUrl }],
      },
    });

    if (existing) {
      await prisma.provider.update({
        where: { id: existing.id },
        data: {
          name: prov.name,
          apiUrl: prov.apiUrl,
          apiKey: encryptedKey,
          balanceCurrency: prov.balanceCurrency,
          isActive: true,
        },
      });
      console.log(`✅ Updated provider: ${prov.name}`);
    } else {
      await prisma.provider.create({
        data: {
          name: prov.name,
          apiUrl: prov.apiUrl,
          apiKey: encryptedKey,
          balanceCurrency: prov.balanceCurrency,
          isActive: true,
        },
      });
      console.log(`✨ Created provider: ${prov.name}`);
    }
  }

  // 2. SystemSettings (YooKassa test keys)
  const yookassaShopId = '1155075';
  const yookassaSecret = 'test_Bz5eSTzvWGA92wbksyOApJbxi-sfJ67LLgMTZSSOulA';
  const encryptedYookassaSecret = VaultService.encrypt(yookassaSecret);

  const settings = await prisma.systemSettings.findFirst();
  if (settings) {
    await prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        yookassaShopId: yookassaShopId,
        yookassaSecretKey: encryptedYookassaSecret,
        yookassaTestShopId: yookassaShopId,
        yookassaTestSecretKey: encryptedYookassaSecret,
      },
    });
    console.log('✅ Updated SystemSettings with YooKassa test credentials');
  } else {
    await prisma.systemSettings.create({
      data: {
        siteName: 'SMMplan',
        yookassaShopId: yookassaShopId,
        yookassaSecretKey: encryptedYookassaSecret,
        yookassaTestShopId: yookassaShopId,
        yookassaTestSecretKey: encryptedYookassaSecret,
      },
    });
    console.log('✨ Created SystemSettings with YooKassa test credentials');
  }

  console.log('🎉 Done! All 8 providers and YooKassa settings are live in the database.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
