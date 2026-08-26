import { db } from '@/lib/db';
import { GeminiClient } from '@/services/ai/gemini-client';

export interface AiSupportResponse {
  client_sentiment: 'NEUTRAL' | 'ANGRY' | 'CONFUSED' | 'HAPPY';
  escalate_to_senior: boolean;
  internal_reasoning: string;
  draft_reply: string;
}

class AiSupportService {
  /**
   * Generates a suggested reply for a ticket based on context using Enterprise Chain-of-Thought JSON Mode.
   */
  async generateReply(ticketId: string, tenantId: string = 'smmplan'): Promise<AiSupportResponse> {
    const ticket = await db.ticket.findFirst({
      where: { id: ticketId, tenantId },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, take: 10 },
        user: {
          select: {
            email: true,
            balance: true,
            orders: {
              take: 3,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                status: true,
                charge: true,
                remains: true,
                quantity: true,
                error: true,
                service: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!ticket) throw new Error('Ticket not found');

    const brandName = tenantId === 'flux' ? 'SMMflux' : 'SMMplan';
    const balanceRub = (Number(ticket.user.balance) / 100).toFixed(2);
    
    // Mask internal provider IDs and sensitive data (Enterprise Sanitization)
    const recentOrdersSummary = ticket.user.orders
      .map(
        (o) =>
          `Заказ #${o.id}: «${o.service.name}», Статус: ${o.status}, Заказано: ${o.quantity}, Остаток: ${o.remains ?? 0}, Сумма: ${(Number(o.charge) / 100).toFixed(2)} ₽${o.error ? `, Лог: ${o.error.replace(/provider_.+/, '[HIDDEN]')}` : ''}`
      )
      .join('\n');

    const systemInstruction = `Ты — Senior Support Agent платформы ${brandName}.
Твоя задача — проанализировать тикет и сгенерировать ответ в строгом формате JSON.

КОНТЕКСТ (ИСТИНА В ПОСЛЕДНЕЙ ИНСТАНЦИИ - НЕ ВЫЧИСЛЯЙ МАТЕМАТИКУ САМ):
- Текущий баланс клиента: ${balanceRub} ₽ (любые возвраты УЖЕ учтены в этой цифре)
- Последние заказы:
${recentOrdersSummary || 'Заказов нет'}

ENTERPRISE ПРАВИЛА БЕЗОПАСНОСТИ (ANTI-HALLUCINATION):
1. ЗАПРЕТ НА ВЫДУМЫВАНИЕ: Если заказ отменен (CANCELED/ERROR) и лог пуст или непонятен, КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выдумывать причину (например, "ваш профиль закрыт").
2. ПАТТЕРН "СЛЕПАЯ ОТМЕНА": Сообщи, что произошел технический отказ со стороны соцсети. Подтверди, что деньги уже на балансе. Дай чек-лист из 3 пунктов (публичность профиля, гео-ограничения, параллельные накрутки).
3. ЗАПРЕТ МАТЕМАТИКИ: Никогда не складывай и не вычитай суммы. Оперируй только теми цифрами, что даны в контексте.
4. ЗАПРЕТ ГАРАНТИЙ И ВЫВОДА: Не обещай вывод на банковскую карту (только на баланс сайта). Не используй слова "гарантирую", "100%", "обязательно".
5. ESCALATION LOOP: Если клиент по кругу повторяет одно и то же или угрожает судом/полицией, ставь escalate_to_senior: true.

ФОРМАТ ВЫВОДА СТРОГО JSON:
{
  "client_sentiment": "NEUTRAL" | "ANGRY" | "CONFUSED" | "HAPPY",
  "escalate_to_senior": boolean,
  "internal_reasoning": "Здесь кратко опиши логику: почему отменен заказ, что ты будешь отвечать и какие правила применил",
  "draft_reply": "Вежливый, эмпатичный, профессиональный черновик ответа на русском языке (до 4 коротких абзацев)."
}`;

    try {
      const contents = ticket.messages.map((m) => ({
        role: (m.sender === 'USER' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: m.text }],
      }));

      const rawResponse = await GeminiClient.generateContent({
        systemInstruction,
        contents,
        temperature: 0.1, // Minimal temperature for absolute strictness
        jsonMode: true,   // Force JSON output
        timeoutMs: 20000,
      });

      // Parse and validate the JSON output
      try {
        // Strip markdown code block formatting if present (e.g. \`\`\`json ... \`\`\`)
        const cleanJsonString = rawResponse.replace(/^```json/i, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(cleanJsonString) as AiSupportResponse;
        
        if (!parsed.draft_reply || !parsed.internal_reasoning) {
          throw new Error('Invalid JSON structure returned from AI');
        }
        return parsed;
      } catch (parseError) {
        console.error('[AI Support] JSON Parse failed:', rawResponse);
        throw new Error('AI вернул неверный формат данных. Попробуйте еще раз.');
      }
    } catch (err) {
      console.error('[AI Support] Generation failed:', err);
      throw new Error('Не удалось сгенерировать ответ автоматически.', { cause: err });
    }
  }
}

export const aiSupportService = new AiSupportService();
