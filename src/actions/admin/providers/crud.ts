"use server";

import { db } from "@/lib/db";
import { requireStaffPermission } from "@/lib/server/rbac";
import { VaultService } from "@/lib/vault";
import { auditAdmin } from "@/lib/admin-audit";
import { providerService } from "@/services/providers/provider.service";
import { z } from "zod";

const apiMappingSchema = z.object({
  httpMethod: z.enum(['GET', 'POST']).optional().default('POST'),
  contentType: z.enum(['form', 'json']).optional().default('form'),
  auth: z.object({
    type: z.enum(['body', 'query', 'header']),
    field: z.string().min(1),
    prefix: z.string().optional()
  }),
  order: z.object({
    serviceField: z.string().min(1),
    linkField: z.string().min(1),
    quantityField: z.string().min(1),
  }),
  response: z.object({
    orderIdField: z.string().min(1),
    errorField: z.string().min(1),
  }),
  catalog: z.object({
    itemsPath: z.string().optional(),
    serviceIdField: z.string().optional(),
    nameField: z.string().optional(),
    priceField: z.string().optional(),
    minField: z.string().optional(),
    maxField: z.string().optional(),
    typeField: z.string().optional(),
    descField: z.string().optional(),
  }).optional(),
  balance: z.object({
    balancePath: z.string().optional(),
    currencyPath: z.string().optional(),
  }).optional()
});

const providerSchema = z.object({
  name: z.string().min(1).max(255),
  apiUrl: z.string().url("Must be a valid URL"),
  apiKey: z.string(),
  isActive: z.boolean().default(false),
  balanceCurrency: z.string().length(3, "Use 3-letter ISO code like USD").toUpperCase(),
  mapping: apiMappingSchema.nullable().optional(),
});

const idSchema = z.string().min(1);

export async function createProvider(rawData: {
  name: string;
  apiUrl: string;
  apiKey: string;
  isActive: boolean;
  balanceCurrency: string;
  mapping?: any;
}) {
  return requireStaffPermission('providers', 'edit', async (admin) => {
    const data = providerSchema.parse(rawData);

    // Encrypt the API key before saving!
    const encryptedKey = VaultService.encrypt(data.apiKey);
    
    // Prepare metadata json
    const metadata = {
       mapping: data.mapping || null
    };

    const provider = await db.provider.create({
      data: {
        name: data.name,
        apiUrl: data.apiUrl,
        apiKey: encryptedKey,
        isActive: data.isActive,
        balanceCurrency: data.balanceCurrency,
        metadata: metadata,
      }
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "PROVIDER_CREATE",
      target: provider.id,
      targetType: "PROVIDER",
      newValue: { name: provider.name, apiUrl: provider.apiUrl }
    });

    return { success: true, error: undefined, providerId: provider.id };
  });
}

export async function updateProvider(rawId: string, rawData: {
  name: string;
  apiUrl: string;
  apiKey?: string; // If empty, we don't update
  isActive: boolean;
  balanceCurrency: string;
  mapping?: any;
}) {
  return requireStaffPermission('providers', 'edit', async (admin) => {
    const id = idSchema.parse(rawId);
    
    // Create an update schema dynamically to allow empty apikey
    const updateSchema = providerSchema.extend({
      apiKey: z.string().optional()
    });
    const data = updateSchema.parse(rawData);
    
    const updateData: any = {
      name: data.name,
      apiUrl: data.apiUrl,
      isActive: data.isActive,
      balanceCurrency: data.balanceCurrency,
      metadata: {
         mapping: data.mapping || null
      }
    };

    if (data.apiKey && data.apiKey.trim() !== "") {
       updateData.apiKey = VaultService.encrypt(data.apiKey);
    }

    const provider = await db.provider.update({
      where: { id },
      data: updateData
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "PROVIDER_UPDATE",
      target: provider.id,
      targetType: "PROVIDER",
      newValue: { name: provider.name, isActive: provider.isActive }
    });

    return { success: true, error: undefined };
  });
}

async function deleteProvider(rawId: string) {
    return requireStaffPermission('providers', 'edit', async (admin) => {
      const id = idSchema.parse(rawId);
      // Check if it has related services
      const count = await db.service.count({ where: { providerId: id } });
      if (count > 0) {
         return { success: false, error: `Cannot delete provider. It is used by ${count} services. Reassign them first.` };
      }

      await db.provider.delete({ where: { id } });

      auditAdmin({
          adminId: admin.id,
          adminEmail: admin.email,
          action: "PROVIDER_DELETE",
          target: id,
          targetType: "PROVIDER",
      });

      return { success: true, error: undefined };
    });
}

export async function checkProviderConnection(rawId: string) {
    return requireStaffPermission('providers', 'view', async () => {
        try {
            const id = idSchema.parse(rawId);
            const providerRecord = await db.provider.findUnique({ where: { id } });
            if (!providerRecord) throw new Error("Provider not found");
            
            const instance = await providerService.getProviderInstance(providerRecord);
            
            // 🌊 WAVE 3.1: Network Timeout Protection
            // Force a 5-second timeout so the UI gets a clean error instead of 504 Gateway Timeout
            const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error("Таймаут ожидания ответа провайдера (5 сек)")), 5000)
            );
            const balanceData = await Promise.race([
                instance.getBalance(),
                timeoutPromise
            ]);
            
            return { 
                success: true, 
                balance: balanceData.balance, 
                currency: balanceData.currency 
            };
        } catch (e: any) {
            return { success: false, error: e.message || "Connection failed" };
        }
    });
}

