import { describe, it, expect } from 'vitest';
import { PiiScrubberService } from '@/services/support/ai/pii-scrubber.service';

describe('PII Scrubber Service (152-FZ Compliance)', () => {
  it('correctly scrubs explicit client email and replaces with [CLIENT_EMAIL]', () => {
    const input = 'Здравствуйте! Моя почта client.test@yandex.ru, проверьте заказ #1643';
    const result = PiiScrubberService.scrub(input, 'client.test@yandex.ru');

    expect(result.hasSensitiveData).toBe(true);
    expect(result.scrubbedText).toContain('[CLIENT_EMAIL]');
    expect(result.scrubbedText).not.toContain('client.test@yandex.ru');
    expect(result.tokensMap['[CLIENT_EMAIL]']).toBe('client.test@yandex.ru');
  });

  it('scrubs generic email addresses to [EMAIL_MASKED]', () => {
    const input = 'Пишите на boss@example.com или support@competitor.net';
    const result = PiiScrubberService.scrub(input);

    expect(result.hasSensitiveData).toBe(true);
    expect(result.scrubbedText).not.toContain('boss@example.com');
    expect(result.scrubbedText).not.toContain('support@competitor.net');
    expect(result.scrubbedText).toContain('[EMAIL_MASKED]');
  });

  it('scrubs Russian phone numbers in various formats', () => {
    const samples = [
      '+7 999 123 45 67',
      '8(926)555-44-33',
      '+79110001122',
    ];

    for (const phone of samples) {
      const text = `Мой номер для связи: ${phone}. Жду звонка.`;
      const res = PiiScrubberService.scrub(text);
      expect(res.hasSensitiveData).toBe(true);
      expect(res.scrubbedText).toContain('[PHONE_MASKED]');
      expect(res.scrubbedText).not.toContain(phone);
    }
  });

  it('scrubs payment card numbers', () => {
    const input = 'Я оплачивал с карты 2202 2032 1234 5678, чек сохранился';
    const result = PiiScrubberService.scrub(input);

    expect(result.hasSensitiveData).toBe(true);
    expect(result.scrubbedText).toContain('[CARD_MASKED]');
    expect(result.scrubbedText).not.toContain('2202 2032 1234 5678');
  });

  it('scrubs JWT tokens and auth headers', () => {
    const input = 'Вот мой токен eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThis';
    const result = PiiScrubberService.scrub(input);

    expect(result.hasSensitiveData).toBe(true);
    expect(result.scrubbedText).toContain('[AUTH_TOKEN_MASKED]');
    expect(result.scrubbedText).not.toContain('eyJhbGci');
  });

  it('leaves safe technical order text unaltered', () => {
    const input = 'Заказ #1643 Telegram Подписчики, статус IN_PROGRESS, количество 1000 шт.';
    const result = PiiScrubberService.scrub(input);

    expect(result.hasSensitiveData).toBe(false);
    expect(result.scrubbedText).toBe(input);
  });
});
