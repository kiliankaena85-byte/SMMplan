import { getServicesByCategoryAction } from '../src/actions/order/catalog';
import { db } from '../src/lib/db';

async function main() {
  // Find a category ID that has active services
  const category = await db.category.findFirst({
    where: {
      services: {
        some: {
          isActive: true
        }
      }
    }
  });

  if (!category) {
    console.log('No active categories with services found.');
    return;
  }

  console.log(`Testing getServicesByCategoryAction for category: ${category.name} (${category.id})`);
  const services = await getServicesByCategoryAction(category.id);
  console.log(`Fetched ${services.length} services!`);
  if (services.length > 0) {
    console.log('Sample service:', services[0]);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await db.$disconnect();
  });
