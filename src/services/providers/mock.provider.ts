import {
  BaseProvider,
  OrderCreationParams,
  ProviderBalanceDto,
  ProviderCancelResultDto,
  ProviderMultiStatusResponse,
  ProviderOrderResponseDto,
  ProviderOrderStatusDto,
  ProviderServiceDto,
} from './base-provider';

/**
 * 🧪 MockProvider (Песочница API / Тест-провайдер)
 * In-memory provider emulator for safe development, testing, and staging.
 * Guarantees zero real balance deductions and zero external network calls.
 */
export class MockProvider implements BaseProvider {
  public readonly name: string;
  public readonly apiUrl: string;
  public readonly apiKey: string;

  private static orderStore = new Map<string, ProviderOrderStatusDto>();

  constructor(
    name: string = 'Mock Provider (Песочница API)',
    apiUrl: string = 'https://mock-provider.internal/api/v2',
    apiKey: string = 'dev_mock_provider_secret_key_2026'
  ) {
    this.name = name;
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  /**
   * Clears in-memory mock order storage (for test teardowns)
   */
  static resetOrderStore(): void {
    MockProvider.orderStore.clear();
  }

  async getBalance(): Promise<ProviderBalanceDto> {
    return {
      balance: '999999.00',
      currency: 'RUB',
    };
  }

  async getServices(): Promise<ProviderServiceDto[]> {
    return [
      {
        service: 'mock_boost_7d',
        name: 'Telegram Бусты для каналов — На 7 дней (Тест)',
        category: 'Бусты для каналов',
        rate: '1.00',
        min: '1',
        max: '100000',
        type: 'Default',
        desc: 'Безопасный тестовый буст на 7 дней для проверки витрины и чекаута.',
        dripfeed: true,
        cancel: true,
        refill: false,
      },
      {
        service: 'mock_boost_14d',
        name: 'Telegram Бусты для каналов — На 14 дней (Тест)',
        category: 'Бусты для каналов',
        rate: '1.00',
        min: '1',
        max: '100000',
        type: 'Default',
        desc: 'Безопасный тестовый буст на 14 дней для проверки витрины и чекаута.',
        dripfeed: true,
        cancel: true,
        refill: false,
      },
      {
        service: 'mock_boost_30d',
        name: 'Telegram Бусты для каналов — На 30 дней (Тест)',
        category: 'Бусты для каналов',
        rate: '1.00',
        min: '1',
        max: '100000',
        type: 'Default',
        desc: 'Безопасный тестовый буст на 30 дней для проверки витрины и чекаута.',
        dripfeed: true,
        cancel: true,
        refill: false,
      },
      {
        service: 'mock_subscribers_std',
        name: 'Telegram Подписчики (Тест)',
        category: 'Подписчики',
        rate: '0.10',
        min: '10',
        max: '100000',
        type: 'Default',
        desc: 'Тестовые подписчики для проверки оформления заказа.',
        dripfeed: true,
        cancel: true,
        refill: false,
      },
    ];
  }

  async createOrder(params: OrderCreationParams): Promise<ProviderOrderResponseDto> {
    const link = params.link || '';

    // Error simulation paths for resilience testing
    if (link.includes('fail-create')) {
      return { error: 'Mock Provider: Simulated order creation failure' };
    }
    if (link.includes('timeout')) {
      throw new Error('Mock Provider: Simulated network timeout');
    }

    const externalOrderId = `mock_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const initialStatus: ProviderOrderStatusDto = {
      order: externalOrderId,
      status: 'Completed',
      charge: '1.00',
      start_count: '100',
      remains: '0',
    };
    MockProvider.orderStore.set(externalOrderId, initialStatus);

    return {
      order: externalOrderId,
      status: 'pending',
    };
  }

  async getOrderStatus(orderId: string | number): Promise<ProviderOrderStatusDto> {
    const idStr = String(orderId);
    const existing = MockProvider.orderStore.get(idStr);
    if (existing) {
      return existing;
    }
    return {
      order: idStr,
      status: 'Completed',
      charge: '1.00',
      start_count: '100',
      remains: '0',
    };
  }

  async getMultiOrderStatus(orderIds: (string | number)[]): Promise<ProviderMultiStatusResponse> {
    const result: ProviderMultiStatusResponse = {};
    for (const id of orderIds) {
      const idStr = String(id);
      const existing = MockProvider.orderStore.get(idStr);
      result[idStr] = existing || {
        order: idStr,
        status: 'Completed',
        charge: '1.00',
        start_count: '100',
        remains: '0',
      };
    }
    return result;
  }

  async cancelOrder(orderId: string | number): Promise<ProviderCancelResultDto> {
    const idStr = String(orderId);
    const existing = MockProvider.orderStore.get(idStr);
    if (existing) {
      existing.status = 'Canceled';
    } else {
      MockProvider.orderStore.set(idStr, {
        order: idStr,
        status: 'Canceled',
        charge: '0.00',
        start_count: '0',
        remains: '0',
      });
    }
    return { success: true };
  }

  async refill(orderId: string | number): Promise<{ refill?: string | number; error?: string }> {
    return { refill: `mock_refill_${orderId}_${Date.now()}` };
  }

  async getRefillStatus(refillId: string | number): Promise<{ status?: string; error?: string }> {
    return { status: 'Completed' };
  }
}
