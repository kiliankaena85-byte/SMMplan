import { db as prisma } from '@/lib/db';
import { SmartCampaignStatus, SmartTaskStatus } from '@prisma/client';
import { marketingService } from '@/services/marketing.service';

export interface TaskAllocation {
  qty: number;
  runAt: Date;
}

export class SmartDripService {
  /**
   * Математический алгоритм разбиения общего объема заказа на случайные чанки (порции)
   * в пределах [minChunk, maxChunk], распределенные случайно по выбранному количеству дней.
   */
  static generateTaskDistribution(
    quantity: number,
    days: number,
    minChunk: number,
    maxChunk: number
  ): TaskAllocation[] {
    let remaining = quantity;
    const chunks: number[] = [];

    // Разбиваем объем на части
    while (remaining > 0) {
      if (remaining < minChunk) {
        if (chunks.length > 0) {
          // Если остаток меньше минимального чанка, прибавляем его к предыдущему чанку
          chunks[chunks.length - 1] += remaining;
        } else {
          chunks.push(remaining);
        }
        remaining = 0;
      } else {
        const limit = Math.min(maxChunk, remaining);
        let chunk = minChunk;
        if (limit > minChunk) {
          // Случайный размер чанка в диапазоне [minChunk, limit]
          chunk = minChunk + Math.floor(Math.random() * (limit - minChunk + 1));
        }
        chunks.push(chunk);
        remaining -= chunk;
      }
    }

    // Случайно распределяем время запуска чанков по дням
    const now = Date.now();
    const durationMs = days * 24 * 60 * 60 * 1000;
    const tasks = chunks.map((qty) => {
      // Случайное смещение от текущего момента времени в пределах totalDays
      const randomOffset = Math.random() * durationMs;
      return {
        qty,
        runAt: new Date(now + randomOffset),
      };
    });

    // Сортируем задачи по времени запуска
    tasks.sort((a, b) => a.runAt.getTime() - b.runAt.getTime());

    return tasks;
  }

  /**
   * Предварительный расчет стоимости умного dripfeed заказа (включая наценку).
   * Вызывается для предпросмотра цен или валидации цен на сервере.
   */
  static async calculateCampaignPrice(
    userId: string | null,
    serviceId: string,
    quantity: number,
    promoCodeStr?: string
  ): Promise<{
    success: boolean;
    basePriceCents: number;
    finalPriceCents: number;
    providerCostCents: number;
    markup: number;
    error?: string;
  }> {
    try {
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        include: { smartConfig: true },
      });

      if (!service || !service.isActive) {
        return { success: false, basePriceCents: 0, finalPriceCents: 0, providerCostCents: 0, markup: 0, error: 'Услуга не найдена или неактивна' };
      }

      if (!service.smartConfig || !service.smartConfig.isEnabled) {
        return { success: false, basePriceCents: 0, finalPriceCents: 0, providerCostCents: 0, markup: 0, error: 'Умный Dripfeed не поддерживается для этой услуги' };
      }

      // Вычисляем базовую цену с учетом скидок и промокодов
      const pricing = await marketingService.calculatePrice(userId, serviceId, quantity, promoCodeStr);

      const markup = service.smartConfig.markup; // e.g. 0.15 (+15%)
      const basePriceCents = pricing.totalCents;
      const finalPriceCents = Math.round(basePriceCents * (1 + markup));

      return {
        success: true,
        basePriceCents,
        finalPriceCents,
        providerCostCents: pricing.providerCostCents,
        markup,
      };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      return { success: false, basePriceCents: 0, finalPriceCents: 0, providerCostCents: 0, markup: 0, error: err.message || 'Ошибка расчета цен' };
    }
  }

  /**
   * Создает умную Dripfeed-кампанию в базе данных с ее запланированными задачами (SmartTasks).
   * Вызывается внутри Checkout транзакции при успешной оплате/оформлении.
   */
  static async createCampaign(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: any, // Prisma Transaction client
    params: {
      userId: string;
      serviceId: string;
      link: string;
      quantity: number;
      days: number;
      paymentId?: string;
      orderId?: string;
      isTestMode?: boolean;
    }
  ) {
    const { userId, serviceId, link, quantity, days, paymentId, orderId, isTestMode } = params;

    const service = await tx.service.findUnique({
      where: { id: serviceId },
      include: { smartConfig: true },
    });

    if (!service || !service.isActive) {
      throw new Error('Услуга не найдена или неактивна');
    }

    const config = service.smartConfig;
    if (!config || !config.isEnabled) {
      throw new Error('Умный Dripfeed не поддерживается для этой услуги');
    }

    // 1. Создаем саму кампанию
    const campaign = await tx.smartCampaign.create({
      data: {
        userId,
        serviceId,
        link,
        totalQuantity: quantity,
        totalDays: days,
        status: SmartCampaignStatus.PLANNED,
        isTestMode: isTestMode || config.isTestMode || false,
        paymentId: paymentId || null,
        orderId: orderId || null,
      },
    });

    // 2. Распределяем порции (SmartTask)
    // Smart Step: If using invite buffer, chunk limits can scale down to as small as 10
    // since we make 1 bulk order and let the bot approve tiny segments smoothly over the week.
    let effectiveMinChunk = config.minChunk;
    let effectiveMaxChunk = config.maxChunk;

    if (config.useInviteBuffer) {
      effectiveMinChunk = Math.max(10, Math.floor(quantity / (days * 2)));
      effectiveMaxChunk = Math.max(30, Math.floor(quantity / days));
      
      if (effectiveMinChunk > config.minChunk) effectiveMinChunk = config.minChunk;
      if (effectiveMaxChunk > config.maxChunk) effectiveMaxChunk = config.maxChunk;
      if (effectiveMinChunk > effectiveMaxChunk) effectiveMinChunk = effectiveMaxChunk;
    }

    const taskAllocations = this.generateTaskDistribution(
      quantity,
      days,
      effectiveMinChunk,
      effectiveMaxChunk
    );

    // 3. Сохраняем задачи SmartTask
    const taskPromises = taskAllocations.map((alloc) =>
      tx.smartTask.create({
        data: {
          campaignId: campaign.id,
          quantity: alloc.qty,
          runAt: alloc.runAt,
          status: SmartTaskStatus.PLANNED,
        },
      })
    );

    const createdTasks = await Promise.all(taskPromises);

    return {
      campaign,
      tasks: createdTasks,
    };
  }
}
