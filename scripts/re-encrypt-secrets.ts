import { PrismaClient } from '@prisma/client';
import { VaultService } from '../src/lib/vault';

const db = new PrismaClient();

async function main() {
  console.log('🔒 Starting re-encryption migration...');

  // 1. Re-encrypt Provider.apiKey
  const providers = await db.provider.findMany();
  for (const p of providers) {
    if (p.apiKey && p.apiKey.split(':').length !== 3) {
      console.log(`Re-encrypting provider key for: ${p.name}`);
      await db.provider.update({
        where: { id: p.id },
        data: { apiKey: VaultService.encrypt(p.apiKey) },
      });
    }
  }

  // 2. Re-encrypt SystemSettings payment secrets
  const settings = await db.systemSettings.findMany();
  for (const s of settings) {
    const fields = [
      'yookassaSecretKey',
      'yookassaTestSecretKey',
      'cryptoBotToken',
      'robokassaPassword',
      'robokassaWebhookPassword',
      'smtpPassword',
      'resendApiKey',
    ] as const;

    const updateData: Record<string, string> = {};
    for (const field of fields) {
      const val = s[field];
      if (val && typeof val === 'string' && val.trim() !== '' && val.split(':').length !== 3) {
        console.log(`Re-encrypting SystemSettings field ${field} for tenant ${s.id}`);
        updateData[field] = VaultService.encrypt(val);
      }
    }
    if (Object.keys(updateData).length > 0) {
      await db.systemSettings.update({ where: { id: s.id }, data: updateData });
    }
  }

  console.log('✅ Re-encryption complete');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
