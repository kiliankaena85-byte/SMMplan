import { describe, it, expect, vi } from 'vitest';
import { KnowledgeRetrieverService } from '@/services/admin/ai-manual/knowledge-retriever.service';
import { AdminAiSanitizerService } from '@/services/admin/ai-manual/admin-ai-sanitizer.service';
import { GeminiClient } from '@/services/ai/gemini-client';

describe('Admin AI Manual Full Service Integration', () => {
  it('1. PII Sanitizer protects cards, phones, emails and tokens', () => {
    const raw = 'Клиент 4276 3800 1234 5678, тел +7 (999) 123-45-67, почта admin@smmplan.pro, key="secret123456789012"';
    const clean = AdminAiSanitizerService.sanitizeInput(raw);

    expect(clean).toContain('[CARD_REDACTED_...5678]');
    expect(clean).toContain('[PHONE_REDACTED]');
    expect(clean).toContain('@smmplan.pro');
    expect(clean).toContain('[REDACTED_SECRET]');
    expect(clean).not.toContain('4276');
    expect(clean).not.toContain('999');
    expect(clean).not.toContain('secret123456789012');
  });

  it('2. KnowledgeRetrieverService returns valid memory status', async () => {
    const status = await KnowledgeRetrieverService.getMemoryStatus();
    expect(status).toBeDefined();
    expect(status.mode).toMatch(/LIVE_DOCKER|OFFLINE_CACHE/);
    expect(status.vectorModel).toBeDefined();
    expect(typeof status.qdrantPointsCount).toBe('number');
  });

  it('3. KnowledgeRetrieverService retrieves relevant route context', async () => {
    const chunks = await KnowledgeRetrieverService.retrieveContext(
      'как настроить наценку для провайдера',
      '/admin/providers'
    );
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].title).toBeDefined();
    expect(chunks[0].content).toBeDefined();
    expect(chunks[0].score).toBeGreaterThan(0);
  });

  it('4. GeminiClient prioritizes gemini-3.8-flash model', async () => {
    const model = await GeminiClient.resolveLatestModel();
    expect(model).toBe('gemini-3.8-flash');
  });
});
