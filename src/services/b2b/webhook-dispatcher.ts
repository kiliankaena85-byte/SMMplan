import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { safeFetch } from '@/lib/security/ssrf-guard';
import crypto from 'crypto';

const log = logger.child({ component: 'B2bWebhookDispatcher' });

export class B2bWebhookDispatcher {
  /**
   * Dispatches order status updates to B2B clients who configured webhooks.
   */
  static async dispatchOrderStatusUpdate(orderId: string, status: string) {
    try {
      const order = await db.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          numericId: true,
          userId: true,
          status: true,
          remains: true,
          charge: true,
          link: true,
          createdAt: true
        }
      });

      if (!order) return;

      const b2bConfig = await db.b2bConfig.findUnique({
        where: { userId: order.userId }
      });

      if (!b2bConfig || !b2bConfig.isB2b || !b2bConfig.isWebhookActive || !b2bConfig.webhookUrl) {
        return;
      }

      const payload = JSON.stringify({
        event: 'order.status_update',
        timestamp: new Date().toISOString(),
        data: {
          orderId: order.id,
          numericId: order.numericId,
          status: order.status,
          remains: order.remains,
          chargeCents: Number(order.charge),
          link: order.link,
          createdAt: order.createdAt.toISOString()
        }
      });

      const signature = b2bConfig.webhookSecret
        ? crypto.createHmac('sha256', b2bConfig.webhookSecret).update(payload).digest('hex')
        : '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'SMMplan-B2B-Webhook/2.0'
      };

      if (signature) {
        headers['X-SMMplan-Signature'] = signature;
      }

      const response = await safeFetch(b2bConfig.webhookUrl, {
        method: 'POST',
        headers,
        body: payload,
        signal: AbortSignal.timeout(5000) // 5s timeout guard
      });

      await db.b2bRequestLog.create({
        data: {
          apiKeyHash: 'webhook_dispatch',
          action: 'order.status_update',
          params: { orderId, status, endpoint: b2bConfig.webhookUrl },
          httpStatus: response.status,
          latencyMs: 0
        }
      }).catch(() => {});

      log.info(`[B2B Webhook] Dispatched status update for order ${order.numericId} to ${b2bConfig.webhookUrl} (Status: ${response.status})`);
    } catch (err) {
      log.error(`[B2B Webhook] Failed to dispatch webhook for order ${orderId}:`, { error: (err as Error).message });
    }
  }
}
