import { VaultService } from '../../lib/vault';
import { 
  BaseProvider, 
  OrderCreationParams, 
  ProviderBalanceDto, 
  ProviderMultiStatusResponse, 
  ProviderOrderResponseDto, 
  ProviderOrderStatusDto, 
  ProviderServiceDto 
} from './base-provider';
import { CircuitBreaker } from '@/lib/circuit-breaker';

export class UniversalProvider implements BaseProvider {
  private apiUrl: string;
  private apiKey: string;
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  constructor(apiUrl: string, encryptedKey: string) {
    this.apiUrl = apiUrl;
    // Decrypt in RAM just-in-time
    const decrypted = VaultService.decrypt(encryptedKey);
    this.apiKey = decrypted || encryptedKey; // Fallback to raw key for testing if decryption returns null
  }

  /**
   * Core request engine providing WAF bypass, correct Form serialization, and Timeout safety
   */
  private async request<T>(payload: Record<string, any>): Promise<T> {
    const params = new URLSearchParams();
    params.append('key', this.apiKey);
    
    for (const [k, v] of Object.entries(payload)) {
      if (v !== undefined && v !== null) {
        params.append(k, v.toString());
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds circuit breaker

    // 1. Check Circuit Breaker before firing
    await CircuitBreaker.check(this.apiUrl);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        },
        body: params.toString(),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Provider HTTP Error: ${response.status}`);
      }

      const text = await response.text();
      try {
        const data = JSON.parse(text) as T;
        // Request succeeded, register success
        await CircuitBreaker.recordSuccess(this.apiUrl);
        return data;
      } catch (jsonErr) {
        throw new Error(`Provider returned invalid JSON: ${text.substring(0, 50)}...`);
      }
    } catch (error: any) {
      // Don't record failure if the circuit was already OPEN and we just threw an exception locally
      if (error.name !== 'CircuitBreakerOpenException') {
        await CircuitBreaker.recordFailure(this.apiUrl);
      }

      if (error.name === 'AbortError') {
        throw new Error('Provider Request Timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getBalance(): Promise<ProviderBalanceDto> {
    const res = await this.request<any>({ action: 'balance' });
    if (res.error) throw new Error(res.error);
    return {
      balance: res.balance?.toString() || "0",
      currency: res.currency || "USD"
    };
  }

  async getServices(): Promise<ProviderServiceDto[]> {
    const res = await this.request<any>({ action: 'services' });
    if (res.error) throw new Error(res.error);
    if (!Array.isArray(res)) throw new Error('Invalid services payload');
    return res as ProviderServiceDto[];
  }

  async createOrder(params: OrderCreationParams): Promise<ProviderOrderResponseDto> {
    const payload = { action: 'add', ...params };
    return await this.request<ProviderOrderResponseDto>(payload);
  }

  async getOrderStatus(orderId: string | number): Promise<ProviderOrderStatusDto> {
    const res = await this.request<any>({ action: 'status', order: orderId });
    if (res.error) throw new Error(res.error);
    if (typeof res === 'string') throw new Error(res); // Handles weird APIs returning string exact errors
    return res as ProviderOrderStatusDto;
  }

  async getMultiOrderStatus(orderIds: (string | number)[]): Promise<ProviderMultiStatusResponse> {
    if (orderIds.length === 0) return {};
    const res = await this.request<any>({ action: 'status', orders: orderIds.join(',') });
    if (res.error) throw new Error(res.error);
    return res as ProviderMultiStatusResponse;
  }
}
