import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { ProxyAgent } from 'undici';

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
    undefined
  );
}

/**
 * Returns an HTTP/SOCKS agent for Telegraf bot instance.
 */
export function getTelegramProxyAgent(): HttpsProxyAgent<string> | SocksProxyAgent | undefined {
  const proxyUrl = getTelegramProxyUrl();
  if (!proxyUrl) return undefined;

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
export function getTelegramDispatcher(): ProxyAgent | undefined {
  const proxyUrl = getTelegramProxyUrl();
  if (!proxyUrl) return undefined;

  try {
    return new ProxyAgent(proxyUrl);
  } catch (err) {
    console.error('[TelegramAgent] Failed to create undici ProxyAgent dispatcher:', err);
    return undefined;
  }
}
