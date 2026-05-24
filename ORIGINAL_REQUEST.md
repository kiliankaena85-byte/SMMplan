# Original User Request

## Initial Request — 2026-05-22T18:38:44Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Глубокий визуальный, логический и UX/UI аудит главной страницы (Landing Page) проекта Smmplan на десктопном и мобильном разрешениях. Проверка работы селекторов соцсетей и категорий, оценка контрастности по WCAG 2.2 и составление интерактивной матрицы ошибок.

Working directory: d:\SMM_plan_2
Integrity mode: development

## 🎯 Цели и описание проекта
Провести детальный аудит главной страницы сайта Smmplan (работающей локально по адресу `http://localhost:3000` или извлеченной из исходных файлов). ИИ-команда должна детально проанализировать каждый UI-элемент на наличие дизайнерских, версточных, логических и функциональных ошибок в десктопном (1280x800) и мобильном (375x812) видах. Отдельное внимание должно быть уделено интерактивному выбору соцсетей и категорий в умной форме заказа.

---

## 🔍 Предварительный список возможных ошибок для поиска (Априорный бэклог аудита)
Команда должна проверить все элементы интерфейса по этому списку возможных проблем:
1. **Визуальные искажения в Aurora-glow эффектах**: наложение фонового сердца-свечения (`Heart Aurora`) на текстовые блоки и кнопки, вызывающее плохую читаемость текста.
2. **Проблемы с контрастностью (WCAG 2.2)**: нехватка контраста между основным текстом в финтех-карточках и их полупрозрачными фонами, а также на кнопках входа и покупки.
3. **Разрушение верстки в мобильном режиме (`MobileWizard`)**: перекрытие элементов, некорректная высота шапки, усечение длинных названий соцсетей в горизонтальном скролле соцсетей.
4. **Неактивные/сломанные элементы**: ссылки на пользовательское соглашение, политику конфиденциальности, кнопки соцсетей в футере, которые ведут на заглушки (`#`) или не реагируют на клик.
5. **Layout Shifts (CLS)**: сдвиги макета при динамическом выборе соцсети и подгрузке категорий.
6. **Ошибки доступности (A11y)**: отсутствие атрибутов `aria-label` у таблиц, списков или кнопок, отсутствие видимого фокуса (focus ring) при навигации с клавиатуры.
7. **Проблемы с Touch Targets**: интерактивные элементы в мобильном макете размером меньше 44x44px (кнопки переключения шагов, плитки соцсетей).
8. **Логика усечения ссылок**: проверка, не ломается ли интерфейс и валидатор, если пользователь вставляет сырую или нестандартную ссылку.

---

## 🛠 Требования (Requirements)

### R1. Запуск окружения и Playwright скриншоты
- Развернуть локальное окружение (убедиться в работоспособности Next.js dev-сервера на `http://localhost:3000`).
- Программно сгенерировать скриншоты главной страницы в Retina-качестве для двух разрешений:
  - **Desktop**: 1280x800 (для проверки сетки и липкого финтех-бара)
  - **Mobile**: 375x812 (для проверки пошагового `MobileWizard`)

### R2. Всесторонний аудит UI-элементов
- Проверить попиксельно и по коду структуру следующих блоков:
  - **Header**: Логотип, навигационные ссылки (Услуги, Поддержка, FAQ), кнопка "Войти".
  - **Hero Section**: Заголовок `h1`, описание, блок социальной статистики (Social Proof Stats), поле ввода `HeroInput`.
  - **Order Engine (Витрина)**: Селектор соцсетей (`NetworkSelector`), боковая панель категорий (`CategorySidebar`), плитка услуг (`ServiceGrid`), липкий чекаут-бар (`StickyCheckoutBar`).
  - **Премиальные блоки доверия**: `TrustBar`, `WhyUs`, `Reviews`, `FAQ`.
  - **Футер**: Блок контактов, реквизиты юридического лица (`LEGAL_*`), ссылки на соглашения.

### R3. Тестирование логики селектора соцсетей и категорий
- Симулировать выбор нескольких соцсетей (например, Telegram, VK, Instagram) и соответствующих категорий (например, Подписчики, Просмотры).
- Убедиться, что:
  - Макет не "прыгает" (отсутствие Layout Shift).
  - Сетка тарифов (`ServiceGrid`) корректно обновляется.
  - На мобильных шаг 1 переходит на шаг 2 без зависаний.
  - Консоль браузера не выводит JS-ошибок при кликах.

### R4. Анализ контрастности и доступности (A11y)
- Выполнить аудит контраста текста и фоновых токенов на соответствие стандартам WCAG 2.2 AA (коэффициент не менее 4.5:1).
- Убедиться, что touch target (зона клика) для мобильных элементов выбора составляет не менее 44x44px.

### R5. Интерактивный отчет и матрица багов
- Сформировать подробную Markdown-таблицу (Bug Matrix) в `.planning/visual-audit-report-landing.md`, содержащую:
  - ID ошибки и её приоритет (Critical, High, Medium, Low).
  - Разрешение (Desktop/Mobile/Both) и целевой UI-компонент.
  - Описание проблемы и ожидаемое поведение.
  - Ссылки на код или скриншот.
  - Точные рекомендации по исправлению.

---

## 🎯 Критерии приемки (Acceptance Criteria)

