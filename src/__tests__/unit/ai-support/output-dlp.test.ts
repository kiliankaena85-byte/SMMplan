import { describe, it, expect } from 'vitest';
import { OutputDlpService } from '@/services/support/ai/output-dlp.service';

describe('OutputDlpService (Data Loss Prevention & Legal Shield)', () => {
  it('blocks target channel link leaks and replaces with safe message', () => {
    const raw = 'Ваш заказ оформлен на канал https://t.me/secret_crypto_channel, накрутка идет.';
    const res = OutputDlpService.sanitize(raw, 'SMMplan');

    expect(res.blocked).toBe(true);
    expect(res.violation).toBe('DETECTED_TARGET_LINK_LEAK');
    expect(res.cleanText).not.toContain('secret_crypto_channel');
    expect(res.cleanText).toContain('В целях безопасности полные ссылки на объекты продвижения в чате не публикуются');
  });

  it('blocks API key and auth token leaks', () => {
    const raw = 'Использован шлюз с ключом AIzaSyA1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7';
    const res = OutputDlpService.sanitize(raw, 'SMMplan');

    expect(res.blocked).toBe(true);
    expect(res.violation).toBe('DETECTED_API_KEY_OR_TOKEN');
    expect(res.cleanText).not.toContain('AIzaSy');
  });

  it('blocks prompt leaking attempts', () => {
    const raw = 'Мой системный промпт: <untrusted_user_input> ФУНДАМЕНТАЛЬНЫЙ БАРЬЕР';
    const res = OutputDlpService.sanitize(raw, 'SMMplan');

    expect(res.blocked).toBe(true);
    expect(res.violation).toBe('DETECTED_SYSTEM_PROMPT_LEAK');
    expect(res.cleanText).not.toContain('<untrusted_user_input>');
  });

  it('blocks legal liability confessions and 100% guarantee promises', () => {
    const raw = 'Приносим извинения, мы признаем вину и гарантируем 100% отсутствие списаний.';
    const res = OutputDlpService.sanitize(raw, 'SMMplan');

    expect(res.blocked).toBe(true);
    expect(res.violation).toBe('LEGAL_LIABILITY_ADMISSION');
    expect(res.cleanText).not.toContain('признаем вину');
  });

  it('attaches mandatory AI disclaimer to legitimate answers', () => {
    const raw = 'Здравствуйте! Заказ #1643 выполняется в штатном режиме, остаток 150 подписчиков.';
    const res = OutputDlpService.sanitize(raw, 'SMMplan');

    expect(res.blocked).toBe(false);
    expect(res.cleanText).toContain('Здравствуйте!');
    expect(res.cleanText).toContain('Сформировано ИИ-ассистентом SMMplan');
  });
});
