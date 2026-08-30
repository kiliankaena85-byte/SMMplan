import { db } from '@/lib/db';
import { getBaseUrlAsync } from '@/utils/get-base-url';
import { SettingsProvider } from '@/lib/settings';
import { WalletOps } from './wallet-ops';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MutexManager } from '@/lib/redis-lock';
import crypto from 'crypto';

let vatThresholdCache: { result: boolean; expiresAt: number } | null = null;

/**
 * 54-ФЗ Fiscalization: Checks whether annual revenue exceeded 20M RUB across all tenants (tax exempt threshold).
 * Cached for 1 hour to reduce database aggregate load.
 */
export async function checkVatThreshold(): Promise<boolean> {
  const now = Date.now();
  if (vatThresholdCache && vatThresholdCache.expiresAt > now) {
    return vatThresholdCache.result;
  }

  const currentYear = new Date().getFullYear();
  const annualRevenue = await db.payment.aggregate({
    _sum: { amount: true },
    where: {
      status: 'SUCCEEDED',
      createdAt: { gte: new Date(currentYear, 0, 1) }
    }
  }).then(res => Number(res._sum.amount || 0));

  const isExceeded = annualRevenue >= 2000000000; // 20M RUB (2,000,000,000 cents)
  vatThresholdCache = { result: isExceeded, expiresAt: now + 3600 * 1000 };
  return isExceeded;
}


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
  metadata?: Record<string, unknown>;
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

    const secrets = await SettingsProvider.getPaymentSecrets();
    const shopId = secrets.yookassaShopId;
    const secretKey = secrets.yookassaSecretKey;

    const isDummyKeys = !shopId || !secretKey || shopId === 'test_shop_id' || shopId === 'test_shop_id_test' || secretKey === 'test_secret' || secretKey === 'test_secret_key';

    if (isDummyKeys) {
      throw new Error('Платёжный шлюз ЮKassa не настроен. Пожалуйста, укажите Shop ID и Secret Key в панели управления.');
    }

    const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
    
    const supportDomain = await SettingsProvider.getSupportEmailDomain();

    const payload: {
      amount: { value: string; currency: string };
      capture: boolean;
      confirmation: { type: string; return_url: string };
      description: string;
      metadata: Record<string, unknown>;
      receipt?: {
        customer: { email: string };
        items: Array<{
          description: string;
          quantity: string;
          amount: { value: string; currency: string };
          vat_code: number;
          payment_mode: string;
          payment_subject: string;
        }>;
      };
    } = {
      amount: { value: params.amountRub.toFixed(2), currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: params.successUrl },
      description: (params.description || "Оплата заказа").slice(0, 128),
      metadata: { paymentId: params.paymentId, userId: params.userId, orderId: params.orderId, ...params.metadata }
    };

    // 54-ФЗ Fiscalization Receipt (Included in both live & test mode for universal YooKassa compatibility)
    const isVatThresholdExceeded = await checkVatThreshold();
    const vatCode = isVatThresholdExceeded ? 10 : 1; // 10 = НДС 22% (п. 3 ст. 164 НК РФ), 1 = Без НДС

    payload.receipt = {
      customer: { email: (params.email?.trim() || `no-reply@${supportDomain}`).slice(0, 64) },
      items: [{
        description: (params.description || "Информационные услуги").slice(0, 128),
        quantity: "1.00",
        amount: { value: params.amountRub.toFixed(2), currency: 'RUB' },
        vat_code: vatCode,
        payment_mode: "full_prepayment",
        payment_subject: "service"
      }]
    };

    const idempString = `yookassa_${params.userId}_${params.paymentId}_${Math.floor(Date.now() / 60000)}`;
    const idempKey = crypto.createHash('sha256').update(idempString).digest('hex').substring(0, 36);

    // Test mode bypass for development & CI verification
    if (params.isTestMode) {
      return {
        paymentUrl: `${params.successUrl}${params.successUrl.includes('?') ? '&' : '?'}testMode=true&paymentId=${params.paymentId}`,
        remoteGatewayId: `test_yk_${params.paymentId}`
      };
    }

    let resp: Response;
    try {
      resp = await fetch('https://api.yookassa.ru/v3/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          'Idempotence-Key': idempKey
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });
    } catch (netErr: unknown) {
      console.error('[YooKassaGateway] Connection failed:', netErr);
      throw new Error('Ошибка соединения со шлюзом ЮKassa. Сервер оплаты временно недоступен — попробуйте СБП или CryptoBot.');
    }

    if (!resp.ok) {
      const errBody = await resp.text();
      console.error('[YooKassaGateway] API Error:', resp.status, errBody);
      let descriptiveError = 'Ошибка шлюза YooKassa';
      try {
        const parsed = JSON.parse(errBody);
        if (parsed.description) {
          descriptiveError = `YooKassa: ${parsed.description}`;
        } else if (parsed.code) {
          descriptiveError = `YooKassa (${parsed.code})`;
        }
      } catch {
        descriptiveError = `YooKassa HTTP ${resp.status}`;
      }
      throw new Error(descriptiveError);
    }

    const data = await resp.json();
    return {
      paymentUrl: data.confirmation.confirmation_url,
      remoteGatewayId: data.id
    };
  }

  async checkStatusSync(gatewayId: string): Promise<boolean> {
    try {
      const secrets = await SettingsProvider.getPaymentSecrets();
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

    const secrets = await SettingsProvider.getPaymentSecrets();
    const cryptoToken = secrets.cryptoBotToken;

    const isDummyKeys = !cryptoToken || cryptoToken === 'test_token' || cryptoToken === 'test_bot_token' || cryptoToken === 'test_shop_id' || cryptoToken === 'test_login' || cryptoToken.startsWith('test_') || cryptoToken.trim().length === 0;

    if (isDummyKeys) {
      throw new Error('Платёжный шлюз CryptoBot не настроен. Пожалуйста, укажите действующий API токен в панели управления.');
    }

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
      const secrets = await SettingsProvider.getPaymentSecrets();
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
    const { ordersQueue } = await import('@/lib/queue-manager');

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
    }, { isolationLevel: 'Serializable', timeout: 15000 });

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

    const secrets = await SettingsProvider.getPaymentSecrets();
    const login = secrets.robokassaLogin;
    const password = secrets.robokassaPassword;

    const isDummyKeys = !login || !password || login === 'test_login' || login.trim().length === 0 || password.trim().length === 0;

    if (isDummyKeys) {
      throw new Error('Платёжный шлюз Робокасса не настроен. Пожалуйста, укажите Merchant Login и Пароль в панели управления.');
    }

    const outSum = params.amountRub.toFixed(2);
    const invId = 0; // Passed CUID in shp_paymentId

    // Robokassa signature formula: MerchantLogin:OutSum:InvId:MerchantPassword1:shp_paymentId=paymentId
    const sigStr = `${login}:${outSum}:${invId}:${password}:shp_paymentId=${params.paymentId}`;
    const signature = crypto.createHash('sha256').update(sigStr).digest('hex');

    // Подсчитываем оборот за год для переключения НДС 22% (ФЗ № 425-ФЗ, ФЗ № 176-ФЗ, ст. 145, 164 НК РФ)
    const isVatThresholdExceeded = await checkVatThreshold();
    const taxRate = isVatThresholdExceeded ? "vat22" : "none"; // vat22 = 22% (п. 3 ст. 164 НК РФ), none = без НДС

    const receipt = {
      items: [{
        name: "Информационные услуги",
        quantity: 1,
        sum: params.amountRub.toFixed(2),
        tax: taxRate,
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
      paymentUrl: params.successUrl || `${await getBaseUrlAsync()}/dashboard/add-funds?success=1`,
      remoteGatewayId: `mock_${Date.now()}`
    };
  }
}

export class PaymentGatewayFactory {
  static getGateway(gatewayName: string): BasePaymentGateway {
    switch (gatewayName.toLowerCase()) {
      case 'yookassa':
      case 'sbp':
      case 'card':
      case 'mir':
      case 'yoomoney':
        return new YooKassaGateway();
      case 'robokassa':
      case 'robo':
        return new RobokassaGateway();
      case 'cryptobot':
      case 'crypto':
      case 'usdt':
      case 'ton':
        return new CryptoBotGateway();
      case 'balance':
        return new BalanceGateway();
      case 'mock':
        return new MockGateway();
      default:
        // Fallback to YooKassa if unknown card/payment method passed
        return new YooKassaGateway();
    }
  }
}
