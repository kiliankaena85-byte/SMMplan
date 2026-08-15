import { ProxyAgent } from 'undici';

// Приоритетный каскад моделей на случай недоступности или смены версий Google API
const FALLBACK_MODEL_CASCADES = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

interface CachedModelRegistry {
  resolvedModel: string;
  cachedAt: number;
}

let modelCache: CachedModelRegistry | null = null;
const MODEL_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 часов

// Кэш временных блокировок ключей (при 429 Too Many Requests или 403)
const keyCooldownMap = new Map<string, number>();
const KEY_COOLDOWN_MS = 5 * 60 * 1000; // 5 минут отлежки при исчерпании квоты

let keyRotationIndex = 0;

export interface GeminiCallPayload {
  systemInstruction?: string;
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  jsonMode?: boolean;
  temperature?: number;
  timeoutMs?: number;
}

export class GeminiClient {
  /**
   * Получает Dispatcher для работы через Прокси (например, Clash Verge: http://127.0.0.1:7890)
   */
  static getDispatcher(): ProxyAgent | undefined {
    const proxyUrl =
      process.env.GEMINI_PROXY ||
      process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY ||
      process.env.ALL_PROXY;

    if (!proxyUrl) return undefined;
    return new ProxyAgent(proxyUrl.trim());
  }

