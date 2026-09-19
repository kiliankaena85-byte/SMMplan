'use server';

/**
 * Level 2 Server Actions: Admin Runbooks & Status
 */

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { KnowledgeRetrieverService } from '@/services/admin/ai-manual/knowledge-retriever.service';
import type { AdminRunbook, DockerMemoryStatus } from '@/types/admin-ai-manual';

const ALLOWED_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'];

async function requireStaffUser() {
  const session = await verifySession();
  if (!session?.userId) throw new Error('Unauthorized');
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true },
  });
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    throw new Error('Forbidden: Staff role required');
  }
  return user;
}

export async function getDockerMemoryStatusAction(): Promise<{ success: boolean; status?: DockerMemoryStatus; error?: string }> {
  try {
    await requireStaffUser();
    const status = await KnowledgeRetrieverService.getMemoryStatus();
    return { success: true, status };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch status' };
  }
}

export async function getAdminRunbooksAction(): Promise<{ success: boolean; runbooks?: AdminRunbook[]; error?: string }> {
  try {
    await requireStaffUser();
    return { success: true, runbooks: CURATED_ADMIN_RUNBOOKS };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch runbooks' };
  }
}

const CURATED_ADMIN_RUNBOOKS: AdminRunbook[] = [
  {
    id: 'catalog-import',
    chapterNumber: 1,
    chapterTitle: 'Каталог и Провайдеры',
    title: 'Импорт каталога услуг через мастер Cherry-Pick',
    targetRoute: '/admin/providers/import',
    summary: 'Пошаговый регламент сопоставления категорий, детекции платформ и пакетного назначения наценок.',
    estimatedMinutes: 5,
    tags: ['каталог', 'провайдеры', 'импорт', 'наценки'],
    relatedFiles: [
      'src/app/admin/providers/import/components/wizard/import-wizard.tsx',
      'src/services/providers/analyzer/smart-analyzer.logic.ts',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Выбор целевого провайдера',
        instruction: 'Перейдите в мастер импорта и выберите настроенного провайдера из выпадающего списка.',
        actionUrl: '/admin/providers/import',
        actionLabel: 'Открыть мастер импорта',
      },
      {
        stepNumber: 2,
        title: 'Синхронизация кэша',
        instruction: 'Если каталог пуст, нажмите "Синхронизировать каталог". Услуги загрузятся в теневой кэш без публикации.',
      },
      {
        stepNumber: 3,
        title: 'Выбор и маппинг категорий',
        instruction: 'Используйте горизонтальные табы соцсетей (Telegram, VK и др.). Алгоритмический анализатор автоматически сопоставит категории. Приоритет выбора администратора (Cherry-Pick) отключает авто-сплит.',
        warningNote: 'Если платформа услуги не распознана (unknown), услуга блокируется правилом Zero-Unknown-Platform Guard.',
      },
      {
        stepNumber: 4,
        title: 'Установка наценки и публикация',
        instruction: 'Укажите коэффициент наценки (например, +50%) и нажмите "Импортировать выбранные".',
      },
    ],
  },
  {
    id: 'finance-54fz',
    chapterNumber: 2,
    chapterTitle: 'Финансы и 54-ФЗ',
    title: 'Настройка эквайринга ЮKassa и кассы 54-ФЗ с НДС 22%',
    targetRoute: '/admin/finance',
    summary: 'Регламент подключения платежного шлюза, маскирования секретов в Vault и настройки фискализации.',
    estimatedMinutes: 7,
    tags: ['финансы', 'юкасса', '54-фз', 'ндс22'],
    relatedFiles: [
      'src/services/financial/payment-gateway.service.ts',
      'src/lib/fiscal/receipt-service.ts',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Проверка реквизитов магазина ЮKassa',
        instruction: 'Откройте настройки финансов и укажите Shop ID и Secret Key.',
        actionUrl: '/admin/settings',
        actionLabel: 'Настройки эквайринга',
      },
      {
        stepNumber: 2,
        title: 'Ставка НДС 22% по 425-ФЗ',
        instruction: 'Убедитесь, что для фискализации чеков выбрана ставка НДС 22% (vat_code: 10) либо УСН без НДС (vat_code: 1) при обороте до 20 млн ₽.',
      },
      {
        stepNumber: 3,
        title: 'Тест вебхука и сверка Леджера',
        instruction: 'Запустите тестовый платеж в режиме ACQUIRING_TEST. Баланс пользователя и запись в LedgerEntry обязаны создаваться строго в копейках BigInt.',
      },
    ],
  },
  {
    id: 'orders-failover',
    chapterNumber: 3,
    chapterTitle: 'Заказы и Воркеры',
    title: 'Обработка сбойных заказов и отмена с рефандом',
    targetRoute: '/admin/orders',
    summary: 'Регламент ручного перезапуска зависших заказов в очередях BullMQ и безопасной отмены.',
    estimatedMinutes: 4,
    tags: ['заказы', 'failover', 'bullmq', 'возврат'],
    relatedFiles: [
      'src/services/orders/checkout-pipeline.service.ts',
      'src/workers/processors/order.processor.ts',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Фильтрация сбойных заказов',
        instruction: 'Перейдите в список заказов и отфильтруйте по статусу ERROR или CANCELING.',
        actionUrl: '/admin/orders',
        actionLabel: 'К списку заказов',
      },
      {
        stepNumber: 2,
        title: 'Анализ ошибки провайдера',
        instruction: 'Кликните на заказ для открытия модалки деталей. Ознакомьтесь с кодом ошибки и статусом внешнего API.',
      },
      {
        stepNumber: 3,
        title: 'Действие Failover / Refund',
        instruction: 'Нажмите "Повторить" для отправки резервному провайдеру или "Отменить с возвратом". Возврат средств клиенту произойдет через WalletOps.refund() строго в копейках BigInt.',
      },
    ],
  },
  {
    id: 'team-rbac',
    chapterNumber: 4,
    chapterTitle: 'Команда и Безопасность',
    title: 'Управление ролями RBAC и персональными ключами Gemini',
    targetRoute: '/admin/settings',
    summary: 'Настройка кастомных прав доступа сотрудников и персональных квот на ИИ.',
    estimatedMinutes: 4,
    tags: ['rbac', 'роли', 'gemini', 'безопасность'],
    relatedFiles: [
      'src/app/admin/settings/team/team-management.tsx',
      'src/services/ai/gemini-client.ts',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Просмотр сотрудников',
        instruction: 'Перейдите во вкладку Команда в настройках панели.',
        actionUrl: '/admin/settings',
        actionLabel: 'Управление командой',
      },
      {
        stepNumber: 2,
        title: 'Назначение прав доступа',
        instruction: 'Выберите сотрудника и задайте матрицу прав по 16 секциям (только чтение или запись).',
      },
      {
        stepNumber: 3,
        title: 'Персональный ключ Gemini',
        instruction: 'Сотрудник может ввести свой личный API-ключ Gemini. Он будет зашифрован в AES-256 Vault и использован в первую очередь при консультациях.',
      },
    ],
  },
];
