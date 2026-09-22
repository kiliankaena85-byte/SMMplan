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
  private readonly name: string;

  constructor(name: string = 'Mock Provider (Песочница API)') {
    this.name = name;
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
        max: '1000',
        type: 'Default',
        desc: 'Безопасный тестовый буст на 7 дней для проверки витрины и чекаута.',
        dripfeed: true,
      },
      {
        service: 'mock_boost_14d',
        name: 'Telegram Бусты для каналов — На 14 дней (Тест)',
        category: 'Бусты для каналов',
        rate: '1.00',
        min: '1',
        max: '1000',
        type: 'Default',
        desc: 'Безопасный тестовый буст на 14 дней для проверки витрины и чекаута.',
        dripfeed: true,
      },
      {
        service: 'mock_boost_30d',
        name: 'Telegram Бусты для каналов — На 30 дней (Тест)',
        category: 'Бусты для каналов',
        rate: '1.00',
        min: '1',
        max: '1000',
        type: 'Default',
        desc: 'Безопасный тестовый буст на 30 дней для проверки витрины и чекаута.',
        dripfeed: true,
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
    return {
      order: externalOrderId,
      status: 'pending',
    };
  }

  async getOrderStatus(orderId: string | number): Promise<ProviderOrderStatusDto> {
    const idStr = String(orderId);
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
      result[idStr] = {
        order: idStr,
        status: 'Completed',
        charge: '1.00',
        start_count: '100',
        remains: '0',
      };
    }
    return result;
  }

  async cancelOrder(_orderId: string | number): Promise<ProviderCancelResultDto> {
    return { success: true };
  }

  async refill(orderId: string | number): Promise<{ refill?: string | number; error?: string }> {
    return { refill: `mock_refill_${orderId}_${Date.now()}` };
  }

  async getRefillStatus(refillId: string | number): Promise<{ status?: string; error?: string }> {
    return { status: 'Completed' };
  }
}
