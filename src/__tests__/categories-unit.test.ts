import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1).max(255, "Category name too long"),
  networkId: z.string().min(1, "Network ID required"),
  sort: z.coerce.number().int().default(0),
  tenantId: z.string().optional().nullable(),
  activityType: z.string().optional().nullable(),
  requireWarning: z.coerce.boolean().default(false),
  warningMessage: z.string().max(1000, "Предупреждение слишком длинное").optional().nullable(),
  analyzerTags: z.string().max(255).optional().nullable()
});

describe('Category Architecture & Multi-Tenant Validation Unit Tests', () => {
  it('validates a complete category payload with tenantId', () => {
    const raw = {
      name: 'Telegram Реакции Премиум',
      networkId: 'net_tg_123',
      sort: 5,
      tenantId: 'flux',
      activityType: 'REACTIONS',
      requireWarning: true,
      warningMessage: 'Канал должен быть публичным',
      analyzerTags: 'channel,post'
    };

    const parsed = categorySchema.parse(raw);
    expect(parsed.name).toBe('Telegram Реакции Премиум');
    expect(parsed.tenantId).toBe('flux');
    expect(parsed.requireWarning).toBe(true);
    expect(parsed.analyzerTags).toBe('channel,post');
  });

  it('defaults sort to 0 and handles optional nullable fields', () => {
    const raw = {
      name: 'VK Подписчики',
      networkId: 'net_vk_456'
    };

    const parsed = categorySchema.parse(raw);
    expect(parsed.sort).toBe(0);
    expect(parsed.requireWarning).toBe(false);
    expect(parsed.tenantId).toBeUndefined();
  });

  it('rejects empty category name or missing networkId', () => {
    expect(() => categorySchema.parse({ name: '', networkId: 'net_1' })).toThrow();
    expect(() => categorySchema.parse({ name: 'Valid', networkId: '' })).toThrow();
  });
});
