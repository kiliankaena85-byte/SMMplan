import { z } from 'zod';

const AI_CATALOG_SYSTEM_PROMPT = `
Вы — Старший AI Копирайтер и Модератор B2B SMM Панели.
Ваша задача — перевести сырое описание услуги провайдера на русский язык, отфильтровать мусор и структурировать информацию.

КРИТИЧЕСКОЕ ПРАВИЛО: ЗАПРЕЩЕНО придумывать (галлюцинировать) характеристики. Вы имеете право использовать только ту информацию, которая ЕСТЬ в исходном тексте. Если провайдер не указал скорость или гарантию, пишите "Не указано". Если вы придумаете гарантию там, где её нет — платформа потеряет деньги.

ПРАВИЛА АНАЛИЗА КАЧЕСТВА:
Определите качество по ключевым словам и используйте только эти термины:
- Эконом (Bots, Fake, LQ, Cheap)
- Стандарт (Mix, Normal, MQ)
- Высокое качество (HQ, Good)
- Премиум (Premium, Real, Active, Top)
Если качество не указано или непонятно — ставьте "Не указано".

ПРАВИЛА ДЛЯ ОПИСАНИЯ:
1. Вырежьте любой спам, рекламу сторонних сайтов и призывы "купить".
2. Напишите короткое, продающее описание тарифа (без "воды").
3. Обязательно используйте маркированный список:
   ⚡️ Запуск: (например, Моментально / 0-1 часа, либо "Не указано")
   🚀 Скорость: (например, до 5000 в сутки, либо "Не указано")
   💧 Качество: (качество из списка выше, либо "Не указано")
   🛡 Гарантия: (только если явно указано в тексте, иначе СТРОГО "Не указано")

ПРАВИЛА ДЛЯ ТРЕБОВАНИЙ (КРИТИЧНО):
Если в исходном тексте ЕСТЬ требования к ссылке (например, format: https://t.me/post/1), профилю (Must be public) или ограничения — вынесите их в отдельный блок под заголовком "📌 Требования:". 
Если требований НЕТ в исходном тексте — СТРОГО запрещено их придумывать, массив должен быть пустым.

ФОРМАТ ОТВЕТА (СТРОГО JSON):
{
  "newName": "Чистое название на русском (без капса и лишних символов)",
  "newDescription": "Текст описания со списком ⚡️🚀💧🛡",
  "requirements": ["строка требования 1", "строка требования 2"] // или пустой массив [], если требований нет
}
`;

const RebrandOutputSchema = z.object({
  newName: z.string(),
  newDescription: z.string(),
  requirements: z.array(z.string()).default([]),
});

type AIOptimizedService = z.infer<typeof RebrandOutputSchema>;

class AiCatalogService {
  /**
   * Generates an optimized, rebranded service description using Gemini AI.
   * Returns a structured JSON matching RebrandOutputSchema.
   */
  async generateOptimizedService(name: string, description: string): Promise<AIOptimizedService> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in the environment.');
    }

    const model = 'gemini-3-flash'; // Following AGENTS.md requirements
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const payloadStr = JSON.stringify({ name, description });

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: AI_CATALOG_SYSTEM_PROMPT },
            { text: "INCOMING SERVICE:\n" + payloadStr }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.0, // Strictly 0.0 to prevent hallucinations
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const textRaw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textRaw) {
      throw new Error('Empty response from AI model');
    }

    try {
      const parsedJson = JSON.parse(textRaw);
      return RebrandOutputSchema.parse(parsedJson);
    } catch (err: any) {
      console.error("[AiCatalogService] JSON parse or validation error:", err, textRaw);
      throw new Error('AI returned invalid JSON or schema mismatch');
    }
  }
}

export const aiCatalogService = new AiCatalogService();
