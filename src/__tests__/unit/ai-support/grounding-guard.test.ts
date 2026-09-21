import { describe, it, expect } from 'vitest';
import { GroundingGuardService } from '@/services/support/ai/grounding-guard.service';

describe('GroundingGuardService (Claim-Level Number Verification)', () => {
  const allowedNumbers = ['1643', '1000', '250', '189.00', '1450.00'];

  it('passes when all mentioned numbers match allowed context or whitelisted constants', () => {
    const text = 'Здравствуйте! По заказу #1643 заказано 1000 подписчиков, остаток 250 шт., стоимость 189.00 ₽. Старт занимает от 15 до 30 минут по регламенту гарантии 30 дней.';
    const res = GroundingGuardService.verifyClaims(text, allowedNumbers);

    expect(res.isGrounded).toBe(true);
    expect(res.ungroundedNumbers).toHaveLength(0);
    expect(res.confidence).toBe(1.0);
  });

  it('detects hallucinated financial amounts or fake order numbers', () => {
    const hallucinatedText = 'Мы вернем вам 7500 рублей за заказ #99999.';
    const res = GroundingGuardService.verifyClaims(hallucinatedText, allowedNumbers);

    expect(res.isGrounded).toBe(false);
    expect(res.ungroundedNumbers).toContain('7500');
    expect(res.ungroundedNumbers).toContain('99999');
    expect(res.confidence).toBeLessThan(0.6);
  });

  it('allows standard procedural list numbering (1, 2, 3) and legal article numbers', () => {
    const proceduralText = '1. Проверьте доступность канала.\n2. Согласно ст. 26 ЗоЗПП возврат осуществляется на исходную карту.\n3. Ожидайте 15 минут.';
    const res = GroundingGuardService.verifyClaims(proceduralText, []);

    expect(res.isGrounded).toBe(true);
    expect(res.ungroundedNumbers).toHaveLength(0);
  });
});
