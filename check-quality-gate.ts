import { getPublicCatalogAction, getServicesByCategoryAction } from "./src/actions/order/catalog";

async function main() {
  console.log("# Landing Pages Quality Gate Verification Matrix");
  console.log("| Network | Category | Services Count | Min Price | Status |");
  console.log("|---|---|---|---|---|");

  const catalogResult = await getPublicCatalogAction();
  if (!catalogResult.success || !catalogResult.data) {
    console.error("Failed to load catalog");
    return;
  }

  for (const network of catalogResult.data) {
    for (const category of network.categories) {
      const services = await getServicesByCategoryAction(category.id);
      const count = services.length;
      const minPrice = count > 0 ? Math.min(...services.map(s => s.pricePerUnitRub)) : 0;
      
      const passesGate = count >= 3 && services.some(s => s.pricePerUnitRub > 0);
      const status = passesGate ? "✅ PASSED" : "🔴 FAILED (NoIndex)";

      console.log(`| ${network.name} | ${category.name} | ${count} | ${minPrice.toFixed(4)} | ${status} |`);
    }
  }
}

main().catch(console.error);
