# Original User Request

## Initial Request — 2026-05-25T12:16:44+03:00

Рефакторинг и оптимизация экрана импорта услуг от SMM-провайдеров в панель Smmplan. Цель — создать максимально удобный, отзывчивый и практичный B2B-интерфейс для администраторов, позволяющий быстро находить, фильтровать, сортировать и пакетно переносить услуги без рутины.

Working directory: d:\SMM_plan_2
Integrity mode: development

## Requirements

### R1. Интерактивная таблица услуг (Cherry-Pick Grid)
- **Множественный выбор (Cherry-Pick)**: Реализовать таблицу с чекбоксами для выбора услуг. Чекбокс в шапке выделяет только доступные для импорта услуги на текущей странице пагинации. Для уже импортированных услуг чекбокс заблокирован.
- **Универсальный поиск с дебаунсом**: Поиск в реальном времени по точному ID услуги (числовой ввод) и по ключевым словам в названии (например, `tg real ru`). Поиск должен иметь встроенный дебаунс (400мс) для исключения лишних запросов к базе/Redis.
- **Отображение данных и цен**:
  - Выводить нормализованное имя услуги (крупно) и оригинальное имя провайдера (мелко под ним).
  - Расчет цен строго на сервере: отображать розничную стоимость за 1 шт в рублях (`₽ / шт`) с учетом наценки (округление до 5 знаков), закупку в рублях за 1 шт и оригинальную цену провайдера (если в USD, с указанием курса).
  - Теги параметров: Соцсеть (цветной бэдж с иконкой), ГЕО, Гарантия (например, `♻️ 30D`), Скорость (`⚡ 500/h`), тип ссылки (`targetType` на основе маппинга категории).

### R2. Боковая панель фильтрации и сортировки (Filter Sidebar)
- **Фильтрация по Соцсетям**: Оформить список соцсетей в виде компактных плашек (или Telegram-диалогов) с круглыми иконками и бэджами количества доступных для импорта услуг у выбранного провайдера.
- **Специфичные фильтры**:
  - По типу услуги (Подписчики, Лайки, Просмотры, Комментарии, Реакции).
  - По наличии гарантии (Refill) и минимальному объему старта (до 100 шт — для розницы).
  - Переключатель «Скрыть уже импортированные» (исключает дублирование услуг в каталоге).
- **Быстрая сортировка**: В один клик упорядочивать список по цене закупки (сначала дешевые / дорогие), ID услуги (по возрастанию / убыванию) и минимальному заказу.

### R3. Панель параметров и Пакетный импорт (Top Action Bar)
- **Конфигурация**: Выбор активного провайдера, выбор локальной категории назначения в панели (соцсеть + категория), числовой ввод наценки в % (по умолчанию 50%).
- **Асинхронный Batch-импорт**: При клике на «Импортировать» массив выбранных ID нарезается на чанки по 50 штук (`BATCH_SIZE = 50`). Запросы отправляются последовательно с живым прогрессом на кнопке (`⏳ Импорт: X из Y`), предотвращая таймауты транзакций Prisma.
- **Уведомления**: Показ понятных плашек успеха с количеством импортированных услуг или подробных ошибок с сохранением уже перенесенных данных.

## Acceptance Criteria

### Visual & UX Quality
- [ ] Полное соответствие дизайн-системе: скругления элементов `var(--radius,10px)` (или 12px), использование семантических токенов (`bg-card`, `border-border`), отсутствие жестких 1px рамок между строками.
- [ ] Все интерактивные элементы (чекбоксы, селекты, кнопки пагинации) имеют размер touch target >= 44px согласно WCAG 2.2 AA.
- [ ] Адаптивность: боковая панель фильтров перестраивается наверх на экранах менее 768px (md).
- [ ] Плавные микро-анимации наведения (`transition-all duration-200`) на строках таблицы, кнопках и чекбоксах.

### Technical Performance & Safety
- [ ] Отсутствие дублирования импортируемых услуг в базе данных (уже импортированные услуги пропускаются и помечаются кнопкой «Редактировать» со ссылкой на локальный роут `/admin/services/localId`).
- [ ] Все Vitest тесты и TypeScript проверки (`npx tsc --noEmit`) проходят без единой ошибки.
- [ ] Сборка продакшена `npm run build` завершается успешно без предупреждений.

## Follow-up — 2026-05-25T13:12:58+03:00

# Teamwork Project Prompt — Provider Services Comparison Hub

Создание вкладки «Сравнение поставщиков» (Provider Comparison Hub) в стиле Яндекс.Маркета в разделе роутинга услуг администратора `/admin/services/[id]/routing`. Модуль позволяет сравнивать в реальном времени тарифы закупки за 1 шт, стабильность SLA на основе исторических отмен заказов, лимиты Min/Max и выполнять безопасную мгновенную смену поставщика (Hot Swap) с автоматическим логированием причин.

Working directory: d:\SMM_plan_2
Integrity mode: development

## Requirements

### R1. Интерактивная таблица сравнения поставщиков (Comparison Hub)
- **Компонент**: Реализовать компонент `ProviderComparisonHub.tsx` (`'use client'`) в карточке услуги.
- **Дизайн в стиле Telegram Light**: 
  - Цветовой контракт: App Background `#E7EBF0`, Card Background `#FFFFFF`, Primary Color `#3390EC` (синий Telegram), Muted Text `#707579`, Borders `#DCDCDC`.
  - Скругления строго ровно `10px` (`rounded-[10px]` под `var(--radius, 10px)`).
- **Матрица сравнения**:
  - Подсвечивать текущего основного (Primary) провайдера синей рамкой Telegram (`#3390EC`).
  - Выводить статус (Активен / В запасе / Отключен), цену закупки за 1 шт в рублях и USD (с учетом системного курса доллара), маржинальность в рублях и % при текущей розничной цене, лимиты провайдера (Min / Max), стабильность SLA за последние 7 дней и среднее время выполнения (ETA).
  - Использовать HSL-индикаторы для SLA: 🟢 Высокая (>95%), 🟡 Средняя (80%-95%), 🔴 Низкая (<80%).

### R2. Предохранители и Горячая замена (Hot Swap Action)
- **Hot Swap**: Кнопка «Сделать основным поставщиком» для резервных провайдеров. При клике открывается модальное окно HeroUI с требованием указать причину переключения.
- **Интеграция**: Вызов Server Action `executeHotSwap` и запись каждого переключения в `RoutingAuditLog`.
- **Защита лимитов**: Если минимальный заказ у провайдера жестче, чем лимит нашей локальной услуги (например, 1000 шт вместо 10 шт), выводить оранжевое предупреждение `⚠️ Несовместимость лимитов` и предупреждать админа о рисках зависания заказов.

### R3. Бэкенд-экшены и Аналитика SLA
- **Служба маршрутизации**: Добавить в `routing.actions.ts` Server Action `getProviderComparisonData(serviceId)` для агрегации сравнительных данных.
- **Расчет SLA**: Вычислять процент успешного выполнения заказов у конкретного провайдера по формуле: `SLA = (Успешные заказы) / (Всего отправленных заказов провайдеру) * 100%` за последние 7 дней по таблице `Order`.
- **Цены закупки**: Расчет рублевой себестоимости за 1 штуку производить строго на сервере в реальном времени с учетом плавающего курса доллара из `SystemSettings`.

## Acceptance Criteria

### Visual & UX Quality
- [ ] Полное соответствие светлой палитре Telegram Light и скруглениям `10px` без использования inline-цветов.
- [ ] Все кнопки действий и выпадающие списки имеют высоту touch target >= 44px согласно WCAG 2.2 AA.
- [ ] Микро-анимации наведения (`transition-all duration-200`) на карточках провайдеров и кнопках.
- [ ] Показ Empty State, если альтернативные маршруты отсутствуют.

### Technical Performance & Safety
- [ ] Атомарность транзакции Prisma при горячей замене Primary-провайдера (блокировка Race Conditions с фоновыми воркерами).
- [ ] Все Vitest тесты и TypeScript проверки (`npx tsc --noEmit`) проходят без ошибок.
- [ ] Продакшн сборка `npm run build` завершается успешно.

## Follow-up — 2026-05-25T21:16:18+03:00

Redesign the Admin User & Team Management workspace to fix locking roles, make user/staff management intuitive, and build a Client-Oriented Programming (COP) validation module to simulate and check usability of core administrative and client actions.

Working directory: d:\SMM_plan_2
Integrity mode: development

## Requirements

### R1. Restructured Team & User Management UI (Premium Telegram Light/Dark)
- Allow changing roles for ALL users (including existing staff) directly in the team list and search results.
- Ensure that the search tool can find ANY user (staff or client) and perform instant promotions/demotions with standard security guardrails (only OWNER can touch ADMIN/OWNER settings).
- Refactor the B2B team management layout with visual clarity, touch targets >= 44px, and Telegram-style HSL semantic variables.

### R2. Client-Oriented Programming (COP) Simulator Module
- Develop a runtime utility/dashboard that simulates client and admin behavior for complex flows (e.g., ordering, support tickets, role change).
- The simulator should automatically analyze the steps required, calculate a usability friction score (number of clicks, target size, cognitive loads), and log usability feedback to the Audit panel.

## Acceptance Criteria

### COP Simulator & Redesign
- [ ] No hardlocked roles: staff can be demoted to USER and clients promoted directly.
- [ ] Programmatic Vitest suite verifying the security bounds of the Server Actions.
- [ ] All interactive touch targets >= 44px.
- [ ] Next.js dev server builds successfully and compiles with zero TypeScript errors.

## Follow-up — 2026-05-26T12:59:02+03:00

Разработка и внедрение встроенной базы знаний и SEO-блога для клиентов Smmplan на основе бэклога (Phase 999.12), ориентированной на привлечение органического трафика, обучение пользователей алгоритмам соцсетей и нативную конверсию в продажи.

Working directory: d:\SMM_plan_2
Integrity mode: development

## Requirements

### R1. База данных и Prisma-модель статей
- Создать модель `Article` в Prisma для хранения публикаций (поля: `slug` [unique], `title`, `description`, `content` [Markdown], `status` [DRAFT/PUBLISHED], `category`, `viewCount`, `createdAt`, `updatedAt`).
- Настроить индексы для быстрого поиска по категории и статусу публикации.
- Безопасно обновить базу данных PostgreSQL (через prisma db push).

### R2. Публичный SEO/AEO роутинг в Next.js 16
- Реализовать публичные страницы:
  - `/knowledge` — плитка (сетка) всех опубликованных статей с фильтрацией по категориям.
  - `/knowledge/[slug]` — страница чтения конкретной статьи.
- Использовать Server Components по умолчанию. НИКАКИХ `"use server"` в файлах страниц (`page.tsx`).
- Использовать Metadata API в Next.js 16 для генерации динамических метатегов Open Graph.
- Внедрить валидный JSON-LD скрипт Schema.org типа `BlogPosting` на страницу статьи для индексации поисковыми роботами и AI-ассистентами.

### R3. Админ-панель управления (CRUD)
- Разработать интерфейс управления статьями в `/admin/knowledge` в премиальном стиле Telegram Light (дизайн-токены, HSL переменные, скругления `10px`).
- Дать возможность создавать, редактировать (с markdown-редактором или удобной текстовой зоной), удалять статьи и переключать статус (Черновик / Опубликовано).
- Обеспечить touch target >= 44px для всех мобильных кнопок и переключателей.

### R4. Нативная конверсия (Виджеты услуг)
- Реализовать связь между статьями и нашими локальными SMM-услугами (Service).
- В конце статьи рендерить компактную премиальную секцию "Рекомендуемые услуги" с выводом названия услуги и розничной цены за 1 штуку в формате pricePerUnitRub ₽ / шт.

## Acceptance Criteria

### Technical & Quality Guardrails
- [ ] База данных успешно мигрирована, Prisma Client сгенерирован без ошибок.
- [ ] Страница `/knowledge/[slug]` рендерит структурированный JSON-LD (BlogPosting) с защитой от XSS через экранирование угловых скобок <.
- [ ] Все интерактивные элементы управления и навигации имеют размер >= 44px.
- [ ] Все цвета используют semantic tokens из globals.css (нет inline hex/tailwind цветов вроде text-blue-500 или bg-white).
- [ ] TypeScript компилируется с 0 ошибок (npx tsc --noEmit).
- [ ] Продакшн сборка Next.js проходит успешно (npm run build).

## Follow-up — 2026-05-26T10:13:26Z

Команда разработчиков базы знаний,

В бэклог проекта добавлен новый критический манифест стандартов качества контента и SEO/AEO-копирайтинга:
- Файл: `d:\SMM_plan_2\.planning\phases\999.12-knowledge-base\SEO-CONTENT-MANIFEST.md`

ОБЯЗАТЕЛЬНО внедрите эти правила во все ИИ-модули генерации статей:
1. **Натуральный русский язык (Anti-Translation):** Полный запрет на сухие английские кальки («когда дело доходит до», «вы хотите убедиться, что», «позволяет вам делать»). Текст должен писаться на сочном, экспертном профессиональном русском SMM-языке.
2. **Персонализация (Ротация авторов по E-E-A-T):** Статьи не должны быть безымянными. Каждая статья публикуется от лица конкретного эксперта с его уникальным стилем и должностью:
   - **Михаил (34 года)** — Системный архитектор прокси-сетей (строгий, технический стиль, прокси, лимиты, антифрод).
   - **Ольга (27 лет)** — Старший специалист поддержки (эмпатичный стиль, реальные боли, тикеты, списания).
   - **Дмитрий (29 лет)** — Арбитражник/трафик-менеджер (бизнес-стиль, ROI, конверсии, социальное доказательство).
