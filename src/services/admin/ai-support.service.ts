import { db } from '@/lib/db';
import { GeminiClient } from '@/services/ai/gemini-client';

class AiSupportService {
  /**
   * Generates a suggested reply for a ticket based on context.
   */
  async generateReply(ticketId: string, tenantId: string = 'smmplan'): Promise<string> {
    const ticket = await db.ticket.findFirst({
      where: { id: ticketId, tenantId },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, take: 10 },
        user: {
          select: {
            email: true,
            balance: true,
            orders: { take: 3, orderBy: { createdAt: 'desc' }, select: { id: true, status: true, charge: true, service: { select: { name: true } } } }
          }
        }
      }
    });

    if (!ticket) throw new Error('Ticket not found');

    const systemInstruction = `You are a support agent for SMMplan, an SMM services platform.
You help users with questions about their orders and services.
Context about the current user:
- Email: ${ticket.user.email}
- Balance: ${(Number(ticket.user.balance) / 100).toFixed(2)} RUB
- Recent orders: ${ticket.user.orders.map(o => `${o.service.name} (${o.status})`).join(', ') || 'None'}
Write a professional, polite, and helpful response in Russian. Keep it concise.
If the user needs a refund, explain that support can issue compensations up to 50,000 RUB.`;

    try {
      const contents = ticket.messages.map(m => ({
        role: (m.sender === 'USER' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: m.text }]
      }));

      const response = await GeminiClient.generateContent({
        systemInstruction,
        contents,
        temperature: 0.3,
        timeoutMs: 25000
      });

      return response;
    } catch (err) {
      console.error('[AI Support] Generation failed:', err);
      throw new Error("Не удалось сгенерировать ответ автоматически.", { cause: err });
    }
  }
}

export const aiSupportService = new AiSupportService();
