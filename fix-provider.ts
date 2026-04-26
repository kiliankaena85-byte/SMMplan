import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Создаем профиль Провайдера VexBoost в базе...')
  
  const provider = await prisma.provider.upsert({
    where: { name: 'VexBoost' },
    update: {
        apiUrl: 'https://vexboost.ru/api/v2',
        apiKey: 'XIXEUVGftzSXwAg8PBerCJpMrg9qujHHPMATH3y95xYvBQ9VMnAHGYtpGnta',
        isActive: true,
    },
    create: {
      name: 'VexBoost',
      apiUrl: 'https://vexboost.ru/api/v2',
      apiKey: 'XIXEUVGftzSXwAg8PBerCJpMrg9qujHHPMATH3y95xYvBQ9VMnAHGYtpGnta',
      isActive: true,
      balanceCurrency: 'RUB'
    }
  })

  console.log('Провайдер успешно создан! ID:', provider.id)

  console.log('Привязываем ранее созданные услуги к этому провайдеру...')
  const updateResult = await prisma.service.updateMany({
    where: {
      id: {
        in: ['vex_instagram_1', 'vex_youtube_2']
      }
    },
    data: {
      providerId: provider.id
    }
  })

  console.log(`Обновлено услуг: ${updateResult.count}`)
}

main().catch(console.error).finally(async () => await prisma.$disconnect())
