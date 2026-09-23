import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ticketService } from '@/services/support/ticket.service';
import { resolveTenantFromHeaders, resolveTenantIdFromHeaders } from '@/lib/tenant-resolver-edge';
import { SettingsProvider } from '@/lib/settings';

interface MockTicketRecord {
  id: string;
  userId: string;
  subject: string;
  source: string;
  status: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    email: string;
    tenantId: string;
    telegramId?: string | null;
  };
  messages?: Array<{
    id: string;
    sender: string;
    text: string;
    createdAt: Date;
  }>;
}

interface MockUserRecord {
  id: string;
  tenantId: string;
  email: string;
}

const mockUsers: MockUserRecord[] = [
  { id: 'usr-plan-1', tenantId: 'smmplan', email: 'plan@smmplan.pro' },
  { id: 'usr-flux-1', tenantId: 'flux', email: 'flux@smmflux.ru' },
];

let mockTickets: MockTicketRecord[] = [];

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: {
          findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => {
            const u = mockUsers.find(user => user.id === where.id);
            if (!u) throw new Error('User not found');
            return u;
          }),
        },
        ticket: {
          findFirst: vi.fn(async ({ where }: { where: { userId: string; tenantId?: string; status?: { not?: string } } }) => {
            return mockTickets.find(t => {
              if (t.userId !== where.userId) return false;
              if (where.tenantId && t.tenantId !== where.tenantId) return false;
              if (where.status?.not && t.status === where.status.not) return false;
              return true;
            }) || null;
          }),
          create: vi.fn(async ({ data }: { data: { userId: string; subject: string; source: string; tenantId: string } }) => {
            const created: MockTicketRecord = {
              id: `tkt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              ...data,
              status: 'OPEN',
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            mockTickets.push(created);
            return created;
          }),
        },
      };
      return cb(tx);
    }),
    ticket: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const t = mockTickets.find(item => item.id === where.id);
        if (!t) return null;
        const u = mockUsers.find(user => user.id === t.userId);
        return {
          ...t,
          user: u ? { ...u, telegramId: null } : { id: t.userId, email: 'unknown@test.com', tenantId: t.tenantId, telegramId: null },
        };
      }),
      findMany: vi.fn(async ({ where }: { where: { userId?: string; tenantId?: string; status?: string } }) => {
        return mockTickets.filter(t => {
          if (where.userId && t.userId !== where.userId) return false;
          if (where.tenantId && t.tenantId !== where.tenantId) return false;
          if (where.status && t.status !== where.status) return false;
          return true;
        });
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { status?: string } }) => {
        const t = mockTickets.find(item => item.id === where.id);
        if (t && data.status) t.status = data.status;
        return t;
      }),
    },
    ticketMessage: {
      create: vi.fn(async ({ data }: { data: { ticketId: string; sender: string; text: string } }) => {
        const t = mockTickets.find(item => item.id === data.ticketId);
        const u = t ? mockUsers.find(user => user.id === t.userId) : null;
        const msg = {
          id: `msg-${Date.now()}`,
          ticketId: data.ticketId,
          sender: data.sender,
          text: data.text,
          createdAt: new Date(),
          ticket: {
            id: data.ticketId,
            subject: t?.subject || 'Support',
            tenantId: t?.tenantId || 'smmplan',
            user: u || { id: 'usr-default', email: 'test@example.com', tenantId: 'smmplan', telegramId: null },
          },
        };
        return msg;
      }),
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
    },
  },
}));

vi.mock('@/lib/settings', () => ({
  SettingsProvider: {
    getSupportEmailDomain: vi.fn(async (tenantId?: string) => {
      return tenantId === 'flux' ? 'smmflux.ru' : 'smmplan.pro';
    }),
    getContactAndLegalSettings: vi.fn(async (tenantId?: string) => {
      return tenantId === 'flux'
        ? { COMPANY_NAME: 'SMMflux' }
        : { COMPANY_NAME: 'SMMplan' };
    }),
  },
}));

vi.mock('@/lib/smtp', () => ({
  sendMail: vi.fn().mockResolvedValue(true),
  sendTicketCreatedMail: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/services/support/sse.service', () => ({
  publishMessageSSE: vi.fn().mockResolvedValue(undefined),
}));

describe('VULN-02: Support Tickets Multi-Tenant Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTickets = [];
  });

  describe('Tenant Resolution from Headers', () => {
    it('resolves canonical flux tenant from x-tenant-id header', () => {
      const h1 = new Headers({ 'x-tenant-id': 'flux' });
      expect(resolveTenantFromHeaders(h1)).toBe('flux');
      expect(resolveTenantIdFromHeaders(h1)).toBe('flux');

      const h2 = new Headers({ 'x-tenant-id': 'lovable' });
      expect(resolveTenantFromHeaders(h2)).toBe('flux');

      const h3 = new Headers({ 'x-tenant-id': 'smmflux' });
      expect(resolveTenantFromHeaders(h3)).toBe('flux');
    });

    it('resolves smmplan tenant from x-tenant-id header or defaults', () => {
      const h1 = new Headers({ 'x-tenant-id': 'smmplan' });
      expect(resolveTenantFromHeaders(h1)).toBe('smmplan');

      const hEmpty = new Headers();
      expect(resolveTenantFromHeaders(hEmpty)).toBe('smmplan');
    });

    it('resolves tenant from host when x-tenant-id is omitted', () => {
      const hFlux = new Headers({ host: 'smmflux.ru' });
      expect(resolveTenantFromHeaders(hFlux)).toBe('flux');

      const hPlan = new Headers({ host: 'smmplan.pro' });
      expect(resolveTenantFromHeaders(hPlan)).toBe('smmplan');
    });
  });

  describe('ticketService.getOrCreateTicket Multi-Tenant Partitioning', () => {
    it('creates and separates tickets for smmplan and flux for the same user', async () => {
      // 1. Create ticket on smmplan
      const ticketPlan = await ticketService.getOrCreateTicket(
        'usr-plan-1',
        'Помощь smmplan',
        'WEB',
        'smmplan'
      );
      expect(ticketPlan).toBeDefined();
      expect(ticketPlan.tenantId).toBe('smmplan');

      // 2. Request ticket for the same user on flux
      const ticketFlux = await ticketService.getOrCreateTicket(
        'usr-plan-1',
        'Помощь flux',
        'WEB',
        'flux'
      );
      expect(ticketFlux).toBeDefined();
      expect(ticketFlux.tenantId).toBe('flux');

      // Crucial: They must be two distinct tickets, not cross-pollinated
      expect(ticketPlan.id).not.toBe(ticketFlux.id);

      // 3. Requesting smmplan again must reuse ticketPlan, not ticketFlux
      const ticketPlanReused = await ticketService.getOrCreateTicket(
        'usr-plan-1',
        'Помощь smmplan',
        'WEB',
        'smmplan'
      );
      expect(ticketPlanReused.id).toBe(ticketPlan.id);

      // 4. Requesting flux again must reuse ticketFlux
      const ticketFluxReused = await ticketService.getOrCreateTicket(
        'usr-plan-1',
        'Помощь flux',
        'WEB',
        'flux'
      );
      expect(ticketFluxReused.id).toBe(ticketFlux.id);
    });

    it('normalizes legacy tenant aliases to canonical flux', async () => {
      const ticketLovable = await ticketService.getOrCreateTicket(
        'usr-flux-1',
        'Чат поддержки',
        'WEB',
        'lovable'
      );
      expect(ticketLovable.tenantId).toBe('flux');

      const ticketSmmflux = await ticketService.getOrCreateTicket(
        'usr-flux-1',
        'Чат поддержки 2',
        'WEB',
        'smmflux'
      );
      // Both map to flux, so the open ticket should be reused
      expect(ticketSmmflux.id).toBe(ticketLovable.id);
      expect(ticketSmmflux.tenantId).toBe('flux');
    });
  });

  describe('addMessage Omnichannel Email Notification Tenant Isolation', () => {
    it('passes ticket tenant to SettingsProvider when sending staff replies', async () => {
      // Create flux ticket
      const ticketFlux = await ticketService.getOrCreateTicket(
        'usr-flux-1',
        'Вопрос по балансу',
        'WEB',
        'flux'
      );

      // Staff replies
      await ticketService.addMessage({
        ticketId: ticketFlux.id,
        sender: 'STAFF',
        text: 'Здравствуйте! Проверяем ваш платёж.',
      });

      // Assert SettingsProvider was called with flux tenant
      expect(SettingsProvider.getSupportEmailDomain).toHaveBeenCalledWith('flux');
      expect(SettingsProvider.getContactAndLegalSettings).toHaveBeenCalledWith('flux');
    });
  });
});
