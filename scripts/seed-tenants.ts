import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding tenants and system settings...');

  // 1. Create SMMplan Tenant & settings
  const smmplanSalt = crypto.randomBytes(32).toString('hex');
  const smmplanTenant = await prisma.tenant.upsert({
    where: { id: 'smmplan' },
    update: {},
    create: {
      id: 'smmplan',
      name: 'SMMplan',
      slug: 'smmplan',
      domain: 'smmplan.pro',
      vaultSalt: smmplanSalt,
      isActive: true
    }
  });

  await prisma.systemSettings.upsert({
    where: { id: 'smmplan' },
    update: {},
    create: {
      id: 'smmplan',
      siteName: 'SMMplan',
      siteDescription: 'Панель продвижения SMMplan',
      taxRate: 6.0,
      exchangeRateUSD: 95.0,
      contactSupportEmail: 'support@smmplan.pro',
      contactPrivacyEmail: 'privacy@smmplan.pro',
      contactTelegramBot: 'smmplan_support_bot',
      contactTelegramChannel: 'smmplan_support',
      legalCompanyName: 'ИП Соколов Артём Андреевич',
      legalCompanyInn: '695006320024',
      legalCompanyAddress: 'Российская Федерация, Тверская область, г. Тверь',
    }
  });

  // 2. Create SMMflux Tenant & settings
  const fluxSalt = crypto.randomBytes(32).toString('hex');
  const fluxTenant = await prisma.tenant.upsert({
    where: { id: 'flux' },
    update: {},
    create: {
      id: 'flux',
      name: 'SMMflux',
      slug: 'flux',
      domain: 'smmflux.ru',
      vaultSalt: fluxSalt,
      isActive: true
    }
  });

  await prisma.systemSettings.upsert({
    where: { id: 'flux' },
    update: {},
    create: {
      id: 'flux',
      siteName: 'SMMflux',
      siteDescription: 'Платформа продвижения SMMflux',
      taxRate: 6.0,
      exchangeRateUSD: 95.0,
      contactSupportEmail: 'support@smmflux.ru',
      contactPrivacyEmail: 'privacy@smmflux.ru',
      contactTelegramBot: 'smmflux_support_bot',
      contactTelegramChannel: 'smmflux_support',
      legalCompanyName: 'ИП Соколов Артём Андреевич',
    }
  });

  console.log('Seeding finished successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
