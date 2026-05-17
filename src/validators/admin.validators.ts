import { z } from 'zod';

// Users / Finance
export const updateBalanceSchema = z.object({
  userId: z.string().min(1),
  amount: z.coerce.number().int(),
  reason: z.string().min(1)
});

export const userIdSchema = z.object({
  userId: z.string().min(1)
});

const entryIdSchema = z.object({
  entryId: z.string().min(1)
});

// Catalog
export const updateMarkupSchema = z.object({
  serviceId: z.string().min(1),
  markup: z.coerce.number()
});

export const toggleServiceSchema = z.object({
  serviceId: z.string().min(1),
  isActive: z.any().transform(val => val === 'true' || val === 'on')
});

export const bulkUpdateMarkupSchema = z.object({
  categoryId: z.string().nullable().optional(),
  platform: z.string().nullable().optional(),
  markup: z.coerce.number().min(0).max(151.0)
});

// Settings
export const roleSchema = z.object({
  userId: z.string().min(1),
  role: z.string().min(1),
});

export const globalSettingsSchema = z.object({
  maintenanceMode: z.any().transform((val) => val === 'true' || val === 'on'),
  siteName: z.any().transform((v) => (typeof v === 'string' && v.trim() ? v : 'Smmplan')),
  siteDescription: z.any().transform((v) => (typeof v === 'string' ? v : '')),
  welcomeMessage: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
  yookassaShopId: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
  yookassaSecretKey: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
  yookassaTestShopId: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
  yookassaTestSecretKey: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
  cryptoBotToken: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
  exchangeRateUSD: z.coerce.number().min(0).optional(),
  smtpHost: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
  smtpPort: z.coerce.number().int().optional().default(465),
  smtpUser: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
  smtpPassword: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
  supportEmailDomain: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
  contactSupportEmail: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
  contactPrivacyEmail: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
  contactTelegramBot: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
  contactTelegramChannel: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
  contactWhatsApp: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
  contactVk: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
  legalCompanyName: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
  legalCompanyInn: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
  legalCompanyOgrnip: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
  legalCompanyAddress: z.any().transform((v) => (typeof v === 'string' && v ? v : null)),
});

// Orders
export const orderIdSchema = z.object({
  orderId: z.string().min(1),
});
