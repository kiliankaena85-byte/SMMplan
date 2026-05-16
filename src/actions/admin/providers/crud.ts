"use server";

import { db } from "@/lib/db";
import { requireStaffPermission } from "@/lib/server/rbac";
import { VaultService } from "@/lib/vault";
import { auditAdmin } from "@/lib/admin-audit";
import { providerService } from "@/services/providers/provider.service";
import { z } from "zod";

const providerSchema = z.object({
  name: z.string().min(1).max(255),
  apiUrl: z.string().url("Must be a valid URL"),
  apiKey: z.string(),
  isActive: z.boolean().default(false),
  balanceCurrency: z.string().length(3, "Use 3-letter ISO code like USD").toUpperCase(),
  httpMethod: z.enum(["GET", "POST"]),
  requestType: z.enum(["JSON", "FORM", "QUERY"]),
  headers: z.record(z.string()).default({})
});

const idSchema = z.string().min(1);

export async function createProvider(rawData: {
  name: string;
  apiUrl: string;
  apiKey: string;
  isActive: boolean;
  balanceCurrency: string;
  httpMethod: string;
  requestType: string;
  headers: Record<string, string>;
}) {
  return requireStaffPermission('providers', 'edit', async (admin) => {
    const data = providerSchema.parse(rawData);

    // Encrypt the API key before saving!
    const encryptedKey = VaultService.encrypt(data.apiKey);
    
    // Prepare metadata json
    const metadata = {
       httpMethod: data.httpMethod,
       requestType: data.requestType,
       headers: data.headers
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
  httpMethod: string;
  requestType: string;
  headers: Record<string, string>;
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
         httpMethod: data.httpMethod,
         requestType: data.requestType,
         headers: data.headers
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

            return { 
                success: true, 
                totalRub, 
                activeCount,
                errorCount
            };
        } catch (e: any) {
            return { success: false, error: e.message || "Failed to calculate global liquidity" };
        }
    });
}

