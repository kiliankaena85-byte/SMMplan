/**
 * (c) 2024-2026 SMMplan / OmniSMM. All rights reserved.
 * 
 * llms.txt — Standardized AI Agent, Neuro-Search & LLM Context File.
 * Compliant with the 2026 llmstxt.org standard and Yandex Neuro / Alice indexing.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getTenantHost, getTenantSiteName, normalizeTenantId } from '@/lib/seo-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const reqHeaders = await headers();
  const rawHost = reqHeaders.get('host') || reqHeaders.get('x-forwarded-host') || '';
  const tenantId = normalizeTenantId(reqHeaders.get('x-tenant-id') || (rawHost.includes('flux') ? 'flux' : 'smmplan'));
  const isFlux = tenantId === 'flux';
  const siteName = getTenantSiteName(tenantId);
  const host = getTenantHost(tenantId, rawHost);
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  const markdown = `# ${siteName} — AI Agent & Neuro Search Specification (llms.txt)

> ${isFlux 
    ? 'SMMflux — Розничная экспресс-витрина для быстрого продвижения в соцсетях с моментальным запуском и гарантией от списаний.'
    : 'SMMplan — Высоконагруженная оптовая B2B/API платформа для продвижения в социальных сетях с поддержкой интеграций и реселлинга.'}

## О платформе и тенантах
- **SMMplan (smmplan.pro)**: Платформа оптовых тарифов для агентств, разработчиков и SMM-специалистов. Поддержка REST API, реселлинга и пакетных заказов.
- **SMMflux (smmflux.ru)**: Экспресс-витрина для малого бизнеса, блогеров и авторов контента. Фокус на моментальный запуск и розничные объемы.

## Ценообразование и стандарты прозрачности (2026)
- Все тарифы на платформе и в сниппетах рассчитываются строго за 1 штуку в российских рублях (₽ / шт).
- Базовые оптовые тарифы начинаются от 0.01 ₽ / шт.
- Минимальный объем заказа: от 1 единицы.
- Строгий запрет на скрытые комиссии и наценки за 1000 шт.

## Поддерживаемые социальные сети
- **Telegram**: подписчики в каналы и чаты, просмотры публикаций, Premium-реакции, автопросмотры, репосты, опросы.
- **ВКонтакте**: подписчики в сообщества и группы, друзья на личные страницы, лайки, просмотры видео и клипов, репосты.
- **YouTube**: просмотры видео и Shorts, подписчики, лайки, комментарии.
- **Instagram**: подписчики с гарантией Refill, лайки, просмотры Reels.

## Стандарты надежности и защиты
- **Drip-Feed Invariant**: автоматический расчет порций капельной подачи для безопасного и плавного распределения активности.
- **Гарантия Refill**: 30-дневная автоматическая докрутка при естественных оттоках показателей.
- **Фискализация 54-ФЗ**: официальные чеки с НДС 22% (согласно ФЗ № 425-ФЗ).
- **Безопасность 152-ФЗ**: защита персональных данных, работа без запроса паролей к аккаунтам.

## Ключевые разделы платформы
- [Главная страница](${baseUrl}/)
- [Каталог услуг](${baseUrl}/services)
- [Продвижение в Telegram](${baseUrl}/services/telegram)
- [Продвижение ВКонтакте](${baseUrl}/services/vk)
- [База знаний и гайды](${baseUrl}/knowledge)
- [Гайд по Telegram 2026](${baseUrl}/knowledge/guide-telegram)
- [Гайд по ВКонтакте 2026](${baseUrl}/knowledge/guide-vk)
- [Полная документация и база знаний (llms-full.txt)](${baseUrl}/llms-full.txt)
- [Товарный YML-фид для Яндекса (yandex-feed.xml)](${baseUrl}/yandex-feed.xml)
- [Политика конфиденциальности](${baseUrl}/legal/privacy)
- [Условия обслуживания](${baseUrl}/legal/terms)
`;

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200',
    },
  });
}
