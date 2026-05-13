import { db } from '@/lib/db';

class AiSupportService {
  /**
   * Generates a suggested reply for a ticket based on context.
   */
  async generateReply(ticketId: string) {
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
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

    const lastMessages = ticket.messages.map(m => `${m.sender}: ${m.text}`).join('\n');
    const userContext = `User: ${ticket.user.email}, Balance: ${(Number(ticket.user.balance) / 100).toFixed(2)} RUB. Recent orders: ${ticket.user.orders.map(o => `${o.service.name} (${o.status})`).join(', ')}`;

    const prompt = `
      You are a support agent for SMMplan, an SMM services platform.
      Current context:
      ${userContext}

      Chat history:
      ${lastMessages}

      Task: Write a professional, polite, and helpful response in Russian.
      If the user is asking about a problem, acknowledge it.
      If the user needs a refund, explain that support can issue compensations up to 1000 RUB.
      Keep it concise and helpful.
      Response should be only the message text.
    `;

    // Call Gemini (pseudo-code or real implementation if SDK is available)
    // Based on GEMINI.md: use 'gemini-3-flash'
    try {
      const response = await this.callGemini(prompt);
      return response;
    } catch (err) {
      console.error('[AI Support] Generation failed:', err);
      return "Извините, не удалось сгенерировать ответ автоматически.";
    }
  }

  private async callGemini(prompt: string): Promise<string> {
     const apiKey = process.env.GEMINI_API_KEY;
     if (!apiKey) return "AI API Key missing";

     const model = 'gemini-3-flash-preview'; // As per GEMINI.md
     
     // Note: Using standard fetch for Gemini API
     const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
     
     const res = await fetch(url, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         contents: [{ parts: [{ text: prompt }] }]
       })
     });

     const data = await res.json();
     return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI";
  }
}

export const aiSupportService = new AiSupportService();
