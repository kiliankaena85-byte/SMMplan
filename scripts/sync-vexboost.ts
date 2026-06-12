import { db } from "../src/lib/db";
import { providerService } from "../src/services/providers/provider.service";
import { SmartAnalyzerLogic, CATEGORY_LABELS } from "../src/services/providers/smart-analyzer.logic";
import { SettingsManager } from "../src/lib/settings";
import { applyPostSyncRules } from "../src/services/providers/post-sync-rules";
import { inferTargetTypeFromCategory } from "../src/utils/target-type";

function sanitizeText(text: string | null | undefined): string {
  if (!text) return "";
  let sanitized = text;
  
  // Replace website domains with our own or remove them
  sanitized = sanitized.replace(/https?:\/\/(www\.)?vexboost\.[a-z]+/gi, 'https://smmplan.pro');
  sanitized = sanitized.replace(/vexboost\.[a-z]+/gi, 'smmplan.pro');
  
  // Replace brand names case-insensitively
  sanitized = sanitized.replace(/vexboost/gi, 'Smmplan');
  sanitized = sanitized.replace(/вексбуст/gi, 'Smmplan');
  
  // Clean up other potential SMM provider brands
  sanitized = sanitized.replace(/hqsmm/gi, 'Smmplan');
  sanitized = sanitized.replace(/cheapsmm/gi, 'Smmplan');
  sanitized = sanitized.replace(/smm-panel/gi, 'Smmplan');
  
  return sanitized.trim();
}