3. **Обход ИИ-детекторов (Anti-AI Filters):** Использовать «рваный ритм» (чередовать сверхкороткие предложения с длинными), риторические вопросы и профессиональный сленг, чтобы поисковые системы не пессимизировали блог за автогенерацию.
4. **Контекстные виджеты услуг и форма автоподбора по ссылке:** В конце статей предусмотреть интерактивный автоподбор на основе анализа структуры введенной пользователем ссылки.

Подтвердите получение и интеграцию этих правил в логику написания контента.

С уважением,
Главный Архитектор Smmplan

## Follow-up — 2026-05-26T13:16:39+03:00

Разработка и внедрение умной навигационной экосистемы Базы знаний Smmplan, включающей древовидные категории, полнотекстовый поиск с автокомплитом, и систему контекстных ИИ-рекомендаций статей непосредственно в тикетах поддержки (клиентам и операторам).

Working directory: d:\SMM_plan_2
Integrity mode: development

## Requirements

### R1. Древовидная навигация и Related Articles
- Реализовать группировку статей по категориям ("Безопасность соцсетей", "Продвижение и Органика", "Биллинг и Лимиты").
- Внедрить хлебные крошки (Breadcrumbs) на страницах чтения статей для легкого возврата в разделы.
- Разработать алгоритм "Похожие статьи" (Related Articles): в конце каждой публикации выводить 3 релевантные статьи из той же категории, исключая текущую.
- Соблюдать HSL-стилистику Telegram Light и touch-targets >= 44px.

### R2. Интерактивный поиск с автокомплитом
- На странице `/knowledge` внедрить строку поиска с живым (Client/Server) автокомплитом по мере ввода (Debounce 300ms).
- Поиск должен искать по совпадениям в `title`, `description` и ключевых словах статей.
- Поддерживать навигацию по выпадающим результатам поиска с клавиатуры (`ArrowUp`, `ArrowDown`, `Enter`).

### R3. Контекстные рекомендации в тикетах (Умный Саппорт)
- **Клиентская зона (`/dashboard/tickets`):** При написании текста тикета клиентом, на лету анализировать содержимое (regex / keyword NLP на клиенте). При совпадении триггеров (например, "списались подписчики" -> статья про списания Telegram; "завис статус" -> статья про лимиты) выводить блок: "Часто помогает: [Название статьи]".
- **Админ-зона (`/admin/tickets/[id]`):** В Unified Workspace оператора выводить блок рекомендованных статей по теме тикета. Добавить кнопку «📎 Прикрепить статью» рядом с каждой рекомендацией, позволяющую оператору мгновенно отправить ссылку на статью в чат в один клик.

### R4. Профили экспертов-авторов
- Использовать поля `authorName` и `authorRole` из Prisma-модели `Article` в интерфейсе.
- Отображать красивую плашку автора под H1 статьи (имя, должность, экспертная аватарка).
- Передавать имя и роль автора в Schema.org JSON-LD `Person` метаданные.

## Acceptance Criteria

### Technical & UX Guardrails
- [ ] Роутинг `/knowledge` полностью работоспособен с фильтрацией по категориям и поисковым запросам.
- [ ] Оверлей поиска на мобильных устройствах адаптируется под ширину экрана.
- [ ] В чате тикетов клик на «Прикрепить статью» отправляет валидную Markdown-ссылку на `/knowledge/[slug]` в текстовое поле ввода или как сообщение.
- [ ] Микро-анимации наведения (`transition-all duration-200`) на карточках категорий и статей.
- [ ] TypeScript компилируется с 0 ошибок (npx tsc --noEmit).
- [ ] Продакшн сборка Next.js проходит успешно (npm run build).

## Follow-up — 2026-05-27T19:22:17+03:00

Выполнение глубокого аудита и визуальной проверки интерфейса сайта Smmplan на соответствие принципам клиентоориентированности и качества UX, зафиксированным в скилле `gsd-client-centric`.

Working directory: d:\SMM_plan_2
Integrity mode: development

## Requirements

### R1. Визуальный аудит по чек-листу клиента
Анализ интерфейсов заказа, чекаута и каталога на предмет отсутствия лишнего трения (Zero-Friction UX), корректной обработки ошибок (No Silent Failures) и заполнения пустых состояний (Empty States).

### R2. Инспекция смарт-парсинга и защиты форм
Проверка валидатора ссылок, механизмов предотвращения потери пользовательских данных при сбоях и защиты от повторных кликов при оформлении заказа.

## Acceptance Criteria

### UX & Client Orientation Checklist
- [ ] Все критические интерактивные элементы (кнопки отправки, выбор категорий) имеют четкие состояния загрузки (isLoading) для защиты от повторных списаний.
- [ ] Ошибки ввода (например, неверный URL) подсвечиваются в контексте инпутов, а не абстрактно, с использованием преимуществ HeroUI.
- [ ] Код прощения опечаток пользователя (smart-parsing) корректно обрабатывает пограничные случаи.
- [ ] Логические "пустые состояния" (empty states) имеют красивое оформление и призыв к действию.

## Follow-up — 2026-05-30T19:02:53Z

Выполнение комплексного аудита, анализа и выработки детального плана стандартизации обработки и отображения ошибок (Error Handling & Error Displaying) во всем приложении Smmplan Lite. Все ошибки в системе (Server Actions, API, Client Components) должны быть приведены к единому стандарту: уникальный код ошибки (`[ERR_...]`) и понятное, клиентоориентированное описание на русском языке.

Working directory: d:\SMM_plan_2
Integrity mode: development

## Requirements

### R1. Глобальный аудит текущей обработки ошибок
Провести глубокий сканинг кодовой базы и выявить все места, где:
- Ошибки замалчиваются (silent failures, пустые `catch`).
- Ошибки выводятся в сыром виде из базы данных (Prisma) или внешних API на английском языке.
- Ошибки маскируются Next.js в generic-строку `"Internal Server Error during execution"`.

### R2. Проектирование единого реестра и архитектуры ошибок
Разработать спецификацию единого словаря ошибок проекта Smmplan Lite по категориям:
- `ERR_AUTH_*` (ошибки авторизации, сессий и RBAC).
- `ERR_DB_*` (сбои базы данных, транзакций Prisma, нарушения уникальности).
- `ERR_PROVIDER_*` (таймауты, сетевые сбои API-провайдеров услуг).
- `ERR_PAYMENT_*` (ошибки платежных шлюзов ЮKassa, Robokassa).
- `ERR_VALIDATION_*` (ошибки валидации форм на клиенте и сервере через Zod).
- `ERR_ORDER_*` (ошибки создания, отмены и проведения заказов).

### R3. Выработка детального плана внедрения (Remediation Roadmap)
Создать пошаговое руководство по рефакторингу ключевых модулей приложения для интеграции централизованного локализатора `src/utils/error-handler.ts`.

## Acceptance Criteria

### Error Auditing & Standards Checklist
- [ ] Сформирован полный отчет-аудит (Error Audit Report) с указанием конкретных файлов и строк, требующих доработки.
- [ ] Описана единая архитектура перехвата ошибок на стыке клиент-сервер (включая обработку ошибок в Server Actions, API routes и React Suspense/Error Boundaries).
- [ ] Разработана и согласована таблица соответствия кодов ошибок `[ERR_CODE]` и русскоязычных сообщений для 30+ типовых сценариев сбоев.
- [ ] План рефакторинга покрывает критические финансовые зоны: пополнение баланса, чекаут заказов, списание средств, кэширование Redis.
- [ ] Все предложенные архитектурные изменения соответствуют строгому контракту **AGENTS.md** и Next.js 16/React 19 стандартам.

## Follow-up — 2026-06-02T10:53:01+03:00

Comprehensive verification of the Smmplan codebase, database population, provider integration, service imports, and execution health.

Working directory: `d:\SMM_plan_2`
Integrity mode: development

## Requirements

### R1. Codebase Integrity & Build Check
- Run compilation checks (`npx tsc --noEmit` or equivalent) and ESLint to verify that the project is in a clean buildable state.
- Ensure that the project follows the standard directory structure and file layout as defined in `AGENTS.md`.

### R2. Database Population & Seed Verification
- Inspect the PostgreSQL database via Prisma client to verify that all necessary migrations are applied.
- Ensure that key master tables (Networks, Categories, Users) are populated and contain the required baseline records.

### R3. Provider Integration & Shadow Catalog Status
- Verify that API providers are registered in the database.
- Check that the Redis shadow catalog contains cached services (`provider:{id}:shadow_catalog`) for the registered providers.

### R4. Imported Services & Pricing Validation
- Verify that active services have been successfully cherry-picked and imported into the `Service` table.
- Validate that imported services comply with the pricing rules (pricing is represented correctly, unit price calculated, no hardcoded rates in UI) and that the `targetType` mapping is correct (e.g., matching category rules in `src/utils/target-type.ts`).

### R5. Execution & Runtime Verification
- Verify that the Next.js application starts up successfully on the development port.
- Check that the background workers (BullMQ/Redis) can start up without crashing, ensuring the full pipeline (Web + Worker) is ready for local execution.

## Acceptance Criteria

### Build & Codebase Health
- [ ] No block-level TypeScript compiling errors (`npx tsc --noEmit` passes).
- [ ] Project directory structure complies with the `AGENTS.md` standard.

### Database & Providers
- [ ] Database contains at least one active Provider.
- [ ] Redis shadow catalog is initialized and populated with provider services.
- [ ] Database is populated with essential tables (Users, Networks, Categories, Services).

### Services & Pricing Consistency
- [ ] Imported services have valid `targetType` values (e.g., no default `POST` fallback where `CHANNEL` is required).
- [ ] Pricing model matches the rules: unit price (`pricePerUnitRub`) is calculated as `pricePer1kRub / 1000`.

### Execution
- [ ] Next.js server starts successfully without immediate fatal error.
- [ ] BullMQ background processes / workers are validated as executable.

## Follow-up — 2026-06-02T14:04:16+03:00

Conduct a comprehensive statistical, logical, and architectural audit of communication and support routing during critical payment/checkout failures on Smmplan, design a high-availability "Support Fallback Matrix" (resolving the Telegram/Live Chat/Email trade-offs), and implement a premium, foolproof Apple-style error screen.

Working directory: `d:\SMM_plan_2`
Integrity mode: development

## Requirements

### R1. Логико-статистический аудит и матрица отказов («Support Fallback Matrix»)
- Провести глубокий анализ узких мест коммуникационных каналов:
  - **Telegram**: Риски блокировок, отсутствие аккаунта у части аудитории, нежелание светить личный профиль.
  - **Live-чат**: Риск оттока (bounce rate), если оператор не отвечает мгновенно; сессионные сбросы на iOS Safari при сворачивании браузера.
  - **Email**: Медленная скорость реакции, попадание в спам, неудобство переписки с мобильного.
- Разразработать **Отказоустойчивую Матрицу Поддержки** (Support Fallback Matrix): умный алгоритм динамической перегрузки каналов саппорта в зависимости от сложности сбоя, состояния сети клиента и доступности операторов.

### R2. Архитектура асинхронного спасения («Offline-First Support Core»)
- Разработать логику сохранения обращений: если пользователь столкнулся с ошибкой, но не хочет переходить в Telegram, система должна позволить ему оставить оффлайн-обращение прямо на экране ошибки в один клик.
- Данные о сбое (ID транзакции, тип ошибки, введенные параметры заказа) автоматически связываются с обращением в БД, а ответ поддержки доставляется пользователю в ЛК с push-уведомлением или возможностью отслеживания по уникальной короткой ссылке (без регистрации).

### R3. Премиальный UI-экран спасения (/support/payment-error) в стиле Apple
- Создать потрясающую, спокойную страницу ошибки, соответствующую манифестам премиальности (Tailwind 4, HeroUI v3, HSL-палитра, микро-анимации).
- Исключить технический пугающий сленг, заменив его на вежливый человеческий язык («Ваш платеж под нашей защитой»).
- Разместить три четких варианта решения:
  1. **Быстрый самоконтроль** (если проблема решается действием пользователя, например: "Включить СБП").
  2. **Интеллектуальная кнопка саппорта** (Telegram с предзаполненными метаданными сбоя).
  3. **Оффлайн-форма быстрого ответа** (прямо на странице, с автосохранением в БД/Redis и трекингом статуса, чтобы пользователю не нужно было сидеть и ждать оператора в чате).

## Acceptance Criteria

### Аналитический отчет
- [ ] В корне проекта создан документ `payment_error_architecture.md` с детальным логико-статистическим разбором воронки отказов и обоснованием выбранной стратегии.
- [ ] Описана математическая модель снижения оттока (bounce rate) при внедрении оффлайн-форм и авто-подсказок.

### Системная логика и БД
- [ ] Реализован API-эндпоинт / Server Action для моментального приема оффлайн-тикета сбоя с авто-привязкой метаданных неудавшейся транзакции.
- [ ] Оффлайн-обращения защищены от спама (Rate Limiting) и сохраняются в PostgreSQL в таблице `TicketMessage` / `Ticket`.

