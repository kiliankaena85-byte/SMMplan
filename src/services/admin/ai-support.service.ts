import { db } from '@/lib/db';
import { ProxyAgent } from 'undici';

class AiSupportService {
  /**
   * Generates a suggested reply for a ticket based on context.
   */
  async generateReply(ticketId: string, tenantId: string = 'smmplan') {
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const lastMessages = ticket.messages.map(m => `${m.sender}: ${m.text}`).join('\n');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const userContext = `User: ${ticket.user.email}, Balance: ${(Number(ticket.user.balance) / 100).toFixed(2)} RUB. Recent orders: ${ticket.user.orders.map(o => `${o.service.name} (${o.status})`).join(', ')}`;

    const systemInstruction = `You are a support agent for SMMplan, an SMM services platform.
You help users with questions about their orders and services.
Context about the current user:
- Email: ${ticket.user.email}
- Balance: ${(Number(ticket.user.balance) / 100).toFixed(2)} RUB
- Recent orders: ${ticket.user.orders.map(o => `${o.service.name} (${o.status})`).join(', ') || 'None'}
Write a professional, polite, and helpful response in Russian. Keep it concise.
If the user needs a refund, explain that support can issue compensations up to 50,000 RUB.`;

    try {
      const response = await this.callGemini(systemInstruction, ticket.messages);
      return response;
    } catch (err) {
      console.error('[AI Support] Generation failed:', err);
      throw new Error("Не удалось сгенерировать ответ автоматически.", { cause: err });
    }
  }

  private async callGemini(systemInstruction: string, userMessages: Array<{sender: string; text: string}>): Promise<string> {
     const apiKey = process.env.GEMINI_API_KEY;
     if (!apiKey) return "AI API Key missing";

     const model = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
     const baseUrl = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
     const url = `${baseUrl}/v1beta/models/${model}:generateContent`;
     
     // W1-3 SECURITY FIX: Structured messages — system instruction separate from user data.
     // Previously: raw user text was concat'd into prompt string → prompt injection risk.
     // Now: Gemini receives clean role-based structure, user content is sandboxed.
     const contents = userMessages.map(m => ({
       role: m.sender === 'USER' ? 'user' : 'model',
       parts: [{ text: m.text }]
     }));

     const proxyUrl = process.env.GEMINI_PROXY || process.env.HTTPS_PROXY;
     const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

     const res = await fetch(url, {
       method: 'POST',
       headers: { 
         'Content-Type': 'application/json',
         'x-goog-api-key': apiKey
       },
       body: JSON.stringify({
         system_instruction: { parts: [{ text: systemInstruction }] },
         contents
       }),
       dispatcher,
       signal: AbortSignal.timeout(30000)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
     } as any);


     if (!res.ok) {
       console.error(`[AI Support] API Error ${res.status}: ${await res.text()}`);
       throw new Error(`Gemini API returned ${res.status}`);
     }

     const data = await res.json();
     return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI";
  }
}

export const aiSupportService = new AiSupportService();
