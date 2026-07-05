import { db } from '../src/lib/db';

async function main() {
  const providers = await db.provider.findMany();
  console.log("Providers count:", providers.length);
  for (const p of providers) {
    console.log(`ID: ${p.id}, Name: ${p.name}, API URL: ${p.apiUrl}, Key length: ${p.apiKey?.length}, Active: ${p.isActive}`);
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
