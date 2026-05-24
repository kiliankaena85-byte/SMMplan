import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { VaultService } from '../src/lib/vault';

// Load .env explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main() {
  const apiKey = process.env.VEXBOOST_API_KEY;
  const apiUrl = process.env.VEXBOOST_API_URL || 'https://vexboost.ru/api/v2';

  if (!apiKey) {
    console.error('❌ VEXBOOST_API_KEY is not defined in .env file!');
    process.exit(1);
  }

  console.log('🔄 Connecting to database and updating Vexboost provider with real credentials...');
  
  // Encrypt the API Key before storing it in the database
  const encryptedKey = VaultService.encrypt(apiKey);

  // Upsert or Update Vexboost
  const provider = await prisma.provider.upsert({
    where: { name: 'Vexboost' },
    update: {
      apiUrl,
      apiKey: encryptedKey,
      isActive: true,
      balanceCurrency: 'RUB',
    },
    create: {
      name: 'Vexboost',
      apiUrl,
      apiKey: encryptedKey,
      isActive: true,
      balanceCurrency: 'RUB',
    },
  });

  // Deactivate all other providers
  const deactivated = await prisma.provider.updateMany({
    where: { NOT: { name: 'Vexboost' } },
    data: { isActive: false },
  });

  console.log('✅ Vexboost provider successfully updated with real API credentials!');
  console.log('Name:', provider.name);
  console.log('API URL:', provider.apiUrl);
  console.log('API Key (masked):', apiKey.substring(0, 8) + '...');
  console.log(`Deactivated secondary SMM providers count: ${deactivated.count}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during Vexboost update:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
