/**
 * (c) 2024-2026 SMMplan. All rights reserved.
 * Robust Order Dispatcher with Outbox Pattern & Circuit Breaker Protection.
 */

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { CircuitBreaker } from '@/lib/resilience/circuit-breaker';
import { ProviderIdempotencyGenerator } from './idempotency-key-generator';
import { ProviderService } from '@/services/providers/provider.service';

export interface DispatchOrderInput {
  orderId: string;
  userId: string;
  serviceId: string;
  providerId: string;
  externalServiceId: string;
  link: string;
  quantity: number;
  runs?: number;
  interval?: number;
  customData?: string;
}

export interface DispatchResult {
  success: boolean;
  providerOrderId?: string;
  cached?: boolean;
  error?: string;
}

export class OrderDispatchService {
  private static readonly providerService = new ProviderService();

  /**
   * Dispatches an order to the provider with Outbox de-duplication and Circuit Breaker.
   */
  static async dispatchOrder(input: DispatchOrderInput): Promise<DispatchResult> {
    const idempotencyKey = ProviderIdempotencyGenerator.generateKey({
      orderId: input.orderId,
      userId: input.userId,
      serviceId: input.serviceId,
      link: input.link,
      quantity: input.quantity,
      runs: input.runs,
      customData: input.customData,
    });

    // 1. Outbox Check / Creation
    let outbox = await db.providerOutbox.findUnique({
      where: { idempotencyKey },
    });

    if (outbox && outbox.status === 'SENT' && outbox.providerOrderId) {
      console.info(`[OrderDispatch] Order ${input.orderId} already sent to provider (Idempotency Hit: ${outbox.providerOrderId})`);
      return { success: true, providerOrderId: outbox.providerOrderId, cached: true };
    }

    if (!outbox) {
      outbox = await db.providerOutbox.create({
        data: {
          orderId: input.orderId,
          providerId: input.providerId,
          idempotencyKey,
          status: 'PENDING',
          payload: input as unknown as Prisma.InputJsonValue,
          attempts: 0,
        },
      });
    }

    // 2. Fetch Provider configuration
    const provider = await db.provider.findUnique({
      where: { id: input.providerId },
    });

    if (!provider || !provider.isActive) {
      await db.providerOutbox.update({
        where: { id: outbox.id },
        data: { status: 'FAILED', error: 'Provider inactive or not found' },
      });
      return { success: false, error: 'Провайдер временно неактивен' };
    }

    // 3. Execute external HTTP call protected by Circuit Breaker
    try {
      const response = await CircuitBreaker.execute(provider.id, provider.name, async () => {
        const instance = await this.providerService.getProviderInstance(provider);
        return await instance.createOrder({
          service: input.externalServiceId,
          link: input.link,
          quantity: input.quantity,
          runs: input.runs,
          interval: input.interval,
        });
      });

      if (!response || response.error || !response.order) {
        throw new Error(response?.error || 'Provider returned unsuccessful response');
      }

      const orderRef = String(response.order);

      // 4. Update Outbox and Order with externalId
      await db.providerOutbox.update({
        where: { id: outbox.id },
        data: {
          status: 'SENT',
          providerOrderId: orderRef,
          lastAttemptAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      await db.order.update({
        where: { id: input.orderId },
        data: {
          externalId: orderRef,
          status: 'IN_PROGRESS',
        },
      });

      return { success: true, providerOrderId: orderRef, cached: false };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[OrderDispatch] Failed to dispatch order ${input.orderId}:`, errorMsg);

      await db.providerOutbox.update({
        where: { id: outbox.id },
        data: {
          status: 'FAILED',
          error: errorMsg,
          lastAttemptAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      return { success: false, error: errorMsg };
    }
  }
}
