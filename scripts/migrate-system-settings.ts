import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting settings migration...');
  const globalSettings = await prisma.systemSettings.findUnique({ where: { id: 'global' } });
  
  if (!globalSettings) {
    console.log('No global settings found to migrate. Creating default tenant settings.');
    // Create default smmplan settings
    await prisma.systemSettings.upsert({
      where: { id: 'smmplan' },
      update: {},
      create: {
        id: 'smmplan',
        siteName: 'SMMplan',
        contactSupportEmail: 'support@smmplan.pro',
      }
    });
    // Create default flux settings
    await prisma.systemSettings.upsert({
      where: { id: 'flux' },
      update: {},
      create: {
        id: 'flux',
        siteName: 'SMMflux',
        contactSupportEmail: 'support@smmflux.ru',
      }
    });
    return;
  }

  console.log('Found global settings, migrating to smmplan and flux...');
  const { id, ...settingsData } = globalSettings;

  // Upsert smmplan
  await prisma.systemSettings.upsert({
    where: { id: 'smmplan' },
    update: settingsData,
    create: { id: 'smmplan', ...settingsData }
  });

  // Upsert flux (override siteName and contact fields for brand isolation)
  await prisma.systemSettings.upsert({
    where: { id: 'flux' },
    update: {
      ...settingsData,
      siteName: 'SMMflux',
      contactSupportEmail: 'support@smmflux.ru',
      contactPrivacyEmail: 'privacy@smmflux.ru',
      contactTelegramBot: 'smmflux_support_bot',
      contactTelegramChannel: 'smmflux_support',
      legalCompanyName: 'ИП Соколов Артём Андреевич',
    },
    create: {
      id: 'flux',
      ...settingsData,
      siteName: 'SMMflux',
      contactSupportEmail: 'support@smmflux.ru',
      contactPrivacyEmail: 'privacy@smmflux.ru',
      contactTelegramBot: 'smmflux_support_bot',
      contactTelegramChannel: 'smmflux_support',
      legalCompanyName: 'ИП Соколов Артём Андреевич',
    }
  });

  console.log('Settings migration completed successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
