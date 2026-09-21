# SPEC-2026-09-21: Silo-перелинковка каталога и услуг под требования Яндекс 2026 (YATI, Проксима) — Вектор №2

## 1. Контекст и цели
Поисковые алгоритмы Яндекса (YATI — Yandex Transformer Index и метрика коммерческого качества «Проксима») отдают приоритет сайтам с глубокой смысловой кластеризацией (Topical Silo Architecture) и высокой коммерческой полезностью.
В сфере SMM изолированный заказ одной услуги (например, только подписчиков) без сопутствующих активностей (просмотров на посты и реакций) выглядит неестественно для алгоритмов соцсетей и снижает конверсию пользователя.

**Цель:** Реализовать динамическую Silo-перелинковку:
1. Блок «С этой услугой также заказывают» / сопутствующие услуги на детальных страницах услуг (`/services/[network]/[category]/[serviceSlug]`).
2. Семантическую перелинковку смежных категорий и услуг в каталоге (`LandingSeoHub`, `/services/[network]/[category]`, `/services/[network]`, `/services`).
3. Поддержку обоих брендов (SMMplan и SMMflux) с абсолютными каноническими ссылками и строгой изоляцией брендов (Anti-Mimicry).

---

## 2. Ключевые инварианты (Hard Invariants)

### 2.1. Мульти-тенантность и абсолютные канонические ссылки (Anti-Mimicry Invariant)
- Для тенанта `smmplan`: канонические ссылки формируются на `https://smmplan.pro` (или тестовый хост `test.smmplan.pro` в стейджинге), имя бренда — «SMMplan».
- Для тенанта `flux`: канонические ссылки формируются на `https://smmflux.ru` (или `flux.smmplan.pro` в стейджинге), имя бренда — «SMMflux».
- Категорически запрещено смешивать бренды или ссылки (Anti-Mimicry Invariant).

### 2.2. Единая политика цен («₽ / шт»)
- Все отображаемые цены услуг строго указываются за 1 единицу в рублях (`pricePerUnitRub`, подпись: «₽ / шт»).
- Категорически запрещено указывать цены «/ 1000 шт» или умножать цену на 1000 в пользовательском интерфейсе.

### 2.3. Чистая архитектура (Clean Architecture & CRAP Limits)
- **Уровень 0 (Domain)**: `src/types/silo.ts` — чистые TypeScript типы и интерфейсы.
- **Уровень 1 (Services)**: `src/services/seo/silo-linking.service.ts` — чистый сервис бизнес-логики сопоставления связей Silo, инференса типов активности, выборки смежных тарифов и кэширования.
- **Уровень 3 (Presentation)**: `src/components/seo/SiloCrossLinking.tsx` — переиспользуемый UI-компонент карточек рекомендаций.
- 0 нарушений слоёв и 0 циклических зависимостей (`npm run check:arch`).

### 2.4. Доступность и UX (WCAG 2.2 AA)
- Минимальный размер кликабельной области (touch target) >= 44x44px.
- Поддержка темной и светлой темы через токены CSS Tailwind 4.
- Читаемый бейдж `#ID` с копированием номера услуги (`ServiceIdBadge`).

---

## 3. Семантическая матрица связей (Silo Activity Matrix)

