import dns from 'dns/promises';
import { URL } from 'url';

export const SHORT_LINK_HOSTS = new Set([
  'bit.ly',
  'youtu.be',
  'vm.tiktok.com',
  't.co',
  'cutt.ly',
  'clck.ru',
  'tinyurl.com',
  'is.gd',
]);

export function isPublicIp(ip: string): boolean {
  // IPv4 Private & Loopback & Special ranges
  if (
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('169.254.') ||
    ip.startsWith('192.168.') ||
    ip === '0.0.0.0'
  ) {
    return false;
  }

  if (ip.startsWith('172.')) {
    const parts = ip.split('.');
    if (parts.length >= 2) {
      const secondOctet = parseInt(parts[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) {
        return false;
      }
    }
  }

  // IPv6 Loopback, Unique Local, Link-Local
  const normalizedIp = ip.toLowerCase();
  if (
    normalizedIp === '::1' ||
    normalizedIp === '::' ||
    normalizedIp.startsWith('fc00:') ||
    normalizedIp.startsWith('fd00:') ||
    normalizedIp.startsWith('fe80:')
  ) {
    return false;
  }

  return true;
}

export async function isPublicHost(hostname: string): Promise<boolean> {
  const cleanHost = hostname.toLowerCase().trim();

  if (cleanHost === 'localhost' || cleanHost.endsWith('.local') || cleanHost.endsWith('.internal')) {
    return false;
  }

  try {
    const records = await dns.lookup(cleanHost, { all: true });
    if (!records || records.length === 0) return false;

    for (const record of records) {
      if (!isPublicIp(record.address)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function resolveShortLink(rawUrl: string): Promise<string> {
  let currentUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
  const maxHops = 5;

  for (let hop = 0; hop < maxHops; hop++) {
    try {
      const parsed = new URL(currentUrl);
      const isAllowedHost = await isPublicHost(parsed.hostname);
      if (!isAllowedHost) {
        return currentUrl;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        const nextUrl = new URL(location, currentUrl).toString();
        currentUrl = nextUrl;
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  return currentUrl;
}
