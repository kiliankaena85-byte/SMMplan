# CURRENT_STATE.md — Состояние проекта SMMplan / SMMpanel 1.0

> **Файл-якорь для синхронизации контекста сессий.**  
> **Последнее обновление:** 2026-08-26 23:55 (МСК)  
> **Статус:** 🟢 ВСЕ БЛОКИ ЗАВЕРШЕНЫ (100% PASS).

- **Статус экранов:** 28/28 экранов реализованы и верифицированы (100%).
- **Топология провайдеров в БД:** Очищена до строго 3 провайдеров:
  1. `VexBoost` (Реальный провайдер, баланс ~3.20 руб — критический порог ликвидности).
  2. `Mock Provider Alpha` (Основной маршрут, баланс 50 000 руб).
  3. `Mock Provider Beta` (Резервный hot-swap маршрут, баланс 50 000 руб).
- **Стресс-тестирование & User Journeys:** Полная батарея из 9 тест-сьютов (58 тестов) пройдена со 100% успехом (включая параллельные гонки баланса, hot-swap отказоустойчивость, защиту вебхуков от спама и мульти-тенант изоляцию).
- **Сборка и деплой:** Next.js 16.2.12 Standalone собран, переразвернут в Docker, healthcheck на `https://test.smmplan.pro/api/health` — 200 OK (HEALTHY).

---

## 🎯 Сводка Прогресса (100% Complete)
**Активный статус:** Production Launch Ready & Fully Hardened. **Завершено:** Блоки 1–40 (259/259 E2E, Unit, Matrix, Security, AI, Telemetry, Payment Lifecycle & Multi-Channel тестов 100% Green, 0 ошибок сборки Next.js 16.2.12 standalone, 0 горизонтальных скроллов).

---

## 📋 Реестр Тестовых Комплексов и Экранов Админки

| № | Направление / Экран | Статус | Комплекс / E2E Тест |
| :---: | :--- | :--- | :--- |
| **19** | **User Dashboard 7-Vector Suite** | ✅ 100% | `e2e/19-user-dashboard-comprehensive.spec.ts` (8/8 PASS) |
| **20** | **Chaos & Cascading Failures** | ✅ 100% | `src/__tests__/chaos-and-cascading-resilience.test.ts` & `e2e/20-chaos-stress-and-cascading-failures.spec.ts` (8/8 PASS) |
| **21** | **Support Stress & Identity Security** | ✅ 100% | `src/__tests__/support-stress-and-identity-security.test.ts` (4/4 PASS) |
| **22** | **Proxy Stress & Self-Healing** | ✅ 100% | `src/__tests__/proxy-stress-and-self-healing.test.ts` (4/4 PASS) |
| **23** | **Provider Key Hot-Reload (0ms)** | ✅ 100% | `src/__tests__/provider-key-hot-reload.test.ts` (2/2 PASS) |
| **24** | **Master 33-Tab Exhaustive Admin Audit** | ✅ 100% | `e2e/24-admin-panel-exhaustive-audit.spec.ts` (34/34 PASS) |
| **25** | **Services & Providers Synergy Suite** | ✅ 100% | `e2e/25-services-and-providers-master-e2e.spec.ts` (9/9 PASS) |
| **26** | **Master Combinatorial State-Matrix Suite** | ✅ 100% | `e2e/26-catalog-combinatorial-matrix.spec.ts` (6/6 PASS) |
| **27** | **Test vs Live Provider & Routing Armor Suite** | ✅ 100% | `src/__tests__/test-vs-live-provider-system.test.ts` & `e2e/27-test-vs-live-mode-toggle-and-dispatch.spec.ts` (10/10 PASS) |
| **28** | **Proxy Swarm, Rate Limiter & Anti-Ban Telemetry** | ✅ 100% | `src/__tests__/provider-proxy-rate-limit.test.ts` (10/10 PASS) |
| **29** | **Adaptive Proxy Chaining & Chaos Stress Suite** | ✅ 100% | `src/__tests__/proxy-chaos-stress.test.ts` & `src/__tests__/proxy-subscription-and-harvester.test.ts` (13/13 PASS) |
| **30** | **Exhaustive Positive & Negative Resilience Matrix** | ✅ 100% | `src/__tests__/proxy-exhaustive-resilience-matrix.test.ts` (10/10 PASS) |
| **31** | **Customer Funnel Smoke & Dual-Brand Journey** | ✅ 100% | `src/__tests__/user-funnel-smoke.test.ts` (5/5 PASS) |
| **32** | **Drip-Feed Orders Lifecycle & Allocation Armor** | ✅ 100% | `src/__tests__/drip-feed-lifecycle-e2e.test.ts` (5/5 PASS) |
| **BE** | **Backend Exhaustive Audit** | ✅ 100% | `src/__tests__/admin-panel-exhaustive-backend-audit.test.ts` (9/9 PASS) |
| **MX** | **Matrix 8-Vector Integration** | ✅ 100% | `src/__tests__/catalog-combinatorial-matrix.test.ts` (8/8 PASS) |
| **FL** | **Catalog Filters & SQL 3VL Audit** | ✅ 100% | `src/__tests__/catalog-filters-hide-deleted.test.ts` (3/3 PASS) |
| **MT** | **Catalog Multi-Tenant Isolation** | ✅ 100% | `src/__tests__/catalog-multitenant-e2e.test.ts` (3/3 PASS) |
| **HS** | **Operational Routing & Hot-Swap** | ✅ 100% | `src/__tests__/operational-routing-hot-swap.test.ts` (8/8 PASS) |
| **MG** | **Margin Guard & Currency Buffer** | ✅ 100% | `src/__tests__/smart-routing-margin.test.ts` (6/6 PASS) |
| **ORD**| **Order Lifecycle & Support Refunds** | ✅ 100% | `src/__tests__/order-actions-and-support-ops.test.ts` (7/7 PASS) |
| **BDG**| **Badge & Warranty Semantic Coherence** | ✅ 100% | `src/__tests__/badge-and-warranty-anti-contradiction.test.ts` (22/22 PASS) |
| **AI** | **AI Data, Math & Schema Integrity** | ✅ 100% | `src/__tests__/ai-data-math-and-schema-integrity.test.ts` (20/20 PASS) |

