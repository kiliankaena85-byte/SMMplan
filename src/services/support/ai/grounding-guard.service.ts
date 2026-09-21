import type { GroundingCheckResult } from '@/types/ai-support';

export class GroundingGuardService {
  // Стандартные регуляторные и регламентные цифры, разрешенные по умолчанию
  private static readonly WHITELISTED_STANDARD_NUMBERS = new Set([
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', // нумерация пунктов
    '15', '20', '30', // 15-30 минут старт, 30 дней гарантии
    '24', '7', // 24/7
    '100', // 100% возврат при отмене до старта
    '26', '327', '54', '152', '115', '38', // номера статей законов
  ]);

  /**
   * Verifies that all specific numbers, amounts, and IDs mentioned in the AI response
   * are strictly grounded in the database context, preventing hallucinated prices or quantities.
   */
  public static verifyClaims(replyText: string, allowedNumbers: string[]): GroundingCheckResult {
    if (!replyText || typeof replyText !== 'string') {
      return { isGrounded: true, ungroundedNumbers: [], confidence: 1.0 };
    }

    // Нормализуем разрешенные числа
    const allowedSet = new Set<string>();
    for (const num of allowedNumbers) {
      if (num) {
        allowedSet.add(num.toString().trim());
        // Добавляем также целую часть для десятичных (например, "189" для "189.00")
        const intPart = num.toString().split('.')[0];
        if (intPart) allowedSet.add(intPart);
      }
    }

    // Извлекаем все числа из ответа
    const matches = replyText.match(/\b\d+(?:[.,]\d+)?\b/g) || [];
    const ungrounded: string[] = [];

    for (const rawMatch of matches) {
      const normalized = rawMatch.replace(',', '.');
      const intPart = normalized.split('.')[0];

      // Проверяем, разрешено ли число
      if (
        this.WHITELISTED_STANDARD_NUMBERS.has(normalized) ||
        this.WHITELISTED_STANDARD_NUMBERS.has(intPart) ||
        allowedSet.has(normalized) ||
        allowedSet.has(intPart)
      ) {
        continue;
      }

      // Неподтвержденное число
      ungrounded.push(rawMatch);
    }

    const isGrounded = ungrounded.length === 0;
    const confidence = isGrounded ? 1.0 : Math.max(0, 1.0 - ungrounded.length * 0.25);

    return {
      isGrounded,
      ungroundedNumbers: ungrounded,
      confidence,
    };
  }
}
