import { db as prisma } from '@/lib/db';
import { providerService } from '@/services/providers/provider.service';
import { SmartCampaignStatus, SmartTaskStatus } from '@prisma/client';

/**
 * Проверяет завершенность кампании и обновляет статус кампании и родительского заказа.
 */
export async function checkAndCompleteCampaign(campaignId: string) {
  const campaign = await prisma.smartCampaign.findUnique({
    where: { id: campaignId },
    include: { tasks: true, order: true },
  });

  if (!campaign) return;

  const allTasks = campaign.tasks;
  const allFinished = allTasks.every(
    (t) => t.status === SmartTaskStatus.COMPLETED || t.status === SmartTaskStatus.ERROR
  );

  if (allFinished) {
    const hasError = allTasks.some((t) => t.status === SmartTaskStatus.ERROR);
    const finalStatus = hasError ? SmartCampaignStatus.ERROR : SmartCampaignStatus.COMPLETED;

    await prisma.smartCampaign.update({
      where: { id: campaign.id },
      data: { status: finalStatus },
    });

    if (campaign.orderId) {
      await prisma.order.update({
        where: { id: campaign.orderId },
        data: {
          status: finalStatus === SmartCampaignStatus.COMPLETED ? 'COMPLETED' : 'ERROR',
          remains: 0,
        },
      });
    }

    console.info(`[Dripfeed] SmartCampaign ${campaignId} завершена со статусом ${finalStatus}.`);
  }
}

/**
 * Основной периодический обработчик, запускаемый раз в 1 минуту.
 * 1. Синхронизирует статусы активных SmartExecution.
 * 2. Запускает SmartTasks, у которых наступило время runAt.
 */
export async function runSmartDripfeedTick() {
  // --- ЧАСТЬ 1: Синхронизация активных SmartExecution ---
  const activeExecutions = await prisma.smartExecution.findMany({
    where: { status: 'IN_PROGRESS' },
    include: {
      task: {
        include: {
          campaign: {
            include: {
              service: { include: { provider: true } },
            },
          },
        },
      },
    },
  });

  for (const exec of activeExecutions) {
    try {
      if (!exec.externalOrderId) continue;
      const task = exec.task;
      const campaign = task.campaign;
      const service = campaign.service;
      if (!service.provider) continue;

      const provider = await providerService.getWorkerProviderInstance(service.provider);
      const statusRes = await provider.getOrderStatus(exec.externalOrderId);

      if (statusRes && statusRes.status) {
        const providerStatus = statusRes.status.toUpperCase();
        const remains = parseInt(statusRes.remains || '0', 10);
        const delivered = Math.max(0, exec.qtySent - remains);

        if (['COMPLETED'].includes(providerStatus)) {
          await prisma.$transaction([
            prisma.smartExecution.update({
              where: { id: exec.id },
              data: { status: 'COMPLETED', qtyDelivered: exec.qtySent },
            }),
            prisma.smartTask.update({
              where: { id: task.id },
              data: { status: SmartTaskStatus.COMPLETED },
            }),
          ]);
          await checkAndCompleteCampaign(campaign.id);
        } else if (['CANCELED', 'PARTIAL', 'FAILED'].includes(providerStatus)) {
          await prisma.$transaction([
            prisma.smartExecution.update({
              where: { id: exec.id },
              data: {
                status: 'FAILED',
                qtyDelivered: delivered,
                error: 'Заказ отменен или частично выполнен провайдером',
              },
            }),
            prisma.smartTask.update({
              where: { id: task.id },
              data: {
                status: SmartTaskStatus.ERROR,
                error: 'Заказ отменен или частично выполнен провайдером',
              },
            }),
          ]);
          await checkAndCompleteCampaign(campaign.id);
        } else {
          // В процессе выполнения: обновляем доставленное количество
          await prisma.smartExecution.update({
            where: { id: exec.id },
            data: { qtyDelivered: delivered },
          });
        }
      }
    } catch (err: any) {
      console.error(
        `[Dripfeed Status Sync] Не удалось синхронизировать статус выполнения ${exec.id}:`,
        err.message
      );
    }
  }

  // --- ЧАСТЬ 2: Запуск запланированных SmartTasks ---
  const plannedTasks = await prisma.smartTask.findMany({
    where: {
      status: SmartTaskStatus.PLANNED,
      runAt: { lte: new Date() },
      campaign: {
        status: SmartCampaignStatus.RUNNING,
      },
    },
    include: {
      campaign: {
        include: {
          service: { include: { provider: true } },
        },
      },
    },
  });

  for (const task of plannedTasks) {
    try {
      // 1. Атомарно помечаем задачу как SENT
      await prisma.smartTask.update({
        where: { id: task.id },
        data: { status: SmartTaskStatus.SENT },
      });

      const campaign = task.campaign;
      const service = campaign.service;

      // Тестовый режим: имитируем мгновенный успех
      if (campaign.isTestMode) {
        await prisma.smartExecution.create({
          data: {
            taskId: task.id,
            qtySent: task.quantity,
            qtyDelivered: task.quantity,
            status: 'COMPLETED',
          },
        });
        await prisma.smartTask.update({
          where: { id: task.id },
          data: { status: SmartTaskStatus.COMPLETED },
        });
        console.info(`[Dripfeed Worker] Тестовая задача ${task.id} имитирована успешно.`);
        await checkAndCompleteCampaign(campaign.id);
        continue;
      }

      // Реальный режим отправки провайдеру
      if (!service.provider) {
        throw new Error(`Услуга ${service.id} не привязана к провайдеру`);
      }

      const provider = await providerService.getWorkerProviderInstance(service.provider);

      // Отправляем чанк провайдеру
      const response = await provider.createOrder({
        service: service.externalId || '',
        link: campaign.link,
        quantity: task.quantity,
        ref: task.id,
        custom_id: task.id,
      });

      if (response.error && !response.order) {
        throw new Error(response.error);
      }

      const extOrderId = response.order ? response.order.toString() : '';

      // Создаем SmartExecution запись
      await prisma.smartExecution.create({
        data: {
          taskId: task.id,
          providerId: service.provider.id,
          externalOrderId: extOrderId,
          qtySent: task.quantity,
          status: 'IN_PROGRESS',
        },
      });

      console.info(
        `[Dripfeed Worker] Задача ${task.id} успешно отправлена провайдеру. External ID: ${extOrderId}`
      );
    } catch (err: any) {
      console.error(`[Dripfeed Worker] Ошибка обработки задачи ${task.id}:`, err.message);
      await prisma.smartTask.update({
        where: { id: task.id },
        data: { status: SmartTaskStatus.ERROR, error: err.message },
      });
      await checkAndCompleteCampaign(task.campaignId);
    }
  }
}
