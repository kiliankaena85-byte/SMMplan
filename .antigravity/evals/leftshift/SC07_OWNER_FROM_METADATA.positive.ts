// SC07 Positive Fixture: Untrusted userId from body/metadata in WalletOps
import { WalletOps } from '@/services/financial/wallet-ops';

export async function processTopup(body: any, amount: bigint) {
  await WalletOps.credit({
    userId: body.userId,
    amount,
    idempotencyKey: 'key'
  });
}
