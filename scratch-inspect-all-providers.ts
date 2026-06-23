import fs from 'fs';
import path from 'path';

async function main() {
  const allProvidersPath = path.resolve('scripts/all-providers-data.json');
  if (!fs.existsSync(allProvidersPath)) {
    console.log('all-providers-data.json not found');
    return;
  }
  
  const rawData = fs.readFileSync(allProvidersPath, 'utf8');
  const data = JSON.parse(rawData);
  const services = Array.isArray(data) ? data : (data.services || []);
  
  const targetExtIds = ['2921', '2922', '2923', '2924', '2925', '2926', '2927', '2928', '2929'];

  const matches = services.filter((s: any) => {
    const extId = s.extId?.toString();
    return targetExtIds.includes(extId);
  });

  console.log(`Found ${matches.length} services matching extId in target list:`);
  console.log(JSON.stringify(matches.map((s: any) => ({
    providerName: s.providerName,
    extId: s.extId,
    originalName: s.originalName,
    category: s.category,
    platform: s.platform,
    desc: s.desc
  })), null, 2));
}

main().catch(console.error);
