import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

const providers = [
  { name: 'soc-rocket', apiUrl: 'https://soc-rocket.ru/api/v2', apiKey: 'emrNjCPOuNMYKmMcxvHb532Xix99uAxM' },
  { name: 'smmprime', apiUrl: 'https://smmprime.com/api/v2', apiKey: '6833e1ceef531d34e7442d492b8e1021' },
  { name: 'stream-promotion', apiUrl: 'https://stream-promotion.ru/api/v2', apiKey: 'fGOsh7PtBk3Ckyq3UmqH6HVNYTC2gGTH' },
  { name: 'likedrom', apiUrl: 'https://likedrom.com/api/v2', apiKey: '4f2aa7f20c56399b4790a4cd73f5b8c9' },
  { name: 'smmpanelus', apiUrl: 'https://smmpanelus.com/api/v2', apiKey: '48a6494eb16406d1226dce68f30d631d' },
  { name: 'soc-proof', apiUrl: 'https://soc-proof.su/api/v2', apiKey: 'a465d4013f1265153a2ca12bdd3cad06' },
  { name: 'telegram.shop', apiUrl: 'https://telegram.shop/api/v2', apiKey: 'abcd6e54ff5b77a11dc8077074445e04' }
];

async function seed() {
  for (const p of providers) {
    // try to find by some matching logic or just upsert by name
    const existing = await db.provider.findFirst({
        where: { name: { contains: p.name, mode: 'insensitive' } }
    });

    if (existing) {
        await db.provider.update({
            where: { id: existing.id },
            data: { apiUrl: p.apiUrl, apiKey: p.apiKey, isActive: true }
        });
        console.log(`Updated ${p.name}`);
    } else {
        await db.provider.create({
            data: {
                name: p.name,
                apiUrl: p.apiUrl,
                apiKey: p.apiKey, // raw is fine due to fallback
                isActive: true,
                metadata: {}
            }
        });
        console.log(`Created ${p.name}`);
    }
  }
  console.log('Seeding complete.');
}

seed().catch(console.error).finally(() => db.$disconnect());
