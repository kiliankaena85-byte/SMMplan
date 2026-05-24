import * as fs from 'fs';

async function main() {
  const curated = JSON.parse(fs.readFileSync('scripts/curated-catalog.json', 'utf-8'));
  console.log(`Total services in curated-catalog.json: ${curated.length}`);

  const byProvider: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};
  for (const item of curated) {
    byProvider[item.providerName] = (byProvider[item.providerName] || 0) + 1;
    byPlatform[item.platform] = (byPlatform[item.platform] || 0) + 1;
  }

  console.log('\nServices by Provider:');
  console.log(byProvider);

  console.log('\nServices by Platform:');
  console.log(byPlatform);
}

main().catch(console.error);
