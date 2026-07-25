import { db } from '@/lib/db';
import { getBaseUrlAsync } from '@/utils/get-base-url';
import { SettingsManager } from '@/lib/settings';
import {  } from '@/services/financial/payment-gateway.service';

type PaymentMetadata = {
  source?: string;
  serviceId?: string;
  promoId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export class UnifiedPaymentService {
  /**
   * Universal method to generate payment URLs for the Bot (Deposits & Top-ups).
   * Reused central PaymentGatewayFactory to support Robokassa, YooKassa, and CryptoBot without duplication.
   */
  static async createPayment(
    projectId: string | undefined, 
    userId: string, 
    amountRub: number, 
    description: string, 
    metadata: PaymentMetadata,
    gateway: 'yookassa' | 'cryptobot' | 'robokassa' = 'yookassa'
  ): Promise<{ success: boolean; confirmationUrl?: string; paymentId?: string; error?: string }> {
    try {
      const amountCents = Math.round(amountRub * 100);

      // 1. Create a PENDING payment record
      const payment = await db.payment.create({
        data: {
          userId,
          amount: amountCents,
          currency: 'RUB',
          status: 'PENDING',
          gateway
        }
      });
      const { SettingsProvider } = await import('@/lib/settings');
      const supportDomain = await SettingsProvider.getSupportEmailDomain();
      const successUrl = `${await getBaseUrlAsync(supportDomain)}/dashboard`;

      // 2. Generate Payment Link synchronously
      const { PaymentGatewayFactory } = await import('@/services/financial/payment-gateway.service');
      const gatewaySvc = PaymentGatewayFactory.getGateway(gateway);
      
      const gatewayResult = await gatewaySvc.createPayment({
        paymentId: payment.id,
        userId,
        amountRub,
        email: null,
        successUrl,
        description,
        metadata,
        isTestMode: await SettingsManager.isTestMode()
      });

      if (gatewayResult.remoteGatewayId || gatewayResult.paymentUrl) {
        await db.payment.update({
          where: { id: payment.id },
          data: {
            gatewayId: gatewayResult.remoteGatewayId || undefined,
            checkoutUrl: gatewayResult.paymentUrl || undefined
          }
        });
      }

      return {
        success: true,
        paymentId: payment.id,
        confirmationUrl: gatewayResult.paymentUrl || `/payment-redirect?id=${payment.id}`
      };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error('[UnifiedPayment] System error:', e.message);
      return { success: false, error: 'Internal logic exception' };
    }
  }
}
