# 🔀 Сверка baseline ↔ `main`: что аудит описал, а что уже исправлено

**Дата:** 2026-09-23
**Baseline аудита (ветка сессии):** `54b8a77f` — **не является предком `main`** (`git merge-base --is-ancestor 54b8a77f main` → NO), общий предок — `2c7368c0`
**Состояние `main`:** `c691e8b2` (108 коммитов, которых нет в ветке baseline; в ветке — 3 коммита, которых нет в `main`)
**Вывод:** аудит описывает состояние **ветки baseline**, а не текущего `main`. Часть находок на `main` уже закрыта, часть — сохраняется без изменений. Ниже — построчная сверка.

---

## 1. Уже исправлено на `main` (находки N/A для текущей магистрали)

| Находка | Baseline `54b8a77f` | `main` `c691e8b2` |
|---|---|---|
| FIND-P0-05 `ignoreBuildErrors` | `true` | **`false`** ✅ |
| FIND-P0-07 подавления `tenant-isolation-ignore` | **96 файлов** (+ 338 вхождений, линтер «100% PASS») | **10 файлов** (линтер выдаёт WARNING, не «PASS») ✅ |
| FIND-P1-10 годфайлы (ключевые) | `catalog.service.ts` **2330**, `checkout.ts` **1437**, `useOrderEngine.ts` **1000** | **181 / 167 / 372** ✅ (декомпозиция выполнена) |
| FIND-P1-03 визарды/чекаут | 4 визарда + 7 вариантов чекаута | 1 каталог `src/components/orders/wizard`; вариантов чекаута — **1**; `FluxDashboardOrderWizard.tsx` **150** строк ✅ |
| FIND-P1-08 красный тест `MobileStep1Link` | 294 строки при лимите 200 | **143 строки** ✅ |
| FIND-P1-12 артефакты откатов в git | `v2_backup.ts`, `fix.js`, `auto-fix-linter.js`, `pre_cleanup_backup.dump` | **отсутствуют** ✅ |
| FIND-P0-06 модели Prisma без `tenantId` | 54 из 87 | 46 из 87 (частично закрыто) 🟡 |
| Замечания guardrails (WARNING/MAJOR) | 146 / 22 | **78 / 16** (вердикт всё ещё ложно-зелёный) 🟡 |

> То есть `54b8a77f` — это **регрессионная ветка**: она откатывает декомпозицию, возвращает монолиты, включает `ignoreBuildErrors` и добавляет артефакты откатов. Магистраль `main` этого не содержит.

---

## 2. Сохраняется и на `main` (требует исправления в первую очередь)

### 2.1 Денежный контур (Tier 1) — код идентичен

| Файл / место | Базовая линия | `main` | Статус |
|---|---|---|---|
| `src/lib/finance/reconciliation.ts:49,61,73,76,78,129` | bigint/number | **файл идентичен baseline** (`git diff main 54b8a77f` пуст) | 🟥 сохраняется |
| `src/utils/balance-verifier.ts:58-60` | `number !== BigInt(0)` | **файл идентичен baseline** | 🟥 сохраняется |
| `src/services/financial/ledger-reconciliation.service.ts:339` | bigint/number | на `main` — та же диагностика | 🟥 сохраняется |
| `src/services/operator/users/client-financial-summary.query.ts:76,79` | bigint/number | на `main` — те же 2 диагностики | 🟥 сохраняется |
| `src/actions/admin/clients.ts:684`, `src/app/admin/clients/[id]/page.tsx:210` | bigint/number | на `main` — те же диагностики | 🟥 сохраняется |
| `src/actions/admin/users.ts:123` (`policyCheck` null) | TS18047 | на `main` — TS18047 в том же файле | 🟥 сохраняется |

**Итог:** все 8 денежных смешений типов и nullable-deref `policyCheck` **присутствуют на `main`** — это подтверждено независимым прогоном `tsc` в worktree `main` (см. `tsc-structural-errors-main-2026-09-23.md`).

### 2.2 Тип-дыры `{}` (JSON без валидации)

