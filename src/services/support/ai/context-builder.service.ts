import { db } from '@/lib/db';
import { aiKnowledgeRetriever } from '@/services/admin/ai-knowledge-retriever.service';
import type { ClientContextSnapshot, SafeOrderSnapshot } from '@/types/ai-support';

export class ContextBuilderService {
  /**
   * Assembles a minimal, secure, and grounded context snapshot for a client ticket.
   */
  public static async build(
    userId: string,
    tenantId: string,
    userQuery: string
  ): Promise<ClientContextSnapshot> {
    const user = await db.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        createdAt: true,
        balance: true,
        bonusBalance: true,
        orders: {
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            quantity: true,
            remains: true,
            charge: true,
            createdAt: true,
            service: {
              select: {
                name: true,
                category: {
                  select: {
                    network: {
                      select: {
                        slug: true,
                      },
                    },
                  },
                },
              },
            },
            error: true,
          },
        },
        payments: {
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            amount: true,
            status: true,
            gateway: true,
            createdAt: true,
          },
        },
      },
    });

    const now = Date.now();
    const regDays = user?.createdAt ? Math.floor((now - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const balanceRub = user ? (Number(user.balance) / 100).toFixed(2) : '0.00';
    const bonusBalanceRub = user ? (Number(user.bonusBalance) / 100).toFixed(2) : '0.00';

    const recentOrders: SafeOrderSnapshot[] = (user?.orders || []).map((o) => {
      let safeErrorSummary: string | undefined;
      if (o.error) {
        const errLower = o.error.toLowerCase();
        if (errLower.includes('private') || errLower.includes('закрыт')) {
          safeErrorSummary = 'Канал или профиль закрыт настройками приватности';
        } else if (errLower.includes('link') || errLower.includes('invalid') || errLower.includes('ссылк')) {
          safeErrorSummary = 'Некорректный формат публичной ссылки';
        } else if (errLower.includes('cancel') || errLower.includes('отмен')) {
          safeErrorSummary = 'Заказ отменен системой, средства возвращены на баланс. Требуется ручная проверка оператором';
        }
      }

      return {
        id: o.id,
        serviceName: o.service?.name || 'Услуга',
        network: o.service?.category?.network?.slug || 'general',
        status: o.status,
        quantity: o.quantity,
        remains: o.remains ?? 0,
        chargeRub: (Number(o.charge) / 100).toFixed(2),
        createdAt: o.createdAt.toISOString().slice(0, 10),
        hasRefillGuarantee: true,
        safeErrorSummary,
      };
    });

    const recentPayments = (user?.payments || []).map((p) => ({
      amountRub: (Number(p.amount) / 100).toFixed(2),
      status: p.status,
      gateway: p.gateway || 'SBP',
      createdAt: p.createdAt.toISOString().slice(0, 10),
    }));

    // Dynamic RAG Grounding from SMM Knowledge Base
    const serviceNames = recentOrders.map((o) => o.serviceName);
    const relevantKnowledge = aiKnowledgeRetriever.findRelevantKnowledge(userQuery, serviceNames) || undefined;

    // Сбор разрешенных чисел для проверки Grounding
    const allowedNumbers: string[] = [balanceRub, bonusBalanceRub];
    for (const ord of recentOrders) {
      allowedNumbers.push(ord.id, ord.quantity.toString(), ord.remains.toString(), ord.chargeRub);
    }
    for (const pay of recentPayments) {
      allowedNumbers.push(pay.amountRub);
    }

    return {
      user: {
        anonymousId: user?.id ? `usr_${user.id.slice(-6)}` : 'usr_guest',
        registrationDays: regDays,
        balanceRub,
        bonusBalanceRub,
        customerTier: regDays > 90 ? 'VIP' : regDays > 14 ? 'REGULAR' : 'NEW',
      },
      recentOrders,
      recentPayments,
      relevantKnowledge,
      allowedNumbers,
    };
  }
}
