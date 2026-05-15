import { db } from '@/lib/db';
import { sendMail } from '@/lib/smtp';

class TicketService {
  async getOrCreateTicket(userId: string, subject: string) {
    const existing = await db.ticket.findFirst({
      where: { userId, status: { not: 'CLOSED' } },
      orderBy: { updatedAt: 'desc' }
    });

    if (existing) return existing;

    return db.ticket.create({
      data: { userId, subject }
    });
  }

  async addMessage(ticketId: string, sender: 'USER' | 'STAFF' | 'INTERNAL', text: string, mediaUrl?: string, mediaType?: string, replyToId?: string) {
    let telegramMsgId: string | undefined = undefined;
    
    // Fetch ticket and user info beforehand for Telegram sending
    const ticketToUpdate = await db.ticket.findUnique({ 
      where: { id: ticketId }, 
      include: { user: true } 
    });

    if (!ticketToUpdate) throw new Error('Ticket not found');

    if (sender === 'STAFF' && ticketToUpdate.user.telegramId) {
      try {
        const { supportBotService } = await import('@/services/support/support-bot.service');
        
        // Find the telegramMsgId of the replied message, if any
        let replyToTgMsgId: string | undefined = undefined;
        if (replyToId) {
          const repliedMsg = await db.ticketMessage.findUnique({ where: { id: replyToId } });
          if (repliedMsg?.telegramMsgId) replyToTgMsgId = repliedMsg.telegramMsgId;
        }

        const tgId = await supportBotService.sendSupportReply(ticketToUpdate.user.telegramId, text, replyToTgMsgId);
        if (tgId) telegramMsgId = tgId;
      } catch (e) {
        console.error('[TicketService] Error sending to telegram:', e);
      }
    }

    const message = await db.ticketMessage.create({
      data: { ticketId, sender, text, mediaUrl, mediaType, replyToId, telegramMsgId },
      include: {
        ticket: { include: { user: true } }
      }
    });

    await db.ticket.update({
      where: { id: ticketId },
      data: { 
        status: sender === 'STAFF' ? 'PENDING' : 'OPEN',
        ...(sender === 'STAFF' && !ticketToUpdate.firstRespondedAt ? { firstRespondedAt: new Date() } : {})
      }
    });

    // Notify user if STAFF replied and NO telegram ID exists (Fallback to Email)
    if (sender === 'STAFF' && message.ticket.user.email && !message.ticket.user.telegramId) {
      const isGuest = message.ticket.source === 'EMAIL';
      const actionText = isGuest 
        ? `<p style="color: #64748b; font-size: 14px;">Для ответа на это сообщение, просто напишите ответное письмо.</p>`
        : `<p style="color: #64748b; font-size: 14px;">Пожалуйста, войдите в панель управления (Dashboard), чтобы ответить.</p>`;

      const replyToAddress = `support+${message.ticket.id}@smmplan.ru`;

      void sendMail(message.ticket.user.email, `Support Reply: ${message.ticket.subject}`, `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
          <h2 style="color: #4f46e5;">Новое сообщение от поддержки Smmplan</h2>
          <p><strong>Тема:</strong> ${message.ticket.subject}</p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4f46e5;">
            ${text}
          </div>
          ${actionText}
        </div>
      `, replyToAddress);
    }

    return message;
  }
}

export const ticketService = new TicketService();