| Тип текущей услуги (`activityType`) | Приоритетные сопутствующие типы (`complementary`) | Поисковый интент Яндекса (YATI / Проксима) |
| --- | --- | --- |
| **FOLLOWERS** (Подписчики, фолловеры, участники) | `VIEWS`, `LIKES`, `BOOSTS`, `COMMENTS` | Разбавление базы подписчиков охватами и реакциями для органического ранжирования в соцсети |
| **VIEWS** (Просмотры, автопросмотры, охваты) | `LIKES`, `REPOSTS`, `COMMENTS`, `FOLLOWERS` | Формирование естественного соотношения ER (Engagement Rate) для вывода постов в рекомендации |
| **LIKES** (Лайки, реакции, классы, сердечки) | `VIEWS`, `COMMENTS`, `REPOSTS`, `FOLLOWERS` | Лайки не могут существовать без просмотров; связка повышает доверие алгоритмов |
| **COMMENTS** (Комментарии, отзывы) | `LIKES`, `VIEWS`, `FOLLOWERS` | Активная дискуссия подкрепляется лайками на комментарии и общим охватом публикации |
| **REPOSTS** (Репосты, рассылки, пересылки) | `VIEWS`, `LIKES`, `FOLLOWERS` | Усиление вирального эффекта комплексным охватом |
| **BOOSTS** (Бусты каналов, голоса для историй) | `FOLLOWERS`, `VIEWS`, `LIKES` | Публикация историй требует живой аудитории и просмотров |
| **VOTES** (Голосования, опросы) | `VIEWS`, `FOLLOWERS`, `LIKES` | Опрос в канале сопровождается просмотром поста |

---

## 4. Спецификация типов (`src/types/silo.ts`)

```typescript
export type SiloActivityType =
  | 'FOLLOWERS'
  | 'LIKES'
  | 'VIEWS'
  | 'REPOSTS'
  | 'COMMENTS'
  | 'VOTES'
  | 'BOOSTS'
  | 'OTHER';

export interface SiloCategoryLink {
  id: string;
  name: string;
  slug: string;
  networkSlug: string;
  networkName: string;
  activityType: SiloActivityType;
  canonicalUrl: string;
  minPricePerUnitRub?: number;
  servicesCount?: number;
}

export interface SiloServiceLink {
  id: string;
  numericId: number;
  name: string;
  slug: string | null;
  networkSlug: string;
  networkName: string;
  categorySlug: string;
  categoryName: string;
  activityType: SiloActivityType;
  pricePerUnitRub: number;
  minQty: number;
  maxQty: number;
  canonicalUrl: string;
  speedClass?: string | null;
  hasRefill?: boolean;
}

export interface SiloRecommendationBundle {
  targetActivityType: SiloActivityType;
  headline: string;
  subheadline: string;
  complementaryCategories: SiloCategoryLink[];
  complementaryServices: SiloServiceLink[];
  tenantId: string;
  siteName: string;
}
```

---

## 5. Премортем-анализ рисков

| Сценарий отказа | Вероятность × Влияние | Защитный механизм в коде |
| --- | --- | --- |
| Услуга или категория находится в карантине / кулдауне | Средняя × Высокая | Строгая фильтрация `isActive: true, isQuarantined: false, cooldownUntil <= now()` |
| В соцсети нет категорий с точным типом активности | Низкая × Средняя | Fallback на любые активные категории текущей сети, отсортированные по популярности |
| Некорректный хост в канонической ссылке (смешивание SMMplan и SMMflux) | Низкая × Критическая | Централизованный вызов `absoluteCanonical(tenantId, path)` с проверкой белого списка доменов |
| Цена услуги равна 0 или отрицательная | Низкая × Критическая | Quality Gate: отсечка `pricePerUnitRub > 0`, применение `applyBeautifulRounding` |
| Циклическая зависимость между Services и Application | Средняя × Высокая | Четкое разделение: `src/services/seo/silo-linking.service.ts` не импортирует `src/actions/` |

---

## 6. План TDD верификации
1. Написание падающих тестов `src/__tests__/seo/silo-internal-linking.test.ts` (Red Phase).
2. Реализация чистых типов и сервиса сопоставления связей (Green Phase).
3. Создание UI-компонента `src/components/seo/SiloCrossLinking.tsx`.
4. Интеграция в страницы каталога и услуг (`[serviceSlug]/page.tsx`, `[category]/page.tsx`, `LandingSeoHub.tsx`).
5. Прогон тестов Vitest (`npx dotenv -e .env.test -- vitest run src/__tests__/seo/`).
6. Контроль типов `npx tsc --noEmit` (0 ошибок).
7. Контроль архитектуры `npm run check:arch` (0 нарушений, 0 циклов).
8. Контроль секретов `node scripts/check-bundle-secrets.mjs` (0 утечек).
