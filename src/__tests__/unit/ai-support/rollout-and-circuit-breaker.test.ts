import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiAgentOrchestratorService } from '@/services/support/ai/ai-agent-orchestrator.service';
import { db } from '@/lib/db';
import { redis } from '@/lib/redis';
import { GeminiClient } from '@/services/ai/gemini-client';

vi.mock('@/lib/db', () => ({
  db: {
    ticket: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: 'ticket-1' }),
    },
    ticketMessage: {
      create: vi.fn().mockResolvedValue({ id: 'msg-1' }),
    },
    systemSettings: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    user: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  },
}));

vi.mock('@/services/ai/gemini-client', () => ({
  GeminiClient: {
    generateContent: vi.fn(),
  },
}));

describe('AiAgentOrchestrator (Rollout, Circuit Breaker & Takeover)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Rollout DISABLED
  it('blocks all users when mode is DISABLED', () => {
    const allowed = AiAgentOrchestratorService.checkRolloutAccess('test@smmplan.pro', 'DISABLED', ['test@smmplan.pro']);
    expect(allowed).toBe(false);
  });

  // 2. Rollout WHITELIST_ONLY
  it('allows ONLY whitelisted users in WHITELIST_ONLY mode', () => {
    const whitelist = ['qa.tester@smmplan.pro', 'owner@smmplan.pro'];

    expect(AiAgentOrchestratorService.checkRolloutAccess('qa.tester@smmplan.pro', 'WHITELIST_ONLY', whitelist)).toBe(true);
    expect(AiAgentOrchestratorService.checkRolloutAccess('random.client@gmail.com', 'WHITELIST_ONLY', whitelist)).toBe(false);
  });

  // 3. Rollout CANARY
  it('deterministically segments users in CANARY mode', () => {
    const email1 = 'client100@mail.ru';
    const email2 = 'client999@mail.ru';

    const res1a = AiAgentOrchestratorService.isCanaryAllowed(email1, 20);
    const res1b = AiAgentOrchestratorService.isCanaryAllowed(email1, 20);
    expect(res1a).toBe(res1b); // Deterministic!

    // Verify 0% and 100% bounds
    expect(AiAgentOrchestratorService.isCanaryAllowed(email2, 0)).toBe(false);
    expect(AiAgentOrchestratorService.isCanaryAllowed(email2, 100)).toBe(true);
  });

  // 4. Rollout ALL_USERS
  it('allows all users in ALL_USERS mode', () => {
    expect(AiAgentOrchestratorService.checkRolloutAccess('anyone@domain.com', 'ALL_USERS')).toBe(true);
  });

  // 5. Quota Circuit Breaker Trigger on 429
  it('trips circuit breaker and falls back to operator on Gemini 429 error', async () => {
    (db.ticket.findUnique as any).mockResolvedValue({
      id: 'ticket-429',
      tenantId: 'smmplan',
      user: { id: 'u1', email: 'test@smmplan.pro' },
    });

    process.env.AI_SUPPORT_MODE = 'ALL_USERS';

    // Gemini returns 429 Resource Exhausted
    (GeminiClient.generateContent as any).mockRejectedValue({
      status: 429,
      message: 'RESOURCE_EXHAUSTED: Quota exceeded for gemini-flash',
    });

    const result = await AiAgentOrchestratorService.processTicketMessage('ticket-429', 'Здравствуйте, где мой заказ?');

    expect(result.actionTaken).toBe('QUOTA_FALLBACK');
    expect(result.reason).toBe('429_QUOTA_EXHAUSTED');
    expect(redis.set).toHaveBeenCalledWith(
      'circuit:ai:quota_exhausted:smmplan',
      'true',
      'EX',
      900
    );
    expect(db.ticket.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'ticket-429' },
      data: expect.objectContaining({ status: 'OPEN' }),
    }));
  });

  // 6. Operator Takeover
  it('records operator takeover in audit log and tags ticket', async () => {
    const success = await AiAgentOrchestratorService.takeoverTicket('ticket-100', 'operator@smmplan.pro');

    expect(success).toBe(true);
    expect(db.ticket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-100' },
      data: { tags: { push: ['MANUAL_TAKEOVER'] } },
    });
    expect(db.ticketMessage.create).toHaveBeenCalledWith({
      data: {
        ticketId: 'ticket-100',
        sender: 'INTERNAL',
        text: expect.stringContaining('Оператор operator@smmplan.pro перехватил диалог'),
      },
    });
  });
});
