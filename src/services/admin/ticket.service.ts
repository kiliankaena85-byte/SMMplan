import { db } from '@/lib/db';
import { paginatedQuery, type PaginatedResult } from '@/lib/pagination';

// ── Types ──

type AdminTicketRow = {
  id: string;
  subject: string;
  status: string;
  source: string;
  updatedAt: Date;
  createdAt: Date;
  user: { id: string; email: string };
  _count: { messages: number };
  messages: { text: string; createdAt: Date; sender: string }[];
};

type TicketSearchParams = {
  page?: number;
  status?: string;
  source?: string;
  search?: string;
  pageSize?: number;
};

// ── Service ──

class AdminTicketService {

  /**
   * Paginated ticket list with filters.
   */
  async listTickets(params: TicketSearchParams): Promise<{ items: AdminTicketRow[], totalPages: number, page: number, totalCount: number }> {
    const where: Record<string, unknown> = {};

    if (params.status && params.status !== 'ALL') {
      where.status = params.status;
    }
    if (params.source && params.source !== 'ALL') {
      where.source = params.source;
    }
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { subject: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const pageSize = params.pageSize || 50;
    const page = params.page || 1;
    const skip = (page - 1) * pageSize;

    const [totalCount, items] = await Promise.all([
      db.ticket.count({ where }),
      db.ticket.findMany({
        where,
        take: pageSize,
        skip,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, email: true } },
          _count: { select: { messages: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      })
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      items: items as unknown as AdminTicketRow[],
      totalPages,
      page,
      totalCount
    };
  }

  /**
   * Close a ticket.
   */
  async closeTicket(ticketId: string) {
    await db.ticket.update({
      where: { id: ticketId },
      data: { status: 'CLOSED' },
    });
  }

  /**
   * Reopen a closed ticket.
   */
  async reopenTicket(ticketId: string) {
    await db.ticket.update({
      where: { id: ticketId },
      data: { status: 'OPEN' },
    });
  }

  /**
   * Ticket statistics for the header.
   */
  async getTicketStats() {
    const [total, open, pending, closed] = await Promise.all([
      db.ticket.count(),
      db.ticket.count({ where: { status: 'OPEN' } }),
      db.ticket.count({ where: { status: 'PENDING' } }),
      db.ticket.count({ where: { status: 'CLOSED' } }),
    ]);
    return { total, open, pending, closed };
  }

  /**
   * Get full ticket detail with messages and user profile (DTO-safe).
   */
  async getTicketDetails(ticketId: string) {
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            balance: true,
            totalSpent: true,
            createdAt: true,
            orders: {
              take: 3,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                status: true,
                quantity: true,
                charge: true,
                createdAt: true,
                service: { select: { name: true } },
              },
            },
            payments: {
              take: 3,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                amount: true,
                status: true,
                gateway: true,
                createdAt: true,
              },
            },
          },
        },
        messages: { 
          orderBy: { createdAt: 'asc' },
          include: { replyTo: true }
        },
      },
    });

    if (!ticket) return null;

    // Fetch 3 most recent historical closed tickets for Intercom Model
    const historicalTickets = await db.ticket.findMany({
      where: { userId: ticket.user.id, status: 'CLOSED', id: { not: ticket.id } },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' }, // Get newest first
          take: 15, // Limit to 15 per ticket to prevent DOM OOM
          include: { replyTo: true }
        }
      }
    });

    // Sort historical messages back to chronological order
    historicalTickets.forEach(t => {
      t.messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    });

    // Sort historical oldest first to prepend correctly
    historicalTickets.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Map Message DTO helper
    const mapMessage = (m: any, isHistorical = false, histTicketId?: string, histSubject?: string) => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      mediaUrl: m.mediaUrl,
      mediaType: m.mediaType,
      createdAt: m.createdAt.toISOString(),
      isDeleted: m.isDeleted,
      isEdited: m.isEdited,
      originalText: m.originalText,
      replyTo: m.replyTo ? {
        id: m.replyTo.id,
        text: m.replyTo.text,
        sender: m.replyTo.sender
      } : null,
      isHistorical,
      historicalTicketId: histTicketId,
      historicalSubject: histSubject
    });

    const stitchedMessages: any[] = [];
    
    // 1. Add historical messages
    for (const hist of historicalTickets) {
      if (hist.messages.length > 0) {
        stitchedMessages.push(...hist.messages.map(m => mapMessage(m, true, hist.id, hist.subject)));
      }
    }
    
    // 2. Add current ticket messages
    stitchedMessages.push(...ticket.messages.map(m => mapMessage(m)));

    return {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      source: ticket.source,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      user: {
        id: ticket.user.id,
        email: ticket.user.email,
        balance: ticket.user.balance,
        totalSpent: ticket.user.totalSpent,
        createdAt: ticket.user.createdAt.toISOString(),
        orders: ticket.user.orders.map(o => ({
          id: o.id,
          status: o.status,
          quantity: o.quantity,
          charge: o.charge,
          createdAt: o.createdAt.toISOString(),
          service: { name: o.service.name },
        })),
        payments: ticket.user.payments.map(p => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          gateway: p.gateway,
          createdAt: p.createdAt.toISOString(),
        })),
      },
      messages: stitchedMessages,
    };
  }
}

export const adminTicketService = new AdminTicketService();
