import { db } from '@/lib/db';
import { GeminiClient } from '@/services/ai/gemini-client';

class AiSupportService {
  /**
   * Generates a suggested reply for a ticket based on context and anti-hallucination guardrails.
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
    const recentOrdersSummary = ticket.user.orders
      .map(
        (o) =>
          `Заказ #${o.id}: «${o.service.name}», Статус: ${o.status}, Заказано: ${o.quantity}, Остаток: ${o.remains ?? 0}, Сумма: ${(Number(o.charge) / 100).toFixed(2)} ₽${o.error ? `, Лог: ${o.error}` : ''}`
      )
      .join('\n');

    const systemInstruction = `Ты — профессиональный ассистент службы поддержки платформы ${brandName}.
Твоя задача — составить точный, вежливый и безопасный проект ответа клиенту на русском языке.

КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ:
- Email: ${ticket.user.email}
- Текущий баланс: ${balanceRub} ₽
- Последние заказы:
${recentOrdersSummary || 'Заказов нет'}

ЖЕСТКИЕ ПРАВИЛА БЕЗОПАСНОСТИ (ANTI-HALLUCINATION & PREMORTEM GUARDRAILS):
1. ЗАПРЕТ НА ВЫДУМЫВАНИЕ ПРИЧИН: Никогда не утверждай причину отмены как свершившийся факт (например, НЕ ПИШИ "ваш профиль закрыт" или "ссылка не работает"), если этого нет в явном логе провайдера.
2. ЕСЛИ ЗАКАЗ ОТМЕНЕН (CANCELED/ERROR) БЕЗ ДЕТАЛЕЙ:
   - Сообщи, что со стороны провайдера/соцсети поступил технический отказ, и средства автоматически возвращены на баланс пользователя (${balanceRub} ₽).
   - Предоставь клиенту деликатный чек-лист из 3 пунктов для повторного запуска:
     1) Убедиться, что профиль/пост открыт для всех (публичный доступ).
     2) Проверить отсутствие возрастных или гео-ограничений.
     3) Не запускать параллельно две накрутки по одной ссылке.
3. ЕСЛИ ЗАКАЗ ЧАСТИЧНЫЙ (PARTIAL):
   - Объясни, что провайдер выполнил часть заказа, а за недовыполненный остаток система автоматически и мгновенно вернула деньги на баланс.
4. ЗАПРЕТ НА ОБЕЩАНИЕ ВЫВОДА НА КАРТУ: Не обещай прямой вывод денег на банковскую карту. Все возвраты зачисляются на внутренний баланс личного кабинета.
5. ТОН И ФОРМАТ: Вежливый, эмпатичный, лаконичный (не более 3-4 коротких абзацев). Без лишней воды.`;

    try {
      const contents = ticket.messages.map((m) => ({
        role: (m.sender === 'USER' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: m.text }],
      }));

      const response = await GeminiClient.generateContent({
        systemInstruction,
        contents,
        temperature: 0.2, // Low temperature to prevent hallucinations
        timeoutMs: 20000,
      });

      return response;
    } catch (err) {
      console.error('[AI Support] Generation failed:', err);
      throw new Error('Не удалось сгенерировать ответ автоматически.', { cause: err });
    }
  }
}

export const aiSupportService = new AiSupportService();