async function main() {
  console.log("Starting Vexboost Sync Script...");

  const dbProvider = await db.provider.findFirst({ where: { isActive: true } });
  if (!dbProvider) {
    console.error("No active provider found in DB.");
    return;
  }
  const provider = await providerService.getDefaultProvider();
  if (!provider) {
    console.error("No primary provider found.");
    return;
  }

  const settings = await db.systemSettings.findUnique({ where: { id: "global" } });
  const quarantineThreshold = settings?.quarantineThreshold ?? 0.20;
  const usdToRub = await SettingsManager.getExchangeRateUSD();
  const isRubProvider = dbProvider.balanceCurrency === 'RUB';

  console.log(`Provider: ${dbProvider.name} | Currency: ${dbProvider.balanceCurrency} | Cross-rate: ${usdToRub}`);
  
  // Wave 6: Perform pre-sync credentials check
  try {
    console.log("Checking Vexboost credentials and balance...");
    const balanceInfo = await provider.getBalance();
    console.log(`Connection successful! Balance: ${balanceInfo.balance} ${balanceInfo.currency}`);
  } catch (err: any) {
    const errMsg = err.message || String(err);
    console.error(`\n❌ [API ERROR] Vexboost verification failed: ${errMsg}`);
    
    // Check for specific auth/inactive errors
    if (errMsg.includes("user_inactive") || errMsg.includes("key") || errMsg.includes("invalid") || errMsg.includes("auth")) {
      console.error("👉 [CRITICAL ALERT] The API key or user account is currently INACTIVE or INVALID.");
      console.error("👉 Please update your Vexboost credentials inside the Admin Panel.");
    } else {
      console.error("👉 Please verify your network connection, proxy settings, or endpoint URL.");
    }

    // Update error statistics in the database
    await db.provider.update({
      where: { id: dbProvider.id },
      data: {
        lastErrorAt: new Date(),
        errorCount5m: { increment: 1 }
      }
    });

    console.log("\nSync aborted due to provider verification failure. Existing database services are preserved.");
    return;
  }

  const apiServices = await provider.getServices();
  console.log(`Fetched ${apiServices.length} services from Vexboost API.`);

  let createdCats = 0;
  let newServices = 0;
  let updatedServices = 0;
  let quarantinedServices = 0;

  const existingCats = await db.category.findMany({ include: { network: true } });
  const catMap = new Map(existingCats.map(c => [`${c.network?.slug || "unknown"}__${c.name}`, c.id]));

  const existingServices = await db.service.findMany({
    where: { providerId: dbProvider.id },
    select: { id: true, externalId: true, rate: true, isQuarantined: true },
  });
  const serviceMap = new Map(existingServices.map(s => [s.externalId, s]));
  const syncedExternalIds = new Set<string>();

  for (const apiService of apiServices) {
    if (apiService.type !== "Default") continue;

    const analysis = SmartAnalyzerLogic.detectSync(apiService.name, "", apiService.category);
    const platform = analysis.platform;
    const catName = CATEGORY_LABELS[analysis.category] || analysis.category;
    const canonicalSlug = platform.toLowerCase() || "unknown";
    const mapKey = `${canonicalSlug}__${catName}`;
    let categoryId = catMap.get(mapKey);

    if (!categoryId) {
      const network = await db.network.upsert({
        where: { slug: canonicalSlug },
        update: {},
        create: { name: platform, slug: canonicalSlug, sort: 0 },
      });
      const newCat = await db.category.create({
        data: { networkId: network.id, name: catName, sort: 0 },
      });
      categoryId = newCat.id;
      catMap.set(mapKey, categoryId);
      createdCats++;
    }

    const externalId = String(apiService.service);
    syncedExternalIds.add(externalId);
    let newRate = parseFloat(apiService.rate) || 0;
    if (isRubProvider && usdToRub > 0) {
      newRate = newRate / usdToRub;
    }
    const minInt = parseInt(apiService.min, 10) || 10;
    const maxInt = parseInt(apiService.max, 10) || 100000;
    const existing = serviceMap.get(externalId);

    const resolvedTargetType = analysis.targetType || inferTargetTypeFromCategory(catName) || 'POST';

    if (existing) {
      const oldRate = existing.rate;
      const priceDelta = oldRate > 0 ? Math.abs(newRate - oldRate) / oldRate : 0;

      if (priceDelta > quarantineThreshold && !existing.isQuarantined) {
        const direction = newRate > oldRate ? "📈 Рост" : "📉 Падение";
        const pct = (priceDelta * 100).toFixed(1);
        const reason = `${direction} цены на ${pct}%: ${oldRate.toFixed(4)} → ${newRate.toFixed(4)}`;

        await db.service.update({
          where: { id: existing.id },
          data: {
            name: sanitizeText(apiService.name),
            isQuarantined: true,
            pendingRate: newRate,
            quarantineReason: reason,
            quarantinedAt: new Date(),
            minQty: minInt,
            maxQty: maxInt,
            lastSeenAt: new Date(),
            targetType: resolvedTargetType,
            description: sanitizeText(apiService.desc) || null,
          },
        });
        quarantinedServices++;
      } else if (!existing.isQuarantined) {
        await db.service.update({
          where: { id: existing.id },
          data: {
            name: sanitizeText(apiService.name),
            rate: newRate,
            minQty: minInt,
            maxQty: maxInt,
            lastSeenAt: new Date(),
            targetType: resolvedTargetType,
            description: sanitizeText(apiService.desc) || null,
          },
        });
        updatedServices++;
      }
    } else {
      await db.service.create({
        data: {
          name: sanitizeText(apiService.name),
          numericId: parseInt(externalId, 10),
          categoryId: categoryId,
          providerId: dbProvider.id,
          externalId: externalId,
          rate: newRate,
          markup: 2.0, // Default 200% logic
          minQty: minInt,
          maxQty: maxInt,
          isActive: true,
          isQuarantined: false,
          lastSeenAt: new Date(),
          targetType: resolvedTargetType,
          description: sanitizeText(apiService.desc) || null,
        },
      });
      newServices++;
    }
  }

  console.log("SYNC COMPLETE.");
  console.log(`New categories: ${createdCats}`);
  console.log(`New services: ${newServices}`);
  console.log(`Updated services: ${updatedServices}`);
  console.log(`Quarantined services: ${quarantinedServices}`);

  // Detect and disable dead services
  const deadServiceIds = existingServices
    .filter(s => s.externalId !== null && !syncedExternalIds.has(s.externalId))
    .map(s => s.id);
    
  if (deadServiceIds.length > 0) {
    await db.service.updateMany({
      where: { id: { in: deadServiceIds } },
      data: { isActive: false }
    });
    console.log(`Auto-disabled missing services: ${deadServiceIds.length}`);
  }

  // Apply post-sync rules (blacklist, hide, reclassify, cap)
  console.log('\nApplying post-sync rules...');
  const rulesResult = await applyPostSyncRules();
  console.log(`  Blacklisted: ${rulesResult.blacklisted}`);
  console.log(`  Hidden: ${rulesResult.hidden}`);
  console.log(`  Reclassified: ${rulesResult.reclassified}`);
  console.log(`  MaxQty capped: ${rulesResult.capped}`);
  console.log(`  Empty categories removed: ${rulesResult.emptyCategoriesRemoved}`);
}

main().catch(console.error).finally(() => process.exit(0));
