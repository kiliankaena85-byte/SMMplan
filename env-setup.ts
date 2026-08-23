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
      yookassaTestShopId: process.env.YOOKASSA_TEST_SHOP_ID || '1155075',
      yookassaTestSecretKey: process.env.YOOKASSA_TEST_SECRET_KEY || 'test_mock_secret_key',
      cryptoBotToken: process.env.CRYPTOBOT_TEST_TOKEN || '123456789:TEST_CRYPTO_TOKEN',
      inboundEmailWebhookSecret: process.env.INBOUND_EMAIL_WEBHOOK_SECRET || 'secret_inbound_123'
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
