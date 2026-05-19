import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- UPDATING TEST ENVIRONMENT ---');

  // 1. Configure System Settings for Test Mode, Mock SMTP, Webhook Secrets
  await prisma.systemSettings.update({
    where: { id: 'global' },
    data: {
      smtpHost: '127.0.0.1', // Local SMTP test server like mailpit/maildev
      smtpPort: 1025,
      smtpUser: 'mock_user',
      smtpPassword: 'mock_password',
      emailProvider: 'SMTP',
      isTestMode: true,
      yookassaTestShopId: '1155075',
      yookassaTestSecretKey: 'test_Bz5eSTzvWGA92wbksyOApJbxi-sfJ67LLgMTZSSOulA',
      cryptoBotToken: '123456789:TEST_CRYPTO_TOKEN',
      inboundEmailWebhookSecret: 'secret_inbound_123'
    }
  });
  console.log('✅ Settings updated: Mailtrap/Mailpit SMTP and Webhook secrets configured.');

  // 2. Update MockProvider URL to local mock endpoint
  await prisma.provider.update({
    where: { name: 'MockProvider' },
    data: {
      apiUrl: 'http://localhost:3000/api/dev/mock-provider'
    }
  });
  console.log('✅ MockProvider URL updated to localhost.');

  console.log('--- SETUP COMPLETE ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
