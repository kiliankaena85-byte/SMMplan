import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getDdosShieldSecret,
  resetEphemeralShieldSecretForTest,
} from '@/lib/security/ddos-shield/pow-engine';

describe('SEC-03: DDoS Shield Secret Hardening', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetEphemeralShieldSecretForTest();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetEphemeralShieldSecretForTest();
  });

  it('uses explicitly provided DDOS_SHIELD_SECRET when present', () => {
    process.env.DDOS_SHIELD_SECRET = 'my-custom-ddos-shield-secret-12345';
    expect(getDdosShieldSecret()).toBe('my-custom-ddos-shield-secret-12345');
  });

  it('uses JWT_SECRET when DDOS_SHIELD_SECRET is absent', () => {
    delete process.env.DDOS_SHIELD_SECRET;
    delete process.env.JWT_SIGNING_KEY;
    process.env.JWT_SECRET = 'jwt-secret-from-environment';
    expect(getDdosShieldSecret()).toBe('jwt-secret-from-environment');
  });

  it('throws in production mode if no secret is set (fail-closed)', () => {
    delete process.env.DDOS_SHIELD_SECRET;
    delete process.env.JWT_SIGNING_KEY;
    delete process.env.JWT_SECRET;
    (process.env as any).NODE_ENV = 'production';

    expect(() => getDdosShieldSecret()).toThrow(/fail-closed, SEC-03/);
  });

  it('generates a cryptographically random ephemeral secret in development/test instead of hardcoded fallback', () => {
    delete process.env.DDOS_SHIELD_SECRET;
    delete process.env.JWT_SIGNING_KEY;
    delete process.env.JWT_SECRET;
    (process.env as any).NODE_ENV = 'development';

    const secret1 = getDdosShieldSecret();
    expect(secret1).not.toBe('omnismm-ddos-shield-fallback-secret-2026');
    expect(secret1.length).toBe(64); // 32 bytes in hex

    // Ephemeral secret is stable within same runtime
    expect(getDdosShieldSecret()).toBe(secret1);

    // After reset, a new random secret is generated
    resetEphemeralShieldSecretForTest();
    const secret2 = getDdosShieldSecret();
    expect(secret2).not.toBe(secret1);
  });
});
