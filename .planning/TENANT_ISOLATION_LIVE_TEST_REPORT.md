# LIVE MULTI-TENANT ISOLATION & BOLA TEST REPORT

> **Date:** 2026-09-22T13:32:51.055Z  
> **Target:** OmniSMM 1.0 Multi-Tenant Engine  
> **AI Auditor:** `cohere/north-mini-code:free` (OpenRouter Free Tier)  
> **Local Test Result:** 17/17 PASS (100%)

---

## 1. Local Penetration & Isolation Battery Results

| # | Контур | Проверка | Результат | Детали |
|---|---|---|:---:|---|
| 1 | Ingress | Host smmplan.pro resolves to smmplan | ✅ PASS | Resolved: smmplan |
| 2 | Ingress | Host smmflux.ru resolves to flux | ✅ PASS | Resolved: flux |
| 3 | Ingress | Unknown Host falls back to default tenant | ✅ PASS | Resolved: smmplan |
| 4 | Ingress | Legacy alias "lovable" normalizes to "flux" | ✅ PASS | Normalized: flux |
| 5 | Enforcer | Tenant-scoped models registry loaded | ✅ PASS | Total models: 40 |
| 6 | Enforcer | Auto-injection of tenantId on blank query | ✅ PASS | Result: {"tenantId":"smmplan"} |
| 7 | Enforcer | Shared model category gets tenant + "all" | ✅ PASS | Result: {"tenantId":{"in":["flux","all"]}} |
| 8 | BOLA Attack | Direct Cross-Tenant IDOR query blocked with SECURITY_TENANT_MISMATCH | ✅ PASS | Attacker tried: tenantId: "flux" while active in "smmplan" |
| 9 | BOLA Attack | Array injection BOLA attack blocked with SECURITY_TENANT_MISMATCH | ✅ PASS | Attacker tried: { in: ["smmplan", "flux"] } |
| 10 | Context | Context active inside runWithTenant("flux") | ✅ PASS | Bypass is false as expected |
| 11 | Bypass Guard | Empty reason for runWithTenantBypass is strictly rejected | ✅ PASS | Caught empty reason attempt |
| 12 | Bypass Guard | Legitimate bypass with audit reason is tracked correctly | ✅ PASS | Reason logged and verified in context |
| 13 | RBAC | Support staff limited to smmplan is blocked from flux | ✅ PASS | Access to flux denied (403) |
| 14 | RBAC | Support staff has valid access to smmplan | ✅ PASS | Access to smmplan granted (200) |
| 15 | RBAC | Owner has unrestricted access to any tenant | ✅ PASS | Access granted across all tenants |
| 16 | Fiscal | SMMplan has registered legal entity (ИП Соколов А.А.) | ✅ PASS | INN: 695006320024 |
| 17 | Fiscal | SMMflux has isolated legal config distinct from SMMplan | ✅ PASS | Plan: support@smmplan.pro, Flux: support@smmflux.ru |

---

## 2. Заключение независимого AI-аудитора (cohere/north-mini-code:free)

## 📊 Общая оценка
**РЕКОМЕНДУЕТСЯ** – Архитектура демонстрирует 100% соответствие требованиям изоляции мульти-тенанта и защиты от BOLA/IDOR в тестовых условиях.

---

## 🎯 Оценка уверенности
**9 / 10**
Все тесты пройдены, но продакшн-среда может быть подвержена новым векторам атак, не охваченным тест-кейсами (см. раздел «Потенциальные уязвимости»).

---

## 💪 3 ключевых преимущества

| # | Преимущество | Почему это важно |
|---|------------|----------------|
| 1️⃣ | **Хост-базированная маршрутизация на уровне HTTP** (`smmplan.pro` ↔ `smmflux.ru`) | Гарантирует правильный исходный хост перед любой проверкой аутентификации; предотвращает перекрестное загрязнение трафика. |
| 2️⃣ | **Автоматический интерцептор Prisma ORM с инъекцией tenantId** (40 моделей) | Обеспечивает неизбирательную изоляцию на уровне базы данных; блокирует как строковые, так и массивные инъекции BOLA через `SECURITY_TENANT_MISMATCH`. |
| 3️⃣ | **Строгий контекст выполнения + аудитные байпасы** (`AsyncLocalStorage`, обязательное обоснование) | Обеспечивает fail-closed режим, отслеживает любые исключения изоляции и делает байпасы подотчетными. |

---

## ⚠️ 2 потенциальных уязвимости / вектора атак, требующих мониторинга

| # | Вектор атаки | Описание | Предлагаемые контрмеры |
|---|-------------|-------------|----------------------|
| 1️⃣ | **DNS-ребиндинг / хост-снартинг** | Если злоумышленник может инициировать DNS-запрос к внутреннему хосту (например, `smmplan` → внутренний IP), он может обойти хост-базированную маршрутизацию. | Ограничьте разрешение DNS до внешних адресов; примените TLS-SNI/ALPN валидацию; мониторьте внезапные изменения DNS. |
| 2️⃣ | **Утечка идентификатора тенанта через другие поля доступа** | Вектор атаки может обойти проверку tenantId, если другие поля (например, `resourceId`, `userId`) содержат скрытые ссылки на тенанта. | Проведите статический анализ на предмет скрытых связей между тенантами; добавьте проверку tenantId во всех точках доступа к данным; включите автоматизированное сканирование на предмет IDOR. |

---

## 🔄 Рекомендации для CI/CD в продакшене

1. **Интегрированные тесты изоляции мульти-тенанта**
   - Добавьте сценарии автоматизированного тестирования (например, с использованием Playwright или Postman) для каждой комбинации BOLA/IDOR, аналогичной предоставленным тестам.
   - Запустите эти тесты как часть пула *предварительного запуска* перед любым развертыванием.

2. **Переназначение и проверка tenantId в режиме реального времени**
   - Включите легкий сервис мониторинга, который периодически запрашивает случайные идентификаторы тенантов и проверяет, что ответ содержит только данные соответствующего тенанта.
   - Отправляйте оповещения в случае обнаружения `SECURITY_TENANT_MISMATCH` или 403-ых ошибок, связанных с тенантом.

3. **Обязательная проверка байпасов**
   - При каждом использовании `runWithTenantBypass` убедитесь, что обоснование аудита не является пустым и соответствует политике безопасности.
   - Храните журнал байпасов в отдельном, неизменяемом хранилище для последующего анализа.

4. **Интеграция с динамической безопасностью приложений (DAS)**
   - Настройте сканер, который регулярно (например, еженедельно) сканирует API на предмет новых векторов IDOR/BOLA, особенно после изменений в схеме моделей.

5. **Шаблоны инфраструктуры как кода**
   - Используйте инфраструктурные скрипты (Terraform, CloudFormation) для обеспечения постоянной изоляции DNS, TLS-сертификатов и сетевых политик, чтобы предотвратить случайное раскрытие хостов.

---

**Вывод:** Архитектура надежно защищена от распространенных атак BOLA/IDOR и обеспечивает строгую изоляцию мульти-тенанта. Поддержание дисциплины CI/CD и постоянный мониторинг выявленных потенциальных векторов атак обеспечит сохранность одобренной оценки в продакшене.
