/**
 * Multi-Provider Health Check & Registration Script
 * Tests connectivity, fetches balance & service count for each provider.
 */
import { db } from '../src/lib/db';
import { CryptoService } from '../src/lib/crypto';
import { UniversalProvider } from '../src/services/providers/universal.provider';

interface ProviderConfig {
  name: string;
  slug: string;
  apiUrl: string;
  apiKey: string;
}

// NOTE: likedrom uses a non-standard API format — skip for now
const PROVIDERS: ProviderConfig[] = [
  {
    name: 'Soc-Rocket',
    slug: 'soc-rocket',
    apiUrl: 'https://soc-rocket.ru/api/v2/',
    apiKey: 'emrNjCPOuNMYKmMcxvHb532Xix99uAxM',
  },
  {
    name: 'SMMPrime',
    slug: 'smmprime',
    apiUrl: 'https://smmprime.com/api/v2',
    apiKey: '6833e1ceef531d34e7442d492b8e1021',
  },
  {
    name: 'Stream-Promotion',
    slug: 'stream-promotion',
    apiUrl: 'https://stream-promotion.ru/api/v2',
    apiKey: 'fGOsh7PtBk3Ckyq3UmqH6HVNYTC2gGTH',
  },
  {
    name: 'SMMPanelUS',
    slug: 'smmpanelus',
    apiUrl: 'https://smmpanelus.com/api/v2',
    apiKey: '48a6494eb16406d1226dce68f30d631d',
  },
  {
    name: 'Soc-Proof',
    slug: 'soc-proof',
    apiUrl: 'https://soc-proof.su/api/v2',
    apiKey: 'a465d4013f1265153a2ca12bdd3cad06',
  },
  {
    name: 'Telegram.Shop',
    slug: 'telegram-shop',
    apiUrl: 'https://telegram.shop/api/v2',
    apiKey: 'abcd6e54ff5b77a11dc8077074445e04',
  },
];

async function main() {
  console.log('=== Multi-Provider Health Check ===\n');

  const results: { name: string; status: string; balance?: string; services?: number; error?: string }[] = [];

  for (const cfg of PROVIDERS) {
    process.stdout.write(`Testing ${cfg.name} (${cfg.apiUrl})... `);
    try {
      const provider = new UniversalProvider(cfg.apiUrl, cfg.apiKey);
      
      // Test 1: Balance
      const balance = await provider.getBalance();
      
      // Test 2: Services count
      const services = await provider.getServices();
      
      console.log(`✅ Balance: $${balance.balance} ${balance.currency} | Services: ${services.length}`);
      results.push({ 
        name: cfg.name, 
        status: '✅ OK', 
        balance: `${balance.balance} ${balance.currency}`,
        services: services.length 
      });
    } catch (err: any) {
      console.log(`❌ ${err.message}`);
      results.push({ name: cfg.name, status: '❌ FAIL', error: err.message });
    }
  }

  console.log('\n=== Results Summary ===');
  console.table(results);

  // Register working providers in DB
  console.log('\n=== Registering Providers in DB ===');
  const working = results.filter(r => r.status === '✅ OK');
  
  for (const r of working) {
    const cfg = PROVIDERS.find(p => p.name === r.name)!;
    const encryptedKey = CryptoService.encrypt(cfg.apiKey);
    
    const existing = await db.provider.findFirst({ where: { name: cfg.name } });
    if (existing) {
      console.log(`  ⏩ ${cfg.name} already exists (id: ${existing.id})`);
      continue;
    }
    
    const created = await db.provider.create({
      data: {
        name: cfg.name,
        apiUrl: cfg.apiUrl,
        apiKey: encryptedKey,
        isActive: true,
        balanceCurrency: 'USD',
        metadata: { slug: cfg.slug },
      }
    });
    console.log(`  ✅ ${cfg.name} registered (id: ${created.id})`);
  }

  // Show all providers
  const allProviders = await db.provider.findMany({ orderBy: { createdAt: 'asc' } });
  console.log('\n=== All Registered Providers ===');
  for (const p of allProviders) {
    console.log(`  ${p.isActive ? '🟢' : '🔴'} ${p.name} — ${p.apiUrl}`);
  }
}

main().catch(console.error).finally(() => process.exit(0));
