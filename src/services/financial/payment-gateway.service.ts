import { db } from '@/lib/db';
import { getBaseUrlAsync } from '@/utils/get-base-url';
import { SettingsManager } from '@/lib/settings';
import { WalletOps } from './wallet-ops';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MutexManager } from '@/lib/redis-lock';
import crypto from 'crypto';


export interface PaymentGatewayResult {
  paymentUrl: string;
  remoteGatewayId: string;
}

export interface PaymentGatewayParams {
  paymentId: string;
  orderId?: string;
  userId: string;
  amountRub: number;
  email: string | null;
  successUrl: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
  isTestMode?: boolean;
}

export abstract class BasePaymentGateway {
  abstract createPayment(params: PaymentGatewayParams): Promise<PaymentGatewayResult>;
  
  // Optional method for synchronous status checking
  async checkStatusSync?(gatewayId: string): Promise<boolean>;
}

class YooKassaGateway extends BasePaymentGateway {
  async createPayment(params: PaymentGatewayParams): Promise<PaymentGatewayResult> {
    if (params.amountRub <= 0 || Math.round(params.amountRub * 100) <= 0) {
      throw new Error('Сумма платежа должна быть больше 0');
    }

    const secrets = await SettingsManager.getPaymentSecrets();
    const shopId = secrets.yookassaShopId;
    const secretKey = secrets.yookassaSecretKey;

    const isDummyKeys = !shopId || !secretKey || shopId === 'test_shop_id' || shopId === 'test_shop_id_test' || secretKey.startsWith('test_') || process.env.NODE_ENV === 'development';

    if (isDummyKeys) {
      return {
        paymentUrl: `${await getBaseUrlAsync()}/api/dev/mock-payment?paymentId=${params.paymentId}${params.orderId ? `&orderId=${params.orderId}` : ''}`,
        remoteGatewayId: `mock_${Date.now()}`
      };
    }

    const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
    
    const { SettingsProvider } = await import('@/lib/settings');
    const supportDomain = await SettingsProvider.getSupportEmailDomain();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      amount: { value: params.amountRub.toFixed(2), currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: params.successUrl },
      description: params.description,
      metadata: { paymentId: params.paymentId, userId: params.userId, orderId: params.orderId, ...params.metadata }
    };

    if (!params.isTestMode) {
      // Подсчитываем оборот за год для переключения НДС 22% (ФЗ № 425-ФЗ, ФЗ № 176-ФЗ, ст. 145, 164 НК РФ)
      const currentYear = new Date().getFullYear();
      const annualRevenue = await db.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'SUCCEEDED',
          createdAt: { gte: new Date(currentYear, 0, 1) }
        }
      }).then(res => Number(res._sum.amount || 0));

      const isVatThresholdExceeded = annualRevenue >= 2000000000; // 20 млн рублей (Порог освобождения от НДС на УСН ст. 145 НК РФ)
      const vatCode = isVatThresholdExceeded ? 10 : 1; // 10 = НДС 22% (п. 3 ст. 164 НК РФ), 1 = Без НДС

      payload.receipt = {
        customer: { email: params.email || `no-reply@${supportDomain}` },
        items: [{
          description: "Информационные услуги",
          quantity: "1.00",
          amount: { value: params.amountRub.toFixed(2), currency: 'RUB' },
          vat_code: vatCode,
          payment_mode: "full_prepayment",
          payment_subject: "service"
        }]
      };
    }

    const idempString = `yookassa_${params.userId}_${params.paymentId}_${Math.floor(Date.now() / 60000)}`;
    const idempKey = crypto.createHash('sha256').update(idempString).digest('hex').substring(0, 36);

    const resp = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'Idempotence-Key': idempKey
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });

    if (!resp.ok) {
      console.error('[YooKassaGateway] API Error:', await resp.text());
      throw new Error('Ошибка шлюза YooKassa');
    }

    const data = await resp.json();
    return {
      paymentUrl: data.confirmation.confirmation_url,
      remoteGatewayId: data.id
    };
  }

  async checkStatusSync(gatewayId: string): Promise<boolean> {
    try {
      const secrets = await SettingsManager.getPaymentSecrets();
      const shopId = secrets.yookassaShopId;
      const secretKey = secrets.yookassaSecretKey;
      if (!shopId || !secretKey) return false;

      const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
      const resp = await fetch(`https://api.yookassa.ru/v3/payments/${gatewayId}`, {
        method: 'GET',
        headers: { 'Authorization': authHeader },
        signal: AbortSignal.timeout(15000)
      });

      if (!resp.ok) return false;
      const data = await resp.json();
      return data.status === 'succeeded' || data.status === 'waiting_for_capture';
    } catch (e) {
      console.error('[YooKassaGateway] Error checking status', e);
      return false;
    }
  }
}

