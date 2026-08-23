import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';
import { isIP } from 'net';

function isValidIp(ip: string): boolean {
  if (!ip) return false;
  const trimmed = ip.trim();
  if (isIP(trimmed) !== 0) return true;
  if (trimmed.startsWith('::ffff:')) {
    return isIP(trimmed.slice(7)) === 4;
  }
  return false;
}

function normalizeIp(ip: string): string {
  const trimmed = ip.trim();
  if (trimmed.startsWith('::ffff:') && isIP(trimmed.slice(7)) === 4) {
    return trimmed.slice(7);
  }
  return trimmed;
}

/**
 * Извлекает IP-адрес клиента из HTTP-заголовков.
 * Приоритет: x-real-ip (доверенный, перезаписанный Nginx / DDoS-Guard) > x-forwarded-for (правый хоп к доверенному прокси) > fallback.
 *
 * ARCHITECTURE CONTRACT: Единственный источник правды для IP.
 * Не дублируйте эту логику — используйте этот вызов.
 *
 * SECURITY: cf-connecting-ip НЕ используется — проект размещён в РФ
 * без Cloudflare. Этот заголовок может быть подделан злоумышленником
 * при прямом обращении к серверу в обход CDN для обхода Rate Limiting.
 */
export async function getClientIp(
  reqOrHeadersOrFallback?: Request | NextRequest | Headers | string | null,
  fallback: string = '0.0.0.0'
): Promise<string> {
  try {
    let reqHeaders: Headers | undefined;
    let effectiveFallback = fallback;

    if (typeof reqOrHeadersOrFallback === 'string') {
      effectiveFallback = reqOrHeadersOrFallback;
    } else if (reqOrHeadersOrFallback) {
      if (typeof (reqOrHeadersOrFallback as { get?: unknown }).get === 'function') {
        reqHeaders = reqOrHeadersOrFallback as Headers;
      } else if ('headers' in reqOrHeadersOrFallback && reqOrHeadersOrFallback.headers) {
        reqHeaders = reqOrHeadersOrFallback.headers;
      }
    }

    if (!reqHeaders) {
      reqHeaders = await headers();
    }

    const realIp = reqHeaders.get('x-real-ip');
    if (realIp && isValidIp(realIp)) {
      return normalizeIp(realIp);
    }

    const forwardedFor = reqHeaders.get('x-forwarded-for');
    if (forwardedFor) {
      const hops = forwardedFor.split(',').map(s => s.trim()).filter(s => isValidIp(s));
      if (hops.length > 0) {
        // Take rightmost valid hop (closest to trusted reverse proxy)
        return normalizeIp(hops[hops.length - 1]);
      }
    }
    return effectiveFallback;
  } catch {
    return typeof reqOrHeadersOrFallback === 'string' ? reqOrHeadersOrFallback : fallback;
  }
}
