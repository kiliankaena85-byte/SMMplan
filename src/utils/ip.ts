import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

/**
 * Извлекает IP-адрес клиента из HTTP-заголовков.
 * Приоритет: x-real-ip (доверенный, перезаписанный Nginx / DDoS-Guard) > x-forwarded-for (первый хоп) > fallback.
 *
 * ARCHITECTURE CONTRACT: Единственный источник правды для IP.
 * Не дублируйте эту логику — используйте этот вызов.
 *
 * SECURITY: cf-connecting-ip НЕ используется — проект размещён в РФ
 * без Cloudflare. Этот заголовок может быть подделан злоумышленником
 * при прямом обращении к серверу в обход CDN для обхода Rate Limiting.
 */
export async function getClientIp(
  reqOrHeaders?: NextRequest | Headers | null,
  fallback: string = '127.0.0.1'
): Promise<string> {
  try {
    let reqHeaders: Headers;
    if (reqOrHeaders) {
      reqHeaders = 'headers' in reqOrHeaders ? reqOrHeaders.headers : reqOrHeaders;
    } else {
      reqHeaders = await headers();
    }
    const realIp = reqHeaders.get('x-real-ip');
    if (realIp) return realIp.trim();

    const forwardedFor = reqHeaders.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    return fallback;
  } catch {
    return fallback;
  }
}
