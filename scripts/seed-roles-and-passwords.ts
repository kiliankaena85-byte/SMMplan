import { db } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth/password';

export const ACCOUNTS = [
  {
    email: 'admin@smmplan.pro',
    role: 'OWNER',
    tenantId: 'smmplan',
    password: 'AdminPassword2026!',
    description: 'Главный Администратор (Владелец платформы / Полный доступ ко всем модулям)'
  },
  {
    email: 'art@artmspektr.ru',
    role: 'OWNER',
    tenantId: 'smmplan',
    password: 'OwnerPassword2026!',
    description: 'Личный аккаунт Владельца (OWNER)'
  },
  {
    email: 'administrator@smmplan.pro',
    role: 'ADMIN',
    tenantId: 'smmplan',
    password: 'AdminUser2026!',
    description: 'Администратор платформы (/admin/dashboard)'
  },
  {
    email: 'operator@smmplan.pro',
    role: 'OPERATOR',
    tenantId: 'smmplan',
    password: 'Operator2026!',
    description: 'Оператор заказов и тикетов (/operator/dashboard)'
  },
  {
    email: 'manager@smmplan.pro',
    role: 'MANAGER',
    tenantId: 'smmplan',
    password: 'Manager2026!',
    description: 'Менеджер каталога, цен и маркетинга (/admin/catalog, /admin/marketing)'
  },
  {
    email: 'support@smmplan.pro',
    role: 'SUPPORT',
    tenantId: 'smmplan',
    password: 'Support2026!',
    description: 'Специалист клиентской поддержки (/admin/tickets)'
  },
  {
    email: 'user@smmplan.pro',
    role: 'USER',
    tenantId: 'smmplan',
    password: 'ClientPassword2026!',
    description: 'Пользователь / Клиент витрины SMMplan (/dashboard)'
  },
  {
    email: 'user@smmflux.ru',
    role: 'USER',
    tenantId: 'flux',
    password: 'FluxClient2026!',
    description: 'Пользователь / Клиент витрины SMMflux (/dashboard)'
  },
  {
    email: 'art@artmspektr.ru',
    role: 'USER',
    tenantId: 'flux',
    password: 'OwnerPassword2026!',
    description: 'Личный аккаунт на витрине SMMflux'
  }
];

async function seedAccounts() {
  console.log('🚀 Синхронизация учетных записей ролей OmniSMM 1.0...');

  for (const acc of ACCOUNTS) {
    const passwordHash = await hashPassword(acc.password);

    const existing = await db.user.findFirst({
      where: {
        email: acc.email.toLowerCase(),
        tenantId: acc.tenantId,
      }
    });

    if (existing) {
      await db.user.update({
        where: { id: existing.id },
        data: {
          role: acc.role,
          passwordHash,
          isActive: true,
          isDeleted: false,
          isEmailVerified: true,
          twoFactorEnabled: false, // отключена для прямого входа
        }
      });
      console.log(`✅ [ОБНОВЛЕН] ${acc.email} (${acc.role}, ${acc.tenantId}) -> Пароль установлен: ${acc.password}`);
    } else {
      await db.user.create({
        data: {
          email: acc.email.toLowerCase(),
          role: acc.role,
          tenantId: acc.tenantId,
          passwordHash,
          isActive: true,
          isDeleted: false,
          isEmailVerified: true,
          twoFactorEnabled: false,
          balance: BigInt(500000), // 5000.00 руб на баланс
        }
      });
      console.log(`✨ [СОЗДАН] ${acc.email} (${acc.role}, ${acc.tenantId}) -> Пароль установлен: ${acc.password}`);
    }
  }

  console.log('🎉 Все учетные записи успешно обновлены и готовы к авторизации!');
}

seedAccounts()
  .catch((err) => {
    console.error('❌ Ошибка при инициализации аккаунтов:', err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
