import { PrismaClient } from '@prisma/client';
import { redis } from '../src/lib/redis';

const prisma = new PrismaClient();

const PROVIDERS = [
    { name: 'Soc-Rocket', url: 'https://soc-rocket.ru/api/v2', key: 'emrNjCPOuNMYKmMcxvHb532Xix99uAxM' },
    { name: 'Smmprime', url: 'https://smmprime.com/api/v2', key: '6833e1ceef531d34e7442d492b8e1021' },
    { name: 'Stream-Promotion', url: 'https://stream-promotion.ru/api/v2', key: 'fGOsh7PtBk3Ckyq3UmqH6HVNYTC2gGTH' },
    { name: 'Likedrom', url: 'https://likedrom.com/api/v2', key: '4f2aa7f20c56399b4790a4cd73f5b8c9' },
    { name: 'Smmpanelus', url: 'https://smmpanelus.com/api/v2', key: '48a6494eb16406d1226dce68f30d631d' },
    { name: 'Soc-Proof', url: 'https://soc-proof.su/api/v2', key: 'a465d4013f1265153a2ca12bdd3cad06' },
    { name: 'Telegram.Shop', url: 'https://telegram.shop/api/v2', key: 'abcd6e54ff5b77a11dc8077074445e04' }
];

async function main() {
    console.log('Seeding providers and fetching shadow catalogs...');
    
    for (const p of PROVIDERS) {
        let provider = await prisma.provider.findUnique({ where: { name: p.name } });
        if (!provider) {
            provider = await prisma.provider.create({
                data: {
                    name: p.name,
                    apiUrl: p.url,
                    apiKey: p.key, // В реальном проекте должен быть зашифрован
                    isActive: true,
                    providerType: 'SMM_PANEL'
                }
            });
            console.log(`Created provider ${p.name}`);
        } else {
            // Убедимся, что ключ актуален
            provider = await prisma.provider.update({
                where: { id: provider.id },
                data: { apiUrl: p.url, apiKey: p.key, isActive: true }
            });
        }

        console.log(`Fetching services for ${p.name}...`);
        try {
            const res = await fetch(p.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ key: p.key, action: 'services' })
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            
            if (Array.isArray(data)) {
                console.log(`Received ${data.length} services for ${p.name}`);
                const cacheKey = `provider:${provider.id}:shadow_catalog`;
                await redis.set(cacheKey, JSON.stringify(data), 'EX', 60 * 60 * 24 * 7); // Храним 7 дней
            } else if (data.error) {
                console.error(`Provider ${p.name} returned error: ${data.error}`);
            } else {
                 console.log(`Unexpected response format from ${p.name}`);
            }
            
        } catch (error: any) {
            console.error(`Failed to fetch services for ${p.name}: ${error.message}`);
        }
    }
    console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
