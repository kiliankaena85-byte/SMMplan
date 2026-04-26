import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const email = 'art@artmspektr.ru'
  let user = await prisma.user.findUnique({ where: { email } })
  
  if (!user) {
    console.log(`[STATUS] Пользователь ${email} не найден в базе.`)
    console.log(`[ACTION] Создаем аккаунт со статусом Владельца (OWNER)...`)
    user = await prisma.user.create({
      data: {
        email,
        role: 'OWNER',
        balance: 1000000 // Стартовый баланс для тестов (в центах)
      }
    })
    console.log('[SUCCESS] Пользователь успешно создан!')
  } else {
    console.log(`[STATUS] Пользователь найден. Текущая роль: ${user.role}`)
    if (user.role !== 'OWNER') {
       console.log('[ACTION] Обновляем роль до OWNER...')
       user = await prisma.user.update({
         where: { email },
         data: { role: 'OWNER' }
       })
       console.log('[SUCCESS] Роль успешно обновлена!')
    } else {
       console.log('[SUCCESS] Роль уже OWNER. Вмешательство не требуется.')
    }
  }
}

main().catch(console.error).finally(async () => await prisma.$disconnect())