### Интерфейс (UI/UX)
- [ ] Создана страница `src/app/support/payment-error/page.tsx` с полной мобильной адаптацией (320px - 4K), отсутствием интерфейсного гигантизма и touch-мишенями >= 48px.
- [ ] Компонент чекаута (`checkout-modal.tsx` или аналогичный) корректно перенаправляет пользователя на `/support/payment-error` с query-параметрами ошибки при сбое API-запроса YooKassa.
- [ ] Успешно пройдена компиляция TypeScript (`npx tsc --noEmit`) и проверка линтинга.

## Follow-up — 2026-06-02T14:45:41+03:00

Conduct a comprehensive architectural, logical, security, and UX audit of Smmplan's checkout flow, payment-error fallback screen, offline ticketing, and YooKassa status synchronization. Identify all potential failure modes, race conditions, design-system violations, and security exploits, and verify that our implementation is completely free of these defects.

Working directory: `d:\SMM_plan_2`
Integrity mode: development

## Requirements

### R1. Глубокий аудит логических и архитектурных ошибок (Failure Modes Audit)
- Исследовать кодовую базу на стыке чекаута, роутинга ошибок `/support/payment-error`, создания тикетов `offline-ticket.ts` и синхронизации статусов YooKassa.
- Составить исчерпывающий каталог потенциальных уязвимостей и сбоев по 5 векторам надежности (Архитектурный стык, Хаос и пустота, Visual & UX Density, WCAG 2.2 AA, Security & Trust).
- Особое внимание уделить:
  - Состоянию гонки (Race Conditions) при параллельных запросах `/api/order-status` и вебхуков YooKassa.
  - Двойному списанию баланса или двойному зачислению (Double-spend / Double-credit).
  - Уязвимостям IDOR и утечкам конфиденциальных данных в `offline-ticket` Server Action.
  - Качеству разметки и доступности форм оффлайн-обращений.

### R2. Инструментальная верификация и устранение дефектов
- Провести аудит кода на соответствие правилам `AGENTS.md` (типизация в Tailwind 4, отсутствие inline-цветов, правильное использование семантических токенов, дочерние функции на `SelectValue`).
- Выполнить проверку и убедиться, что ни одна из найденных ошибок или потенциальных уязвимостей не присутствует в коде. При обнаружении скрытых багов или неполных обработчиков — исправить их.

## Acceptance Criteria

### Аналитический отчет об аудите
- [ ] В корне проекта создан/обновлен документ `payment_audit_report.md`, содержащий систематизированную таблицу потенциальных рисков и подтверждение их отсутствия (или отчет об их устранении).
- [ ] Матрица рисков оценивает сценарии сбоя по шкале вероятности и влияния (P×I) с конкретными защитными механизмами.

### Качество и безопасность кода
- [ ] В Server Action `offline-ticket` подтверждена строгая валидация ввода (Zod), защита от спама (Rate Limiting) и отсутствие утечек IDOR.
- [ ] Статус-синхронизация YooKassa в `/api/order-status/route.ts` корректно обрабатывает тестовый и боевой режимы без конфликтов при параллельных запросах.
- [ ] Код соответствует дизайн-системе: отсутствуют inline-цвета (например, `text-white`, `bg-black`), все элементы используют HSL переменные из `globals.css`.

### Интеграционная верификация
- [ ] TypeScript компилируется без единой ошибки (`npx tsc --noEmit`).
- [ ] Next.js проект собирается без предупреждений компиляции (`npm run build`).

## Follow-up — 2026-06-03T12:28:48+03:00

Conduct a comprehensive multi-pass architectural, security, logical, and UX audit of the Smmplan project to prepare it for production, strictly using the instructions and protocols defined in the `gsd-production-critic` skill. Locate minor bugs, UX flaws, and code-quality issues while strictly refraining from making any code changes.

Working directory: `d:\SMM_plan_2`
Integrity mode: development

