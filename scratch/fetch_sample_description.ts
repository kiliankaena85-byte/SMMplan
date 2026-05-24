import { providerService } from '../src/services/providers/provider.service';
import { db } from '../src/lib/db';

async function main() {
  const provider = await providerService.getDefaultProvider();
  if (!provider) {
    console.log('No primary provider instance available.');
    return;
  }

  console.log('Fetching services from provider API...');
  const services = await provider.getServices();
  console.log(`Fetched ${services.length} services.`);

  // Find some services that have descriptions
  const withDesc = services.filter(s => s.desc && s.desc.trim().length > 10);
  console.log(`Found ${withDesc.length} services with description.`);

  if (withDesc.length > 0) {
    console.log('Sample service descriptions:');
    for (let i = 0; i < Math.min(3, withDesc.length); i++) {
      console.log(`\n--- [ID: ${withDesc[i].service}] ${withDesc[i].name} ---`);
      console.log('Raw Category:', withDesc[i].category);
      console.log('Description:', withDesc[i].desc);
    }
  } else {
    console.log('No services had descriptions. Let\'s check the first 5 services fields:');
    for (let i = 0; i < Math.min(5, services.length); i++) {
      console.log(`\n--- [ID: ${services[i].service}] ${services[i].name} ---`);
      console.log('Keys:', Object.keys(services[i]));
      console.log('Raw object:', services[i]);
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await db.$disconnect();
  });
