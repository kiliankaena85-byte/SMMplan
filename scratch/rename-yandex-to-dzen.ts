import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Запуск миграции соцсетей...");

  // Находим сеть Yandex (поддерживаем регистронезависимость)
  const yandexNetwork = await prisma.network.findFirst({
    where: {
      OR: [
        { slug: "yandex" },
        { name: "Yandex" },
        { name: "yandex" }
      ]
    }
  });

  if (yandexNetwork) {
    console.log(`Found Yandex network with ID: ${yandexNetwork.id}`);
    
    // Обновляем имя на Дзен, а слаг на dzen
    const updated = await prisma.network.update({
      where: { id: yandexNetwork.id },
      data: {
        name: "Dzen",
        slug: "dzen"
      }
    });

    console.log(`✅ Успешно обновлено: ${updated.name} (slug: ${updated.slug})`);
  } else {
    // Если сети нет, проверяем, есть ли уже Dzen
    const dzenNetwork = await prisma.network.findFirst({
      where: {
        OR: [
          { slug: "dzen" },
          { name: "Dzen" }
        ]
      }
    });
    
    if (dzenNetwork) {
      console.log(`ℹ️ Сеть Dzen уже существует в базе данных (ID: ${dzenNetwork.id}).`);
    } else {
      // Создаем новую, если не было Yandex
      const created = await prisma.network.create({
        data: {
          name: "Dzen",
          slug: "dzen",
          sort: 10
        }
      });
      console.log(`✅ Создана новая сеть: ${created.name} (slug: ${created.slug})`);
    }
  }
}

main()
  .catch((e) => {
    console.error("❌ Ошибка выполнения скрипта:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