export async function getGlobalProviderLiquidity() {
    return requireStaffPermission('providers', 'view', async () => {
        try {
            const providers = await db.provider.findMany({ where: { isActive: true } });
            
            // Get exchange rate directly from SettingsManager/Provider to unify currency to RUB
            const { SettingsProvider } = await import('@/lib/settings');
            const usdRate = await SettingsProvider.getExchangeRateUSD();
            
            let totalRub = 0;
            let activeCount = 0;
            let errorCount = 0;

            await Promise.allSettled(providers.map(async (provider) => {
                try {
                    const instance = await providerService.getProviderInstance(provider);
                    
                    const timeoutPromise = new Promise<never>((_, reject) => 
                        setTimeout(() => reject(new Error("Timeout")), 5000)
                    );
                    const balanceData = await Promise.race([
                        instance.getBalance(),
                        timeoutPromise
                    ]);
                    
                    const balance = parseFloat(balanceData.balance) || 0;
                    const currency = (balanceData.currency || provider.balanceCurrency || 'RUB').toUpperCase();

                    if (currency === 'USD') {
                        totalRub += (balance * usdRate);
                    } else if (currency === 'RUB') {
                        totalRub += balance;
                    } else if (currency === 'EUR') {
                        // Rough approx if EUR is ever used, though Smmplan standard is USD/RUB
                        totalRub += (balance * usdRate * 1.08); 
                    }
                    activeCount++;
                } catch (e) {
                    console.error(`Failed to fetch balance for provider ${provider.name}:`, e);
                    errorCount++;
                }
            }));

            // Calculate Burn Rate (Provider cost spent in last 24h)
            const yesterday = new Date();
            yesterday.setHours(yesterday.getHours() - 24);
            
            const recentOrders = await db.order.findMany({
                where: {
                    createdAt: { gte: yesterday },
                    status: { notIn: ['ERROR', 'CANCELED'] }
                },
                select: { providerCost: true }
            });

            // providerCost is in Cents (RUB)
            const burnRate24hCents = recentOrders.reduce((sum, order) => sum + Number(order.providerCost || 0), 0);
            const burnRate24hRub = burnRate24hCents / 100;

            return { 
                success: true, 
                totalRub, 
                activeCount,
                errorCount,
                burnRate24h: burnRate24hRub
            };
        } catch (e: any) {
            return { success: false, error: e.message || "Failed to calculate global liquidity" };
        }
    });
}

/**
 * Server Action for Zombie Eraser
 * Triggers a manual synchronization of the provider's catalog to find deleted/reappeared services.
 */
export async function syncProviderCatalogAction(rawId: string) {
    return requireStaffPermission('providers', 'edit', async (admin) => {
        try {
            const id = idSchema.parse(rawId);
            const { adminCatalogService } = await import('@/services/admin/catalog.service');
            
            const stats = await adminCatalogService.syncProviderCatalog(id, admin);
            
            return {
                success: true,
                stats
            };
        } catch (e: any) {
            return { success: false, error: e.message || "Синхронизация не удалась" };
        }
    });
}

export async function inferProviderSchema(apiUrl: string, apiKey: string, httpMethod: 'GET'|'POST', contentType: 'form'|'json', authConfig: any, providerId?: string) {
    return requireStaffPermission('providers', 'edit', async () => {
        try {
            let finalApiKey = apiKey;
            if (!finalApiKey && providerId) {
                const existing = await db.provider.findUnique({ where: { id: providerId } });
                if (existing && existing.apiKey) {
                    finalApiKey = VaultService.decrypt(existing.apiKey);
                }
            }

            const providerService = (await import('@/services/providers/provider.service')).providerService;
            const mockProvider = {
                id: 'mock',
                name: 'Mock',
                apiUrl,
                apiKey: VaultService.encrypt(finalApiKey),
                balanceCurrency: 'USD',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: {
                    mapping: {
                        httpMethod,
                        contentType,
                        auth: authConfig
                    }
                }
            };
            
            const instance = await providerService.getProviderInstance(mockProvider as any);
            const servicesResponse = await (instance as any).request({ action: 'services' }, 0);
            
            let servicesKeys: string[] = [];
            let itemsPath = '$';
            
            if (Array.isArray(servicesResponse) && servicesResponse.length > 0) {
                servicesKeys = Object.keys(servicesResponse[0]);
            } else if (typeof servicesResponse === 'object' && servicesResponse !== null) {
                for (const [key, val] of Object.entries(servicesResponse)) {
                    if (Array.isArray(val) && val.length > 0) {
                        itemsPath = key;
                        servicesKeys = Object.keys(val[0]);
                        break;
                    }
                }
            }

            const balanceResponse = await (instance as any).request({ action: 'balance' }, 0);
            let balanceKeys: string[] = [];
            if (typeof balanceResponse === 'object' && balanceResponse !== null) {
                balanceKeys = Object.keys(balanceResponse);
            }

            return {
                success: true,
                schema: {
                    catalog: { itemsPath, keys: servicesKeys },
                    balance: { keys: balanceKeys }
                }
            };
        } catch (e: any) {
            return { success: false, error: e.message || "Failed to infer schema" };
        }
    });
}
