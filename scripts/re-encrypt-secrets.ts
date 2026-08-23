import { PrismaClient } from '@prisma/client';
import { VaultService } from '../src/lib/vault';

const db = new PrismaClient();

async function main() {
  const isApply = process.argv.includes('--apply');
  const isDryRun = !isApply;

  console.log(`🔒 Starting re-encryption tool (Mode: ${isDryRun ? 'DRY-RUN (default, no DB changes)' : 'APPLY (writing to DB)'})...`);

  // 1. Re-encrypt Provider.apiKey
  const providers = await db.provider.findMany();
  for (const p of providers) {
    if (p.apiKey && p.apiKey.split(':').length !== 3) {
      console.log(`[DRY-RUN: ${isDryRun}] Re-encrypting unencrypted provider key for: ${p.name}`);
      if (isApply) {
        await db.provider.update({
          where: { id: p.id },
          data: { apiKey: VaultService.encrypt(p.apiKey) },
        });
      }
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
        console.log(`[DRY-RUN: ${isDryRun}] Re-encrypting SystemSettings field ${field} for tenant ${s.id}`);
        if (isApply) {
          updateData[field] = VaultService.encrypt(val);
        }
      }
    }
    if (isApply && Object.keys(updateData).length > 0) {
      await db.systemSettings.update({ where: { id: s.id }, data: updateData });
    }
  }

  console.log(`✅ Re-encryption scan complete (${isDryRun ? 'DRY-RUN: run with --apply to commit' : 'Applied'})`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
