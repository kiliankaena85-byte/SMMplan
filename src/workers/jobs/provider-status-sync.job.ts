/**
 * (c) 2024-2026 SMMplan. All rights reserved.
 * Provider Status Sync Job (Lost in Space Order Polling).
 */

import { db } from '@/lib/db';
import { CircuitBreaker } from '@/lib/resilience/circuit-breaker';
import { ProviderService } from '@/services/providers/provider.service';

export class ProviderStatusSyncJob {
  private static readonly providerService = new ProviderService();

  /**
   * Polls stuck orders in IN_PROGRESS state older than 10 minutes.
   */
  static async syncStuckOrders(): Promise<{ synced: number; skipped: number; errors: number }> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const stuckOrders = await db.order.findMany({
      where: {
        status: 'IN_PROGRESS',
        externalId: { not: null },
        updatedAt: { lte: tenMinutesAgo },
      },
      include: {
        provider: true,
      },
      take: 50,
    });

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const order of stuckOrders) {
      const provider = order.provider;
      if (!provider || !provider.isActive || !order.externalId) {
        skipped++;
        continue;
      }

      // Check Circuit Breaker before calling
      const circuit = await CircuitBreaker.getStatus(provider.id);
      if (circuit.state === 'OPEN') {
        skipped++;
        continue;
      }

      try {
        await CircuitBreaker.execute(provider.id, provider.name, async () => {
          const instance = await this.providerService.getProviderInstance(provider);
          const statusResult = await instance.getOrderStatus(order.externalId!);

          if (statusResult && statusResult.status) {
            const raw = statusResult.status.toLowerCase();
            const targetStatus = raw === 'completed' ? 'COMPLETED' : raw === 'canceled' ? 'CANCELED' : 'IN_PROGRESS';
            await db.order.update({
              where: { id: order.id },
              data: { status: targetStatus },
            });
            synced++;
          }
        });
      } catch (err) {
        console.error(`[ProviderStatusSyncJob] Failed to sync order ${order.id}:`, err);
        errors++;
      }
    }

    return { synced, skipped, errors };
  }
}
