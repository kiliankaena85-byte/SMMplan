import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { SlaTelemetryEngine } from '../telemetry/sla-telemetry-engine.service';

const log = logger.child({ component: 'SentinelConciergeService' });

export interface ProactiveDelayAlert {
  orderId: string;
  userId: string;
  serviceName: string;
  elapsedSeconds: number;
  expectedP90Seconds: number;
  suggestedAction: 'WAIT' | 'HOT_SWAP_READY' | 'REFUND_RECOMMENDED';
}

export class SentinelConciergeService {
  /**
   * Scans in-progress orders and dispatches proactive notifications before the client complains.
   */
  public static async evaluateOrderHealth(orderId: string): Promise<ProactiveDelayAlert | null> {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        service: true,
        user: { select: { id: true, telegramId: true, email: true } },
      },
    });

    if (!order || order.status !== 'IN_PROGRESS' || !order.providerId) {
      return null;
    }

    const elapsedSeconds = Math.round((Date.now() - order.createdAt.getTime()) / 1000);
    const sla = await SlaTelemetryEngine.getProviderSlaSnapshot(order.providerId);

    // If order has waited longer than P90 SLA threshold
    if (elapsedSeconds > sla.p90Seconds) {
      const isSevere = elapsedSeconds > sla.p99Seconds;

      const alert: ProactiveDelayAlert = {
        orderId: order.id,
        userId: order.userId,
        serviceName: order.service.name,
        elapsedSeconds,
        expectedP90Seconds: sla.p90Seconds,
        suggestedAction: isSevere ? 'HOT_SWAP_READY' : 'WAIT',
      };

      // Dispatches client-facing message if telegram is connected
      if (order.user.telegramId) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (token) {
          const msg = [
            `👋 <b>Здравствуйте! Заказ #${order.id.slice(-6)} на контроле Sentinel AI</b>`,
            `Услуга: <i>${order.service.name}</i>`,
            `⚡ Поставщик задерживает старт на ${Math.round((elapsedSeconds - sla.p90Seconds) / 60)} мин из-за очереди на шлюзе.`,
            `Мы уже отслеживаем выполнение. Если заказ не стартует в течение 10 минут, мы автоматически переключим его на резервный узел.`,
          ].join('\n');

          try {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: order.user.telegramId,
                text: msg,
                parse_mode: 'HTML',
              }),
            });
          } catch {
            // Ignore telegram network failures in test/headless mode
          }
        }
      }

      return alert;
    }

    return null;
  }
}
