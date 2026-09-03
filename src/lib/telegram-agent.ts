import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { ProxyAgent } from 'undici';

let cachedDbProxyUrl: string | null = null;
let lastDbProxyCheck = 0;
const DB_PROXY_CACHE_TTL = 30_000; // 30 seconds

/**
 * Resolves the configured Telegram Proxy URL from environment variables.
 * Supports: TELEGRAM_PROXY_URL, HTTPS_PROXY, HTTP_PROXY, ALL_PROXY.
 */
export function getTelegramProxyUrl(): string | undefined {
  return (
    process.env.TELEGRAM_PROXY_URL ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.ALL_PROXY ||
    cachedDbProxyUrl ||
    undefined
  );
}

/**
 * Resolves active proxy from Database (SystemSettings + TelegramProxy) if not set in ENV.
 */
export async function resolveActiveTelegramProxyUrl(tenantId = 'smmplan'): Promise<string | undefined> {
  const envUrl = process.env.TELEGRAM_PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY;
  if (envUrl) return envUrl;

  const now = Date.now();
  if (cachedDbProxyUrl !== null && now - lastDbProxyCheck < DB_PROXY_CACHE_TTL) {
    return cachedDbProxyUrl || undefined;
  }

  try {
    const { db } = await import('@/lib/db');
    const settings = await db.systemSettings.findFirst({
      where: { id: tenantId },
      select: { telegramProxyId: true },
    });

    if (settings?.telegramProxyId) {
      const proxy = await db.telegramProxy.findUnique({
        where: { id: settings.telegramProxyId },
      });

      if (proxy && proxy.isActive && proxy.host && proxy.port) {
        let auth = '';
        if (proxy.username) {
          let password = '';
          if (proxy.passwordEncrypted) {
            try {
              const { VaultService } = await import('@/lib/vault');
              password = VaultService.decrypt(proxy.passwordEncrypted);
            } catch {
              password = proxy.passwordEncrypted;
            }
          }
          auth = `${encodeURIComponent(proxy.username)}:${encodeURIComponent(password)}@`;
        }
        const protocol = (proxy.protocol || 'socks5').toLowerCase() === 'socks5' ? 'socks5h' : (proxy.protocol || 'http').toLowerCase();
        cachedDbProxyUrl = `${protocol}://${auth}${proxy.host}:${proxy.port}`;
        lastDbProxyCheck = now;
        return cachedDbProxyUrl;
      }
    }

    // 2. Fallback to healthy proxy from general providerProxy pool
    const providerProxy = await db.providerProxy.findFirst({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: [
        { lastTestLatencyMs: 'asc' },
        { errorCount: 'asc' },
      ],
    });

    if (providerProxy && providerProxy.host && providerProxy.port) {
      const protocol = (providerProxy.protocol || 'socks5').toLowerCase() === 'socks5' ? 'socks5h' : (providerProxy.protocol || 'http').toLowerCase();
      let auth = '';
      if (providerProxy.username) {
        let password = '';
        if (providerProxy.passwordEncrypted) {
          try {
            const { VaultService } = await import('@/lib/vault');
            password = VaultService.decrypt(providerProxy.passwordEncrypted);
          } catch {
            password = providerProxy.passwordEncrypted;
          }
        }
        auth = `${encodeURIComponent(providerProxy.username)}:${encodeURIComponent(password)}@`;
      }
      cachedDbProxyUrl = `${protocol}://${auth}${providerProxy.host}:${providerProxy.port}`;
      lastDbProxyCheck = now;
      console.info(`[TelegramAgent] 🛡️ Auto-routed Telegram bot through healthy pool proxy: ${providerProxy.label || providerProxy.host}`);
      return cachedDbProxyUrl;
    }

    cachedDbProxyUrl = '';
    lastDbProxyCheck = now;
    return undefined;
  } catch (err) {
    console.warn('[TelegramAgent] Could not resolve proxy from database:', err);
    return undefined;
  }
}

/**
 * Returns an HTTP/SOCKS agent for Telegraf bot instance.
 */
export function getTelegramProxyAgent(proxyUrlOverride?: string): HttpsProxyAgent<string> | SocksProxyAgent | undefined {
  const rawUrl = proxyUrlOverride || getTelegramProxyUrl();
  if (!rawUrl) return undefined;

  // Enforce socks5h:// for remote DNS resolution (prevent domestic DNS blocking)
  const proxyUrl = rawUrl.startsWith('socks5://') ? rawUrl.replace('socks5://', 'socks5h://') : rawUrl;

  try {
    if (proxyUrl.startsWith('socks')) {
      return new SocksProxyAgent(proxyUrl);
    }
    return new HttpsProxyAgent(proxyUrl);
  } catch (err) {
    console.error('[TelegramAgent] Failed to create proxy agent for Telegraf:', err);
    return undefined;
  }
}

/**
 * Returns a ProxyAgent dispatcher for native fetch / undici HTTP calls (alerts, webhooks, diagnostics).
 */
export function getTelegramDispatcher(proxyUrlOverride?: string): ProxyAgent | undefined {
  const proxyUrl = proxyUrlOverride || getTelegramProxyUrl();
  if (!proxyUrl) return undefined;

  try {
    return new ProxyAgent(proxyUrl);
  } catch (err) {
    console.error('[TelegramAgent] Failed to create undici ProxyAgent dispatcher:', err);
    return undefined;
  }
}
