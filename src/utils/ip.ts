import { headers } from 'next/headers';

/**
 * Извлекает IP-адрес клиента из HTTP-заголовков.
 * Приоритет: x-real-ip (доверенный, от Nginx) > x-forwarded-for > fallback.
 * 
 * ARCHITECTURE CONTRACT: Единственный источник правды для IP.
 * Не дублируйте эту логику — используйте этот вызов.
 */
export async function getClientIp(fallback: string = '127.0.0.1'): Promise<string> {
  const reqHeaders = await headers();
  return (
    reqHeaders.get('x-real-ip') ||
    reqHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    fallback
  );
}
