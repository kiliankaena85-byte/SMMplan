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
import { ApiMappingDTO } from '../admin/provider.service';
import { CircuitBreaker } from '@/lib/circuit-breaker';
import { z } from 'zod';

const ProviderServiceSchema = z.object({
  service: z.union([z.string(), z.number()]).transform(String),
  name: z.string().optional().default("Unknown Service"),
  category: z.string().optional().default("Unknown Category"),
  rate: z.union([z.string(), z.number()]).transform(String),
  min: z.union([z.string(), z.number()]).transform(String),
  max: z.union([z.string(), z.number()]).transform(String),
  type: z.string().optional().default("Default"),
  desc: z.string().optional(),
  description: z.string().optional(),
  dripfeed: z.union([z.number(), z.boolean(), z.string()]).optional(),
  refill: z.union([z.number(), z.boolean(), z.string()]).optional(),
  cancel: z.union([z.number(), z.boolean(), z.string()]).optional(),
}).passthrough();

const ProviderServicesArraySchema = z.array(ProviderServiceSchema);

export class UniversalProvider implements BaseProvider {
  private apiUrl: string;
  private apiKey: string;
  private mapping: ApiMappingDTO | null;
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  constructor(apiUrl: string, encryptedKey: string, metadata?: { mapping?: ApiMappingDTO | null }) {
    this.apiUrl = apiUrl;
    const decrypted = VaultService.decrypt(encryptedKey);
    this.apiKey = decrypted || encryptedKey;
    this.mapping = metadata?.mapping || null;
  }

