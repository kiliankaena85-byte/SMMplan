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
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 часов

export interface GeminiCallPayload {
  systemInstruction?: string;
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  jsonMode?: boolean;
  temperature?: number;
  timeoutMs?: number;
}

export class GeminiClient {
  private static getDispatcher(): ProxyAgent | undefined {
    const proxyUrl = process.env.GEMINI_PROXY || process.env.HTTPS_PROXY;
    return proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
  }

  private static getBaseUrl(): string {
    return process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
  }

  /**
   * Динамически определяет самую свежую рабочую Flash-модель из официального Google API.
   * Кэширует результат на 12 часов, чтобы не делать лишних запросов.
   */
  static async resolveLatestModel(apiKey: string): Promise<string> {
    // 1. Ручной оверрайд из .env (если администратор явно зафиксировал модель)
    if (process.env.GEMINI_MODEL) {
      return process.env.GEMINI_MODEL;
    }

    // 2. Использование кэша
    const now = Date.now();
    if (modelCache && now - modelCache.cachedAt < CACHE_TTL_MS) {
      return modelCache.resolvedModel;
    }

    // 3. Авто-опрос списка моделей через GET /v1beta/models
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

        // Фильтруем Flash-модели с поддержкой generateContent
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
          // Сортируем по убыванию версии (3.7 > 3.6 > 2.5 > 2.0 > 1.5)
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

    // 4. Безопасный дефолт из каскада
    modelCache = { resolvedModel: FALLBACK_MODEL_CASCADES[0], cachedAt: now };
    return FALLBACK_MODEL_CASCADES[0];
  }

  /**
   * Выполняет запрос к Gemini с автоматическим самовосстановлением и каскадным перебором моделей.
   * Если выбранная модель возвращает 404 (устарела/удалена) или 400, запрос автоматически
   * повторяется на следующей стабильной модели из каскада.
   */
  static async generateContent(payload: GeminiCallPayload): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const primaryModel = await this.resolveLatestModel(apiKey);
    
    // Формируем список кандидатов: сначала primary, затем остальные из каскада без дубликатов
    const candidateModels = Array.from(
      new Set([primaryModel, ...FALLBACK_MODEL_CASCADES])
    );

    let lastError: Error | null = null;

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

        if (res.status === 404 || res.status === 400) {
          console.warn(`[GeminiClient] Model ${model} returned HTTP ${res.status}. Cascading to next model...`);
          // Сбрасываем кэш, так как модель оказалась невалидной
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
          // Успешно! Обновляем кэш на эту рабочую модель
          modelCache = { resolvedModel: model, cachedAt: Date.now() };
          return text;
        }
      } catch (e: unknown) {
        lastError = e instanceof Error ? e : new Error(String(e));
        console.warn(`[GeminiClient] Failed with model ${model}:`, lastError.message);
      }
    }

    throw lastError || new Error('All Gemini fallback models exhausted');
  }
}
