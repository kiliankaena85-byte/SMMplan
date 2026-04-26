import { Job } from 'bullmq';
import { db } from '../../lib/db';
import { DripFeedJobPayload, dripfeedQueue, ordersQueue } from '../queues';

export default async function dripfeedProcessor(job: Job<DripFeedJobPayload>) {
  const { orderId } = job.data;
  
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || !order.isDripFeed || !order.runs || !order.interval) {
    return;
  }

  // If order was canceled manually, stop scheduling
  if (order.status === 'CANCELED' || order.status === 'ERROR') {
    return;
  }

  if (order.currentRun >= order.runs) {
    // All runs dispatched, our job here as DripFeed scheduler is done
    return;
  }

  // 1. Dispatch the chunk to the normal order queue
  await ordersQueue.add('order-dispatch-chunk', { 
    orderId: order.id, 
    isDripFeedChild: true 
  }, { delay: 0 });

  // 2. Increment run counter
  const updatedOrder = await db.order.update({
    where: { id: order.id },
    data: {
      currentRun: { increment: 1 },
      nextRunAt: new Date(Date.now() + order.interval * 60 * 1000)
    }
  });

  // 3. Schedule next run if needed
  if (updatedOrder.currentRun < order.runs) {
    await dripfeedQueue.add(
      'dripfeed-next', 
      { orderId: order.id }, 
      { delay: order.interval * 60 * 1000 }
    );
    console.log(`[DripFeed] Scheduled run ${updatedOrder.currentRun + 1}/${order.runs} for Order ${order.id}`);
  } else {
    console.log(`[DripFeed] Completed all ${order.runs} dispatches for Order ${order.id}`);
  }
}
