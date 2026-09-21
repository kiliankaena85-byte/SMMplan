/**
 * (c) 2024-2026 SMMplan / OmniSMM. All rights reserved.
 * 
 * llms-full.txt — Complete AI Knowledge Base, Taxonomy & API Specification.
 * Compliant with the 2026 llmstxt.org standard for deep RAG ingestion
 * across Yandex Neuro, Alice, Perplexity, GPT, and Claude.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getTenantHost, getTenantSiteName, normalizeTenantId } from '@/lib/seo-helpers';
import { pillarPages, clusterArticles, glossaryTerms } from '@/data/seo';

export const dynamic = 'force-dynamic';

function htmlToPlainText(html: string): string {
  return html
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n### $1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function GET() {
  const reqHeaders = await headers();
  const rawHost = reqHeaders.get('host') || reqHeaders.get('x-forwarded-host') || '';
  const tenantId = normalizeTenantId(reqHeaders.get('x-tenant-id') || (rawHost.includes('flux') ? 'flux' : 'smmplan'));
  const isFlux = tenantId === 'flux';
  const siteName = getTenantSiteName(tenantId);
  const host = getTenantHost(tenantId, rawHost);
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  let markdown = `# ${siteName} — Complete AI Knowledge Base & API Specification (llms-full.txt)

> ${isFlux 
    ? 'SMMflux — Экспресс-витрина розничного продвижения с моментальным запуском, гарантией Refill 30 дней и прозрачными тарифами от 1 штуки.'
    : 'SMMplan — Высоконагруженная B2B/API платформа для оптового продвижения в социальных сетях, реселлинга и программных интеграций.'}

## 1. Архитектура Платформы и Бренды
- **Движок**: OmniSMM 1.0 (Next.js 16 App Router, React 19, Tailwind CSS 4, Prisma 5, PostgreSQL, Redis BullMQ).
- **SMMplan (smmplan.pro)**: Флагманская платформа для агентств, вебмастеров и реселлеров. REST API v2, оптовые тарифы, вебхуки статусов заказов.
- **SMMflux (smmflux.ru)**: Розничная экспресс-витрина Radiant Aurora для бизнеса, экспертов и блогеров. Моментальный старт, оплата в 1 клик, защита от списаний.

## 2. Финансовые Стандарты и Ценообразование (2026)
- **Ценообразование**: Все тарифы платформы рассчитываются и отображаются строго за 1 штуку в российских рублях (₽ / шт).
- **Базовая ставка**: от 0.01 ₽ за единицу услуги.
- **Drip-Feed Invariant**: При оформлении капельного заказа (N запусков) объем на один запуск floor(Q / N) не может быть меньше минимального объема услуги (minQty). Общий объем заказа строго >= minQty * N.
- **Фискализация 54-ФЗ**: Официальные онлайн-чеки через ЮKassa и Robokassa. Базовая ставка НДС 22% (согласно ст. 164 НК РФ и 425-ФЗ).
- **Защита персональных данных 152-ФЗ**: Полная конфиденциальность. Никаких паролей, кодов подтверждения или токенов доступа к аккаунтам заказчика не требуется.
- **Гарантия Refill 30 дней**: Автоматическое восстановление показателей при естественных оттоках алгоритмов социальных сетей.

## 3. Каталог Услуг и Поддерживаемые Социальные Сети
### Telegram
- Подписчики в открытые и закрытые каналы (РФ, СНГ, гео-таргетинг).
- Просмотры постов и историй (Story).
- Автопросмотры на будущие публикации.
- Реакции (позитивные, премиум-эмодзи, смешанные).
- Голоса в опросах и викторинах.
- Бусты (Boosts) для открытия историй в каналах.

### ВКонтакте
- Подписчики в группы, паблики и сообщества.
- Друзья и подписчики на личные страницы.
- Лайки на посты, фото и клипы.
- Просмотры видеозаписей и VK Клипов с удержанием.
- Репосты записей в личные профили и сообщества.

### YouTube
- Просмотры видео и Shorts с гарантированным удержанием.
- Подписчики на канал с плавной доставкой.
- Лайки и комментарии от живой аудитории.

### Instagram
- Подписчики с автоматической гарантией восстановления (30 дней Refill).
- Лайки на публикации и Reels.
- Просмотры Reels, историй и видео.

## 4. База Знаний: Экспертные Гайды и Пиллары (2026)
`;

  // Inject full pillar guides
  for (const pillar of pillarPages) {
    markdown += `\n### Гайд: ${pillar.title}\n`;
    markdown += `**Канонический URL**: ${baseUrl}/knowledge/${pillar.slug}\n`;
    markdown += `**Время чтения**: ${pillar.readTimeMinutes} мин | **Категория**: ${pillar.category}\n\n`;
    markdown += `> ${pillar.excerpt}\n\n`;
    markdown += `${htmlToPlainText(pillar.contentHtml)}\n\n`;

    if (pillar.faq && pillar.faq.length > 0) {
      markdown += `#### Вопросы и Ответы (FAQ):\n`;
      for (const f of pillar.faq) {
        markdown += `- **В**: ${f.question}\n  **О**: ${f.answer}\n`;
      }
      markdown += `\n`;
    }
  }

  markdown += `\n## 5. Практические Кластерные Инструкции\n`;
  for (const cluster of clusterArticles) {
    markdown += `\n### ${cluster.title}\n`;
    markdown += `**URL**: ${baseUrl}/knowledge/${cluster.slug} | **Родительский раздел**: [${cluster.parentPillar}](${baseUrl}/knowledge/${cluster.parentPillar})\n`;
    markdown += `> ${cluster.excerpt}\n\n`;
    markdown += `${htmlToPlainText(cluster.contentHtml)}\n\n`;

    if (cluster.faq && cluster.faq.length > 0) {
      markdown += `**FAQ**:\n`;
      for (const f of cluster.faq) {
        markdown += `- **${f.question}**: ${f.answer}\n`;
      }
      markdown += `\n`;
    }
  }

  markdown += `\n## 6. Терминологический Глоссарий SMM\n`;
  for (const term of glossaryTerms) {
    markdown += `- **${term.term}** (${baseUrl}/knowledge/${term.slug}): ${term.definition}\n`;
  }

  markdown += `\n## 7. REST API v2 Спецификация для Разработчиков
- **Базовый URL**: \`${baseUrl}/api/v2\`
- **Авторизация**: Заголовок \`Authorization: Bearer <API_KEY>\`
- **Формат данных**: JSON UTF-8
- **Ключевые эндпоинты**:
  - \`POST /api/v2/order\`: Создание заказа (\`serviceId\`, \`link\`, \`quantity\`, опционально \`runs\`, \`interval\`).
  - \`GET /api/v2/status?id=<ORDER_ID>\`: Проверка статуса выполнения заказа.
  - \`GET /api/v2/services\`: Получение актуального прайс-листа и остатков лимитов.
  - \`GET /api/v2/balance\`: Запрос текущего баланса лицевого счета.
- **Идемпотентность**: Поддержка заголовка \`Idempotency-Key: <UUID>\` для защиты от повторных списаний.

## 8. Официальные Контакты и Ссылки
- Главная страница: ${baseUrl}/
- Каталог: ${baseUrl}/services
- База знаний: ${baseUrl}/knowledge
- Краткая спецификация: ${baseUrl}/llms.txt
- Товарный YML-фид: ${baseUrl}/yandex-feed.xml
- Политика конфиденциальности: ${baseUrl}/legal/privacy
- Условия предоставления услуг: ${baseUrl}/legal/terms
`;

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}
