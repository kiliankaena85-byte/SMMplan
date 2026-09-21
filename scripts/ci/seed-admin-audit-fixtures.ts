/**
 * (c) 2026 SMMplan & OmniSMM 1.0.
 * Deterministic Seed Script for Admin Panel Audit Harness & E2E Testing.
 *
 * Populates PostgreSQL database with fixed-CUID fixtures for dynamic routes:
 * - /admin/orders/[id]
 * - /admin/clients/[id]
 * - /admin/providers/[id]
 * - /admin/catalog/[id]
 * - /admin/tickets/[id]
 * - /admin/cms/[id]
 * - /admin/services/[id]/routing
 * - /admin/knowledge/[id]/edit
 * - /admin/finance/payments/[id]/dispute-pack
 */

import 'dotenv/config';
import { PrismaClient, OrderStatus, ArticleStatus } from '@prisma/client';
import { hashPassword } from '../../src/lib/auth/password';

export function resolveAuditDatabaseUrl(): string {
  let url = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5435/smmplan_lite?schema=public';
  if (url.includes('@db:5432') || url.includes('@db:')) {
    url = url.replace('@db:5432', '@127.0.0.1:5435').replace('@db:', '@127.0.0.1:5435');
  }
  return url;
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: resolveAuditDatabaseUrl(),
    },
  },
});

export const AUDIT_FIXTURES = {
  admin: {
    id: 'cuid_audit_admin_user_000000001',
    email: 'admin.audit@smmplan.pro',
    role: 'OWNER',
    tenantId: 'smmplan',
    passwordPlain: 'AuditMasterPass2026!',
  },
  client: {
    id: 'cuid_audit_client_user_00000001',
    email: 'client.audit@smmplan.pro',
    role: 'USER',
    tenantId: 'smmplan',
    balance: 1500000n, // 15,000.00 RUB in kopecks
    totalSpent: 500000n, // 5,000.00 RUB in kopecks
  },
  network: {
    id: 'cuid_audit_network_tg_000000001',
    name: 'Telegram (Audit)',
    slug: 'telegram-audit',
  },
  category: {
    id: 'cuid_audit_category_sub_0000001',
    name: 'Telegram Подписчики (Audit)',
    slug: 'telegram-subscribers-audit',
  },
  provider: {
    id: 'cuid_audit_provider_00000000001',
    name: 'Audit SMM Provider Prime',
    apiUrl: 'https://api.audit-provider.com/v2',
  },
  service: {
    id: 'cuid_audit_service_000000000001',
    numericId: 888801,
    name: 'Telegram Подписчики Реальные РФ (Гарантия)',
    slug: 'tg-subscribers-real-rf-audit',
  },
  route: {
    id: 'cuid_audit_route_0000000000001',
  },
  order: {
    id: 'cuid_audit_order_0000000000001',
    numericId: 888801,
  },
  ticket: {
    id: 'cuid_audit_ticket_000000000001',
  },
  ticketMessage: {
    id: 'cuid_audit_ticket_msg_00000001',
  },
  contentItem: {
    id: 'cuid_audit_content_000000000001',
    slug: 'audit-knowledge-article-2026',
  },
  article: {
    id: 'cuid_audit_article_000000000001',
    slug: 'audit-knowledge-base-article',
  },
  payment: {
    id: 'cuid_audit_payment_000000000001',
  },
  ledger: {
    id: 'cuid_audit_ledger_0000000000001',
  },
} as const;

export interface SeedAuditResult {
  adminUserId: string;
  clientUserId: string;
  orderId: string;
  providerId: string;
  serviceId: string;
  ticketId: string;
  paymentId: string;
  contentItemId: string;
  articleId: string;
  urls: {
    dashboard: string;
    ordersList: string;
    orderDetail: string;
    clientsList: string;
    clientDetail: string;
    providersList: string;
    providerDetail: string;
    catalogList: string;
    catalogDetail: string;
    serviceRouting: string;
    ticketsList: string;
    ticketDetail: string;
    cmsList: string;
    cmsDetail: string;
    knowledgeEdit: string;
    financeList: string;
    marketingList: string;
    paymentDisputePack: string;
    settingsList: string;
    staffList: string;
    systemFeatures: string;
  };
}

