// SC10 Negative Fixture: SmartDripService.createCampaign inside runSerializableTransaction
import { SmartDripService } from '@/services/dripfeed/smart-drip.service';

export async function processCheckout(userId: string, serviceId: string, orderId: string, tx: any) {
  await runSerializableTransaction(async (tx) => {
    await SmartDripService.createCampaign(tx, userId, serviceId, orderId, 'p1', 'http', 100, 5, {} as any);
  });
}
function runSerializableTransaction(fn: any) {}
