import * as fs from 'fs';

async function main() {
  const curated = JSON.parse(fs.readFileSync('scripts/curated-catalog.json', 'utf-8'));
  const vexServices = curated.filter((s: any) => s.providerName === 'Vexboost');
  console.log(`Vexboost services in curated-catalog.json: ${vexServices.length}`);
  console.log('Sample services:');
  console.log(vexServices.slice(0, 5));
}

main().catch(console.error);