---

## 9 Критических Правил и Инвариантов Проекта
1. **Multi-Tenant (Строго 2 бренда):** `smmplan` (`smmplan.pro`) и `flux` (`smmflux.ru`). Переключение в шапке через `<GlobalSiteSwitcher />` (кука `x_admin_tenant`).
2. **UI Pricing Contract:** Цена за 1 штуку (`pricePerUnitRub`) с подписью `₽ / шт`. Запрещено умножать на 1000 на клиенте.
3. **Shadow Catalog & Cherry-Pick:** Сырые каталоги (5000+ услуг) буферизуются в Redis (`provider:{id}:catalog`). В PostgreSQL `Service` попадают только проверенные услуги.
4. **No Horizontal Scroll Rule:** Таблицы на 100% ширины видимого экрана без обрезания колонок и скрытых кнопок.
5. **Modal Hoisting:** Модальные окна объявляются на уровне страницы (Page State Lifting), запрещено монтировать диалоги внутри дропдаунов.
6. **Financial Trust Boundary:** Все операции с балансом — строго через `WalletOps`, `BigInt` (копейки) с `idempotencyKey` и `await auditAdminAwaitable()`.
7. **Idempotent Telegram Polling:** Сброс вебхуков через `deleteWebhook({ drop_pending_updates: true })` перед `bot.launch()`.
8. **Cloudflare Tunnel Exclusivity:** Официальный туннель Cloudflare (`scripts/start-tunnel.ps1`) на домене `test.smmplan.pro`.
9. **Badge Zero-Contradiction Invariant:** Услуга с признаком «Без гарантии» / `isRefillEnabled = false` КАТЕГОРИЧЕСКИ НЕ МОЖЕТ иметь бейдж «ГАРАНТИЯ» в UI. Автоматическая санитизация бейджа на уровне каталога и валидация в админке.