### Технические критерии
- [ ] Playwright-скрипт захватывает скриншоты главной страницы и сохраняет их в директорию `.planning/screenshots/`.
- [ ] Логи консоли браузера Playwright зафиксированы и не содержат JS-ошибок/исклечений во время кликов по соцсетям и категориям.
- [ ] Сгенерирован полноценный файл отчета по адресу [visual-audit-report-landing.md](file:///d:/SMM_plan_2/.planning/visual-audit-report-landing.md).

### UX/UI критерии качества
- [ ] Каждый UI элемент из списка (Header, Hero, Order Engine, TrustBar, FAQ, Footer) явно упомянут в отчете с оценкой "Пройдено" (Pass) или "Ошибка" (Fail).
- [ ] Проведена явная проверка зон клика селекторов соцсетей и категорий в мобильном режиме (минимальный размер 44x44px).
- [ ] Описана реакция интерфейса при переключении между Telegram, VK и Instagram (скорость загрузки тарифов, анимации Framer Motion, корректность смены состояний).
- [ ] Все семантические цветовые токены кнопок проверены на контраст по WCAG 2.2 AA.

## Follow-up — 2026-05-22T22:19:59Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Устранение 12 визуальных, логических и доступных (WCAG 2.2 AA) ошибок на главной странице Smmplan, обнаруженных в ходе глубокого аудита. Перевод инлайновых цветов на семантические токены, исправление контрастности элементов и оптимизация размеров интерактивных мишеней (touch targets) на мобильных экранах.

Working directory: d:\SMM_plan_2
Integrity mode: development

## 🎯 Цели и описание проекта
Команда разработчиков должна провести точечный рефакторинг UI-компонентов главной страницы сервиса Smmplan с целью полного устранения замечаний дизайн-системы, несоответствий теме и грубых нарушений доступности WCAG 2.2 AA (размеры кнопок на мобильных и контрастность текстов). 

Все изменения должны строго следовать **Smmplan Lite AI Developer Contract (AGENTS.md)**:
1. Запрещены жестко вшитые inline-цвета (`text-emerald-600`, `text-indigo-500` и т.д.). Все цвета берутся из семантических токенов `globals.css`.
2. Код должен успешно компилироваться без предупреждений и ошибок типов (`npx tsc --noEmit`).
3. Сборка продакшена (`npm run build`) должна проходить без сбоев.

---

## 🛠 Требования (Requirements)

### R1. Исправление темы и визуальных конфликтов первого экрана (BUG-001, BUG-002)
- Устранить жестко прописанный темный фон `bg-slate-950` в Hero-секции `SmartLinkLanding.tsx` (строка ~149) и перевести его на адаптивные классы темы.
- Убрать резкую белую подложку Header на фоне черного Hero-экрана, сделав переход мягким и бесшовным во всех темах.

### R2. Ликвидация inline-цветов в Bento и Предупреждениях (BUG-003, BUG-004, BUG-005, BUG-006)
- Провести рефакторинг следующих файлов, заменив жесткие цветовые классы на семантические токены (`text-success`, `text-danger`, `text-warning`, `text-primary`, `bg-danger/10` и т.д.):
  - `src/components/landing/order-engine/DynamicPayloadWarnings.tsx`
  - `src/components/landing/TrustBar.tsx`
  - `src/components/landing/WhyUs.tsx`
  - `src/components/landing/Reviews.tsx`

### R3. Повышение контрастности подписей, кнопок и ссылок до WCAG 2.2 AA (BUG-007, BUG-008, BUG-009)
- Внести изменения в `@theme` блок `src/app/globals.css` для повышения контраста в светлой теме относительно фона `#f8fafc`:
  - Кнопки `bg-primary`: заменить Sky-600 (`#0284c7`) на Sky-700 (`#0369a1`), подняв контраст с белым текстом до **5.1:1** (AA пройдено).
  - Вспомогательный текст `text-muted-foreground`: заменить Slate-500 (`#64748b`) на Slate-600 (`#475569`), подняв контраст до **5.1:1**.
  - Ссылки и индикаторы `text-primary`: скорректировать до насыщенного синего/голубого тона для уверенного прохождения AA.

### R4. Оптимизация сенсорных зон на мобильных до WCAG 2.5.5 (BUG-010, BUG-011, BUG-012)
- Увеличить высоту селекторов и переключателей в `MobileWizard.tsx` (включая выбор сетей, категорий и PRO-режим) до стандарта **>= 44 CSS-пикселей** (например, через классы `h-11`, `h-12` или `py-3`).
- Увеличить вертикальные отступы элементов выпадающего меню в `components/ui/select.tsx` до `py-2.5` или `py-3` для легкого попадания пальцем.

---

## 🎯 Критерии приемки (Acceptance Criteria)

### Технические проверки
- [ ] Отсутствуют ошибки компиляции TypeScript: команда `npx tsc --noEmit` завершается успешно с кодом `0`.
- [ ] Команда `npm run build` собирает оптимизированный Next.js продакшн-билд без сбоев.
- [ ] В консоли браузера при эмуляции Playwright нет JS-исключений при выборе сетей и категорий.

### Проверки доступности и визуального качества
- [ ] Ни один из измененных компонентов (`DynamicPayloadWarnings`, `TrustBar`, `WhyUs`, `Reviews`) не содержит жестко закодированных инлайновых цветовых классов (проверяется по коду).
- [ ] Математический расчет контраста измененных токенов в `globals.css` показывает коэффициент не менее **4.5:1** для мелкого текста.
- [ ] Высота всех кликабельных областей в `MobileWizard` на экранах шириной 375px составляет не менее 44px.

## Follow-up — 2026-05-23T08:08:28Z

# Teamwork Project Prompt

Команда автономных ИИ-агентов должна провести всесторонний аудит и анализ административной панели (`/admin/*`) проекта Smmplan. Необходимо проверить работоспособность роутинга, правильность вызова серверных экшенов, интеграцию с базой данных Prisma, а также удобство интерфейса для администраторов и операторов техподдержки (UX/UI консистентность в Tailwind 4 и HeroUI v3).

Working directory: d:\SMM_plan_2
Integrity mode: development

## Requirements

### R1. Аудит роутинга и навигации административной панели
Проанализировать все страницы и вложенные разделы админ-панели в папке `src/app/admin/` (Dashboard, Finance, Marketing, Orders, Providers, Settings, Tickets, CMS). Убедиться, что все ссылки бокового меню и внутренних вкладок ведут на существующие роуты, переключения происходят мгновенно, и отсутствуют ошибки гидратации (hydration mismatch) или падения рендеринга на сервере.

### R2. Анализ функциональности и связи с бэкендом (Server Actions)
Проверить все интерактивные формы, переключатели и кнопки (например, обновление тарифов, ручное пополнение баланса, смена настроек, ответы на тикеты поддержки, импорт услуг). Проследить, чтобы формы вызывали соответствующие Server Actions из папки `src/actions/admin/` (или смежных экшенов), защищенных проверкой прав `requireAdmin()`, и корректно мутировали данные в СУБД PostgreSQL через Prisma.

### R3. UX-аудит удобства работы операторов (Operator-Centric B2B UX)
Оценить плотность данных, таблицы (aria-label заголовки, читаемость, отсутствие лишних границ), фильтры поиска заказов/тикетов и скорость взаимодействия. Интерфейс должен соответствовать правилам B2B-инструментов, снижать когнитивную нагрузку на саппорт-инженеров и не содержать интерфейсного гигантизма.

## Acceptance Criteria

### Документация и отчетность
- [ ] Сформирован подробный отчет-аудит `admin_panel_audit_report.md` в папке brain.
- [ ] В отчете представлена структурированная матрица приоритетов (Критический, Мажорный, Минорный) со всеми найденными проблемами (битые ссылки, утечки данных, отсутствие лоудеров, неработающие экшены) и конкретными рекомендациями по исправлению.
- [ ] Описаны все проверенные страницы с детальным заключением о соответствии фронтенд-компонентов бэкенд-логике Prisma.
- [ ] Весь проект успешно компилируется (`npm run build`) без ошибок типов TypeScript и линтера ESLint в админ-директориях.

## Follow-up — 2026-05-23T08:17:25Z

# Stage 2 Deep Audit Request

Hello! The user has requested a much deeper, more exhaustive Stage 2 audit of the Smmplan admin panel to find absolutely all hidden issues, security race conditions, empty state rendering bugs, validation bounds, and globals.css dark mode compliance gaps before making a massive fix.

Please execute a Stage 2 Deep Audit immediately. Formulate a plan to audit the following dimensions:
1. Concurrency & Transaction Isolation (Race conditions in settings, finance top-ups, blockings).
2. Cold Start & Empty States (Page behaviors under 0 database records, correct Skeleton and empty state mockups).
3. Input Validation Bounds & Zod schemas for all forms.
4. Tailwind 4 globals.css token compliance & WCAG 2.2 AA Dark Mode contrast ratio checks.

Exhaustively compile all findings into the existing D:\SMM_plan_2\brain\admin_panel_audit_report.md report, including exact file names, line ranges, and drop-in code fixes. Let me know when you have started Stage 2!


## Follow-up — 2026-05-23T09:08:10Z

# Teamwork Project Prompt: Comprehensive E2E Support & Admin Verification (Stage 3)

> Status: Launched (Stage 3 - Comprehensive Verification)
> Goal: Run comprehensive multi-agent E2E verification → pass Playwright and Vitest test suites → confirm 100% build integrity

Провести глубокую, сквозную (E2E) и визуальную проверку всех внедренных инноваций в системе поддержки клиентов (живой чат, история обращений, привязка заказов, слияние аккаунтов Telegram) и админ-панели проекта Smmplan. Убедиться, что каждая кнопка, вложение, селектор и защитный механизм работают безотказно в реальных пользовательских сценариях.

Working directory: d:\SMM_plan_2
Integrity mode: development

## Requirements

### R1. Визуальная и E2E-проверка чата поддержки (Client Live-Chat Flow)
- Проверить автоматическое перенаправление клиента с `/dashboard/tickets` на активную чат-сессию `/dashboard/tickets/[id]`.
- Убедиться, что в чате хронологически подгружаются сообщения из предыдущих 3 закрытых тикетов, разделенные четкими визуальными границами `--- Диалог завершен ---`.
- Проверить работу премиального выпадающего меню привязки заказов `📦` рядом с кнопкой прикрепления файлов.
- Проверить, что выбранный заказ корректно прикрепляется к сообщению в виде превью-карточки, передается на бэкенд и отображается у оператора.

### R2. Проверка ручного слияния Telegram-профилей (Manual Account Merging)
- Проверить сценарий привязки временного Telegram-профиля (`tg_...`) к основному веб-аккаунту через боковую панель оператора (`ClientProfileSidebar.tsx`).
- Убедиться, что при первичном вводе email выводится подробное превью слияния (кол-во заказов, баланс цели).
- Проверить, что слияние происходит строго после клика по новой кнопке подтверждения `#manual-bind-confirm` ("Слить"), временный профиль удаляется из БД, а права и заказы переносятся без гонок данных.

### R3. Верификация лимитов баланса и безопасности операторов (Admin Balance & Trust Guards)
- Проверить работу валидаторов Zod на ручные корректировки баланса пользователей (лимиты от -500 000 ₽ до +500 000 ₽) с обрезкой пробелов в причинах.
- Убедиться, что операторам поддержки запрещено устанавливать отрицательные или превышающие 100k ₽ лимиты доверия.
- Проверить валидацию сроков действия персональных скидок (только будущие даты) и параметров промокодов.

## Acceptance Criteria

### Функциональное тестирование
- [ ] Интеграционные тесты `vitest` для API тикетов и сообщений получают 100% успех.
- [ ] Сценарии Playwright (`e2e/tickets.spec.ts`, `e2e/admin-panel.spec.ts`) выполняются без сбоев и ошибок.
- [ ] Кнопка подтверждения слияния `#manual-bind-confirm` корректно завершает процедуру переноса в БД.

### Качество и компиляция
- [ ] Отсутствуют ошибки типов TypeScript (`npx tsc --noEmit`).
- [ ] Линтер ESLint проходит с нулевым количеством замечаний во всех измененных папках.
- [ ] Успешная сборка продакшен-бандла (`npm run build`) без предупреждений и падений Turbopack.

## Follow-up — 2026-05-23T09:15:15Z

# Teamwork Project Prompt: Production Readiness, Provider Toggles & YooKassa Sandbox Verification

> Status: Launched (Production Toggles & YooKassa Sandbox Verification)
> Goal: Audit test vs live provider configurations → verify YooKassa test/live credential toggles → execute full-circle payment & order E2E tests

Провести глубокую проверку готовности проекта Smmplan к продакшену: протестировать работу тестового и боевого провайдеров услуг, проверить корректность настройки и переключения между тестовыми и боевыми ключами ЮKassa, запустить сквозное тестирование платежного цикла и убедиться, что тестировщики смогут беспрепятственно совершать тестовые заказы.

Working directory: d:\SMM_plan_2
Integrity mode: development

## Requirements

### R1. Валидация настроек ЮKassa (YooKassa Toggles & Encryption)
- Убедиться, что администратор в панели настроек (`/admin/settings?tab=integrations`) может одновременно указать как тестовые (`yookassaTestShopId`, `yookassaTestSecretKey`), так и боевые (`yookassaShopId`, `yookassaSecretKey`) учетные данные.
- Проверить, что все чувствительные ключи (секреты) шифруются с помощью `VaultService` при сохранении в PostgreSQL и успешно дешифруются при получении.
- Проверить, что переключение тумблера «Тестовый режим» на вкладке «Система» мгновенно и без перезагрузки сервера переключает платежные секреты (`SettingsProvider.getPaymentSecrets`).

### R2. Проверка тестового и боевого провайдеров (Provider Sandbox Interception)
- Проверить логику фабрики провайдеров (`ProviderService`): в тестовом режиме все фоновые запросы заказов от воркеров должны перехватываться и отправляться на встроенный локальный эмулятор `/api/dev/mock-provider`, защищая реальный баланс провайдера.
- Убедиться, что административные функции (импорт каталога, проверка баланса) в тестовом режиме продолжают обращаться напрямую к реальному API провайдера (через `getProviderInstance`), обеспечивая возможность наполнения витрины.

### R3. Сквозное тестирование платежного цикла (E2E Payment & Order Lifecycle)
- Проверить полный цикл оформления заказа неавторизованным клиентом через форму `SmartOrderForm` с выбором ЮKassa:
  1. Создание неоплаченного заказа со статусом `AWAITING_PAYMENT` и создание транзакции со статусом `PENDING`.
  2. Перенаправление на безопасный эмулятор оплаты `/api/dev/mock-payment`.
  3. Симуляция успешного платежа через вебхук `/api/webhooks/yookassa` с передачей корректных метаданных.
  4. Перевод транзакции в статус `SUCCEEDED` и активация заказа в статус `PENDING` (готов к передаче провайдеру).

## Acceptance Criteria

### Программная верификация
- [ ] Интеграционные тесты Playwright для ЮKassa (`e2e/checkout-yookassa.spec.ts`) выполняются со 100% успехом.
- [ ] Интеграционные тесты для провайдеров (`e2e/providers.spec.ts`) завершаются полностью зелёными.
- [ ] Успешно пройдена компиляция проекта (`npm run build`) без ошибок типов TypeScript и ESLint.

### Безопасность и готовность
- [ ] В тестовом режиме боевые API-ключи ЮKassa гарантированно никогда не передаются во внешнюю сеть.
- [ ] Запросы к боевому провайдеру воркеров полностью изолированы и возвращают mock-ответы при `isTestMode = true`.

## Follow-up — 2026-05-23T10:53:47Z

# Smmplan Support & Admin Logging System Audit

An automated deep audit of the Smmplan admin and support logging system to ensure zero runtime logging errors, complete audit trailing of support and administrative actions, and optimal balance between logging verbosity and sufficiency.

Working directory: d:\SMM_plan_2
Integrity mode: development

## Requirements

### R1. Admin & Support Action Auditing Coverage
- Check that all administrative operations (such as balance adjustments, team modifications, coupon creation, catalog imports, user bans, and settings modifications) trigger a secure audit log in the database (e.g., using `auditAdminAwaitable` or the database audit trail logs).
- Check that support representative operations (such as resolving tickets, sending messages, and setting limits) are fully logged under their session identifiers.

### R2. Logging System Stability & Error-Free Execution
- Verify that standard application logs and db audit trail writes do not crash operations or throw unhandled exceptions (e.g., missing fields, circular JSON structures in metadata, or database constraint violations).

### R3. Optimal Density Audit
- Verify that logging is sufficient (critical parameters like CUIDs, adjusters, target clients, and amounts are preserved) but not excessive (no raw credentials, passwords, session tokens, or massive API catalogs are dumped into database text fields).

## Acceptance Criteria

### Security & Adequacy Criteria
- [ ] Every admin-level server action must include a synchronous audit log call or database entry recording the admin ID, target resource, action type, and trimmed metadata.
- [ ] No raw password hashes, encryption keys, or Vault-encrypted variables are exposed in database or file system log outputs.
- [ ] All audit tables maintain proper foreign key or logical bindings without throwing P2002/P2003 database errors.
- [ ] The Next.js production build does not print console warnings or stack traces during administrative operations or mock payment actions.

## Follow-up — 2026-05-23T14:10:41Z

Давай я передам тебе боевые секреты от юкассы.
В защищенном виде

## Follow-up — 2026-05-23T16:14:17+03:00

Deep audit and robust enhancement of the authentication, session isolation, account switching, and user-initiated soft-deletion flow in the Smmplan platform.

Working directory: d:\SMM_plan_2
Integrity mode: development

## Requirements

### R1. Authentication, Router Cache Purging, and Flawless Account Switching
- Audit and resolve session locking issues where users cannot cleanly log out or switch to another user account.
- **Next.js Router Cache Invalidation**: Ensure that `/api/auth/logout` completely evicts the session from cookies and the database, and adds standard `Cache-Control: no-store, max-age=0, must-revalidate` headers. On the client side, ensure that logging out triggers a full state/cache clear to prevent sticky client-side caching of the previous user's dashboard.
- **Already Logged-in /login Behavior**: If an already authenticated user accesses `/login` directly, instead of silently redirecting them or locking the UI, display a premium, clean card showing their current active email and two clear action buttons:
  1. "Продолжить как [email]" (redirects to `/dashboard`)
  2. "Войти под другим аккаунтом" (logs them out and shows the clean login form).

### R2. User-Initiated Account Soft Deletion (Self-Service)
- Design and implement a secure, premium "Удаление аккаунта" (Delete Account) flow in the user settings dashboard page.
- **Safety Verification Gate**: To prevent accidental deletion, the user must:
  1. Confirm by typing the exact word `УДАЛИТЬ` in a confirmation input field.
  2. Verify their account password (if they have set a password) before the action is executed.
- **Soft-Deletion Execution**: The deletion must be executed via a secure Server Action. It must:
  * Set a flag `isDeleted = true` and `isActive = false` on the `User` model in the database.
  * Delete all active `Session` rows for this user in the database to instantly force-logout all of their active devices.
  * Clear the `session_token` cookie and redirect the user back to the landing page with a clean success toast notification.

### R3. Data Integrity & Financial Auditing Preservation
- Soft-deleted users must be strictly prevented from:
  * Logging in via password or magic link (display a clear "Ваш аккаунт заблокирован или удален" error message).
  * Creating new orders, topping up their balance, or triggering referral payouts.
- **Preserve Historical Records**: All database relationships (orders, tickets, transactions, ledger entries) must remain fully intact. The soft-deletion must never cascade-delete financial transactions, orders, or support logs to maintain full accounting and tax auditing compliance.

### R4. Automated Testing & Verification
- Implement unit and integration tests using Vitest (e.g., in `src/services/user/__tests__/deletion.test.ts` or similar test file) verifying:
  1. Successful soft-deletion marks the user as `isDeleted` and clears database sessions.
  2. A soft-deleted user cannot authenticate (login fails with a proper error message).
  3. Deletion does not trigger cascade-deletes of orders or transactions.

## Acceptance Criteria

### Authentication & Account Switching
- [ ] Navigating to `/api/auth/logout` clears the session cookie and DB session, returning the user to `/` with no client-side route caching of `/dashboard`.
- [ ] Accessing `/login` while logged in displays the active user email and lets them cleanly sign out to switch accounts.
- [ ] No unhandled Next.js runtime warnings are printed on logout or login redirections.

### Account Soft Deletion
- [ ] The "Удалить аккаунт" button in the dashboard settings page opens a secure modal requiring typing `УДАЛИТЬ` and validating their password (if set).
- [ ] Soft-deleted users are blocked from logging in (password and magic link are both rejected with a clean message).
- [ ] Active orders and past transaction ledgers for the deleted user remain untouched in the database.
- [ ] Vitest test suite runs successfully with `npm run test` or `npx vitest` and covers the deletion constraints.

## Follow-up — 2026-05-24T03:31:32Z

Admin tools for bulk service reassignment, duplicate category merging, and catalog sanitization in the Smmplan admin panel to simplify the client-facing tariff catalog.

Working directory: d:\SMM_plan_2
Integrity mode: development

## Requirements

### R1. Bulk Service Reassignment in Admin Catalog
- Add a new button "Перенести в категорию" (Transfer to Category) to the batch action bar in the main catalog view (`/admin/catalog`).
- When clicked, this button should open a clean modal displaying a searchable select input of all available categories.
- Upon choosing a category and confirming, a secure Server Action (`batchReassignServicesCategoryAction`) must update all selected services' `categoryId` fields in a single database transaction.
- The UI must immediately reflect the changes, clear selection state, and show a success toast.

### R2. Bulk Category Merge Tool in Categories Manager
- Extend the categories manager (`/admin/catalog/categories`) with a "Объединить категории" (Merge Categories) utility.
- The interface must let the administrator:
  1. Select a **Source Category** (from which all services will be moved).
  2. Select a **Target Category** (into which all services will be moved).
- Upon submission, a secure Server Action (`mergeCategoriesAction`) must:
  * Reassign all services (both active and inactive) from the Source Category to the Target Category inside a single atomic Prisma transaction.
  * Delete the empty Source Category.
  * Update paths and trigger cache revalidation tags (`catalog`, `services`) to ensure the client-facing UI updates instantly.

### R3. Safe DB Transactions & Audit Logs
- All batch updates and category deletions must be run within secure Prisma transactions to prevent partial updates in case of network or database failure.
- Every category merge and service reclassification action must be recorded inside the `AdminAuditLog` table using the existing `auditAdmin` helper, registering:
  * `action: "CATEGORY_MERGE"` or `"BATCH_SERVICE_REASSIGN"`
  * Target category IDs and service count.
- Prevent deleting categories that still contain active services unless running through the explicit Merge flow.

### R4. Automated Verification & Vitest Specs
- Write a dedicated Vitest suite (e.g., in `src/actions/admin/catalog/__tests__/categories-ops.test.ts`) that verifies:
  1. `batchReassignServicesCategoryAction` correctly moves service records and writes audit logs.
  2. `mergeCategoriesAction` atomic execution successfully transfers all services and safely deletes the source category.
  3. Attempting to merge invalid or identical categories returns a clear error.

## Acceptance Criteria

### Batch Service Transfer UI
- [ ] Selecting services in `/admin/catalog` displays the "Перенести в категорию" action in the batch action bar.
- [ ] The transfer modal renders a dropdown listing all active categories grouped by social network.
- [ ] Transferring services successfully moves them and clears selection with a toast confirmation.

### Category Merge Tool
- [ ] A dedicated modal or tab "Объединить категории" exists in the Categories Manager UI.
- [ ] The tool prevents merging a category into itself.
- [ ] Successful merge transfers all services, deletes the source category, and revalidates Next.js cache.
- [ ] Action is atomic: any failure during transfer rolls back all service reassignments.

### Server Safety & Testing
- [ ] All staff actions are guarded by `requireStaffPermission('CATALOG', 'edit')` rules.
- [ ] Vitest test suite runs cleanly and achieves 100% pass rate.
- [ ] `npx tsc --noEmit` compiles without any TypeScript type errors.

## Follow-up — 2026-05-24T03:33:03Z

IMPORTANT UPDATE: The requirements for our Catalog Management Developers task have been expanded by the administrator. Please merge these new, detailed CRUD requirements directly into your current planning and implementation flow:

1. **Manual Service Creation & Editing (CRUD)**:
   - Implement a pencil edit icon/button next to each service row in `/admin/catalog` that opens a dense, elegant Edit Modal.
   - Allow manually modifying: `name`, `description` (multiline `textarea`), `categoryId` (dropdown), `targetType` (select mapping to: `POST`, `CHANNEL`, `PROFILE`, `STORY`, `CUSTOM`), `minQty`, `maxQty`, `isActive`, `rate`, and `markup`.
   - **Manual Provider Binding**: Include fields inside the Edit Modal to select the `Provider` (searchable select dropdown of active providers) and input their `externalId` manually.
   - **Create Service Manually**: Add a "Создать услугу" button at the top of `/admin/catalog` that opens a modal to define a completely new service from scratch with all the above parameters.

2. **Social Networks & Categories CRUD**:
   - In `/admin/catalog/categories`, allow admins to view and create Networks (social platforms) from scratch, entering `name`, `slug` (lowercase, e.g. `vkontakte`), and `sort`.
   - In categories listing, allow inline editing or a dialog to rename categories, assign them to a different Network, and change their sorting order.
   - Support creating categories under any social network from scratch.

3. **Security, Caching, and Audit Logs**:
   - All manual CRUD, merging, and reassignment actions must be atomic (using Prisma `$transaction`).
   - Every manual action must record audit logs in `AdminAuditLog` (`SERVICE_MANUAL_CREATE`, `SERVICE_MANUAL_UPDATE`, `NETWORK_CREATE`, etc.) using the `auditAdmin` helper.
   - Use proper staff permission check `requireStaffPermission('CATALOG', 'edit')`.
   - Revalidate cache paths (`/admin/catalog`, `/admin/catalog/categories`) and tags (`catalog`, `services`) instantly on change.

4. **Testing & Types Check**:
   - Add unit/integration Vitest specs covering these manual operations.
   - Ensure all TypeScript checks pass flawlessly.

## Follow-up — 2026-05-24T04:10:33Z

Комплексный юзабилити- и логический аудит административной панели Smmplan с фокусом на работу оператора поддержки, тикет-систему, бесшовные переходы между тикетами и заказами, а также удобство управления каталогом услуг и провайдерами.

Рабочая директория: d:\SMM_plan_2
Режим целостности (Integrity Mode): development

## Требования

### R1. Анализ тикет-системы и UX-эффективности поддержки
- Провести аудит интерфейса списка тикетов (`/admin/tickets`) и детальной страницы чата (`/admin/tickets/[id]`) на соответствие правилам **Enterprise UX (Operator-Centric Design)** и **Premium Matrix** (отступы, визуальный шум, читаемость).
- Проанализировать удобство работы с шаблонами ответов поддержки (`TemplateManagerModal`) и функционала компенсаций/рефиллов (`ManualRefillModal`, лимиты `supportLimitCents`).

### R2. Карта путей оператора (Userflows) и аудит логики переходов
- Построить и описать пошаговые Userflows оператора поддержки при обработке обращений:
  1. *Flow A: Обращение по конкретному заказу* (Поиск заказа, проверка статуса, отмена/перезапуск, возврат средств).
  2. *Flow B: Ручная привязка Telegram-профиля* к основному Email аккаунту клиента из чата.
  3. *Flow C: Просмотр LTV и финансовой истории* клиента из карточки тикета.
- Зафиксировать все логические косяки переходов. **Критичные баги для фиксации**:
  - Ссылка "Смотреть все заказы →" в `ClientProfileSidebar` ведет на `/admin/orders?userId=...`, но страница заказов полностью игнорирует параметр `userId` и показывает все заказы.
  - Кнопка "Перейти к заказу" ведет на `/admin/orders?edit_order_id=...`, но Drawer открывается только если заказ находится на первой странице (среди первых 50). Если заказ старый, Drawer не открывается вообще.

### R3. Проектирование бесшовного Drawer управления заказом в чате тикета
- Спроектировать интеграцию боковой панели управления заказом (`OrderDrawer` или аналогичного) непосредственно внутрь страницы диалога `/admin/tickets/[id]`, чтобы оператор мог совершать все действия (отмена, перезапуск, смена провайдера/failover, ручная корректировка) без перехода в `/admin/orders` и потери контекста.

### R4. Анализ каталога услуг и интеграции с провайдерами
- Проанализировать логику и удобство поиска услуг в каталоге. Оценить возможность поиска по ID провайдера (`externalId`), фильтрации по провайдерам/соцсетям, сортировки по маржинальности/цене и массового перемещения услуг по категориям.

## Критерии приемки (Acceptance Criteria)

### 📊 Качество и глубина отчета
- [ ] Составлен детальный отчет об аудите в файле `admin_usability_audit_report.md` на русском языке.
- [ ] Описаны минимум 3 детальных Userflow оператора с указанием шагов, эмоциональных триггеров и точек трения (Chain-of-Feeling).
- [ ] Задокументированы все логические ошибки переходов (включая баги с `userId` и `edit_order_id`) с точными ссылками на файлы исходного кода.

### 🛠 Проектирование решений (UI-SPEC / API-SPEC)
- [ ] Разработан детальный план интеграции `OrderDrawer` в чат тикета (шаги рефакторинга, Server Actions, изменения в стейте).
- [ ] Разработаны точные спецификации для исправления багов фильтрации заказов по `userId` и динамического запроса старых заказов по `edit_order_id` с сервера.
- [ ] Сформирован план улучшения каталога (поиск по ID провайдера, маржинальность, групповой перенос).

## Follow-up — 2026-05-24T04:13:47Z

Внимание: Пользователь запросил дополнительно добавить в глубокий аудит страницу «Заказов» (/admin/orders).

Пожалуйста, проведите детальный анализ страницы заказов и полноценно включите результаты в итоговый отчет `admin_usability_audit_report.md`:
1. Юзабилити таблицы заказов (информационная плотность, удобство быстрого сканирования данных оператором, математическое выравнивание цен/сумм).
2. Анализ багов и логических косяков на этой странице (включая игнорирование userId при фильтрации и сбой открытия Drawer для старых заказов при переходе по ссылке edit_order_id).
3. Удобство выполнения действий над заказами (кнопки отмены, перезапуска, модалка Failover/смены провайдера) и понятность выводимых ошибок API.
4. Предложите конкретные UI/UX улучшения в соответствии с принципами Enterprise UX (Progressive Disclosure, Vercel Style, снижение визуального шума).

## Follow-up — 2026-05-24T04:15:54Z

Внимание: Дополнительно добавьте в скоуп аудита Услуги / Каталог (/admin/catalog и /admin/services) со следующим фокусом:
1. Отображение цен с переключателем валюты (Рубли / USD) и переключателем объема (за 1 штуку / за 1000 штук) для администратора.
2. Проектирование удобного административного UI-переключателя/виджета, который позволит оператору мгновенно сопоставлять закупочную цену (Rate в USD за 1k от провайдера) с розничной ценой за 1 шт в рублях и маржой.
3. Анализ фильтров, сортировок по марже/себестоимости и группировок услуг по соцсетям/категориям для удобства администрирования.

Пожалуйста, включите детальные спецификации этого переключателя и UX-рекомендации по ценам в итоговый отчет `admin_usability_audit_report.md`!

## Follow-up — 2026-05-24T04:19:23Z

Внимание: Пользователь хочет обсудить архитектурные решения по вкладке «Докрутки» (Refills).
Его видение: там должны отображаться заказы, которые делались вручную админом поддержки, которые он клиенту докручивал по гарантии (клиент за них не платил).

Пожалуйста, проведите глубокий архитектурный мозговой штурм (Brainstorming) и включите в отчет `admin_usability_audit_report.md` отдельный раздел «Архитектура докруток (Refills)»:
1. **Сценарий A: Индустриальный Refill API** (запрос отправляется провайдеру по оригинальному ID заказа, провайдер выполняет докрутку бесплатно, Smmplan платит $0).
2. **Сценарий B: Ручная компенсационная докрутка от поддержки (Free Compensatory Order)** (оператор запускает ручную докрутку, создается дочерний заказ с ценой 0 рублей для клиента, но Smmplan оплачивает его себестоимость провайдеру из своего кармана).
3. **Защита от фрода операторов (Security & Audit)**: как защитить систему от злоупотреблений операторов (создание бесконечных бесплатных заказов для друзей). Ограничение по лимитам `supportLimitCents`, сверка с исходным объемом заказа (нельзя докрутить больше, чем исходный заказ), запись в `AdminAuditLog`.
4. **Визуализация в UI**: как вкладка «Докрутки» должна отображать эти два типа докруток, удобство переходов между оригинальным заказом, тикетом и самой докруткой.

Полноценно проработайте эти архитектурные сценарии в Milestone 2!

## Follow-up — 2026-05-24T08:13:32Z

Доведение административной панели Smmplan до 100% уровня зрелости (Production-Ready) с акцентом на модернизацию вкладки «Маркетинг», повышение financial безопасности «Докруток», улучшение поиска в «Каталоге» и внедрение премиальных UI/UX элементов по Stripe/Vercel стандартам.

Working directory: d:\SMM_plan_2
Integrity mode: development

## Requirements

### R1. Полная модернизация вкладки «Маркетинг» (/admin/marketing)
- Заменить заглушку реферальных графиков линейным графиком (AreaChart / LineChart) динамики выплат по дням/месяцам на базе Recharts, визуализирующим объемы выплаченных реферальных средств и средств в ожидании выплат за последнее время.
- Исправить логическую ошибку в таблице рефоводов в client-referrers-table.tsx: переименовать колонку `PENDING` в «БАЛАНС / ДОСТУПНО К ВЫПЛАТЕ».
- Внедрить автоматический генератор случайных промокодов (иконка 🎲) in create-promo-form.tsx, генерирующий красивый 8-символьный буквенно-цифровой код в верхнем регистре (вида `SUMMER26`, `GIFT89X1`) и заполняющий им инпут.
- Сделать поля ввода в форме промокодов create-promo-form.tsx динамическими: при типе "Скидка" показывать только поле процента, при типе "Ваучер" — только сумму.
- Заменить стандартный чекбокс статуса промокода на красивый HeroUI `Switch` в promocode-columns.tsx, а деструктивное удаление промокода перевести на Popover/Modal с кастомным подтверждением вместо браузерного `confirm()`.

### R2. Повышение безопасности во вкладке «Докрутки» (/admin/refills)
- Внедрить строгую бэкенд-проверку в Server Actions: запретить создание ручных и автоматических запросов докрутки для заказов, которые были отменены (`CANCELED`) или по которым произведен полный возврат средств.
- Реализовать механизм автоматического перезапуска (Retry Backoff) для автоматических докруток через фоновые задачи BullMQ: делать 3 попытки автоматического перезапуска с экспоненциальной задержкой (раз в 15 минут) при сбое внешнего API провайдера. Если все попытки исчерпаны — выставлять статус `ERROR` и регистрировать ошибку в админ-панели.

### R3. Интеллектуальный поиск в «Каталоге» (/admin/catalog)
- Добавить поддержку фильтрации списка услуг каталога по ID провайдера (`providerId`) и по соцсети/платформе в catalog.service.ts.
- Реализовать в строке поиска каталога автоматическое распознавание внешнего ID провайдера (`externalId`), чтобы админ мог мгновенно находить конкретную услугу поставщика.

### R4. Premium UI/UX & WCAG 2.2 AA доступность во всей панели
- Заменить все оставшиеся браузерные диалоги `confirm()` (при отмене, перезапуске заказов) на кастомные модальные окна подтверждения HeroUI.
- Привести все интерактивные кнопки к стандартам WCAG (touch target >= 44px на мобильных устройствах).

## Acceptance Criteria

### Функциональность маркетинга
- [ ] Линейный/областной график рефералов работает на базе Recharts и отображает динамику выплат.
- [ ] Колонка баланса рефоводов в таблице озаглавлена как «БАЛАНС / ДОСТУПНО К ВЫПЛАТЕ».
- [ ] Кнопка генератора промокодов заполняет поле случайным 8-символьным буквенно-цифровым кодом в верхнем регистре.
- [ ] Форма промокодов скрывает/показывает поля ввода на лету.
- [ ] Статус промокода переключается через `Switch` из HeroUI, а удаление подтверждается через модальное окно.

### Безопасность и логика
- [ ] При попытке запустить докрутку по отмененному заказу бэкенд возвращает ошибку валидации.
- [ ] Механизм Retry Backoff для докруток успешно выполняет 3 попытки при симуляции падения API провайдера.
- [ ] Поиск каталога успешно находит услуги по значению `externalId`.
- [ ] TypeScript компиляция (`npx tsc --noEmit`) проходит без ошибок.
- [ ] Полная сборка проекта (`npm run build`) завершается успешно.

## Follow-up — 2026-05-24T08:20:28Z

Доведение административной панели Smmplan до 100% уровня зрелости (Production-Ready) с акцентом на модернизацию вкладки «Маркетинг», повышение финансовой безопасности «Докруток», улучшение поиска в «Каталоге», внедрение премиальных UI/UX элементов по Stripe/Vercel стандартам и полное перепроектирование тикет-системы под двухпанельный интерфейс в стиле HappyDesk с мобильной адаптивностью.

Working directory: d:\SMM_plan_2
Integrity mode: development

## Requirements

### R1. Полная модернизация вкладки «Маркетинг» (/admin/marketing)
- Заменить заглушку реферальных графиков линейным графиком (AreaChart / LineChart) динамики выплат по дням/месяцам на базе Recharts, визуализирующим объемы выплаченных реферальных средств и средств в ожидании выплат за последнее время.
- Исправить логическую ошибку в таблице рефоводов в client-referrers-table.tsx: переименовать колонку `PENDING` в «БАЛАНС / ДОСТУПНО К ВЫПЛАТЕ».
- Внедрить автоматический генератор случайных промокодов (иконка 🎲) в create-promo-form.tsx, генерирующий красивый 8-символьный буквенно-цифровой код в верхнем регистре (вида `SUMMER26`, `GIFT89X1`) и заполняющий им инпут.
- Сделать поля ввода в форме промокодов create-promo-form.tsx динамическими: при типе "Скидка" показывать только поле процента, при типе "Ваучер" — только сумму.
- Заменить стандартный чекбокс статуса промокода на красивый HeroUI `Switch` в promocode-columns.tsx, а деструктивное удаление промокода перевести на Popover/Modal с кастомным подтверждением вместо браузерного `confirm()`.

### R2. Повышение безопасности во вкладке «Докрутки» (/admin/refills)
- Внедрить строгую бэкенд-проверку в Server Actions: запретить создание ручных и автоматических запросов докрутки для заказов, которые были отменены (`CANCELED`) или по которым произведен полный возврат средств.
- Реализовать механизм автоматического перезапуска (Retry Backoff) для автоматических докруток через фоновые задачи BullMQ: делать 3 попытки автоматического перезапуска с экспоненциальной задержкой (раз в 15 минут) при сбое внешнего API провайдера. Если все попытки исчерпаны — выставлять статус `ERROR` и регистрировать ошибку в админ-панели.

### R3. Интеллектуальный поиск в «Каталоге» (/admin/catalog)
- Добавить поддержку фильтрации списка услуг каталога по ID провайдера (`providerId`) и по соцсети/платформе в catalog.service.ts.
- Реализовать в строке поиска каталога автоматическое распознавание внешнего ID провайдера (`externalId`), чтобы админ мог мгновенно находить конкретную услугу поставщика.

### R4. Premium UI/UX & WCAG 2.2 AA доступность во всей панели
- Заменить все оставшиеся браузерные диалоги `confirm()` (при отмене, перезапуске заказов) на кастомные модальные окна подтверждения HeroUI.
- Привести все интерактивные кнопки к стандартам WCAG (touch target >= 44px на мобильных устройствах).

### R5. Единое двухпанельное рабочее пространство тикетов (/admin/tickets) в стиле HappyDesk
- Объединить список тикетов и чат диалога в единую двухпанельную рабочую среду (Unified Workspace) на странице `/admin/tickets`:
  - **Левая панель**: Фильтры по статусам (Все, Открытые, Ожидают, Закрытые), поисковая строка, интерактивный список карточек тикетов (с аватарами, метаданными и превью последнего сообщения) и компактная пагинация внизу.
  - **Правая панель**: Чат с активным тикетом, шапкой (назначенный оператор, тема, Email), блоком привязанного заказа, окном сообщений `ChatWindow` и формой ответа. Если тикет не выбран — показывать красивый заглушечный экран.
- **Архитектурный паттерн URL-State**: Использовать query-параметр `ticketId` в URL для бесшовного управления активным диалогом на сервере и клиенте (для быстрого SSR рендеринга деталей).
- **Полная мобильная адаптивность**: 
  - На экранах `< 1024px` интерфейс переключается в однопанельный режим.
  - Если `ticketId` в URL отсутствует — показывается только список тикетов.
  - Если `ticketId` выбран — показывается только окно чата во весь экран с кнопкой «Назад» (очищающей параметр в URL) для возврата к списку.

## Acceptance Criteria

### Функциональность маркетинга
- [ ] Линейный/областной график рефералов работает на базе Recharts и отображает динамику выплат.
- [ ] Колонка баланса рефоводов в таблице озаглавлена как «БАЛАНС / ДОСТУПНО К ВЫПЛАТЕ».
- [ ] Кнопка генератора промокодов заполняет поле случайным 8-символьным буквенно-цифровым кодом в верхнем регистре.
- [ ] Форма промокодов скрывает/показывает поля ввода на лету.
- [ ] Статус промокода переключается через `Switch` из HeroUI, а удаление подтверждается через модальное окно.

### Единое окно тикетов и адаптивность
- [ ] Раздел тикетов `/admin/tickets` отображает список диалогов слева и чат справа в виде единого экрана на десктопе.
- [ ] Клик по тикету в левой панели обновляет URL (`?ticketId=...`) и загружает чат тикета в правой панели без полной перезагрузки страницы.
- [ ] На смартфонах при выбранном тикете отображается только чат с кнопкой «Назад к списку». При клике на «Назад» URL очищается, и отображается список тикетов.
- [ ] Кнопки переключения статусов тикетов и привязка заказов в `TicketActionsDropdown` работают корректно внутри единого окна.

### Безопасность и логика
- [ ] При попытке запустить докрутку по отмененному заказу бэкенд возвращает ошибку валидации.
- [ ] Механизм Retry Backoff для докруток успешно выполняет 3 попытки при симуляции падения API провайдера.
- [ ] Поиск каталога успешно находит услуги по значению `externalId`.
- [ ] TypeScript компиляция (`npx tsc --noEmit`) проходит без ошибок.
- [ ] Полная сборка проекта (`npm run build`) завершается успешно.

## Follow-up — 2026-05-24T08:22:17Z

Дополнительное уточнение по UI/UX тикетов:
Правая колонка профиля клиента (ClientProfileSidebar) должна быть скрываемой и по умолчанию скрыта.
В шапке чата должна быть кнопка (например, иконка профиля или информации), по клику на которую эта панель плавно раскрывается сбоку.
На мобильных устройствах сайдбар профиля должен открываться поверх чата в виде Drawer.

## Follow-up — 2026-05-24T08:26:20Z

Добавление требований R6 по мобильной эргономике саппорта (Mobile Support Operator UX):
1. Мобильный сплит-режим и скролл: Использовать динамические DVH-единицы, автоскролл при открытии клавиатуры, горизонтальный свайп шаблонов.
2. Нижний BottomSheet/Drawer (HeroUI) для аудита заказа на смартфонах с кнопками >= 44px.
3. Интеллектуальный мост поддержки провайдеров (Support Bridge): В деталях заказа выводить кнопку «В тикеты провайдера». По клику на нее: автокопирование внешнего ID заказа в буфер обмена с тостом, открытие поддержки провайдера в новой вкладке.


## Follow-up — 2026-05-24T11:17:16Z

Глубокий анализ, аудит и технологическое закаливание (Hardening) B2B-административной панели Smmplan для достижения абсолютной надежности, финансовой безопасности и премиального UX.

Working directory: d:\SMM_plan_2
Integrity mode: development

## Requirements

### R1. Эргономический UX поддержки (Eyestrain Reduction & Warm Light Theme)
- Адаптировать цветовую гамму, контрастность и типографику административной панели под требования комфортной 12-часовой смены оператора согласно научным стандартам эргономики (ISO 9241-110).
- Избегать «кислотных» цветов и экстремально контрастного черного на чисто белом фоне. Применить теплую светлую палитру (мягкий оттенок цинка/слоновой кости для фона `bg-background`, мягкий графитовый slate для основного текста `text-foreground`, оптимальные межстрочные интервалы `line-height: 1.6` и сглаженные границы с тональным HSL-контрастом вместо резких 1px линий).
- Оптимизировать размеры touch-мишеней (строго >= 44px) и минимизировать когнитивную нагрузку при переходе между основными вкладками: Дашборд, Заказы, Услуги, Провайдеры, Клиенты, Саппорт и Настройки.

### R2. Авто-ценообразование с Elastic Quarantine & Защита от убытков (ЦБ РФ USD/RUB)
- Реализовать фоновый сервис (Cron Job / API Sync), опрашивающий официальный API Центрального Банка РФ (ЦБ РФ) для получения актуального курса USD/RUB (например, через ежедневный JSON-сервис ЦБ).
- **Маппинг розничных цен**: Автоматически пересчитывать розничные цены в рублях для всех активных импортированных услуг провайдеров:
  $$\text{pricePer1kRub} = \text{providerRateUSD} \times \text{markup} \times \text{usdToRubCourse}$$
- **Elastic Quarantine**: Если закупочный тариф провайдера в USD возрастает более чем на 20% за одно обновление, автоматически отправлять услугу в карантин (`isQuarantined = true`, `quarantineReason = "Ценовой скачок у провайдера"`) и временно отключать ее для заказов (`isActive = false`) до подтверждения админом.
- **Loss Prevention (Блокировка убытков)**: Если розничная стоимость за 1 штуку (`pricePerUnitRub`) становится меньше себестоимости закупки в рублях из-за колебаний курса ЦБ или подорожания у поставщика, немедленно деактивировать услугу (`isActive = false`), логировать ошибку в базе и отправлять критическое уведомление в админку.

### R3. Финансовая и налоговая аналитика для Владельца ("Finance for Dummies")
- Добавить на Дашборд администратора интуитивно понятный финансовый блок со следующими простыми карточками:
  - **«Поступило (Выручка)»**: Сумма всех успешно завершенных платежей клиентов за выбранный период (руб).
  - **«Комиссии кассы»**: Общие комиссии эквайринга YooKassa (в расчете 3% от платежей).
  - **«Закупки (Расход)»**: Сумма себестоимости (`providerCost`) всех успешно обработанных заказов у провайдеров.
  - **«Расчетный налог (УСН)»**: Интерактивная карточка налога (УСН 6% «Доходы» или УСН 15% «Доходы минус Расходы» на выбор владельца в настройках) с детальным и простым текстовым объяснением: *"Ваш налог платится ежеквартально в ФНС. Ближайший платеж до 28 числа... Для уплаты переведите ХХХ рублей по реквизитам ФНС..."*.
  - **«Чистая прибыль»**: Итоговая прибыль после вычета закупок, комиссий и налогов, снабженная понятным цветовым индикатором (Зеленый — прибыль стабильна, Желтый — снизилась маржа, Красный — расходы превысили доходы).

### R4. Защитная утилита сверки балансов (Double-Check Ledger Utility)
- Создать фоновый скрипт и консольную команду (`src/utils/balance-verifier.ts` / `npm run check-balances`):
  - По каждому пользователю сканировать всю цепочку транзакций:
    $$\text{Ожидаемый Баланс} = \text{Все Суммы Пополнений} - \text{Все Списания за Заказы} + \text{Все Возвраты средств}$$
  - Сравнивать полученную математическую сумму с текущим полем `user.balance` в базе данных.
  - При наличии расхождения даже в 1 копейку (абсолютная погрешность), система должна немедленно:
    1. Зафиксировать критическую запись в лог ошибок.
    2. Временно заблокировать аккаунт пользователя во избежание фрода или утечек.
    3. Отправить Critical-alert владельцу платформы.

### R5. Консольный скрипт автоматического визуального контроля (Visual QA)
- Разработать скрипт `scripts/visual-qa.js` на базе Playwright или Puppeteer, который:
  - Автоматически авторизуется под тестовым аккаунтом администратора.
  - Делает скриншоты 7 ключевых вкладок: Дашборд, Заказы, Услуги, Провайдеры, Клиенты, Чат саппорта и Настройки.
  - Сохраняет скриншоты в папку `.planning/screenshots/`.
  - При запуске в режиме сравнения (`node scripts/visual-qa.js --compare`), скрипт сопоставляет текущие скриншоты с эталонными (Baseline) через библиотеку `pixelmatch` и выдает ошибку, если верстка сместилась или сломалась более чем на 1% пикселей.

## Acceptance Criteria

### Эргономика и Скриншоты
- [ ] Оформление админки приведено к теплой пастельной гамме (ISO 9241): отсутствуют режущие глаза контрасты, текст легко читается на протяжении 12-часовой смены.
- [ ] Скрипт `scripts/visual-qa.js` успешно делает снимки экрана 7 ключевых разделов и сохраняет их.
- [ ] Режим сравнения скриншотов с `pixelmatch` корректно детектирует и подсвечивает изменения верстки.

### Авто-цены и Защита от убытков
- [ ] Курс USD/RUB автоматически обновляется по данным ЦБ РФ в фоновом режиме.
- [ ] При подорожании услуги у провайдера более чем на 20%, услуга автоматически переходит в `isQuarantined = true` и деактивируется.
- [ ] При снижении маржинальности услуги ниже себестоимости закупки (отрицательная маржа) происходит мгновенная авто-блокировка услуги (`isActive = false`).

### Финансы и Сверка балансов
- [ ] Дашборд отображает простые метрики Выручки, Расходов, Комиссий, Налога УСН и Чистой прибыли с текстовыми хелперами.
- [ ] Скрипт `npm run check-balances` успешно выявляет расхождения между транзакционной историей и балансом пользователя.
- [ ] При искусственной симуляции расхождения баланса пользователя (более 1 копейки) скрипт мгновенно блокирует пользователя и пишет подробный алерт.
- [ ] TypeScript компиляция (`npx tsc --noEmit`) проходит с 0 ошибок.
- [ ] Полная сборка `npm run build` выполняется успешно.