  private extractNested(obj: any, path: string): any {
     if (!path || !obj || path === '$') return obj;
     return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  /**
   * Core request engine providing WAF bypass, correct Form serialization, and Timeout safety
   */
  private async request<T>(payload: Record<string, any>, retries = 2): Promise<T> {
    const params = new URLSearchParams();
    
    let authHeaderValue: string | undefined;
    if (this.mapping && this.mapping.auth) {
      const auth = this.mapping.auth;
      if (auth.type === 'body' || auth.type === 'query') {
        params.append(auth.field, (auth.prefix || '') + this.apiKey);
      } else if (auth.type === 'header') {
        authHeaderValue = (auth.prefix || '') + this.apiKey;
      }
    } else {
      params.append('key', this.apiKey); // Fallback standard v2
    }
    
    for (const [k, v] of Object.entries(payload)) {
      if (v !== undefined && v !== null) {
        params.append(k, v.toString());
      }
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      try {
        await CircuitBreaker.check(this.apiUrl);
        
        const httpMethod = this.mapping?.httpMethod || 'POST';
        const contentType = this.mapping?.contentType || 'form';
        
        const headers: Record<string, string> = {
          'User-Agent': this.userAgent,
          'Accept': 'application/json'
        };
        
        if (httpMethod === 'POST') {
          headers['Content-Type'] = contentType === 'json' ? 'application/json' : 'application/x-www-form-urlencoded';
        }
        
        if (authHeaderValue && this.mapping?.auth?.field) {
           headers[this.mapping.auth.field] = authHeaderValue;
        }

        let finalUrl = this.apiUrl;
        let body: string | undefined;

        if (httpMethod === 'GET') {
          const qs = params.toString();
          if (qs) {
            finalUrl = finalUrl.includes('?') ? `${finalUrl}&${qs}` : `${finalUrl}?${qs}`;
          }
        } else {
          if (contentType === 'json') {
            const jsonObj: Record<string, any> = {};
            params.forEach((value, key) => jsonObj[key] = value);
            body = JSON.stringify(jsonObj);
          } else {
            body = params.toString();
          }
        }

        const response = await fetch(finalUrl, {
          method: httpMethod,
          headers,
          body,
          signal: controller.signal
        });

        // Handle Rate Limits (429)
        if (response.status === 429) {
          if (attempt < retries) {
            const retryAfter = response.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 30000; // Default 30s for 429
            console.warn(`[API] 429 Rate Limit from ${this.apiUrl}. Waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          throw new Error(`Provider Rate Limit Exceeded (429)`);
        }

        // Handle Server Errors (50x)
        if (!response.ok) {
          if (response.status >= 500 && attempt < retries) {
             const backoff = Math.pow(2, attempt) * 1500; // 1.5s, 3s
             console.warn(`[API] ${response.status} Error from ${this.apiUrl}. Retrying in ${backoff}ms...`);
             await new Promise(resolve => setTimeout(resolve, backoff));
             continue;
          }
          throw new Error(`Provider HTTP Error: ${response.status}`);
        }

        const text = await response.text();
        try {
          const data = JSON.parse(text) as T;
          await CircuitBreaker.recordSuccess(this.apiUrl);
          return data;
        } catch (jsonErr) {
          throw new Error(`Provider returned invalid JSON: ${text.substring(0, 100)}...`);
        }

      } catch (error: any) {
        if (error.name === 'AbortError') {
           if (attempt < retries) {
              console.warn(`[API] Timeout from ${this.apiUrl}. Retrying...`);
              continue;
           }
           await CircuitBreaker.recordFailure(this.apiUrl);
           throw new Error('Provider Request Timeout (15s)');
        }
        
        // Don't record failure if the circuit was already OPEN
        if (error.name !== 'CircuitBreakerOpenException' && attempt === retries) {
          await CircuitBreaker.recordFailure(this.apiUrl);
        }

        if (attempt === retries) throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    }
    throw new Error('Max retries exceeded');
  }

  async getBalance(): Promise<ProviderBalanceDto> {
    const res = await this.request<any>({ action: 'balance' });
    
    if (this.mapping && this.mapping.balance) {
      const bPath = this.mapping.balance.balancePath || 'balance';
      const cPath = this.mapping.balance.currencyPath || 'currency';
      
      const balanceVal = this.extractNested(res, bPath);
      const currencyVal = this.extractNested(res, cPath);
      
      // Strict Schema Drift protection
      if (balanceVal === undefined) {
         throw new Error(`Schema Drift Error: Ожидался ключ баланса '${bPath}', но он не найден в ответе.`);
      }

      return {
        balance: balanceVal?.toString() || "0",
        currency: currencyVal?.toString() || "USD"
      };
    }

    // Standard Fallback
    if (res.error) throw new Error(res.error);
    return {
      balance: res.balance?.toString() || "0",
      currency: res.currency || "USD"
    };
  }

  async getServices(): Promise<ProviderServiceDto[]> {
    // Increase retries for large requests
    const res = await this.request<any>({ action: 'services' }, 3);
    
    let servicesArray: any[] = [];

    if (this.mapping && this.mapping.catalog) {
      const c = this.mapping.catalog;
      // Extract array based on itemsPath
      const extracted = this.extractNested(res, c.itemsPath || '');
      
      if (!Array.isArray(extracted)) {
         // Fallback: search for the first array if the explicit path failed
         const possibleArray = Object.values(res).find(Array.isArray);
         if (possibleArray) {
             servicesArray = possibleArray as any[];
         } else {
             throw new Error(`Schema Drift Error: Ожидался массив услуг по пути '${c.itemsPath || '$'}', но получен ${typeof extracted}`);
         }
      } else {
         servicesArray = extracted;
      }

      // Map dynamic fields to Canonical Schema
      servicesArray = servicesArray.map(item => ({
         service: this.extractNested(item, c.serviceIdField || 'service'),
         name: this.extractNested(item, c.nameField || 'name'),
         category: this.extractNested(item, c.typeField || 'category'), // Notice we map their category/type
         rate: this.extractNested(item, c.priceField || 'rate'),
         min: this.extractNested(item, c.minField || 'min'),
         max: this.extractNested(item, c.maxField || 'max'),
         type: this.extractNested(item, c.typeField || 'type'),
         desc: this.extractNested(item, c.descField || 'desc'),
         description: this.extractNested(item, c.descField || 'description'),
      }));

      // Schema Drift check on first item
      if (servicesArray.length > 0 && servicesArray[0].service === undefined) {
         throw new Error(`Schema Drift Error: Ожидался ключ ID услуги '${c.serviceIdField || 'service'}', но он не найден.`);
      }

    } else {
      // Standard Fallback
      if (res.error) throw new Error(res.error);
      if (!Array.isArray(res)) throw new Error('Invalid services payload');
      servicesArray = res;
    }
    
    // Zod validation to ensure no crash from malformed data
    try {
      const parsed = ProviderServicesArraySchema.parse(servicesArray);
      // Normalize 'description' to 'desc' if needed
      return parsed.map(s => ({
         ...s,
         desc: s.desc || s.description || ""
      })) as ProviderServiceDto[];
    } catch (err: any) {
      console.error("[API] Zod parsing failed for getServices:", err);
      throw new Error(`Provider schema validation failed: ${err.message}`);
    }
  }

  async createOrder(params: OrderCreationParams): Promise<ProviderOrderResponseDto> {
    let payload: any;
    
    if (this.mapping && this.mapping.order) {
      payload = { action: 'add' };
      payload[this.mapping.order.serviceField || 'service'] = params.service;
      payload[this.mapping.order.linkField || 'link'] = params.link;
      payload[this.mapping.order.quantityField || 'quantity'] = params.quantity;
      for (const [k, v] of Object.entries(params)) {
         if (!['service', 'link', 'quantity'].includes(k) && v !== undefined) {
             payload[k] = v;
         }
      }
    } else {
      payload = { action: 'add', ...params };
    }

    const res = await this.request<any>(payload);
    
    if (this.mapping && this.mapping.response) {
       const err = this.extractNested(res, this.mapping.response.errorField);
       if (err) throw new Error(err);
       
       const orderId = this.extractNested(res, this.mapping.response.orderIdField);
       if (!orderId) throw new Error("Order ID not found in provider response");
       
       return { order: orderId.toString() };
    } else {
       if (res.error) throw new Error(res.error);
       return res as ProviderOrderResponseDto;
    }
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