export async function seedAdminAuditFixtures(): Promise<SeedAuditResult> {
  console.log('🌱 Seeding deterministic admin audit fixtures with fixed CUIDs...');
  const passwordHash = await hashPassword(AUDIT_FIXTURES.admin.passwordPlain);

  // 1. Audit Admin User (OWNER context)
  await prisma.user.upsert({
    where: { id: AUDIT_FIXTURES.admin.id },
    update: {
      email: AUDIT_FIXTURES.admin.email,
      role: AUDIT_FIXTURES.admin.role,
      passwordHash,
      tenantId: AUDIT_FIXTURES.admin.tenantId,
      isActive: true,
      isDeleted: false,
    },
    create: {
      id: AUDIT_FIXTURES.admin.id,
      email: AUDIT_FIXTURES.admin.email,
      role: AUDIT_FIXTURES.admin.role,
      passwordHash,
      tenantId: AUDIT_FIXTURES.admin.tenantId,
      isActive: true,
      isDeleted: false,
      balance: 10000000n, // 100,000.00 RUB
    },
  });

  // 2. Audit Client User
  await prisma.user.upsert({
    where: { id: AUDIT_FIXTURES.client.id },
    update: {
      email: AUDIT_FIXTURES.client.email,
      role: AUDIT_FIXTURES.client.role,
      tenantId: AUDIT_FIXTURES.client.tenantId,
      isActive: true,
      isDeleted: false,
      balance: AUDIT_FIXTURES.client.balance,
      totalSpent: AUDIT_FIXTURES.client.totalSpent,
    },
    create: {
      id: AUDIT_FIXTURES.client.id,
      email: AUDIT_FIXTURES.client.email,
      role: AUDIT_FIXTURES.client.role,
      passwordHash,
      tenantId: AUDIT_FIXTURES.client.tenantId,
      isActive: true,
      isDeleted: false,
      balance: AUDIT_FIXTURES.client.balance,
      totalSpent: AUDIT_FIXTURES.client.totalSpent,
    },
  });

  // 3. Network
  await prisma.network.upsert({
    where: { id: AUDIT_FIXTURES.network.id },
    update: {
      name: AUDIT_FIXTURES.network.name,
      slug: AUDIT_FIXTURES.network.slug,
      isActive: true,
    },
    create: {
      id: AUDIT_FIXTURES.network.id,
      name: AUDIT_FIXTURES.network.name,
      slug: AUDIT_FIXTURES.network.slug,
      sort: 1,
      isActive: true,
    },
  });

  // 4. Category
  await prisma.category.upsert({
    where: { id: AUDIT_FIXTURES.category.id },
    update: {
      name: AUDIT_FIXTURES.category.name,
      slug: AUDIT_FIXTURES.category.slug,
      network: { connect: { id: AUDIT_FIXTURES.network.id } },
    },
    create: {
      id: AUDIT_FIXTURES.category.id,
      name: AUDIT_FIXTURES.category.name,
      slug: AUDIT_FIXTURES.category.slug,
      network: { connect: { id: AUDIT_FIXTURES.network.id } },
      sort: 1,
    },
  });

  // 5. Provider
  await prisma.provider.upsert({
    where: { id: AUDIT_FIXTURES.provider.id },
    update: {
      name: AUDIT_FIXTURES.provider.name,
      apiUrl: AUDIT_FIXTURES.provider.apiUrl,
      isActive: true,
      balanceCurrency: 'RUB',
    },
    create: {
      id: AUDIT_FIXTURES.provider.id,
      name: AUDIT_FIXTURES.provider.name,
      apiUrl: AUDIT_FIXTURES.provider.apiUrl,
      apiKey: 'enc:audit-test-key-12345',
      isActive: true,
      providerType: 'SMM_PANEL',
      balanceCurrency: 'RUB',
    },
  });

  // 6. Service
  await prisma.service.upsert({
    where: { id: AUDIT_FIXTURES.service.id },
    update: {
      name: AUDIT_FIXTURES.service.name,
      category: { connect: { id: AUDIT_FIXTURES.category.id } },
      provider: { connect: { id: AUDIT_FIXTURES.provider.id } },
      externalId: '101',
      rate: 150.0,
      providerCurrency: 'RUB',
      costPer1kRub: 150.0,
      minQty: 100,
      maxQty: 50000,
      markup: 2.0,
      targetType: 'CHANNEL',
      qualityTier: 'STANDARD',
      isActive: true,
      tenantId: 'smmplan',
      slug: AUDIT_FIXTURES.service.slug,
    },
    create: {
      id: AUDIT_FIXTURES.service.id,
      numericId: AUDIT_FIXTURES.service.numericId,
      name: AUDIT_FIXTURES.service.name,
      category: { connect: { id: AUDIT_FIXTURES.category.id } },
      provider: { connect: { id: AUDIT_FIXTURES.provider.id } },
      externalId: '101',
      rate: 150.0,
      providerCurrency: 'RUB',
      costPer1kRub: 150.0,
      minQty: 100,
      maxQty: 50000,
      markup: 2.0,
      targetType: 'CHANNEL',
      qualityTier: 'STANDARD',
      isActive: true,
      tenantId: 'smmplan',
      slug: AUDIT_FIXTURES.service.slug,
    },
  });

  // 7. Service Route (Hot-swap & failover routing)
  await prisma.serviceRoute.upsert({
    where: {
      serviceId_providerId: {
        serviceId: AUDIT_FIXTURES.service.id,
        providerId: AUDIT_FIXTURES.provider.id,
      },
    },
    update: {
      providerServiceId: '101',
      isPrimary: true,
      isActive: true,
      priority: 1,
    },
    create: {
      id: AUDIT_FIXTURES.route.id,
      service: { connect: { id: AUDIT_FIXTURES.service.id } },
      provider: { connect: { id: AUDIT_FIXTURES.provider.id } },
      providerServiceId: '101',
      isPrimary: true,
      isActive: true,
      priority: 1,
      failoverMode: 'manual',
    },
  });

  // 8. Order
  await prisma.order.upsert({
    where: { id: AUDIT_FIXTURES.order.id },
    update: {
      user: { connect: { id: AUDIT_FIXTURES.client.id } },
      service: { connect: { id: AUDIT_FIXTURES.service.id } },
      provider: { connect: { id: AUDIT_FIXTURES.provider.id } },
      link: 'https://t.me/audit_channel_test',
      quantity: 1000,
      status: OrderStatus.IN_PROGRESS,
      remains: 500,
      startCount: 120,
      charge: 30000n, // 300.00 RUB
      providerCost: 15000n, // 150.00 RUB
      environmentMode: 'PRODUCTION',
    },
    create: {
      id: AUDIT_FIXTURES.order.id,
      numericId: AUDIT_FIXTURES.order.numericId,
      user: { connect: { id: AUDIT_FIXTURES.client.id } },
      service: { connect: { id: AUDIT_FIXTURES.service.id } },
      provider: { connect: { id: AUDIT_FIXTURES.provider.id } },
      link: 'https://t.me/audit_channel_test',
      quantity: 1000,
      status: OrderStatus.IN_PROGRESS,
      remains: 500,
      startCount: 120,
      charge: BigInt(30000),
      providerCost: BigInt(15000),
      environmentMode: 'PRODUCTION',
    },
  });

  // 9. Ticket & Message
  await prisma.ticket.upsert({
    where: { id: AUDIT_FIXTURES.ticket.id },
    update: {
      subject: 'Проверка скорости выполнения заказа #888801',
      status: 'OPEN',
      order: { connect: { id: AUDIT_FIXTURES.order.id } },
      tenantId: 'smmplan',
    },
    create: {
      id: AUDIT_FIXTURES.ticket.id,
      user: { connect: { id: AUDIT_FIXTURES.client.id } },
      subject: 'Проверка скорости выполнения заказа #888801',
      status: 'OPEN',
      source: 'WEB',
      order: { connect: { id: AUDIT_FIXTURES.order.id } },
      tenantId: 'smmplan',
    },
  });

  await prisma.ticketMessage.upsert({
    where: { id: AUDIT_FIXTURES.ticketMessage.id },
    update: {
      text: 'Здравствуйте, проверьте пожалуйста скорость докрутки заказа #888801.',
    },
    create: {
      id: AUDIT_FIXTURES.ticketMessage.id,
      ticket: { connect: { id: AUDIT_FIXTURES.ticket.id } },
      sender: 'USER',
      text: 'Здравствуйте, проверьте пожалуйста скорость докрутки заказа #888801.',
    },
  });

  // 10. ContentItem (CMS)
  await prisma.contentItem.upsert({
    where: { id: AUDIT_FIXTURES.contentItem.id },
    update: {
      title: 'Безопасное масштабирование Telegram-каналов в 2026 году',
      slug: AUDIT_FIXTURES.contentItem.slug,
      isPublished: true,
    },
    create: {
      id: AUDIT_FIXTURES.contentItem.id,
      slug: AUDIT_FIXTURES.contentItem.slug,
      title: 'Безопасное масштабирование Telegram-каналов в 2026 году',
      type: 'PAGE',
      isPublished: true,
      excerpt: 'Комплексное руководство по безопасным методам привлечения аудитории.',
      contentJson: JSON.stringify({
        blocks: [{ type: 'paragraph', data: { text: 'Безопасность продвижения каналов основывается на плавных алгоритмах.' } }],
      }),
    },
  });

  // 11. Article (Knowledge Base)
  await prisma.article.upsert({
    where: { id: AUDIT_FIXTURES.article.id },
    update: {
      title: 'Политика возвратов и гарантийного обслуживания',
      slug: AUDIT_FIXTURES.article.slug,
      status: ArticleStatus.PUBLISHED,
    },
    create: {
      id: AUDIT_FIXTURES.article.id,
      slug: AUDIT_FIXTURES.article.slug,
      title: 'Политика возвратов и гарантийного обслуживания',
      description: 'Официальный регламент рассмотрения обращений клиентов по возвратам.',
      content: 'Все заявки на возврат средств рассматриваются в течение 24 часов в соответствии с регламентом.',
      status: ArticleStatus.PUBLISHED,
      category: 'Финансы',
    },
  });

  // 12. Payment
  await prisma.payment.upsert({
    where: { id: AUDIT_FIXTURES.payment.id },
    update: {
      amount: BigInt(150000), // 1500.00 RUB
      status: 'SUCCEEDED',
      tenantId: 'smmplan',
      user: { connect: { id: AUDIT_FIXTURES.client.id } },
    },
    create: {
      id: AUDIT_FIXTURES.payment.id,
      user: { connect: { id: AUDIT_FIXTURES.client.id } },
      amount: BigInt(150000),
      currency: 'RUB',
      status: 'SUCCEEDED',
      gateway: 'yookassa',
      gatewayId: 'audit-yk-payment-99901',
      tenantId: 'smmplan',
    },
  });

  // 13. LedgerEntry (Strictly append-only & immutable in PostgreSQL)
  const existingLedger = await prisma.ledgerEntry.findUnique({
    where: { id: AUDIT_FIXTURES.ledger.id },
  });

  if (!existingLedger) {
    await prisma.ledgerEntry.create({
      data: {
        id: AUDIT_FIXTURES.ledger.id,
        user: { connect: { id: AUDIT_FIXTURES.client.id } },
        amount: AUDIT_FIXTURES.client.balance,
        reason: 'Тестовое пополнение баланса для аудита',
        status: 'APPROVED',
        transactionType: 'PAYMENT',
        tenantId: 'smmplan',
        idempotencyKey: 'audit-seed-ledger-001',
      },
    });
  }

  const existingAdminLedger = await prisma.ledgerEntry.findFirst({
    where: { idempotencyKey: 'audit-seed-admin-ledger-001' },
  });

  if (!existingAdminLedger) {
    await prisma.ledgerEntry.create({
      data: {
        userId: AUDIT_FIXTURES.admin.id,
        amount: 10000000n,
        reason: 'Audit fixture initial admin reserve allocation',
        status: 'APPROVED',
        transactionType: 'PAYMENT',
        tenantId: 'smmplan',
        idempotencyKey: 'audit-seed-admin-ledger-001',
      },
    });
  }

  console.log('✅ Deterministic fixtures successfully seeded.');

  const result: SeedAuditResult = {
    adminUserId: AUDIT_FIXTURES.admin.id,
    clientUserId: AUDIT_FIXTURES.client.id,
    orderId: AUDIT_FIXTURES.order.id,
    providerId: AUDIT_FIXTURES.provider.id,
    serviceId: AUDIT_FIXTURES.service.id,
    ticketId: AUDIT_FIXTURES.ticket.id,
    paymentId: AUDIT_FIXTURES.payment.id,
    contentItemId: AUDIT_FIXTURES.contentItem.id,
    articleId: AUDIT_FIXTURES.article.id,
    urls: {
      dashboard: '/admin/dashboard',
      ordersList: '/admin/orders',
      orderDetail: `/admin/orders/${AUDIT_FIXTURES.order.id}`,
      clientsList: '/admin/clients',
      clientDetail: `/admin/clients/${AUDIT_FIXTURES.client.id}`,
      providersList: '/admin/providers',
      providerDetail: `/admin/providers/${AUDIT_FIXTURES.provider.id}`,
      catalogList: '/admin/catalog',
      catalogDetail: `/admin/catalog/${AUDIT_FIXTURES.service.id}`,
      serviceRouting: `/admin/services/${AUDIT_FIXTURES.service.id}/routing`,
      ticketsList: '/admin/tickets',
      ticketDetail: `/admin/tickets/${AUDIT_FIXTURES.ticket.id}`,
      cmsList: '/admin/cms',
      cmsDetail: `/admin/cms/${AUDIT_FIXTURES.contentItem.id}`,
      knowledgeEdit: `/admin/knowledge/${AUDIT_FIXTURES.article.id}/edit`,
      financeList: '/admin/finance',
      marketingList: '/admin/marketing',
      paymentDisputePack: `/admin/finance/payments/${AUDIT_FIXTURES.payment.id}/dispute-pack`,
      settingsList: '/admin/settings',
      staffList: '/admin/staff',
      systemFeatures: '/admin/system/features',
    },
  };

  return result;
}

if (require.main === module) {
  seedAdminAuditFixtures()
    .then((res) => {
      console.log('\n📋 Seeded Admin Route Manifest:');
      for (const [key, url] of Object.entries(res.urls)) {
        console.log(`   - ${key.padEnd(20)}: ${url}`);
      }
    })
    .catch((err) => {
      console.error('❌ Failed seeding fixtures:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
