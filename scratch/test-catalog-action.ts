import { getPublicCatalogAction } from "../src/actions/order/catalog";

async function main() {
  const result = await getPublicCatalogAction();
  console.log("Catalog Action Result:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
