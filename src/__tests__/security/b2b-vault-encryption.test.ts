import { describe, it, expect, beforeAll } from 'vitest';
import { B2BClientProfileService } from '@/services/b2b/client-profile.service';

describe('B2B VaultService Field Encryption Suite (P3-21)', () => {
  beforeAll(() => {
    process.env.DATA_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });
  it('encrypts sensitive B2B tax fields (inn, kpp, ogrn, directorName, legalAddress) and decrypts accurately', () => {
    const rawInput = {
      companyName: 'ООО Ромашка',
      inn: '7701234567',
      kpp: '770101001',
      ogrn: '1234567890123',
      directorName: 'Иванов Иван Иванович',
      legalAddress: 'г. Москва, ул. Тверская, д. 1',
    };

    const encrypted = B2BClientProfileService.encryptB2BFields(rawInput);

    expect(encrypted.companyName).toBe('ООО Ромашка');
    expect(encrypted.inn).not.toBe('7701234567');
    expect(encrypted.inn).toContain(':'); // AES-256 GCM format v:iv:tag:ciphertext
    expect(encrypted.kpp).not.toBe('770101001');
    expect(encrypted.ogrn).not.toBe('1234567890123');
    expect(encrypted.directorName).not.toBe('Иванов Иван Иванович');

    const decrypted = B2BClientProfileService.decryptB2BFields(encrypted);

    expect(decrypted?.companyName).toBe('ООО Ромашка');
    expect(decrypted?.inn).toBe('7701234567');
    expect(decrypted?.kpp).toBe('770101001');
    expect(decrypted?.ogrn).toBe('1234567890123');
    expect(decrypted?.directorName).toBe('Иванов Иван Иванович');
    expect(decrypted?.legalAddress).toBe('г. Москва, ул. Тверская, д. 1');
  });
});
