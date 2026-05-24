# План задач: Омниканальные уведомления и привязка Telegram

## Шаг 1: Разработка омниканальных уведомлений (Email + Telegram)
- `[x]` Отредактировать [ticket.service.ts](file:///d:/SMM_plan_2/src/services/support/ticket.service.ts), чтобы отправлять письма на Email при ответе `STAFF` независимо от привязки Telegram.

## Шаг 2: Интеграция премиальной карточки привязки в настройки ЛК
- `[x]` Отредактировать [page.tsx](file:///d:/SMM_plan_2/src/app/dashboard/settings/page.tsx), добавив `telegramId: true` в Prisma-выборку данных пользователя.
- `[x]` Реализовать интерфейс карточки Telegram в [page.tsx](file:///d:/SMM_plan_2/src/app/dashboard/settings/page.tsx) (с выводом статуса привязки и ссылкой на защищенный редирект-роут привязки).

## Шаг 3: Добавление прямого бесшовного перехода в Telegram-бот
- `[x]` Добавить кнопку «Написать в бот» в [TelegramCard.tsx](file:///d:/SMM_plan_2/src/components/dashboard/settings/TelegramCard.tsx) для связанных аккаунтов.
- `[x]` Добавить кнопку «Написать в Telegram» в шапку чата тикета [page.tsx](file:///d:/SMM_plan_2/src/app/dashboard/tickets/[id]/page.tsx).

## Шаг 4: Верификация и тестирование (Zero-Defect)
- `[x]` Запустить тайпчек `npx tsc --noEmit` и убедиться в отсутствии ошибок.
- `[x]` Проверить адаптивность интерфейса карточки Telegram и кнопки перехода.
- `[x]` Проверить боевую сборку `npm run build`.
