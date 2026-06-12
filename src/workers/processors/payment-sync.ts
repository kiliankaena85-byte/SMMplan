import { Job } from 'bullmq';
import { db } from '../../lib/db';
import { SyncJobPayload } from '../../lib/queue-manager';
import { SettingsManager } from '../../lib/settings';
import { paymentService } from '../../services/financial/payment.service';
import { logger } from '../../lib/logger';

const log = logger.child({ component: 'PaymentSyncProcessor' });

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async function paymentSyncProcessor(job: Job<SyncJobPayload>) {
  log.info('Starting pending payments synchronization...');

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 1. Auto-cancel stale non-YooKassa payments older than 24 hours
  const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
  try {
    const stalePayments = await db.payment.findMany({
      where: {
        status: 'PENDING',
        gateway: { notIn: ['yookassa'] },
        createdAt: { lt: staleThreshold }
      },
      select: { id: true, orderId: true },
      take: 50
    });

    for (const payment of stalePayments) {
      try {
        await db.$transaction(async (tx) => {
          const updated = await tx.payment.updateMany({
            where: { id: payment.id, status: 'PENDING' },
            data: { status: 'CANCELED' }
          });
          if (updated.count === 0) return;

          if (payment.orderId) {
            await tx.order.updateMany({
              where: { id: payment.orderId, status: 'AWAITING_PAYMENT' },
              data: { status: 'CANCELED', error: 'Оплата не поступила в течение 24ч (auto-expire)' }
            });
          }
        });
        log.info(`Stale non-YooKassa payment ${payment.id} expired successfully.`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        log.error(`Failed to expire stale payment ${payment.id}: ${errMsg}`);
      }
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log.error(`Error during stale payments cleanup: ${errMsg}`);
  }

  // 2. Fetch pending YooKassa payments
  const pendingPayments = await db.payment.findMany({
    where: {
      status: 'PENDING',
      gateway: 'yookassa',
      createdAt: {
        lt: tenMinutesAgo,
        gt: twentyFourHoursAgo
      }
    },
    take: 50,
    orderBy: { createdAt: 'asc' }
  });

  if (pendingPayments.length === 0) {
    log.info('No pending YooKassa payments found for synchronization.');
    return;
  }

  log.info(`Found ${pendingPayments.length} pending YooKassa payments to check.`);

  const isTestMode = await SettingsManager.isTestMode();
  if (isTestMode) {
    log.info('System is in Sandbox/Test mode. Skipping real YooKassa API status checks.');
    return;
  }

  const secrets = await SettingsManager.getPaymentSecrets();
  const shopId = secrets.yookassaShopId;
  const secretKey = secrets.yookassaSecretKey;

  if (!shopId || !secretKey) {
    log.error('YooKassa shopId or secretKey is not configured. Aborting payments synchronization.');
    return;
  }

  const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');

  for (const payment of pendingPayments) {
    if (!payment.gatewayId) {
      log.warn(`Pending payment ${payment.id} has no remote gatewayId. Skipping.`);
      continue;
    }

    try {
      log.info(`Checking remote status for payment ${payment.id} (YooKassa ID: ${payment.gatewayId})...`);

      const response = await fetch(`https://api.yookassa.ru/v3/payments/${payment.gatewayId}`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        log.error(`Failed to fetch YooKassa payment ${payment.gatewayId}. Status code: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const remoteStatus = data.status; // succeeded, canceled, pending, waiting_for_capture

      log.info(`Payment ${payment.id} remote status is: ${remoteStatus}`);

      if (remoteStatus === 'succeeded') {
        const realAmountCents = Math.round(parseFloat(data.amount.value) * 100);
        log.info(`Payment ${payment.id} succeeded remotely with amount: ${realAmountCents} cents. Confirming locally...`);
        
        const success = await paymentService.confirmPayment(
          payment.gatewayId,
          realAmountCents,
          payment.userId,
          false,
          'yookassa',
          payment.id
        );

        if (success) {
          log.info(`Successfully synced and confirmed payment ${payment.id}.`);
        } else {
          log.error(`Failed to confirm payment ${payment.id} locally during synchronization.`);
        }
      } else if (remoteStatus === 'canceled') {
        log.info(`Payment ${payment.id} has been canceled remotely. Updating local database...`);
        await db.payment.update({
          where: { id: payment.id },
          data: { status: 'CANCELED' }
        });
        log.info(`Successfully marked payment ${payment.id} as CANCELED.`);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      log.error(`Exception while syncing payment ${payment.id}: ${err.message}`, { cause: err });
    }
  }

  log.info('Finished pending payments synchronization.');
}
