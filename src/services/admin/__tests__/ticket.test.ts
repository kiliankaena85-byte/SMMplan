import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { adminTicketService } from '../../admin/ticket.service';

vi.mock('@/lib/db', () => ({
  db: {
    ticket: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    }
  }
}));

describe('AdminTicketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTicketDetails', () => {
    it('should limit historical messages to 15 per ticket to prevent DOM freeze', async () => {
      // Mock current ticket
      const currentTicket = {
        id: 'ticket-current',
        userId: 'user-1',
        user: { 
          id: 'user-1',
          createdAt: new Date(),
          orders: [],
          payments: []
        },
        messages: []
      };

      // Mock historical tickets
      const histTicket1 = {
        id: 'hist-1',
        createdAt: new Date('2026-05-10T10:00:00Z'),
        messages: Array.from({ length: 50 }).map((_, i) => ({
          id: `hist-msg-${i}`,
          createdAt: new Date(`2026-05-10T10:0${i % 10}:00Z`)
        }))
      };

      vi.mocked(db.ticket.findUnique).mockResolvedValueOnce(currentTicket as any);
      vi.mocked(db.ticket.findMany).mockResolvedValueOnce([histTicket1] as any);

      await adminTicketService.getTicketDetails('ticket-current');

      // The key assertion: did we pass take: 15 to Prisma?
      expect(db.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            messages: expect.objectContaining({
              take: 15,
              orderBy: { createdAt: 'desc' }
            })
          })
        })
      );
    });

    it('should expose originalText for deleted messages to STAFF (Audit Visibility)', async () => {
      const mockMessage = {
        id: 'msg-deleted',
        sender: 'STAFF',
        text: 'This was deleted',
        isDeleted: true,
        originalText: 'Oops I said a bad word',
        createdAt: new Date()
      };

      const currentTicket = {
        id: 't-1',
        user: { 
          id: 'u-1',
          createdAt: new Date(),
          orders: [],
          payments: []
        },
        messages: [mockMessage]
      };

      vi.mocked(db.ticket.findUnique).mockResolvedValueOnce(currentTicket as any);
      vi.mocked(db.ticket.findMany).mockResolvedValueOnce([]);

      const result = await adminTicketService.getTicketDetails('t-1');
      
      expect(result).not.toBeNull();
      // Admin API must NOT censor originalText, because staff needs to see what was deleted
      expect(result!.messages[0].originalText).toBe('Oops I said a bad word');
      expect(result!.messages[0].isDeleted).toBe(true);
    });
  });
});
