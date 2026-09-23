# SPEC-2026-09-20: Стандартизация длины паролей (6–128 символов) и лимита промокодов (до 64 символов)

## 1. Контекст и цели
1. **Длина пароля регистрации**: переход со старого жесткого минимума (12 символов) на диапазон от 6 до 128 символов (6 <= length <= 128) для улучшения конверсии регистрации при сохранении защиты от простых паролей (WEAK_PASSWORDS) и атак повторения одного символа.
2. **Максимальная длина промокода**: ограничение до 64 символов (length <= 64) во всех контурах (валидация перед БД, Zod-схемы, чекаут, админка, инпуты витрины) для защиты базы данных от перегрузки строковыми пейлоадами и ReDoS.

## 2. Архитектурные требования
### 2.1. Пароли (Auth Boundary)
- src/validators/password-policy.ts:
  - min(6, 'Пароль должен быть не менее 6 символов')
  - max(128, 'Пароль не должен превышать 128 символов')
  - Добавление популярных коротких паролей ('123456', 'qwerty', 'password') в WEAK_PASSWORDS.
- src/lib/validators/auth-schemas.ts:
  - passwordLoginSchema: max(128) для поддержки длинных паролей.
  - passwordRegisterSchema: валидация через passwordPolicySchema.
- src/app/(auth)/login/login-form.tsx:
  - minLength={6}, maxLength={128}.
  - Плейсхолдер: Создайте пароль (мин. 6 символов).
  - Валидация перед отправкой: проверка length < 6 и length > 128.
- src/actions/auth/password-settings.ts:
  - setPasswordSchema и changePasswordSchema: min(6).max(128).

### 2.2. Промокоды (Promocode & Database DoS Prevention)
- src/services/marketing.service.ts:
  - calculatePrice: clean.length <= 64 (ранее 32).
- src/services/promo/promo-validator.service.ts:
  - cleanCode.length > 64 (ранее 32).
- src/actions/order/checkout.ts:
  - calculatePriceAction: cleanPromo.length > 64.
  - checkoutSchema: promoCodeStr: z.string().trim().max(64, ...)
- src/actions/user/promo.ts:
  - ctivatePromoCodeAction: отсечка cleanCode.length > 64 до транзакции БД.
- src/actions/admin/marketing.ts:
  - promoCodeSchema: code: z.string().min(1).max(64)...
- src/app/admin/marketing/create-promo-form.tsx:
  - maxLength={64}, лейбл Код (до 64 символов).
- UI компоненты ввода промокода (PlanCheckoutPromo.tsx, MobileCheckoutPromo.tsx, DrawerFormInputs.tsx, dd-funds/client-page.tsx):
  - Атрибут maxLength={64} на всех полях ввода.

## 3. План верификации
- src/__tests__/unit/password-and-promocode-length-limits.test.ts (Vitest unit tests)
- 
px tsc --noEmit (0 ошибок компиляции)
- 
pm run build (standalone сборка)
- Проверка на Stage-контуре (:3005)
