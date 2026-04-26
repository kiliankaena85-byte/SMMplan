import { db } from "../src/lib/db";
import { providerService } from "../src/services/providers/provider.service";
import { SmartAnalyzerLogic, CATEGORY_LABELS } from "../src/services/providers/smart-analyzer.logic";
import { SettingsManager } from "../src/lib/settings";
import { applyPostSyncRules } from "../src/services/providers/post-sync-rules";

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

  console.log(`Provider: ${dbProvider.name}`);
  const apiServices = await provider.getServices();
  console.log(`Fetched ${apiServices.length} services from Vexboost API.`);

  let createdCats = 0;
  let newServices = 0;
  let updatedServices = 0;
  let quarantinedServices = 0;

  const existingCats = await db.category.findMany({ include: { network: true } });
  const catMap = new Map(existingCats.map(c => [`${c.network?.slug || "unknown"}__${c.name}`, c.id]));

  const existingServices = await db.service.findMany({
    select: { id: true, externalId: true, rate: true, isQuarantined: true },
  });
  const serviceMap = new Map(existingServices.map(s => [s.externalId, s]));

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
    const newRate = parseFloat(apiService.rate) || 0;
    const minInt = parseInt(apiService.min, 10) || 10;
    const maxInt = parseInt(apiService.max, 10) || 100000;
    const existing = serviceMap.get(externalId);

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
            isQuarantined: true,
            pendingRate: newRate,
            quarantineReason: reason,
            quarantinedAt: new Date(),
            minQty: minInt,
            maxQty: maxInt,
            lastSeenAt: new Date(),
          },
        });
        quarantinedServices++;
      } else if (!existing.isQuarantined) {
        await db.service.update({
          where: { id: existing.id },
          data: {
            rate: newRate,
            minQty: minInt,
            maxQty: maxInt,
            lastSeenAt: new Date(),
          },
        });
        updatedServices++;
      }
    } else {
      await db.service.create({
        data: {
          name: apiService.name,
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