| Место | Baseline | `main` |
|---|---|---|
| `src/app/admin/catalog/quarantine/page.tsx` | 7 | **7** (те же) |
| `src/services/system/feature-flag.service.ts` | 4 | **4** |
| `src/services/financial/nightly-ledger-audit.service.ts` | 4 | **4** |
| `catalog.service.ts` | 10 | файла больше нет (181 строка) — но появились новые: `catalog-import.service.ts` **5**, `catalog-sync.service.ts` **4**, `providers/quarantine.service.ts` **4**, `order-analytics.service.ts` **3**, `analytics.service.ts` **2** |

**Итог:** класс проблемы сохраняется, точки сместились в новые сервисы, созданные декомпозицией.

### 2.3 Прочие сохранённые находки

| Находка | Baseline | `main` |
|---|---|---|
| `normalizeTenantId` (экспортов) | 4 | **4** 🟥 |
| `cancelOrderAction` / `restartOrderAction` (файлов) | 2 / 2 | **2 / 2** 🟥 |
| Журнал транзакций (копий) | 3 | **3** (`admin/transactions`, `dashboard/finance/client-page`, `dashboard/transactions`) 🟥 |
| `package-lock.json` зеркальные URL | 60 | **60** 🟥 |
| `omnismm-skills.zip`, `tunnel.err`, `dist/bot.js`, `dist/worker.js` в git | да | **да** 🟥 |
| Guardrails: вердикт «Architecture is clean» при замечаниях | 168 замечаний | **94 замечания** (78 WARNING + 16 MAJOR) → вердикт по-прежнему ложно-зелёный 🟥 |
| Структурные ошибки `tsc` | 38 | **43** (состав изменился, суммарно больше) 🟥 |

---

## 3. Сводный вердикт по сверке

| Категория | Находки | Актуальность для `main` |
|---|---|---|
| Деньги / типовая безопасность | FIND-P0-01, 02, 03 | **Критично, актуально** (код идентичен) |
| Тип-дыры данных | FIND-P0-04 | **Актуально** (сместилось в новые сервисы) |
| Тенанты | FIND-P0-06, 07, 08 | **Частично актуально**: 46/87 моделей и 4× `normalizeTenantId`; подавления сокращены до 10 файлов |
| Гейты и метрики | FIND-P0-05, P1-05…09 | **Смешанно**: `ignoreBuildErrors` снят, но guardrails/tenant-линтер всё ещё дают ложно-зелёные вердикты; снапшот-тесты остаются |
| Дубли и размеры модулей | FIND-P1-01…04, 10 | **Частично**: визарды и годфайлы декомпозированы на `main`; дубли `normalizeTenantId`, cancel/restart, 3× журнал транзакций — остались |
| UX / визуал | FIND-P1-11, P2 | Требует повторного замера на `main` |
| Репозиторий / процесс | FIND-P1-12, P3 | **Актуально**: lock-файл, zip/dump-артефакты, `dist/*`, тесты без Prisma Client |

### Рекомендуемая ре-базовая процедура

1. **Перенести аудит на `main`** как на источник истины; ветку `54b8a77f` считать регрессионной и **не мержить**.
2. Взять этот PR как **документацию**, а исправления вести от `main`: сначала деньги (FIND-P0-01…03), затем тип-дыры и тенанты, затем гейты.
3. Перед фиксами повторить замеры на `main` (метрики §2) — чек-лист совпадает с `AUDIT_PLAN_2026-09-23.md`.
4. Уточнить в `AUDIT_FINDINGS_REPORT_2026-09-23.md` статусы: находки, закрытые на `main`, помечать как «исправлено в магистрали».

---

## 4. Как воспроизвести сверку

```bash
# 1. Является ли baseline предком main
git merge-base --is-ancestor 54b8a77f main && echo "ancestor" || echo "DIVERGED"

# 2. Сверка файлов, где живут денежные дефекты (пусто = файл идентичен)
git diff --stat main 54b8a77f -- src/lib/finance/reconciliation.ts src/utils/balance-verifier.ts

# 3. Статический прогон на main (worktree)
git worktree add --detach /tmp/main-wt main
ln -s /path/to/node_modules /tmp/main-wt/node_modules
cd /tmp/main-wt && node node_modules/typescript/lib/tsc.js --noEmit --pretty false   # 722 диагностики, 43 структурных
node node_modules/tsx/dist/cli.mjs scripts/run-ast-guardrails.ts                     # 78 WARNING + 16 MAJOR
node node_modules/tsx/dist/cli.mjs scripts/lint-tenant-isolation.ts                  # WARNING (не PASS)
```
