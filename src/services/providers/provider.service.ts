import { Provider } from '@prisma/client';
import { BaseProvider } from './base-provider';
import { db } from '@/lib/db';
import { SettingsManager } from '@/lib/settings';
import { UniversalProvider } from './universal.provider';
import { CryptoService } from '@/lib/crypto';

export class ProviderService {
  /**
   * Retrieves all active providers from DB
   */
  async getActiveProviders(): Promise<Provider[]> {
    return db.provider.findMany({ where: { isActive: true } });
  }

  /**
   * Main Factory Method
   * Returns instance of BaseProvider based on provider config
   */
  async getProviderInstance(config: Provider): Promise<BaseProvider> {
    // Decrypt the API Key before passing it to the provider
    const decryptedKey = CryptoService.decrypt(config.apiKey);

    return new UniversalProvider(config.apiUrl, decryptedKey || config.apiKey);
  }

  /**
   * Factory for background workers (order/sync processors).
   * In test mode, redirects ALL provider traffic to the internal mock-provider API.
   * This protects real provider balance from being charged during QA testing.
   * 
   * IMPORTANT: Do NOT use this for admin functions (catalog import, balance check).
   * Those must always hit the real provider — use getProviderInstance() instead.
   */
  async getWorkerProviderInstance(config: Provider): Promise<BaseProvider> {
    const isTest = await SettingsManager.isTestMode();
    if (isTest) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return new UniversalProvider(`${baseUrl}/api/dev/mock-provider`, 'test');
    }
    // Production path: decrypt and use real provider
    const decryptedKey = CryptoService.decrypt(config.apiKey);
    return new UniversalProvider(config.apiUrl, decryptedKey || config.apiKey);
  }

  /**
   * Auto-resolves the default provider (for Smmplan Lite, we usually have one)
   */
  async getDefaultProvider(): Promise<BaseProvider> {
    const provider = await db.provider.findFirst({
      where: { isActive: true }
    });
    
    if (!provider) {
      throw new Error('No active providers found in the database. Please add one (e.g., Vexboost).');
    }

    return await this.getProviderInstance(provider);
  }
}

// Singleton export
export const providerService = new ProviderService();