class CryptoBotGateway extends BasePaymentGateway {
  async createPayment(params: PaymentGatewayParams): Promise<PaymentGatewayResult> {
    if (params.amountRub <= 0 || Math.round(params.amountRub * 100) <= 0) {
      throw new Error('Сумма платежа должна быть больше 0');
    }

    const secrets = await SettingsManager.getPaymentSecrets();
    const cryptoToken = secrets.cryptoBotToken;

    const isDummyKeys = !cryptoToken || cryptoToken === 'test_token' || cryptoToken === 'test_shop_id' || cryptoToken === 'test_login';

    if (isDummyKeys) {
      return {
        paymentUrl: `${await getBaseUrlAsync()}/api/dev/mock-payment?paymentId=${params.paymentId}${params.orderId ? `&orderId=${params.orderId}` : ''}`,
        remoteGatewayId: `mock_${Date.now()}`
      };
    }

    const { SettingsProvider } = await import('@/lib/settings');
    const legalSettings = await SettingsProvider.getContactAndLegalSettings();
    const brandName = legalSettings.COMPANY_NAME || 'SMMplan';
    const cleanDesc = params.description.startsWith('Test ') 
      ? params.description.substring(5) 
      : params.description;
    const hiddenMessage = `${brandName} ${cleanDesc}`;

    const resp = await fetch('https://pay.crypt.bot/api/createInvoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Crypto-Pay-API-Token': cryptoToken
      },
      body: JSON.stringify({
        currency_type: 'fiat', // Allow paying in TON but amount specified in RUB
        fiat: 'RUB',
        amount: params.amountRub.toFixed(2),
        description: params.description,
        hidden_message: hiddenMessage,
        payload: params.paymentId
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!resp.ok) {
      console.error('[CryptoBotGateway] API Error:', await resp.text());
      throw new Error('Ошибка шлюза CryptoBot');
    }

    const data = await resp.json();
    if (!data.ok) throw new Error('CryptoBot returned error: ' + JSON.stringify(data.error));
    
    return {
      paymentUrl: data.result.pay_url,
      remoteGatewayId: data.result.invoice_id.toString()
    };
  }

  async checkStatusSync(gatewayId: string): Promise<boolean> {
    try {
      const secrets = await SettingsManager.getPaymentSecrets();
      const cryptoToken = secrets.cryptoBotToken;
      if (!cryptoToken) return false;

      const resp = await fetch(`https://pay.crypt.bot/api/getInvoices?invoice_ids=${gatewayId}`, {
        method: 'GET',
        headers: {
          'Crypto-Pay-API-Token': cryptoToken
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!resp.ok) return false;
      const data = await resp.json();
      if (!data.ok || !data.result || !data.result.items) return false;

      const item = data.result.items[0];
      return item && item.status === 'paid';
    } catch (e) {
      console.error('[CryptoBotGateway] Error checking status:', e);
      return false;
    }
  }
}

class BalanceGateway extends BasePaymentGateway {
  async createPayment(params: PaymentGatewayParams): Promise<PaymentGatewayResult> {
    const amountCents = Math.round(params.amountRub * 100);
    const remoteId = `internal_${Date.now()}`;
    const { ordersQueue } = await import('@/workers/queues');

    // Perform atomic deduction inside the transaction to prevent race condition double-spending
    const updatedOrderIds: string[] = await db.$transaction(async (tx) => {
      // Atomic WalletOps deduction (already handles totalSpent increment securely)
      await WalletOps.charge(tx, params.userId, amountCents, params.description);

      await tx.payment.update({
          where: { id: params.paymentId },
          data: { status: 'SUCCEEDED', gatewayId: remoteId }
        });

        // Update any specific order if passed
        const ids = [];
        if (params.orderId) {
          const order = await tx.order.findUnique({
            where: { id: params.orderId }
          });
          if (order) {
            await tx.order.update({
              where: { id: params.orderId },
              data: { status: 'PENDING' }
            });
            if (order.promoCodeId) {
              const promo = await tx.promoCode.findUnique({
                where: { id: order.promoCodeId },
                select: { isSuspicious: true }
              });
              const isSuspicious = promo?.isSuspicious ?? false;
              
              const existingUsage = await tx.promoCodeUsage.findUnique({
                where: { orderId: order.id }
              });
              
              if (!existingUsage) {
                await tx.promoCodeUsage.create({
                  data: {
                    promoCodeId: order.promoCodeId,
                    userId: params.userId,
                    orderId: order.id,
                    discountCents: order.discountCents,
                    revenueCents: BigInt(Number(order.charge)),
                    profitCents: BigInt(Number(order.charge - order.providerCost)),
                    isSuspicious,
                  }
                });
              }
            }
            ids.push(params.orderId);
          }
        }

        // Also update any orders linked to this paymentId (Mass Orders / Basket)
        const basketOrders = await tx.order.findMany({ 
          where: { paymentId: params.paymentId, status: 'AWAITING_PAYMENT' } 
        });
        if (basketOrders.length > 0) {
          await tx.order.updateMany({
            where: { paymentId: params.paymentId, status: 'AWAITING_PAYMENT' },
            data: { status: 'PENDING' }
          });
          for (const order of basketOrders) {
            if (order.promoCodeId) {
              const promo = await tx.promoCode.findUnique({
                where: { id: order.promoCodeId },
                select: { isSuspicious: true }
              });
              const isSuspicious = promo?.isSuspicious ?? false;
              
              const existingUsage = await tx.promoCodeUsage.findUnique({
                where: { orderId: order.id }
              });
              
              if (!existingUsage) {
                await tx.promoCodeUsage.create({
                  data: {
                    promoCodeId: order.promoCodeId,
                    userId: params.userId,
                    orderId: order.id,
                    discountCents: order.discountCents,
                    revenueCents: BigInt(Number(order.charge)),
                    profitCents: BigInt(Number(order.charge - order.providerCost)),
                    isSuspicious,
                  }
                });
              }
            }
          }
          ids.push(...basketOrders.map(o => o.id));
        }
        
        return ids;
    });

    for (const id of updatedOrderIds) {
      await ordersQueue.add('order-dispatch', { orderId: id }, { jobId: `dispatch-${id}`, delay: 3 * 60 * 1000 });
    }

    return {
      paymentUrl: params.successUrl,
      remoteGatewayId: remoteId
    };
  }
}

class RobokassaGateway extends BasePaymentGateway {
  async createPayment(params: PaymentGatewayParams): Promise<PaymentGatewayResult> {
    if (params.amountRub <= 0 || Math.round(params.amountRub * 100) <= 0) {
      throw new Error('Сумма платежа должна быть больше 0');
    }

    const secrets = await SettingsManager.getPaymentSecrets();
    const login = secrets.robokassaLogin;
    const password = secrets.robokassaPassword;

    const isDummyKeys = !login || !password || login === 'test_login';

    if (isDummyKeys) {
      return {
        paymentUrl: `${await getBaseUrlAsync()}/api/dev/mock-payment?paymentId=${params.paymentId}${params.orderId ? `&orderId=${params.orderId}` : ''}`,
        remoteGatewayId: `mock_${Date.now()}`
      };
    }

    const outSum = params.amountRub.toFixed(2);
    const invId = 0; // Passed CUID in shp_paymentId

    // Robokassa signature formula: MerchantLogin:OutSum:InvId:MerchantPassword1:shp_paymentId=paymentId
    const sigStr = `${login}:${outSum}:${invId}:${password}:shp_paymentId=${params.paymentId}`;
    const signature = crypto.createHash('sha256').update(sigStr).digest('hex');

    const receipt = {
      items: [{
        name: "Информационные услуги",
        quantity: 1,
        sum: params.amountRub.toFixed(2),
        tax: "none",
        payment_method: "full_prepayment",
        payment_subject: "service"
      }]
    };

    const queryParams = new URLSearchParams({
      MerchantLogin: login,
      OutSum: outSum,
      InvId: invId.toString(),
      Description: params.description,
      SignatureValue: signature,
      shp_paymentId: params.paymentId,
      Receipt: JSON.stringify(receipt)
    });

    const robokassaUrl = `https://auth.robokassa.ru/Merchant/Index.aspx?${queryParams.toString()}`;

    return {
      paymentUrl: robokassaUrl,
      remoteGatewayId: `robo_${params.paymentId}`
    };
  }

  async checkStatusSync(gatewayId: string): Promise<boolean> {
    try {
      const paymentId = gatewayId.replace(/^robo_/i, '');
      const payment = await db.payment.findUnique({
        where: { id: paymentId }
      });
      return payment?.status === 'SUCCEEDED';
    } catch (e) {
      console.error('[RobokassaGateway] Error checking status:', e);
      return false;
    }
  }
}

class MockGateway extends BasePaymentGateway {
  async createPayment(params: PaymentGatewayParams): Promise<PaymentGatewayResult> {
    return {
      paymentUrl: `${await getBaseUrlAsync()}/api/dev/mock-payment?paymentId=${params.paymentId}${params.orderId ? `&orderId=${params.orderId}` : ''}`,
      remoteGatewayId: `mock_${Date.now()}`
    };
  }
}

export class PaymentGatewayFactory {
  static getGateway(gatewayName: string): BasePaymentGateway {
    switch (gatewayName.toLowerCase()) {
      case 'yookassa':
        return new YooKassaGateway();
      case 'robokassa':
        return new RobokassaGateway();
      case 'cryptobot':
        return new CryptoBotGateway();
      case 'balance':
        return new BalanceGateway();
      case 'mock':
        return new MockGateway();
      default:
        throw new Error(`Unsupported gateway: ${gatewayName}`);
    }
  }
}
