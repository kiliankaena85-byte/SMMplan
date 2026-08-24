import { Provider } from '@prisma/client';
import { BaseProvider, ProviderServiceDto } from './base-provider';
import { getBaseUrlAsync } from '@/utils/get-base-url';
import { db } from '@/lib/db';
import { SettingsManager } from '@/lib/settings';
import { UniversalProvider } from './universal.provider';
import { VaultService } from '@/lib/vault';
import { redis } from '@/lib/redis';
import type { ProxyConfig } from '@/types/provider-proxy';

export class ProviderService {
  /**
   * Retrieves all active providers from DB
   */
  async getActiveProviders(): Promise<Provider[]> {
    return db.provider.findMany({ where: { isActive: true } });
  }

  /**
   * Resolves proxy config from DB for a given provider
   */
  private async resolveProxyConfig(provider: Provider): Promise<ProxyConfig | null> {
    if (!provider.proxyId) return null;
    try {
      const proxy = await db.providerProxy.findUnique({
        where: { id: provider.proxyId, isActive: true },
      });
      if (!proxy) return null;

      // Decrypt password in memory
      let password: string | undefined;
      if (proxy.passwordEncrypted) {
        try {
          password = VaultService.decrypt(proxy.passwordEncrypted);
        } catch {
          console.warn(`[Proxy] Failed to decrypt password for proxy ${proxy.id}, falling back to direct`);
          return null;
        }
      }

      return {
        protocol: proxy.protocol as 'http' | 'https' | 'socks5',
        host: proxy.host,
        port: proxy.port,
        username: proxy.username || undefined,
        password,
      };
    } catch (err) {
      console.warn(`[Proxy] Error resolving proxy for provider ${provider.id}:`, err);
      return null;
    }
  }

  /**
   * Main Factory Method — resolves and passes proxy config to UniversalProvider
   */
  async getProviderInstance(config: Provider): Promise<BaseProvider> {
    let decryptedKey: string;
    try {
      decryptedKey = VaultService.decrypt(config.apiKey);
    } catch {
      decryptedKey = config.apiKey;
    }

    const proxyConfig = await this.resolveProxyConfig(config);

    return new UniversalProvider(
      config.apiUrl,
      decryptedKey || config.apiKey,
      (config.metadata as Record<string, unknown> | undefined),
      proxyConfig,
    );
  }

  /**
   * Retrieves services from the provider, utilizing a Redis cache (24-hour expiration)
   * unless forceRefresh is true.
   */
  async getServicesWithCache(
    config: Provider,
    providerInstance: BaseProvider,
    forceRefresh = false
  ): Promise<ProviderServiceDto[]> {
    const cacheKey = `provider:${config.id}:catalog`;

    if (!forceRefresh) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as ProviderServiceDto[];
        }
      } catch (err) {
        console.warn(`[Redis Cache] Failed to read ${cacheKey}:`, err);
      }
    }

    const rawServices = await providerInstance.getServices();

    try {
      await redis.set(cacheKey, JSON.stringify(rawServices), 'EX', 24 * 60 * 60);
    } catch (err) {
      console.warn(`[Redis Cache] Failed to write ${cacheKey}:`, err);
    }

    return rawServices;
  }

  /**
   * Factory for background workers (order/sync processors).
   * In test mode, redirects ALL provider traffic to the internal mock-provider API.
   * This protects real provider balance from being charged during QA testing.
   */
  async getWorkerProviderInstance(config: Provider): Promise<BaseProvider> {
    const isTest = await SettingsManager.isTestMode();
    if (isTest) {
      const mockKey = process.env.MOCK_PROVIDER_KEY;
      if (!mockKey) {
        throw new Error('MOCK_PROVIDER_KEY is not set. Configure it in .env to use test mode.');
      }
      const baseUrl = await getBaseUrlAsync();
      return new UniversalProvider(
        `${baseUrl}/api/dev/mock-provider`,
        mockKey,
        (config.metadata as Record<string, unknown> | undefined),
      );
    }

    let decryptedKey: string;
    try {
      decryptedKey = VaultService.decrypt(config.apiKey);
    } catch {
      decryptedKey = config.apiKey;
    }

    const proxyConfig = await this.resolveProxyConfig(config);

    return new UniversalProvider(
      config.apiUrl,
      decryptedKey || config.apiKey,
      (config.metadata as Record<string, unknown> | undefined),
      proxyConfig,
    );
  }

  /**
   * Auto-resolves the default provider
   */
  async getDefaultProvider(): Promise<BaseProvider> {
    const provider = await db.provider.findFirst({
      where: { isActive: true },
    });

    if (!provider) {
      throw new Error('No active providers found in the database. Please add one (e.g., Vexboost).');
    }

    return await this.getProviderInstance(provider);
  }
}

// Singleton export
export const providerService = new ProviderService();
