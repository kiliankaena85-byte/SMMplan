import { headers } from 'next/headers';

/**
 * Извлекает IP-адрес клиента из HTTP-заголовков.
 * Приоритет: x-real-ip (доверенный, перезаписанный Nginx / DDoS-Guard) > x-forwarded-for > fallback.
 *
 * ARCHITECTURE CONTRACT: Единственный источник правды для IP.
 * Не дублируйте эту логику — используйте этот вызов.
 *
 * SECURITY: cf-connecting-ip НЕ используется — проект размещён в РФ
 * без Cloudflare. Этот заголовок может быть подделан злоумышленником
 * при прямом обращении к серверу в обход CDN.
 */
export async function getClientIp(fallback: string = '127.0.0.1'): Promise<string> {
  const reqHeaders = await headers();
  return (
    reqHeaders.get('x-real-ip') ||
    reqHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    fallback
  );
}
