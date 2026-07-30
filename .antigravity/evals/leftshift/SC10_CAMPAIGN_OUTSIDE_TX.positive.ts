// SC10 Positive Fixture: SmartDripService.createCampaign outside tx in checkout
import { SmartDripService } from '@/services/dripfeed/smart-drip.service';

export async function processCheckout(userId: string, serviceId: string, orderId: string) {
  await SmartDripService.createCampaign(null, userId, serviceId, orderId, 'p1', 'http', 100, 5, {} as any);
}
