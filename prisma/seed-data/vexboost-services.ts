import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("VexBoost Seeder started...");

  // Mocking the data because API returned "user_inactive"
  const rawServices = [
    {
      id: "vex_instagram_1",
      service: "Instagram Followers - Fast Delivery",
      type: "default",
      category: "Instagram",
      rate: "1.5",
      resell: "5.0",
      description: "HQ Quality, Instant Start",
      link_type: "profile",
      min_qty: "100",
      max_qty: "10000"
    },
    {
      id: "vex_youtube_2",
      service: "YouTube Views - WorldWide",
      type: "default",
      category: "YouTube",
      rate: "3.2",
      resell: "10.0",
      description: "Non-drop, 30 days refill",
      link_type: "video",
      min_qty: "500",
      max_qty: "50000"
    }
  ];

  // Get a category to map to
  const category = await prisma.category.findFirst({
    where: { name: { contains: "Test" } }
  });

  const targetCategory = category || (await prisma.category.findFirst());
  if (!targetCategory) {
    console.log("No category found, skipping seed.");
    return;
  }

  for (const item of rawServices) {
    const rateInt = Math.round(parseFloat(item.rate));
    const markupInt = Math.round(parseFloat(item.resell));
    const minQty = Math.round(parseFloat(item.min_qty));
    const maxQty = Math.round(parseFloat(item.max_qty));
    const randomNumericId = Math.floor(Math.random() * 1000000) + 10000;

    await prisma.$executeRaw`
      INSERT INTO "Service" ("id", "numericId", "name", "categoryId", "rate", "markup", "minQty", "maxQty", "externalId", "updatedAt") 
      VALUES (${item.id}, ${randomNumericId}, ${item.service}, ${targetCategory.id}, ${rateInt}, ${markupInt}, ${minQty}, ${maxQty}, ${item.id}, NOW()) 
      ON CONFLICT ("id") DO NOTHING;
    `;
  }

  console.log("VexBoost raw insert completed successfully.");
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