## Focus Areas
- Deep audit of the entire project, focusing on payment gateways (YooKassa, Robokassa), Server Actions, and API endpoints.
- Front-end audit against design system requirements (Tailwind 4, HeroUI v3 named exports, and HSL semantic colors).
- **Core Directive**: Execute the audit following the 6 filters and checklist defined in the [gsd-production-critic](file:///d:/SMM_plan_2/.agent/skills/gsd-production-critic/SKILL.md) skill.

## Requirements

### R1. Глубокий многопроходный аудит проекта (Deep Multi-Pass Audit)
- Провести исследование всей кодовой базы Smmplan по 5 векторам надежности (Архитектурный стык, Хаос и пустота, Visual & UX Density, WCAG 2.2 AA, Security & Trust) и 6 фильтрам надежности из `gsd-production-critic`.
- Выявить мелкие баги, неочевидные граничные случаи (edge cases), недочеты в типизации, проблемы производительности и отклонения от дизайн-системы.
- Запрещено изменять файлы исходного кода или конфигураций в репозитории. Разрешен только сбор улик и запуск диагностических утилит.

### R2. Инструментальная диагностика
- Разрешено запускать проверку типов `npx tsc --noEmit`, встроенные тесты `vitest` и линтеры для поиска скрытых ошибок сборки и компиляции.
- Все временные файлы или файлы логов сборки не должны попадать в отслеживаемый git-индекс исходного кода.

### R3. Формирование детального отчета
- Собрать результаты проверок в структурированный финальный отчет с разделением по критичности дефектов (Severity Model: Critical, High, Medium, Low).
- Подтвердить дефекты доказательствами: приложить выдержки из кода (номера строк) или логи выполнения статических анализаторов.

## Acceptance Criteria

### Отчет об аудите качества и безопасности
- [ ] В корне проекта создан/обновлен подробный отчет `production_readiness_audit.md` с полной таблицей найденных дефектов и рекомендациями.
- [ ] Каждый найденный недочет сопровождается ссылкой на конкретные файлы и строки кода в качестве доказательства.
- [ ] Отчет содержит общую оценку готовности проекта к релизу (Readiness Score) по 100-балльной шкале.

### Сохранность кодовой базы
- [ ] `git status` показывает отсутствие измененных исходных файлов (код проекта не модифицирован в процессе аудита).

## Follow-up — 2026-06-03T12:31:45+03:00

Conduct a comprehensive multi-pass architectural, security, logical, and UX audit of the Smmplan project to prepare it for production, strictly using the instructions and protocols defined in the `gsd-production-critic` skill. Analyze and classify all found defects by severity level (Critical, High, Medium, Low), and document them along with mitigation recommendations. Strictly refrain from modifying any codebase files in the repository.

Working directory: `d:\SMM_plan_2`
Integrity mode: development (Allows running system linter, typecheck, and test suites, but prohibits committing any code changes to the repository)

## Resources
- `d:\SMM_plan_2\AGENTS.md` — Smmplan architectural contract (must exist in the repository before audit starts)
- `d:\SMM_plan_2\.agent\skills\gsd-production-critic\SKILL.md` — Core pre-release auditor instructions and checklists

## Focus Areas & Glossary

### 1. YooKassa API v3 Integration
- Audit the payment status synchronization logic at `/api/order-status/route.ts` and YooKassa webhook handlers.
- **Double-spend / Double-credit prevention**: Verify that parallel requests or duplicate YooKassa webhook notifications cannot result in duplicate balance credit to a user or duplicate charges for the same order.

### 2. Support Ticketing & Offline Recovery
- Audit the input validation and error tracking in the Server Action file `src/actions/support/offline-ticket.ts`.
- Ensure strict mitigation against IDOR vulnerabilities, rate limiting (anti-spam), and proper fallback routes like `/support/payment-error`.

### 3. Reliability & 5 Vectors Checklist
A agents team must audit the project against the 5 vectors of reliability:
- **Архитектурный стык (Architecture Boundaries)**: Proper Server vs Client component boundaries, no `"use server"` declarations inside page files, Server Actions protected by `requireAdmin()`.
- **Хаос и пустота (Chaos & Edge Cases)**: Zero-data database states, error-recovery flow, database transaction safety via Prisma `$transaction`.
- **Visual & UX Density**: Responsiveness from 320px up to 4K resolution, lack of oversized UI elements, clean layouts.
- **Доступность (WCAG 2.2 AA)**: Form touch targets must be at least 44px (preferably 48px), text-to-background contrast ratio must be ≥ 4.5:1, interactive components must have appropriate ARIA attributes.
- **Security & Trust**: Server-side pricing enforcement, IDOR checks, visible secure payment badges.

## Requirements

### R1. Глубокий аудит логических и архитектурных ошибок (Failure Modes Audit)
- Исследовать кодовую базу на стыке чекаута, роутинга ошибок `/support/payment-error`, создания тикетов `src/actions/support/offline-ticket.ts` и синхронизации статусов YooKassa API v3.
- Составить исчерпывающий каталог потенциальных уязвимостей и сбоев по 5 векторам надежности.

### R2. Инструментальная верификация стандартов
- Провести audit кода на соответствие правилам `AGENTS.md` (типизация в Tailwind 4, использование семантических токенов, дочерние функции на `SelectValue` в компонентах Select).
- Выполнить проверку типов `npx tsc --noEmit` and `npm run build`.

### R3. Формирование отчета об аудите
- Документировать все дефекты по уровням критичности: `Critical`, `High`, `Medium`, `Low`. Не модифицировать файлы проекта.

## Acceptance Criteria

### Отчет об аудите (Audit Report)
- [ ] В корне проекта создан/обновлен документ `production_readiness_audit.md` с полной таблицей найденных дефектов.
- [ ] Каждый дефект подкреплен доказательством (ссылка на имя файла и номера строк кода).
- [ ] Отчет содержит общую оценку готовности проекта к релизу (Readiness Score) по 100-балльной шкале (из расчета: старт со 100, минус 50 за Critical, 20 за High, 5 за Medium, 1 за Low).

### Качество и безопасность (Code Quality & Security)
- [ ] В Server Action `src/actions/support/offline-ticket.ts` оценена валидация ввода, защита от спама (Rate Limiting) and отсутствие утечек IDOR.
- [ ] Оценено поведение YooKassa API v3 синхронизатора в `/api/order-status/route.ts` на предмет устойчивости к гонкам при параллельных вызовах.
- [ ] Форма оффлайн-обращений на странице `/support/payment-error` проверена на соответствие WCAG 2.2 AA (мишени touch targets ≥ 44px, ариа-метки, контраст ≥ 4.5:1).
- [ ] Проверен дизайн-код: отсутствуют произвольные (arbitrary) значения цветов (например, `text-[#...]`, `bg-[#...]`) и inline-стили `style="..."` с цветами. Брендовые цвета используют семантические переменные HSL из `globals.css`.

### Интеграционная диагностика (Diagnostics & Escape Paths)
- [ ] Выполнен запуск `npx tsc --noEmit` and `npm run build`. 
- [ ] Если сборка завершается с ошибками, они детально логгируются в `production_readiness_audit.md` с меткой `[CRITICAL_BUILD_FAIL]`, а сам аудит продолжается без изменений исходного кода.
- [ ] `git status` показывает, что файлы исходного кода не модифицированы.

## Follow-up — 2026-06-03T19:59:47+03:00

Conduct a comprehensive multi-pass visual and UX audit of the SMMplan project. Verify pages on a running local dev server (`http://localhost:3000`), identify all visual and functional defects, classify them by severity in a P×I risk matrix, and generate a remediation roadmap.

Working directory: `d:\SMM_plan_2`

---

## Ресурсы и Окружение

> ⚠️ Все перечисленные службы и файлы должны существовать/работать до начала делегирования.

- Web Server: `http://localhost:3000` (Next.js 16/React 19)
- Database: Postgres на `127.0.0.1:5433` (smmplan_lite)
- Cache: Redis на `127.0.0.1:6379`
- `d:\SMM_plan_2\AGENTS.md` — Правила дизайн-системы: токены, Tailwind 4
- `d:\SMM_plan_2\app\globals.css` — HSL-переменные всех дизайн-токенов
- `d:\SMM_plan_2\payment_audit_report.md` — Контекст предыдущего аудита
- Chrome DevTools Lighthouse / Playwright / Puppeteer — Автоматизированный аудит

---

## Страницы для Аудита

- `/` (Landing Page)
- `/auth/login` (Вход в систему)
- `/dashboard/orders` (Список заказов)
- `/dashboard/wallet` (Пополнение баланса и статус кошелька)
- `/support` (Интерактивная поддержка и тикеты)
- `/support/payment-error` (Форма оффлайн-обращения при сбое)
- `/success` (Экран успешного оформления заказа)
- `/admin/settings` (Панель настроек администратора)
- `/dashboard/tickets/[id]` (Экран конкретного обращения)

---

## Требования (Requirements)

### R1. Аудит визуальной иерархии и дизайн-системы (Visual Hierarchy & Tokens)
- Проверить верстку на соответствие `AGENTS.md`. Исключить использование произвольных инлайн-цветов (например, `text-[#...]`, `bg-[#...]` или `text-white`, `bg-black`). Все цвета должны ссылаться на семантические токены из `globals.css` (`bg-background`, `text-foreground`, `text-primary` и др.).
- Проверить шрифты, отступы, выравнивание сеток (grid/flex) на предмет аккуратности и визуального шума.

### R2. Математический аудит контрастности (WCAG 2.2 AA Contrast)
- Рассчитать коэффициенты контрастности текста относительно фона для ключевых интерактивных и текстовых элементов (кнопки, ссылки, подписи) в светлой и темной темах.
- Контрастность обычного текста должна составлять не менее 4.5:1, крупного или жирного — не менее 3:1.
- Сформировать подробную Contrast Matrix.

### R3. Мобильная адаптивность и размеры мишеней (Mobile Layout & Touch Targets)
- Проверить отображение страниц на мобильном вьюпорте (375x812 и др.) на предмет перекрытия элементов (например, наложения floating виджета переключения тем на нижний навигационный бар), вылезания текста за границы экранов и сломанной верстки.
- Измерить размеры интерактивных областей (touch targets) согласно критерию WCAG 2.5.5. Они должны быть не менее 44x44 CSS-пикселей.

### R4. Автоматизированный аудит и консольные логи
- Запустить тесты Lighthouse для каждой страницы из списка и зафиксировать оценки (Performance, Accessibility, Best Practices, SEO).
- Собрать ошибки, предупреждения и исключения JS в консоли браузера при переходах и действиях пользователя.

### R5. Протокол автоматического исправления WCAG (Auto-Fix Protocol)
- Запрещено менять логику работы или дизайн приложения.
- Разрешается автоматически добавлять недостающие `aria-label`, теги `alt` для изображений, связывать `<label htmlFor="...">` с `<input id="...">` при условии, что:
  - Любые авто-исправления помечаются как `[AUTO-FIXED]`
  - Проект после авто-исправлений успешно собирается (`npx tsc --noEmit` и `npm run build` возвращают 0 ошибок)
  - В случае падения сборки изменения откатываются и переносятся в категорию `[DEFERRED]`

---

## Структура `visual_audit_report.md`

```markdown
# Visual Audit Report — SMMplan
Date: YYYY-MM-DD
Status: AUDIT COMPLETE / PENDING FIXES

## 1. Executive Summary
## 2. Lighthouse Scores (таблица по страницам)
## 3. Contrast Matrix (HSL-токены × фоны)
## 4. P×I Risk Matrix (все нарушения)
## 5. Findings by Vector
   ### 5.1 Визуальная иерархия
   ### 5.2 Цветовая система
   ### 5.3 Плотность контента
   ### 5.4 Современность дизайна
   ### 5.5 Консистентность компонентов
## 6. Mobile / Responsive Audit
## 7. WCAG 2.2 AA Compliance
## 8. Design Modernity Scores (по страницам)
## 9. Remediation Roadmap (приоритизированный список)
## 10. Auto-Fixed Items (если есть)
```

## Follow-up — 2026-06-03T20:16:13+03:00

Conduct a comprehensive multi-pass visual and UX audit of the SMMplan project. Verify pages on a running local dev server (`http://localhost:3000`), identify all visual and functional defects, classify them by severity in a P×I risk matrix, and generate a remediation roadmap.

Working directory: `d:\SMM_plan_2`

---

## Ресурсы и Окружение

- Web Server: `http://localhost:3000` (Next.js 16.2.6 / React 19.2.6 / Tailwind CSS 4.0.0 / HeroUI v3)
- Database: Postgres на `127.0.0.1:5433` (smmplan_lite)
- Cache: Redis на `127.0.0.1:6379`
- `d:\SMM_plan_2\AGENTS.md` — Правила дизайн-системы: токены, Tailwind 4
- `d:\SMM_plan_2\app\globals.css` — HSL-переменные всех дизайн-токенов
- `d:\SMM_plan_2\payment_audit_report.md` — Контекст предыдущего аудита
- Chrome DevTools Lighthouse / Playwright / Puppeteer — Автоматизированный аудит

---

## Страницы для Аудита (с приоритетами)

### P1 (Critical Checkout & Support Flow)
- `/` (Landing Page)
- `/support/payment-error` (Форма оффлайн-обращения при сбое платежа)
- `/success` (Экран успешного оформления заказа)
- `/dashboard/wallet` (Пополнение баланса и статус кошелька)
- `/dashboard/orders` (Список заказов пользователя)

### P2 (Management & Settings)
- `/admin/settings` (Панель настроек администратора)
- `/dashboard/tickets/[id]` (Экран конкретного обращения)
- `/support` (Интерактивная поддержка и тикеты)

### P3 (Authentication & Static)
- `/auth/login` (Вход в систему)

---

## Требования (Requirements)

### R1. Аудит визуальной иерархии и дизайн-системы (Visual Hierarchy & Tokens)
- Проверить верстку на соответствие `AGENTS.md`. 
- **Запрещены**: arbitrary-значения (`text-[#...]`, `bg-[#...]`) и `style`-атрибуты с жестко прописанными цветами. Стандартные Tailwind-утилиты (`text-white`, `bg-black`, `text-foreground`, `bg-background` и т.д.) допустимы только если соответствуют семантическому токену в `globals.css`.
- Проверить шрифты, отступы, выравнивание сеток (grid/flex) на предмет аккуратности и визуального шума.
- **Критерий CTA-иерархии**: на каждом экране должен быть ровно один визуально доминирующий призыв к действию (CTA), выделенный первичным цветом.

### R2. Математический аудит контрастности (WCAG 2.2 AA Contrast)
- Рассчитать коэффициенты контрастности текста относительно фона для ключевых интерактивных и текстовых элементов (кнопки, ссылки, подписи) в светлой и темной темах.
- Контрастность обычного текста должна составлять не менее 4.5:1, крупного или жирного — не менее 3:1.
- Сформировать подробную Contrast Matrix.

### R3. Мобильная адаптивность и размеры мишеней (Mobile Layout & Touch Targets)
- Проверить отображение страниц на трех контрольных точках (breakpoints): `375px` (Mobile), `768px` (Tablet) и `1440px` (Desktop). Выявить перекрытие элементов (например, наложение floating виджета переключения тем на нижний навигационный бар), вылезания текста за границы экранов и сломанной верстки.
- Измерить размеры интерактивных областей (touch targets) согласно критерию WCAG 2.5.5. Они должны быть не менее 44x44 CSS-пикселей.

### R4. Проверка доступности (Accessibility & Grayscale)
- Провести **Grayscale-тест** (эмуляция монохромного режима в Chrome DevTools) для проверки того, что цвет не является единственным визуальным индикатором состояния интерфейса (прямое нарушение WCAG SC 1.4.1).
- Запустить тесты Lighthouse для каждой страницы из списка и зафиксировать оценки (Performance, Accessibility, Best Practices, SEO).
- Собрать ошибки, предупреждения и исключения JS в консоли браузера при переходах и действиях пользователя.

### R5. Оценка современности дизайна (Design Modernity)
- Оценить современность дизайна по шкале от 1 до 10 (где 1 — устаревший Web 1.0, 10 — премиальный Stripe/Vercel-level дизайн с градиентами, микроанимациями, тональным контрастом и шрифтовым разнообразием). Описать критерии оценки для каждой страницы.

### R6. Консистентность компонентов (Component Consistency)
- Проверить единообразие кнопок, инпутов, селекторов и модальных окон по всему приложению. Убедиться в правильном использовании HeroUI v3 (NextUI) dot notation API (`<Table.Header>`, `<Table.Column>`).

### R7. Протокол автоматического исправления WCAG (Auto-Fix Protocol)
- Запрещено менять логику работы или дизайн приложения.
- Разрешается автоматически добавлять недостающие `aria-label`, теги `alt` для изображений, свявать `<label htmlFor="...">` с `<input id="...">` при условии, что:
  - Любые авто-исправления помечаются как `[AUTO-FIXED]`
  - Проект после авто-исправлений успешно собирается (`npx tsc --noEmit` и `npm run build` возвращают 0 ошибок)
  - **Escape-path**: Если сборка после auto-fix падает, изменения откатываются через `git checkout -- <file>`, а дефект фиксируется в отчете как `[DEFERRED]` с описанием причины проблемы.

---

## Пороговые значения Lighthouse

| Категория | Минимум | Цель |
|-----------|---------|------|
| Performance | ≥ 70 | ≥ 90 |
| Accessibility | ≥ 90 | 100 |
| Best Practices | ≥ 90 | 100 |
| SEO | ≥ 80 | ≥ 95 |

---

## Acceptance Criteria
- [ ] `visual_audit_report.md` создан в корне проекта.
- [ ] Lighthouse Accessibility ≥ 90 на всех P1-страницах.
- [ ] Contrast Matrix заполнена для всех HSL-токенов в `globals.css`.
- [ ] P×I Risk Matrix содержит все найденные нарушения с указанием приоритетов (Severity).
- [ ] Все скриншоты аудита сохранены в директорию `visual_audit_assets/`.
- [ ] Для всех `[AUTO-FIXED]` правок вызов `npx tsc --noEmit` возвращает 0 ошибок.
- [ ] Команда `npm run build` завершается с результатом SUCCESS после любых внесенных auto-fix изменений.
- [ ] `git status` чист (все не-auto-fix файлы исходного кода не изменены).

---

## Структура `visual_audit_report.md`

```markdown
# Visual Audit Report — SMMplan
Date: 2026-06-03
Status: AUDIT COMPLETE / PENDING FIXES

## 1. Executive Summary
## 2. Lighthouse Scores (таблица по страницам)
## 3. Contrast Matrix (HSL-токены × фоны)
## 4. P×I Risk Matrix (все нарушения)
## 5. Findings by Vector
   ### 5.1 Визуальная иерархия
   ### 5.2 Цветовая система
   ### 5.3 Плотность контента
   ### 5.4 Современность дизайна
   ### 5.5 Консистентность компонентов
## 6. Mobile / Responsive Audit
## 7. WCAG 2.2 AA Compliance
## 8. Design Modernity Scores (по страницам)
## 9. Remediation Roadmap (приоритизированный список)
## 10. Auto-Fixed Items (если есть)
```

## Follow-up — 2026-06-03T20:20:08+03:00

Conduct a comprehensive multi-pass visual and UX audit of the SMMplan project. Verify pages on a running local dev server (`http://localhost:3000`), identify all visual and functional defects, classify them by severity in a P×I risk matrix, and generate a remediation roadmap.

Working directory: `d:\SMM_plan_2`

---

## Ресурсы и Окружение

- Web Server: `http://localhost:3000` (Next.js 16.2.6 / React 19.2.6 / Tailwind CSS 4.0.0 / HeroUI v3)
- Database: Postgres на `127.0.0.1:5433` (smmplan_lite)
- Cache: Redis на `127.0.0.1:6379`
- `d:\SMM_plan_2\AGENTS.md` — Правила дизайн-системы: токены, Tailwind 4
- `d:\SMM_plan_2\app\globals.css` — HSL-переменные всех дизайн-токенов
- `d:\SMM_plan_2\payment_audit_report.md` — Контекст предыдущего аудита
- Chrome DevTools Lighthouse / Playwright / Puppeteer — Автоматизированный audit

---

## Страницы для Аудита (с приоритетами)

### P1 (Critical Checkout & Support Flow)
- `/` (Landing Page)
- `/support/payment-error` (Форма оффлайн-обращения при сбое платежа)
- `/success` (Экран успешного оформления заказа)
- `/dashboard/wallet` (Пополнение баланса и статус кошелька)
- `/dashboard/orders` (Список заказов пользователя)

### P2 (Management & Settings)
- `/admin/settings` (Панель настроек администратора)
- `/dashboard/tickets/[id]` (Экран конкретного обращения)
- `/support` (Интерактивная поддержка и тикеты)

### P3 (Authentication & Static)
- `/auth/login` (Вход в систему)

---

## Требования (Requirements)

### R1. Аудит визуальной иерархии и дизайн-системы (Visual Hierarchy & Tokens)
- Проверить верстку на соответствие `AGENTS.md`. 
- **Запрещены**: arbitrary-значения (`text-[#...]`, `bg-[#...]`) и `style`-атрибуты с жестко прописанными цветами. Стандартные Tailwind-утилиты (`text-white`, `bg-black`, `text-foreground`, `bg-background` и т.д.) допустимы только если соответствуют семантическому токену в `globals.css`.
- Проверить шрифты, отступы, выравнивание сеток (grid/flex) на предмет аккуратности и визуального шума.
- **Критерий CTA-иерархии**: на каждом экране должен быть ровно один визуально доминирующий призыв к действию (CTA), выделенный первичным цветом.

### R2. Математический аудит контрастности (WCAG 2.2 AA Contrast)
- Рассчитать коэффициенты контрастности текста относительно фона для ключевых интерактивных и текстовых элементов (кнопки, ссылки, подписи) в светлой и темной темах.
- Контрастность обычного текста должна составлять не менее 4.5:1, крупного или жирного — не менее 3:1.
- Сформировать подробную Contrast Matrix.

### R3. Мобильная адаптивность и размеры мишеней (Mobile Layout & Touch Targets)
- Проверить отображение страниц на трех контрольных точках (breakpoints): `375px` (Mobile), `768px` (Tablet) и `1440px` (Desktop). Выявить перекрытие элементов (например, наложение floating виджета переключения тем на нижний навигационный бар), вылезания текста за границы экранов и сломанной верстки.
- Измерить размеры интерактивных областей (touch targets) согласно критерию WCAG 2.5.5. Они должны быть не менее 44x44 CSS-пикселей.

### R4. Проверка доступности (Accessibility & Grayscale)
- Провести **Grayscale-тест** (эмуляция монохромного режима в Chrome DevTools) для проверки того, что цвет не является единственным визуальным индикатором состояния интерфейса (прямое нарушение WCAG SC 1.4.1).
- Запустить тесты Lighthouse для каждой страницы из списка и зафиксировать оценки (Performance, Accessibility, Best Practices, SEO).
- Собрать ошибки, предупреждения и исключения JS в консоли браузера при переходах и действиях пользователя.

### R5. Оценка современности дизайна (Design Modernity)
- Оценить современность дизайна по шкале от 1 до 10 (где 1 — устаревший Web 1.0, 10 — премиальный Stripe/Vercel-level дизайн с градиентами, микроанимациями, тональным контрастом и шрифтовым разнообразием). Описать критерии оценки для каждой страницы на основе следующих индикаторов:

| Категория | Устаревший (−) | Современный (+) |
|-----------|---------------|----------------|
| Тени | Жёсткие `2px 2px 4px #000` | Soft, blur ≥ 16px, opacity < 30% |
| Скругления | 0px или хаотичные | Консистентная система: sm/md/lg |
| Отступы | Произвольные значения | 4px/8px grid |
| Анимации | Нет или `all 0.3s ease` | Targeted transitions |
| Иконки | Разные стили, skeuomorphic | Единый set, consistent stroke |
| Whitespace | Плотная вёрстка | Breathing room, generous padding |

### R6. Консистентность компонентов (Component Consistency)
- Проверить единообразие кнопок, инпутов, селекторов и модальных окон по всему приложению. Убедиться в правильном использовании HeroUI v3 (NextUI) dot notation API (`<Table.Header>`, `<Table.Column>`).

### R7. Протокол автоматического исправления WCAG (Auto-Fix Protocol)
- Запрещено менять логику работы или дизайн приложения.
- Разрешается автоматически добавлять недостающие `aria-label`, теги `alt` для изображений, связывать `<label htmlFor="...">` с `<input id="...">` при условии, что:
  - Любые авто-исправления помечаются как `[AUTO-FIXED]`
  - Проект после авто-исправлений успешно собирается (`npx tsc --noEmit` и `npm run build` возвращают 0 ошибок)
  - **Escape-path**: Если сборка после auto-fix падает, изменения откатываются через `git checkout -- <file>`, а дефект фиксируется в отчете как `[DEFERRED]` с описанием причины проблемы.

### R8. Плотность контента (Cognitive Load)
- Для каждой P1-страницы подсчитать количество одновременных решений, требуемых от пользователя.
- Проверить экран `/support/payment-error` на перегрузку текстом.
- Форма оффлайн-тикета: не более 5 обязательных полей должно быть видно одновременно.

---

## Пороговые значения Lighthouse

| Категория | Минимум | Цель |
|-----------|---------|------|
| Performance | ≥ 70 | ≥ 90 |
| Accessibility | ≥ 90 | 100 |
| Best Practices | ≥ 90 | 100 |
| SEO | ≥ 80 | ≥ 95 |

---

## Acceptance Criteria
- [ ] `visual_audit_report.md` создан в корне проекта.
- [ ] Lighthouse Accessibility ≥ 90 на всех P1-страницах.
- [ ] Contrast Matrix заполнена для всех HSL-токенов в `globals.css`.
- [ ] P×I Risk Matrix содержит все найденные нарушения с указанием приоритетов (Severity).
- [ ] Все скриншоты аудита сохранены в формате PNG, именование: `{page-slug}_{breakpoint}_{theme}.png` (например: `landing_375px_dark.png`, `wallet_1440px_light.png`).
- [ ] Grayscale-версии скриншотов сохранены с суффиксом `_grayscale.png`.
- [ ] Все скриншоты сохранены в директорию `visual_audit_assets/`.
- [ ] Для всех `[AUTO-FIXED]` правок вызов `npx tsc --noEmit` возвращает 0 ошибок.
- [ ] Команда `npm run build` завершается с результатом SUCCESS после любых внесенных auto-fix изменений.
- [ ] `git status` чист (все не-auto-fix файлы исходного кода не изменены).

---

## Структура `visual_audit_report.md`

```markdown
# Visual Audit Report — SMMplan
Date: 2026-06-03
Status: AUDIT COMPLETE / PENDING FIXES

## 1. Executive Summary
## 2. Lighthouse Scores (таблица по страницам)
## 3. Contrast Matrix (HSL-токены × фоны)
## 4. P×I Risk Matrix (все нарушения)
## 5. Findings by Vector
   ### 5.1 Визуальная иерархия
   ### 5.2 Цветовая система
   ### 5.3 Плотность контента
   ### 5.4 Современность дизайна
   ### 5.5 Консистентность компонентов
## 6. Mobile / Responsive Audit
## 7. WCAG 2.2 AA Compliance
## 8. Design Modernity Scores (по страницам)
## 9. Remediation Roadmap (приоритизированный список)
## 10. Auto-Fixed Items (если есть)
```

## Follow-up — 2026-06-03T21:04:09+03:00

Conduct a comprehensive multi-pass visual and UX audit of the SMMplan project. Verify pages on a running local dev server (`http://localhost:3000`), identify all visual and functional defects, classify them by severity in a P×I risk matrix, and generate a remediation roadmap.

---

## Маппинг путей

| Windows (документация) | Linux (рабочее окружение) |
|------------------------|--------------------------|
| `d:\SMM_plan_2` | `/home/z/my-project/smmpplan` |
| `d:\SMM_plan_2\AGENTS.md` | `/home/z/my-project/smmpplan/AGENTS.md` |
| `d:\SMM_plan_2\app\globals.css` | `/home/z/my-project/smmpplan/app/globals.css` |
| `d:\SMM_plan_2\payment_audit_report.md` | `/home/z/my-project/smmpplan/payment_audit_report.md` |

**Рабочая директория:** `/home/z/my-project/smmpplan`

---

## Ресурсы и Окружение

| Ресурс | Адрес / Путь |
|--------|-------------|
| Web Server | `http://localhost:3000` (Next.js 16.2.6 / React 19.2.6 / Tailwind CSS 4.0.0 / HeroUI v3) |
| Database | Postgres `127.0.0.1:5433` (smmplan_lite) |
| Cache | Redis `127.0.0.1:6379` |
| Дизайн-система | `/home/z/my-project/smmpplan/AGENTS.md` |
| Цветовые токены | `/home/z/my-project/smmpplan/app/globals.css` |
| Контекст аудита | `/home/z/my-project/smmpplan/payment_audit_report.md` |
| Инструменты | Playwright, Lighthouse CLI, Axe-core, Python 3 + Pillow/numpy |

---

## Pre-flight Validation (обязательно перед началом аудита)

Выполнить все проверки последовательно. При провале любой — остановиться и сообщить об ошибке.

```bash
# 1. Проверить доступность dev-сервера
curl -sf http://localhost:3000 > /dev/null \
  || echo "FAIL: localhost:3000 недоступен — запустите npm run dev"

# 2. Проверить наличие ключевых файлов
test -f /home/z/my-project/smmpplan/AGENTS.md \
  || echo "FAIL: AGENTS.md не найден"
test -f /home/z/my-project/smmpplan/app/globals.css \
  || echo "FAIL: globals.css не найден"

# 3. Проверить Playwright
npx playwright --version \
  || echo "FAIL: Playwright не установлен — npx playwright install"

# 4. Проверить Python + Pillow (для R11)
python3 -c "from PIL import Image; import numpy" \
  || echo "FAIL: pip install Pillow numpy"
```

---

## Обязательная конфигурация Playwright

```typescript
// playwright.config.ts — обязательные параметры для стабильных скриншотов
use: {
  animations:   'disabled',            // отключить CSS-анимации
  reducedMotion: 'reduce',             // prefers-reduced-motion
  colorScheme:  'light',               // только светлая тема
  viewport:     { width: 1440, height: 900 },
},

// Хелпер — использовать перед КАЖДЫМ скриншотом:
async function stableScreenshot(page, path) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(300);      // ждать пост-hydration эффекты
  await page.screenshot({ path, fullPage: true });
}
```

---

## Страницы для Аудита

### P1 — Critical (обязательно)
| Маршрут | Описание |
|---------|----------|
| `/` | Landing Page — конверсионная страница |
| `/support/payment-error` | Форма оффлайн-обращения при сбое платежа |
| `/success` | Экран успешного оформления заказа |
| `/dashboard/wallet` | Пополнение баланса и статус кошелька |
| `/dashboard/orders` | Список заказов пользователя |

### P2 — Management (важно)
| Маршрут | Описание |
|---------|----------|
| `/admin/settings` | Панель настроек администратора |
| `/dashboard/tickets/[id]` | Экран конкретного обращения |
| `/support` | Интерактивная поддержка и тикеты |

### P3 — Static (желательно)
| Маршрут | Описание |
|---------|----------|
| `/auth/login` | Вход в систему |

---

## Шкала P×I Risk Matrix

Использовать во всех findings. Каждое нарушение обязательно записывать в формате `[P×I]`.

| Уровень | Probability (P) | Impact (I) | Итоговый severity |
|---------|----------------|------------|------------------|
| **Critical** | P3 — воспроизводится всегда | I3 — блокирует пользователей | P3×I3 |
| **High** | P2 — воспроизводится часто | I3 или P3×I2 | P2×I3 / P3×I2 |
| **Medium** | P2 — часто | I2 — мешает, не блокирует | P2×I2 / P1×I3 |
| **Low** | P1 — редко | I1 — незначительно | P1×I1 |

**Формат записи:**
```
[P3×I3] Critical | /: контраст CTA-кнопки 2.8:1 (требуется 4.5:1) | Файл: Button.tsx:34
```

Страницы с Lighthouse score ниже минимального порога → автоматически `High` в Risk Matrix.

---

## Требования

### R1. Визуальная иерархия и дизайн-система

- Проверить вёрстку на соответствие `AGENTS.md`.
- **Запрещены:** arbitrary-значения (`text-[#...]`, `bg-[#...]`) и `style`-атрибуты с жёстко прописанными цветами. Стандартные Tailwind-утилиты (`text-white`, `bg-black` и др.) допустимы только если соответствуют семантическому токену в `globals.css`.
- Проверить шрифты, отступы, выравнивание сеток (grid/flex) на предмет аккуратности и визуального шума.
- **Критерий CTA-иерархии:** на каждом экране должен быть **ровно один** визуально доминирующий CTA, выделенный первичным цветом. Secondary CTA должен быть визуально тише (outline vs filled).

---

### R2. Математический аудит контрастности (WCAG 2.2 AA)

Рассчитать коэффициенты контрастности для ключевых пар:

| Элемент | Минимум |
|---------|---------|
| Основной текст на фоне | ≥ 4.5:1 |
| Крупный / жирный текст (≥ 18pt или 14pt bold) | ≥ 3:1 |
| Placeholder в полях форм | ≥ 4.5:1 |
| Границы полей ввода | ≥ 3:1 |
| Иконки без текстовой подписи | ≥ 3:1 |
| Focus-кольцо относительно фона | ≥ 3:1 |

Сформировать **полную Contrast Matrix:** строки = foreground-токены, столбцы = background-токены, значения = ratio + Pass/Fail.

---

### R3. Мобильная адаптивность и Touch Targets

| Breakpoint | Размер | Приоритет |
|------------|--------|-----------|
| Mobile S | 375×812px | 🔴 Критично |
| Tablet | 768×1024px | 🟠 Важно |
| Desktop | 1440×900px | 🟡 Базовый |

**Проверки:**
- Нет горизонтального скролла ни на одном breakpoint
- Touch targets ≥ 44×44px (WCAG 2.5.5)
- Шрифт ≥ 16px в полях форм (иначе iOS auto-zoom)
- Отсутствие наложений: floating виджет темы не перекрывает нижний навбар
- `StickyCheckoutBar` на `/` корректен на 375px

---

### R4. Доступность, Grayscale-тест и Keyboard Navigation

**Grayscale-тест** — выполнять программно через Playwright (не через DevTools GUI):

```typescript
// Правильный способ для агента:
await page.addStyleTag({
  content: '* { filter: grayscale(100%) !important; }'
});
await page.waitForTimeout(300);
await page.screenshot({
  path: `visual_audit_assets/${slug}_${bp}_grayscale.png`,
  fullPage: true
});
// Убедиться что success и error статусы визуально различимы без цвета
// Убедиться что CTA-кнопки отличимы от фона
```

**Lighthouse:** запустить для каждой P1/P2 страницы, timeout = 45 секунд на страницу. При превышении — фиксировать как `[TIMEOUT]` и продолжать.

```bash
npx lighthouse http://localhost:3000{path} \
  --output=json \
  --output-path=visual_audit_assets/lighthouse/{slug}.json \
  --timeout=45000 \
  --chrome-flags="--headless --no-sandbox"
```

**Console errors:** собрать JS-ошибки при навигации между страницами.

**Keyboard Navigation (WCAG 2.4.7, 2.1.1):**
- Tab order: пройти Tab от `<body>` до конца страницы, зафиксировать порядок — должен быть логическим (сверху вниз, слева направо)
- Focus trap: модальные диалоги удерживают фокус внутри, Escape закрывает
- Skip link: наличие «Skip to main content» ссылки на каждой странице
- Все интерактивные элементы имеют видимое focus-кольцо (SC 2.4.7)

**WCAG SC 1.3.1:** все `<label>` привязаны через `htmlFor`/`id`, landmark-роли присутствуют.

---

### R5. Оценка современности дизайна (Design Modernity Score)

Оценка — бинарные чеки с весом, итог нормируется в шкалу 1–10.

| # | Категория | Чек (pass = 1, fail = 0) | Вес |
|---|-----------|--------------------------|-----|
| 1 | Тени | Есть ≥ 1 элемент с `box-shadow` blur ≥ 16px И opacity < 30% | 1.25 |
| 2 | Скругления | Все `border-radius` принадлежат системе: `{2,4,6,8,12,16,24}px` | 1.25 |
| 3 | Отступы | ≥ 80% отступов кратны 4px | 1.25 |
| 4 | Анимации | Нет `transition: all` — только targeted properties | 1.25 |
| 5 | Иконки | Единый icon set (все иконки из одной библиотеки, одинаковый stroke) | 1.25 |
| 6 | Whitespace | Расстояние между секциями ≥ 48px на desktop | 1.25 |
| 7 | Градиенты | Нет ярких насыщенных линейных градиентов на фонах | 1.25 |
| 8 | Карточки | Карточки используют soft shadow, нет жёсткого `1px solid` border | 1.25 |

**Расчёт:** `Score = (Σ passed_checks × weight) / 10 × 10` → шкала 1–10.

Страницы с баллом < 6 → `High` в Remediation Roadmap.

---

### R6. Консистентность компонентов

Проверить единообразие на **всех** страницах аудита:

| Компонент | Что проверять |
|-----------|--------------|
| Кнопки | Высота, padding, border-radius, шрифт, font-weight |
| Поля ввода | Border, padding, placeholder-стиль, focus-state |
| Карточки | Shadow, border-radius, padding, border |
| Badges / Tags | Размер, padding, цветовая схема |
| Toast / Alert | Иконки, цвета, позиционирование |
| Скелетоны | Соответствуют реальному контенту по размеру |
| HeroUI v3 | Корректный dot notation API (`<Table.Header>`, `<Table.Column>`) |

---

### R7. Пустые состояния (Empty States)

| Страница | Корректный сценарий |
|----------|-------------------|
| `/dashboard/orders` | 0 заказов у пользователя |
| `/dashboard/wallet` | 0 транзакций в истории (при любом балансе) |
| `/support` | 0 тикетов в списке обращений |
| `/dashboard/tickets/[id]` | Тикет не найден / несуществующий `id` (404-сценарий) |

Для каждого empty state: скриншот + оценка — есть ли иллюстрация/иконка, понятный текст, CTA для следующего действия.

---

### R8. Плотность контента (Cognitive Load)

**Определение «решения»:** любой интерактивный элемент в видимой области viewport, требующий осознанного выбора: CTA-кнопки, radio-группы, toggle, dropdown-select. Простые ссылки в навигации и декоративные элементы **не считаются**.

- Для каждой P1-страницы подсчитать количество «решений» в первом viewport (норма ≤ 3, критично > 5)
- Проверить `/support/payment-error` на перегрузку текстом
- Форма оффлайн-тикета: не более 5 обязательных полей видно одновременно
- Зафиксировать нарушения Miller's Law: если в навигации или списке > 7±2 элементов

---

### R9. Температурная согласованность палитры

Извлечь все нейтральные HSL-токены из `globals.css`: `background`, `card`, `muted`, `border`, `input`, `popover`.

| Токен | HSL | HEX | Hue° | Saturation% | Температура |
|-------|-----|-----|------|-------------|-------------|
| `--background` | … | … | … | … | холодный / нейтральный / тёплый |
| `--card` | … | … | … | … | … |
| `--muted` | … | … | … | … | … |
| … | | | | | |

**Классификация температуры:** холодный = hue 180–270°, нейтральный = hue 0° или saturation < 5°, тёплый = hue 20–60°.

**Критерий:** все нейтральные поверхности должны иметь hue в диапазоне ±15°. Смешение холодных и тёплых серых рядом → `Medium` в Risk Matrix.

---

### R10. Согласованность насыщенности акцентных токенов

Извлечь все функциональные токены: `primary`, `destructive`, `success`, `warning`, `info` (если есть).

| Токен | HSL | Hue° | Saturation% | Отклонение от среднего |
|-------|-----|------|-------------|----------------------|
| `--primary` | … | … | … | … |
| `--destructive` | … | … | … | … |
| `--success` | … | … | … | … |
| `--warning` | … | … | … | … |

**Критерий:** допустимый разброс saturation — **±15%**. Превышение → `Medium`.

**Дополнительно:** `primary` не должен совпадать по hue с `success` (допустимо ±20°) — иначе CTA-кнопки визуально неотличимы от успешных статусов → `High`.

---

### R11. Правило 60-30-10 (пиксельный анализ)

**Методика** — количественный пиксельный анализ через Python:

```python
from PIL import Image
import numpy as np

img = Image.open("visual_audit_assets/landing_1440px.png").convert("RGB")
pixels = np.array(img).reshape(-1, 3)

# Классифицировать пиксели по группам через Delta-E < 15 к ближайшему токену
# Группа 1 (Доминирующий): background, card, muted токены
# Группа 2 (Вторичный): foreground, secondary, border токены
# Группа 3 (Акцентный): primary, destructive, success токены

# Подсчитать % площади каждой группы
total = len(pixels)
dominant_pct  = len(dominant_pixels)  / total * 100
secondary_pct = len(secondary_pixels) / total * 100
accent_pct    = len(accent_pixels)    / total * 100
```

| Группа | Целевой диапазон | Нарушение |
|--------|-----------------|-----------|
| Доминирующий (60%) | 55–65% | < 50% или > 70% → `Medium` |
| Вторичный (30%) | 25–35% | < 20% или > 40% → `Low` |
| Акцентный (10%) | 5–15% | > 20% → `Medium` / < 3% → `Low` |

Выполнить для всех P1-страниц на desktop (1440px).

---

## Core Web Vitals

Зафиксировать для всех P1-страниц в дополнение к Lighthouse:

| Метрика | Хорошо | Требует улучшения | Плохо |
|---------|--------|------------------|-------|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.5–4.0s | > 4.0s |
| **INP** (Interaction to Next Paint) | < 200ms | 200–500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.1–0.25 | > 0.25 |

Метрики ниже «Хорошо» → фиксировать в Risk Matrix с severity `High`.

---

## SEO & Meta Verification (P1-страницы)

| Проверка | Критерий |
|----------|---------|
| `<title>` | Не пустой, уникальный для каждой страницы, ≤ 60 символов |
| `<meta name="description">` | Присутствует, ≤ 160 символов |
| `og:title` | Присутствует, не пустой |
| `og:description` | Присутствует, не пустой |
| `og:image` | Присутствует, URL отвечает 200 |
| `<link rel="icon">` | Присутствует, URL не 404 |
| Broken images | Все `<img>` загружены (статус 200, нет `alt` с пустым `src`) |

---

## Пороговые значения Lighthouse

| Категория | Минимум | Цель |
|-----------|---------|------|
| Performance | ≥ 70 | ≥ 90 |
| Accessibility | ≥ 90 | 100 |
| Best Practices | ≥ 90 | 100 |
| SEO | ≥ 80 | ≥ 95 |

---

## Acceptance Criteria

### Отчёт
- [ ] `visual_audit_report.md` создан в корне проекта
- [ ] Pre-flight все проверки пройдены до начала аудита
- [ ] Lighthouse scores зафиксированы для всех P1/P2 страниц в табличном виде
- [ ] Полная Contrast Matrix построена для всех HSL-токенов `globals.css`
- [ ] P×I Risk Matrix содержит все нарушения в формате `[Px×Iy] Severity | Страница: описание | Файл`
- [ ] Таблица температурной согласованности (R9) заполнена
- [ ] Таблица насыщенности акцентных токенов (R10) заполнена
- [ ] Пиксельный анализ 60-30-10 (R11) выполнен для всех P1-страниц
- [ ] Core Web Vitals (R12) зафиксированы для всех P1-страниц
- [ ] SEO/Meta проверка (R13) выполнена для всех P1-страниц
- [ ] Keyboard navigation audit выполнен для всех P1-страниц

### Визуальные артефакты
- [ ] Все скриншоты сохранены в `visual_audit_assets/` в формате PNG
- [ ] Конвенция именования: `{page-slug}_{breakpoint}.png`
  - Пример: `landing_375px.png`, `wallet_1440px.png`
- [ ] Grayscale-версии P1-страниц: `{page-slug}_{breakpoint}_grayscale.png`
- [ ] Lighthouse JSON-отчёты: `visual_audit_assets/lighthouse/{slug}.json`

### Качество
- [ ] Lighthouse Accessibility ≥ 90 на всех P1-страницах
- [ ] Ни один основной текстовый элемент не нарушает порог 4.5:1
- [ ] Все P1-экраны имеют ровно один визуально доминирующий CTA
- [ ] `StickyCheckoutBar` корректен на 375px без горизонтального скролла
- [ ] Все нейтральные токены: hue в диапазоне ±15°
- [ ] Разброс saturation акцентных токенов ≤ 15%
- [ ] `primary` и `success` отличаются по hue > 20°

### Код
- [ ] Для всех `[AUTO-FIXED]` правок: `npx tsc --noEmit` = 0 ошибок
- [ ] `npm run build` = SUCCESS после любых auto-fix изменений
- [ ] `git status` чист (все не-auto-fix файлы не изменены)

---

## Структура `visual_audit_report.md`

```markdown
# Visual Audit Report — SMMplan
Date: YYYY-MM-DD
Status: AUDIT COMPLETE / PENDING FIXES
Scope: Light mode only

## 1. Executive Summary

## 2. Pre-flight Results

## 3. Lighthouse Scores (таблица: страница × категория)

## 4. Core Web Vitals (LCP / INP / CLS по страницам)

## 5. Contrast Matrix (HSL-токены × фоны, ratio + Pass/Fail)

## 6. Colour Harmony Analysis
   ### 6.1 Температурная согласованность (R9)
   ### 6.2 Насыщенность акцентных токенов (R10)
   ### 6.3 Правило 60-30-10 — пиксельный анализ (R11)

## 7. P×I Risk Matrix (все нарушения)

## 8. Findings by Vector
   ### 8.1 Визуальная иерархия и токены
   ### 8.2 Цветовая система и гармония
   ### 8.3 Плотность контента
   ### 8.4 Современность дизайна
   ### 8.5 Консистентность компонентов

## 9. Mobile / Responsive Audit (375 / 768 / 1440px)

## 10. WCAG 2.2 AA Compliance

## 11. Keyboard Navigation Audit

## 12. Empty States Audit

## 13. SEO & Meta Verification

## 14. Design Modernity Scores (бинарные чеки по страницам)

## 15. Remediation Roadmap (приоритизированный список)

## 16. Auto-Fixed Items (если есть)
```

## Follow-up — 2026-06-03T21:08:47+03:00

Detailed user review feedback for the visual audit:
1. **Delete `production_readiness_audit.md`** from the workspace root (this is a regression and must be deleted).
2. **Format P×I Matrix entries** strictly as: `[Px×Iy] Severity | Page: description | File`.
3. **Scope Enforcement**: Remove all Dark Theme findings from the report or place them in an explicitly marked `[OUT OF SCOPE]` section, as the audit must focus on Light Mode only.
4. **Compile Lighthouse scores** in tabular form for all P1/P2 pages under Section 3.
5. **Build the complete Contrast Matrix** for all HSL tokens in `globals.css` in Section 5.
6. **Complete Colour Harmony Analysis** (R9: Temperature table, R10: Saturation delta, R11: 60-30-10 dominant/secondary/accent pixel analysis).
7. **Ensure screenshots** (both standard and grayscale copies) are saved in `visual_audit_assets/` using the `{slug}_{breakpoint}.png` and `{slug}_{breakpoint}_grayscale.png` naming conventions.
8. **Verify Core Web Vitals** (R12), **SEO & Meta Verification** (R13), **Keyboard Navigation Audit**, and **Empty States Audit** sections are fully populated.
9. **Report Structure**: Adhere strictly to the 16-section template specified in the prompt.

## Follow-up — 2026-06-04T08:17:14Z

Проведение комплексного автоматизированного и семантического аудита проекта Smmplan на соответствие правилам юридического комплаенса РФ (законодательство 2026 года) и принципам клиентоориентированности UI/UX.

Working directory: d:\SMM_plan_2
Integrity mode: development

## Requirements

### R1. Юридический аудит (Russian Legal Compliance)
- Запустить скрипт юридической проверки `.agent/skills/gsd-russian-legal-watchdog/scripts/check-compliance.js`.
- Проверить страницы `/legal/privacy`, `/legal/terms`, `/legal/refund` на отсутствие шаблонных скобок и наличие обязательного пункта 2.5 (149-ФЗ о запрете противоправного контента).
- Убедиться в наличии дисклеймеров о согласии на обработку персональных данных (ФЗ-152) рядом со всеми интерактивными формами ввода на сайте (авторизация, создание тикетов поддержки).

### R2. UX/UI Аудит клиентоориентированности (Client-Orientation Audit)
- Проверить ключевые экраны каталога услуг, чекаута и поддержки на соответствие 12 критериям клиентоориентированности (из скилла `gsd-client-orientation`).
- Исключить любые случаи "молчаливого отказа" (disabled кнопки без вывода toast-подсказки), когнитивной перегрузки и скрытых наценок.
- Проверить контрастность элементов (не менее 4.5:1 для обычного текста) и размеры интерактивных областей (мишени touch targets не менее 44x44px).

### R3. Интеграционная целостность
- Провести полную проверку сборки проекта (`npm run build`) и компиляции типов (`npx tsc --noEmit`) после применения любых автоматических исправлений. Любые правки, ломающие билд, должны быть немедленно откатаны.

## Acceptance Criteria

### Юридический комплаенс
- [ ] Юридический сканер возвращает статус `AUDIT SUCCESS` (код выхода `0`).
- [ ] Отсутствуют захардкоженные заглушки `[...]` на страницах соглашений.

### Клиентоориентированность и доступность (Accessibility)
- [ ] Кнопка перехода к оплате в чекауте активна и выводит toast-подсказку при неполном вводе данных вместо блокировки в disabled.
- [ ] Все интерактивные элементы ввода и кнопки имеют высоту не менее 44px и корректные атрибуты `aria-label`.
- [ ] Реквизиты Исполнителя и ссылки на юридические оферты корректно отображаются в футере страниц.

### Стабильность сборки
- [ ] TypeScript компилируется без ошибок (`npx tsc --noEmit` возвращает 0).
- [ ] Команда `npm run build` успешно завершает сборку проекта.
- [ ] В корне проекта создан итоговый отчет об аудите `audit_validation_report.md` со списком проверенных страниц и их оценками.

## Follow-up — 2026-06-04T11:14:47Z

Комплексный аудит надежности и безопасности продакшен-архитектуры Smmplan (платежи YooKassa, воркеры BullMQ, Redis-каталог и безопасность по OWASP Top 10).

Working directory: d:\SMM_plan_2
Integrity mode: development

## Requirements

### R1. Аудит YooKassa API v3 на Race Conditions и Double-Spend/Double-Credit
- Проанализировать обработчик вебхуков YooKassa и роут `/api/order-status/route.ts`.
- Исключить возникновение состояний гонки (Race Conditions) при одновременных запросах от пользователя и вебхука YooKassa.
- Гарантировать защиту от двойного зачисления баланса (Double-credit) или повторного списания (Double-spend) с использованием транзакций Prisma и механизмов блокировок.

### R2. Настройка фоновых процессов и запуск воркеров BullMQ
- Проверить стабильность запуска и конфигурацию PM2/Docker-compose для воркеров BullMQ (`src/workers/index.ts`).
- Убедиться, что при старте веб-сервера фоновые воркеры поднимаются параллельно и заказы не зависают в Redis в статусе `PENDING`.
- Обеспечить корректный механизм ретраев и логирование ошибок выполнения фоновых задач.

### R3. Валидация Shadow Catalog и автоматического ценообразования
- Проверить, что сырые каталоги провайдеров не пишутся напрямую в таблицу `Service` в PostgreSQL, а кэшируются в Redis (`provider:{id}:catalog`).
- Убедиться, что Margin Worker автоматически пересчитывает розничную стоимость услуг за единицу (`pricePerUnitRub`) с учетом курсов ЦБ РФ (USD/RUB) для сохранения заданного процента маржи, и отключает («усыпляет») услуги, которые пропали у провайдера.

### R4. Security & OWASP Top 10 Audit
- Проверить Server Actions и API эндпоинты на уязвимости IDOR (особенно в тикетах поддержки `offline-ticket.ts`), отсутствие утечек данных и SQL-инъекций.
- Настроить/проверить Rate Limiting (anti-spam) для форм обращений и авторизации.

## Acceptance Criteria

### Платежи и транзакции (YooKassa API)
- [ ] Prisma-запросы к балансу пользователя и статусам заказов используют транзакции (`$transaction`) с необходимым уровнем изоляции.
- [ ] Дублирующие вебхуки YooKassa или повторные запросы клиента обрабатываются идемпотентно, не создавая повторных транзакций и списаний.

### Фоновые задачи (BullMQ)
- [ ] Описана корректная конфигурация запуска PM2 (`ecosystem.config.js`) или Docker-compose, запускающая воркеры в качестве отдельного независимого процесса.
- [ ] Проведен интеграционный тест: заказы успешно обрабатываются воркером и переводятся из `PENDING` в `PROCESSING`/`COMPLETED`.

### Каталог и Ценообразование
- [ ] Импорт каталога провайдеров использует кэширование в Redis (`provider:{id}:catalog`), а в Postgres попадают только выбранные услуги.
- [ ] Цены вычисляются корректно: `pricePerUnitRub = (rate * markup * usdToRub) / 1000`.

### Безопасность и Валидация
- [ ] Доступ к Server Actions в `src/actions/admin/` защищен проверкой `requireAdmin()`.
- [ ] Server Action создания тикетов `offline-ticket.ts` защищен от спама (Rate Limiting) и валидирует входные параметры через Zod.
- [ ] Проект успешно собирается (`npm run build`) и проходит проверку типов (`npx tsc --noEmit`).

## Follow-up — 2026-06-04T15:05:28+03:00

Провести аудит базы знаний техподдержки (`support_training_manual.md`) на соответствие **реальной кодовой базе** проекта Smmplan, зафиксировать все несоответствия и обновить документ.

Working directory: d:\SMM_plan_2
Integrity mode: development

---

## Requirements

### R1. Аудит пользовательского флоу (User Flow)
Исследовать реальный флоу заказа через компонент SmartLinkLanding (`src/components/landing/SmartLinkLanding.tsx`) и соответствующие страницы в `src/app/`. Сравнить с описанием в блоке 2.1 мануала (путь к нему: `C:\Users\Артём\.gemini\antigravity\brain\c24060ca-194d-4357-9d6e-1c8be7a5d039\support_training_manual.md`). Определить точный порядок шагов заказа.

### R2. Аудит статусов заказов
Исследовать Prisma-схему (`d:\SMM_plan_2\prisma\schema.prisma`) и найти все enum-значения статусов заказа. Сравнить с блоком 2.4 мануала. Проверить наличие статусов `AWAITING_PAYMENT`, `ERROR`, `PROCESSING` и других.

### R3. Аудит способов оплаты
Исследовать API-маршруты оплаты в `d:\SMM_plan_2\src\app\api\` и сервисы в `d:\SMM_plan_2\src\services\`. Определить реальный список поддерживаемых платёжных шлюзов. Сравнить с блоком 2.3 мануала.

### R4. Аудит ролей персонала и инструментов поддержки
Исследовать систему ролей (`OWNER`, `ADMIN`, `MANAGER`, `SUPPORT`) в `d:\SMM_plan_2\src\actions\admin\users.ts` и `d:\SMM_plan_2\src\app\admin\`. Определить реальные права роли SUPPORT (особенно: canSeeRates, доступ к заказам, управление балансом). Сравнить с блоком 4.3-4.6 мануала.

### R5. Фиксация и обновление документа
По итогам аудита R1–R4:
1. Создать отчёт о несоответствиях `d:\SMM_plan_2\artifacts\support_manual_audit_report.md` с таблицей: | Блок мануала | Что написано | Что реально в коде | Критичность |
2. Обновить `C:\Users\Артём\.gemini\antigravity\brain\c24060ca-194d-4357-9d6e-1c8be7a5d039\support_training_manual.md`, исправив все найденные несоответствия HIGH и MEDIUM критичности.

## Acceptance Criteria

### Аудит
- [ ] Исследованы файлы: `prisma/schema.prisma`, `SmartLinkLanding.tsx`, файлы в `src/app/api/`, `src/actions/admin/users.ts`, `src/app/admin/orders/`
- [ ] Каждое несоответствие задокументировано: (a) что в мануале, (b) что в коде, (c) критичность HIGH/MEDIUM/LOW
- [ ] Найдены все enum-статусы заказа из реальной Prisma-схемы

### Отчёт
- [ ] Создан `d:\SMM_plan_2\artifacts\support_manual_audit_report.md` с заполненной таблицей несоответствий
- [ ] Мануал обновлён — все HIGH и MEDIUM несоответствия исправлены
- [ ] Резюме в конце отчёта: сколько блоков верно, сколько исправлено


## Follow-up � 2026-06-04T15:20:35+03:00

������� ������������� ����������� ������ �� ����� ������� Smmplan �� ������ ��������� ������������ �������� ������� ����. R1: ������������ ������������ �� 9 ������� (���������������� ����, ������, �������, admin+RBAC, ����������, Telegram-���, ������, �������/���������, �������/CRON). R2: ������� d:\SMM_plan_2\artifacts\extended_manual.md (300+ �����, 10 ��������). R3: �������� support_training_manual.md. Acceptance criteria: ��� 10 �������� �������, ��� 4 ���� RBAC, ��� 3 �����, 20+ �������� ��, ������� ����, markdown-�������.

## Follow-up — 2026-06-05T07:58:51+03:00

Проведение глубокого QA-аудита проекта Smmplan Lite с тотальной очисткой кодовой базы, а также миграция чистой локальной базы данных на продакшен-сервер (включая провайдеров). Команда агентов должна очистить сервер от мусора (старые логи, кэши, сборки), удалить старые скрипты в коде, исправить линтер и перенести локальную базу. 

Working directory: d:\SMM_plan_2
Integrity mode: development

## User Review Required
> [!IMPORTANT]
> Перенос локальной БД на сервер полностью сотрет текущую серверную БД. Будут перенесены локальные пользователи, провайдеры и настройки. Обязательно убедитесь, что локальный пароль админа надежен!

## 🛡️ Премортем-анализ (Failure Simulation)
| Риск (Сценарий отказа) | Механизм защиты (Mitigation) |
| :--- | :--- |
| **Системные настройки смотрят на localhost:** После миграции маджик-ссылки авторизации и вебхуки оплаты на сервере сломаются, так как в локальной БД был зашит локальный домен. | Агенты обязаны перед дампом (или сразу после него) обновить в базе SystemSettings и Provider все URL-адреса с localhost:3000 на https://smmplan.pro. |
| **Гонка данных при восстановлении:** Фоновые процессы на сервере (BullMQ) пытаются писать в БД в момент её удаления и восстановления через pg_restore. | Обязательная остановка Docker-контейнеров приложения и воркера (docker compose stop app worker) перед дропом БД. |
| **Удаление нужных скриптов:** Вырезание scripts/ ломает логику деплоя или сидирования базы. | Удалять скрипты можно только после тщательной сверки с package.json скриптами; необходимые утилиты нужно переписать в src/lib/. |

## Requirements (Proposed Changes)

### R1. Тотальная очистка кодовой базы
- Проверить eslint.config.mjs и удалить все "хаки" и игнорирования.
- Удалить мертвый код в src/ (на основе Knip npm run lint:debt).
- Полностью удалить старые .js утилиты, использующие require, и переписать их на строгий TypeScript.

### R2. Подготовка локальной БД (Sanitization)
- Очистить локальную базу от мусорных данных (тикеты, заказы, платежи). 
- КРИТИЧНО: Изменить домены в настройках и провайдерах на https://smmplan.pro во избежание сбоев webhook'ов на проде.
- Сохранить настроенных провайдеров (Provider), учетную запись владельца (User) и системные настройки (SystemSettings).

### R3. Очистка сервера и Миграция БД
- Подключиться к smmplan.pro. Очистить Docker от остановленных контейнеров и старых образов (docker system prune -a -f). Очистить Redis.
- Остановить рабочие контейнеры app и worker перед манипуляциями с БД!
- Развернуть дамп локальной БД, полностью заменив старую серверную базу (через Drop Schema или Prisma migrate --reset + seed из дампа). Затем запустить контейнеры.

### R4. Исправление утечек и багов в тестах
- Добавить mock-объекты для внешних сервисов (например, SMTP в test/setup.ts).
- Удалить устаревшие и нестабильные тесты, гарантировать что тесты не выходят во внешнюю сеть.

## Acceptance Criteria (Verification Plan)

### Серверная инфраструктура
- [ ] Контейнеры на сервере успешно стартуют, нет ошибок Prisma connection в логах (docker logs smmplan_lite_prod_app).
- [ ] Авторизация администратора работает на проде (значит localhost успешно заменен на smmplan.pro).
- [ ] В БД на сервере присутствуют локальные провайдеры, но нет старых заказов.

### Локальное качество кода
- [ ] npm run lint выдает 0 ошибок и 0 предупреждений (без обходных путей).
- [ ] npm run lint:debt' выдает чистый результат.
- [ ] npm run test (или vitest run) завершается со 100% успехом, не пытаясь установить соединение с внешним SMTP-сервером.
## Follow-up вЂ” 2026-06-07T19:15:15Z

# Teamwork Project Prompt

РРЅС‚РµРіСЂР°С†РёРѕРЅРЅР°СЏ СЃРёСЃС‚РµРјР° СЂРµР°Р»СЊРЅРѕРіРѕ СЃРєРІРѕР·РЅРѕРіРѕ (E2E) С‚РµСЃС‚РёСЂРѕРІР°РЅРёСЏ СЃС‚Р°Р±РёР»СЊРЅРѕСЃС‚Рё РїР»Р°С‚С„РѕСЂРјС‹ Smmplan СЃ РІС‹Р·РѕРІР°РјРё РІРЅРµС€РЅРёС… API (РїСЂРѕРІР°Р№РґРµСЂС‹, РїР»Р°С‚РµР¶РЅС‹Рµ С€Р»СЋР·С‹, РєСѓСЂСЃС‹ РІР°Р»СЋС‚) Рё РїСЂРѕРІРµСЂРєРѕР№ РєСЂРёС‚РёС‡РµСЃРєРёС… Р±РёР·РЅРµСЃ-СЃС†РµРЅР°СЂРёРµРІ.

Working directory: d:\SMM_plan_2
Integrity mode: development

## Requirements

### R1. Real Provider & Catalog Integration Verification
- РЎРѕР·РґР°С‚СЊ/РґРѕРїРѕР»РЅРёС‚СЊ РёРЅС‚РµРіСЂР°С†РёРѕРЅРЅС‹Рµ С‚РµСЃС‚С‹ РґР»СЏ РїСЂРѕРІРµСЂРєРё СЃРѕРµРґРёРЅРµРЅРёСЏ СЃ СЂРµР°Р»СЊРЅС‹РјРё API SMM РїСЂРѕРІР°Р№РґРµСЂРѕРІ.
- РџСЂРѕРІРµСЂРёС‚СЊ СЂР°Р±РѕС‚РѕСЃРїРѕСЃРѕР±РЅРѕСЃС‚СЊ РїРѕР»СѓС‡РµРЅРёСЏ Р±Р°Р»Р°РЅСЃР° Рё РїР°СЂСЃРёРЅРіР° РєР°С‚Р°Р»РѕРіРѕРІ СѓСЃР»СѓРі РѕС‚ РїСЂРѕРІР°Р№РґРµСЂРѕРІ (Cherry-Pick Import & Shadow Catalog).
- РќР°РїРёСЃР°С‚СЊ С‚РµСЃС‚ РґР»СЏ РїСЂРѕРІРµСЂРєРё СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёРё РєСѓСЂСЃРѕРІ РІР°Р»СЋС‚ СЃ Р¦РµРЅС‚СЂР°Р»СЊРЅС‹Рј Р‘Р°РЅРєРѕРј Р Р¤ (CBR) С‡РµСЂРµР· РёРЅС‚РµСЂРЅРµС‚, РіР°СЂР°РЅС‚РёСЂСѓСЏ, С‡С‚Рѕ XML/JSON СЌРЅРґРїРѕРёРЅС‚ РєРѕСЂСЂРµРєС‚РЅРѕ РїР°СЂСЃРёС‚СЃСЏ, Р° Р·РЅР°С‡РµРЅРёРµ `exchangeRateUSD` РѕР±РЅРѕРІР»СЏРµС‚СЃСЏ РІ СЃРёСЃС‚РµРјРЅС‹С… РЅР°СЃС‚СЂРѕР№РєР°С….

### R2. Payment Gateways API Verification (Anti-Mocking & Fallbacks)
- РџСЂРѕРІРµСЂРёС‚СЊ СЃС‚СЂРѕРіРѕРµ СЃРѕР±Р»СЋРґРµРЅРёРµ РїСЂР°РІРёР» РїР»Р°С‚РµР¶РЅС‹С… С€Р»СЋР·РѕРІ (Р®Kassa, Robokassa, CryptoBot) РёР· `AGENTS.md`.
- РќР°РїРёСЃР°С‚СЊ С‚РµСЃС‚С‹, РїСЂРѕРІРµСЂСЏСЋС‰РёРµ, С‡С‚Рѕ РїСЂРё РЅР°Р»РёС‡РёРё РЅР°СЃС‚СЂРѕРµРЅРЅС‹С… РєР»СЋС‡РµР№ С€Р»СЋР·РѕРІ (РґР°Р¶Рµ С‚РµСЃС‚РѕРІС‹С…, С‚Р°РєРёС… РєР°Рє `yookassaTestShopId`) РІС‹РїРѕР»РЅСЏСЋС‚СЃСЏ СЂРµР°Р»СЊРЅС‹Рµ API-Р·Р°РїСЂРѕСЃС‹ Рє СЃРµСЂРІРµСЂР°Рј РїР»Р°С‚РµР¶РЅС‹С… СЃРёСЃС‚РµРј, Р° РЅРµ РјРѕРєРѕРІС‹Рµ РїРµСЂРµРЅР°РїСЂР°РІР»РµРЅРёСЏ РЅР° `/api/dev/mock-payment`.
- РџСЂРѕРІРµСЂРёС‚СЊ Р°РІС‚Рѕ-РѕС‚РєР°С‚ РЅР° С‚РµСЃС‚РѕРІС‹Рµ РєР»СЋС‡Рё РІ СЃСЂРµРґРµ СЂР°Р·СЂР°Р±РѕС‚РєРё, РµСЃР»Рё Р±РѕРµРІС‹Рµ РєР»СЋС‡Рё СЃРѕРґРµСЂР¶Р°С‚ РґРµС„РѕР»С‚РЅС‹Рµ РїР»РµР№СЃС…РѕР»РґРµСЂС‹.
- РЈР±РµРґРёС‚СЊСЃСЏ, С‡С‚Рѕ РїСЂРё РїРѕР»РЅРѕСЃС‚СЊСЋ РїСѓСЃС‚С‹С… СЂРµРєРІРёР·РёС‚Р°С… СЃРёСЃС‚РµРјР° РєРѕСЂСЂРµРєС‚РЅРѕ РїРµСЂРµРєР»СЋС‡Р°РµС‚СЃСЏ РЅР° Р°РІР°СЂРёР№РЅС‹Р№ СЃРёРјСѓР»СЏС‚РѕСЂ.

### R3. End-to-End User Flow Tests (Playwright)
- Р Р°Р·СЂР°Р±РѕС‚Р°С‚СЊ РёР»Рё РѕР±РЅРѕРІРёС‚СЊ СЃРєРІРѕР·РЅС‹Рµ Playwright-С‚РµСЃС‚С‹ РІ СЂРµР°Р»СЊРЅРѕРј/headless Р±СЂР°СѓР·РµСЂРµ РґР»СЏ РїСѓС‚Рё РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ:
  - РђРІС‚РѕСЂРёР·Р°С†РёСЏ (РІС…РѕРґ РїРѕ РїР°СЂРѕР»СЋ Рё РїРѕ РІРѕР»С€РµР±РЅРѕР№ СЃСЃС‹Р»РєРµ).
  - Р’С‹Р±РѕСЂ СѓСЃР»СѓРі РІ РєР°С‚Р°Р»РѕРіРµ, СЂР°СЃС‡РµС‚ Рё РѕС‚РѕР±СЂР°Р¶РµРЅРёРµ С†РµРЅС‹ Р·Р° 1 РµРґРёРЅРёС†Сѓ (`pricePerUnitRub` СЃ РїРѕРґРїРёСЃСЊСЋ `в‚Ѕ / С€С‚`, Р±РµР· `/ 1000 С€С‚` СЃРѕРіР»Р°СЃРЅРѕ РїСЂР°РІРёР»Р°Рј С†РµРЅРѕРѕР±СЂР°Р·РѕРІР°РЅРёСЏ).
  - РџСЂРѕРІРµСЂРєР° РІР°Р»РёРґР°С†РёРё СЃСЃС‹Р»РѕРє (`targetType` РЅР° РѕСЃРЅРѕРІРµ РєР°С‚РµРіРѕСЂРёР№: `CHANNEL`, `POST`, `STORY`, `CUSTOM` СЃРѕРіР»Р°СЃРЅРѕ `src/utils/target-type.ts`).
  - РћС„РѕСЂРјРёС‚СЊ Р·Р°РєР°Р·, СЃРїРёСЃР°С‚СЊ Р±Р°Р»Р°РЅСЃ РёР»Рё РїРµСЂРµРЅР°РїСЂР°РІРёС‚СЊ РЅР° РѕРїР»Р°С‚Сѓ РєР°СЂС‚РѕР№/РЎР‘Рџ.

### R4. Admin Panel & Operator Roles E2E Tests
- РџСЂРѕС‚РµСЃС‚РёСЂРѕРІР°С‚СЊ E2E-СЃС†РµРЅР°СЂРёРё Р°РґРјРёРЅРёСЃС‚СЂРёСЂРѕРІР°РЅРёСЏ:
  - Р’С…РѕРґ РІ РїР°РЅРµР»СЊ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°, СЃРѕР·РґР°РЅРёРµ Рё РЅР°СЃС‚СЂРѕР№РєР° РЅРѕРІС‹С… РїСЂРѕРІР°Р№РґРµСЂРѕРІ.
  - РРјРїРѕСЂС‚ СѓСЃР»СѓРі РёР· С‚РµРЅРµРІРѕРіРѕ РєР°С‚Р°Р»РѕРіР° РїСЂРѕРІР°Р№РґРµСЂРѕРІ.
  - РЈРїСЂР°РІР»РµРЅРёРµ РЅР°С†РµРЅРєР°РјРё (`markup`), РїСЂРѕРІРµСЂРєР° СЂР°Р±РѕС‚С‹ РєР°СЂР°РЅС‚РёРЅРЅС‹С… Р·РѕРЅ (`isQuarantined`, Price Spike Isolation, Elastic Cooldown).
  - Р›РѕРіРёСЂРѕРІР°РЅРёРµ РґРµР№СЃС‚РІРёР№ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° (`AdminAuditLog` Рё Ledger-Р·Р°РїРёСЃРё).

### R5. Queue & SLA Verification (BullMQ Workers)
- РџРѕРєСЂС‹С‚СЊ С‚РµСЃС‚Р°РјРё С„РѕРЅРѕРІС‹Рµ РІРѕСЂРєРµСЂС‹ BullMQ (`OrderProcessor`, `SyncProcessor`):
  - РџСЂРѕРІРµСЂРєР° РєРѕСЂСЂРµРєС‚РЅРѕР№ РѕР±СЂР°Р±РѕС‚РєРё РѕС‡РµСЂРµРґРµР№ Рё SLA РІС‹РїРѕР»РЅРµРЅРёСЏ Р·Р°РєР°Р·РѕРІ.
  - РЎС‚СЂРµСЃСЃ-С‚РµСЃС‚РёСЂРѕРІР°РЅРёРµ/С…Р°РѕСЃ-РёРЅР¶РёРЅРёСЂРёРЅРі: СЃРёРјСѓР»СЏС†РёСЏ С‚Р°Р№РјР°СѓС‚РѕРІ РїСЂРѕРІР°Р№РґРµСЂРѕРІ РёР»Рё СЃР±РѕРµРІ С‚СЂР°РЅР·Р°РєС†РёР№ РІ Prisma (`db.$transaction` rollback) СЃ РїСЂРѕРІРµСЂРєРѕР№ С‚РѕРіРѕ, С‡С‚Рѕ Р·Р°РєР°Р·С‹ РЅРµ С‚РµСЂСЏСЋС‚СЃСЏ Рё СѓС…РѕРґСЏС‚ РІ retry-РѕС‡РµСЂРµРґСЊ РёР»Рё DLQ.

## Acceptance Criteria

### API & DB Integrity
- [ ] РРЅС‚РµРіСЂР°С†РёРѕРЅРЅС‹Рµ С‚РµСЃС‚С‹ CBR-СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёРё Рё SMM-РїСЂРѕРІР°Р№РґРµСЂРѕРІ СѓСЃРїРµС€РЅРѕ РїСЂРѕС…РѕРґСЏС‚ СЃ СЂРµР°Р»СЊРЅС‹Рј РґРѕСЃС‚СѓС€РµРј Рє СЃРµС‚Рё РёРЅС‚РµСЂРЅРµС‚.
- [ ] Р›РѕРіРёРєР° РІС‹Р±РѕСЂР° РїР»Р°С‚РµР¶РЅРѕРіРѕ С€Р»СЋР·Р° (СЂРµР°Р»СЊРЅС‹Р№ Р·Р°РїСЂРѕСЃ vs РјРѕРє) РїРѕРєСЂС‹С‚Р° С‚РµСЃС‚Р°РјРё РЅР° 100% Рё СЃРѕРѕС‚РІРµС‚СЃС‚РІСѓРµС‚ РїСЂР°РІРёР»Р°Рј `AGENTS.md`.

### UI/UX & E2E Validation
- [ ] Playwright-СЃС†РµРЅР°СЂРёРё РїСЂРѕС…РѕРґСЏС‚ Р±РµР· РѕС€РёР±РѕРє Р°РІС‚РѕСЂРёР·Р°С†РёРё Рё РєРѕСЂСЂРµРєС‚РЅРѕ РёРјРёС‚РёСЂСѓСЋС‚ РїРѕР»РЅС‹Р№ С†РёРєР» Р·Р°РєР°Р·Р° РєР»РёРµРЅС‚Р°.
- [ ] Р’Р°Р»РёРґР°С‚РѕСЂ СЃСЃС‹Р»РѕРє (`targetType` РїРѕ РєР°С‚РµРіРѕСЂРёСЏРј) Рё РѕС‚РѕР±СЂР°Р¶РµРЅРёРµ С†РµРЅ Р·Р° 1 С€С‚СѓРєСѓ РІ UI РїСЂРѕРІРµСЂРµРЅС‹ С‚РµСЃС‚Р°РјРё.
- [ ] Р’СЃРµ С‚РµСЃС‚С‹ Р·Р°РїСѓСЃРєР°СЋС‚СЃСЏ С‡РµСЂРµР· СЃС‚Р°РЅРґР°СЂС‚РЅС‹Рµ РєРѕРјР°РЅРґС‹ РІ `package.json` (`npm run test`, `npm run test:e2e`).
- [ ] РЎРіРµРЅРµСЂРёСЂРѕРІР°РЅ РїРѕРґСЂРѕР±РЅС‹Р№ РѕС‚С‡РµС‚ Рѕ РїСЂРѕС…РѕР¶РґРµРЅРёРё С‚РµСЃС‚РѕРІ Рё СѓСЂРѕРІРЅРµ РїРѕРєСЂС‹С‚РёСЏ РєСЂРёС‚РёС‡РµСЃРєРёС… С„СѓРЅРєС†РёР№.