  static getBaseUrl(): string {
    return (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
  }

  /**
   * Извлекает список доступных API-ключей из GEMINI_API_KEYS (через запятую) или GEMINI_API_KEY.
   */
  static getAvailableApiKeys(): string[] {
    const raw = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
    const keys = raw
      .split(/[,\n]/)
      .map((k) => k.trim())
      .filter((k) => k.length > 5);

    return keys;
  }

  /**
   * Возвращает пул активных ключей, отсеивая те, что находятся на кулдауне (429/403).
   */
  static getActiveKeyPool(): string[] {
    const allKeys = this.getAvailableApiKeys();
    if (allKeys.length === 0) return [];

    const now = Date.now();
    // Очищаем истекшие кулдауны
    for (const [key, expiresAt] of keyCooldownMap.entries()) {
      if (now >= expiresAt) {
        keyCooldownMap.delete(key);
      }
    }

    const available = allKeys.filter((k) => !keyCooldownMap.has(k));
    // Если все ключи на кулдауне, принудительно возвращаем все, чтобы попробовать снова
    return available.length > 0 ? available : allKeys;
  }

  /**
   * Помечает ключ как временно недоступный (например, исчерпан лимит запросов / 429).
   */
  static markKeyCooldown(key: string, reason: string) {
    const expiresAt = Date.now() + KEY_COOLDOWN_MS;
    keyCooldownMap.set(key, expiresAt);
    console.warn(`[GeminiClient] Key ...${key.slice(-6)} placed on cooldown for 5m. Reason: ${reason}`);
  }

  /**
   * Динамически определяет самую свежую рабочую Flash-модель из официального Google API.
   * Кэширует результат на 12 часов, чтобы не делать лишних запросов.
   */
  static async resolveLatestModel(apiKey: string): Promise<string> {
    if (process.env.GEMINI_MODEL) {
      return process.env.GEMINI_MODEL.trim();
    }

    const now = Date.now();
    if (modelCache && now - modelCache.cachedAt < MODEL_CACHE_TTL_MS) {
      return modelCache.resolvedModel;
    }

    try {
      const baseUrl = this.getBaseUrl();
      const res = await fetch(`${baseUrl}/v1beta/models?key=${apiKey}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        dispatcher: this.getDispatcher(),
        signal: AbortSignal.timeout(5000),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      if (res.ok) {
        const data = await res.json();
        const models = (data?.models || []) as Array<{
          name: string;
          supportedGenerationMethods?: string[];
        }>;

        const flashModels = models
          .filter(
            (m) =>
              m.supportedGenerationMethods?.includes('generateContent') &&
              m.name.includes('flash') &&
              !m.name.includes('vision') &&
              !m.name.includes('8b')
          )
          .map((m) => m.name.replace(/^models\//, ''));

        if (flashModels.length > 0) {
          flashModels.sort((a, b) => {
            const getVer = (str: string) => {
              const match = str.match(/gemini-(\d+(?:\.\d+)?)/);
              return match ? parseFloat(match[1]) : 0;
            };
            return getVer(b) - getVer(a);
          });

          const highestModel = flashModels[0];
          modelCache = { resolvedModel: highestModel, cachedAt: now };
          return highestModel;
        }
      }
    } catch (e) {
      console.warn('[GeminiClient] Auto-discovery of models failed, falling back to static cascade:', e);
    }

    modelCache = { resolvedModel: FALLBACK_MODEL_CASCADES[0], cachedAt: now };
    return FALLBACK_MODEL_CASCADES[0];
  }

  /**
   * Выполняет запрос к Gemini с ротацией ключей, поддержкой прокси и каскадным перебором моделей.
   */
  static async generateContent(payload: GeminiCallPayload): Promise<string> {
    const activeKeys = this.getActiveKeyPool();
    if (activeKeys.length === 0) {
      throw new Error('GEMINI_API_KEY / GEMINI_API_KEYS is not configured');
    }

    // Выбираем ключ с учетом Round-Robin ротации
    const startIndex = keyRotationIndex % activeKeys.length;
    keyRotationIndex = (keyRotationIndex + 1) % 100000;

    // Упорядочиваем ключи начиная с выбранного
    const keysToTry = [
      ...activeKeys.slice(startIndex),
      ...activeKeys.slice(0, startIndex),
    ];

    let lastError: Error | null = null;

    // Перебираем доступные ключи
    for (const apiKey of keysToTry) {
      const primaryModel = await this.resolveLatestModel(apiKey);
      const candidateModels = Array.from(
        new Set([primaryModel, ...FALLBACK_MODEL_CASCADES])
      );

      // Перебираем модели для текущего ключа
      for (const model of candidateModels) {
        try {
          const baseUrl = this.getBaseUrl();
          const url = `${baseUrl}/v1beta/models/${model}:generateContent`;

          const body: Record<string, unknown> = {
            contents: payload.contents,
          };

          if (payload.systemInstruction) {
            body.system_instruction = {
              parts: [{ text: payload.systemInstruction }],
            };
          }

          if (payload.jsonMode || payload.temperature !== undefined) {
            body.generationConfig = {
              ...(payload.jsonMode ? { response_mime_type: 'application/json' } : {}),
              ...(payload.temperature !== undefined ? { temperature: payload.temperature } : {}),
            };
          }

          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify(body),
            dispatcher: this.getDispatcher(),
            signal: AbortSignal.timeout(payload.timeoutMs || 25000),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any);

          // Обработка исчерпания квоты / Rate limit (429) или невалидного ключа (403)
          if (res.status === 429 || res.status === 403) {
            const errText = await res.text();
            this.markKeyCooldown(apiKey, `HTTP ${res.status}: ${errText.slice(0, 100)}`);
            // Прерываем перебор моделей для этого ключа и переходим к следующему ключу!
            break;
          }

          // Если модель устарела (404/400), пробуем следующую модель из каскада
          if (res.status === 404 || res.status === 400) {
            console.warn(`[GeminiClient] Model ${model} returned HTTP ${res.status}. Trying next model in cascade...`);
            modelCache = null;
            continue;
          }

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini API HTTP ${res.status}: ${errText}`);
          }

          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (text) {
            modelCache = { resolvedModel: model, cachedAt: Date.now() };
            return text;
          }
        } catch (e: unknown) {
          lastError = e instanceof Error ? e : new Error(String(e));
          console.warn(`[GeminiClient] Key ...${apiKey.slice(-6)} / Model ${model} failed:`, lastError.message);
        }
      }
    }

    throw lastError || new Error('All Gemini API keys and models exhausted');
  }
}
