import fs from 'fs';
import path from 'path';

async function main() {
  const curatedPath = path.resolve('scripts/curated-catalog.json');
  if (!fs.existsSync(curatedPath)) {
    console.log('curated-catalog.json not found');
    return;
  }
  const data = JSON.parse(fs.readFileSync(curatedPath, 'utf8'));
  const services = Array.isArray(data) ? data : (data.services || []);
  
  // Search for any service whose description has emojis like "🎉", "🔥", "👏", or contains "Уточняется" or "отписки"
  const matches = services.filter((s: any) => {
    const desc = s.description || '';
    const name = s.name || '';
    return desc.includes('🎉') || desc.includes('🔥') || desc.includes('👏') || name.includes('🎉') || name.includes('👏') || name.includes('Уточняется') || desc.includes('Уточняется');
  });

  console.log(`Found ${matches.length} matches:`);
  console.log(JSON.stringify(matches.slice(0, 10).map((s: any) => ({
    extId: s.extId,
    name: s.name,
    category: s.category,
    description: s.description ? s.description.substring(0, 100) + '...' : null
  })), null, 2));
}

main().catch(console.error);
