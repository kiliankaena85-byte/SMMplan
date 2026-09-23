import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const db = new PrismaClient();

async function main() {
  const email = 'nikita8888@inbox.ru';
  const tenantId = 'smmplan';

  const user = await db.user.findFirst({
    where: { email, tenantId },
  });

  if (!user) {
    throw new Error(`Пользователь ${email} не найден!`);
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours TTL for convenience

  await db.authToken.create({
    data: {
      userId: user.id,
      token: hashedToken,
      tenantId,
      expiresAt,
      ipIssued: '127.0.0.1',
      userAgentIssued: 'Manual CLI Generator',
    },
  });

  const localLink = `http://localhost:3000/api/auth/verify?token=${rawToken}&redirect=/admin/dashboard`;
  const tunnelLink = `https://desktop-25m6el7.tailbb9d28.ts.net/api/auth/verify?token=${rawToken}&redirect=/admin/dashboard`;
  const fluxLocalLink = `http://localhost:3000/api/auth/verify?token=${rawToken}&redirect=/dashboard?tenant=flux&tenant=flux`;

  console.log('==================================================');
  console.log('       👑 СВЕЖАЯ ПРЯМАЯ ССЫЛКА ДЛЯ ВХОДА ВЛАДЕЛЬЦА');
  console.log('==================================================');
  console.log(`Пользователь: ${user.email} (${user.role}, tenant: ${user.tenantId})`);
  console.log(`Действительна до: ${expiresAt.toLocaleString('ru-RU')}`);
  console.log('\n[1] ЛОКАЛЬНЫЙ ВХОД В АДМИНКУ (localhost:3000):');
  console.log(localLink);
  console.log('\n[2] ВНЕШНИЙ ВХОД ЧЕРЕЗ ОФИЦИАЛЬНЫЙ ТУННЕЛЬ (Tailscale Funnel):');
  console.log(tunnelLink);
  console.log('\n[3] ВХОД НА SMMFLUX:');
  console.log(fluxLocalLink);
  console.log('==================================================\n');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
