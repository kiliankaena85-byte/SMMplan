import { describe, it, expect } from 'vitest';
import { redactSensitiveTokens, sanitizeLogObject, SENSITIVE_PATTERNS } from '@/lib/logger/sensitive-data-filter';

describe('Sensitive Data Filter Suite (P3-25 & Item 2)', () => {
  it('exposes extensible SENSITIVE_PATTERNS array', () => {
    expect(Array.isArray(SENSITIVE_PATTERNS)).toBe(true);
    expect(SENSITIVE_PATTERNS.length).toBeGreaterThanOrEqual(8);
  });

  it('redacts passwords in database connection URIs (postgresql)', () => {
    const raw = 'Connecting to postgresql://admin:superSecretPassword123@db.internal:5432/main';
    const redacted = redactSensitiveTokens(raw);
    expect(redacted).toBe('Connecting to postgresql://admin:*****@db.internal:5432/main');
  });

  it('redacts passwords in mongodb+srv URIs with URL-encoded characters (%40)', () => {
    const raw = 'Connecting to mongodb+srv://dbuser:pass%40word123@cluster0.mongodb.net/prod_db';
    const redacted = redactSensitiveTokens(raw);
    expect(redacted).toBe('Connecting to mongodb+srv://dbuser:*****@cluster0.mongodb.net/prod_db');
  });

  it('redacts passwords in mysql, mariadb, http, amqp, and clickhouse URIs', () => {
    expect(redactSensitiveTokens('mysql://root:mySecret123@127.0.0.1:3306/db'))
      .toBe('mysql://root:*****@127.0.0.1:3306/db');
    expect(redactSensitiveTokens('mariadb://user:p%40ssword@host:3306/db'))
      .toBe('mariadb://user:*****@host:3306/db');
    expect(redactSensitiveTokens('https://admin:sec%40ret@api.example.com/v1'))
      .toBe('https://admin:*****@api.example.com/v1');
    expect(redactSensitiveTokens('amqp://guest:guestPass@localhost:5672/vhost'))
      .toBe('amqp://guest:*****@localhost:5672/vhost');
    expect(redactSensitiveTokens('clickhouse://ch_admin:strong_pass@ch.internal:9000/default'))
      .toBe('clickhouse://ch_admin:*****@ch.internal:9000/default');
  });

  it('redacts passwords in URLs without scheme (user:pass@host)', () => {
    const raw = 'Failed connection to admin_user:secret_pass123@db-primary.internal:5432';
    const redacted = redactSensitiveTokens(raw);
    expect(redacted).toContain('admin_user:*****@db-primary.internal:5432');
  });

  it('redacts unquoted password assignments (password=abc, password: abc)', () => {
    expect(redactSensitiveTokens('Config: password=mySecretUnquoted123; user=admin'))
      .toContain('password="[REDACTED]"');
    expect(redactSensitiveTokens('Header secret: mySecretKeyVal123'))
      .toContain('secret: "[REDACTED]"');
  });

  it('redacts Redis connection credentials', () => {
    const raw = 'Connecting to redis://default:secretAuthToken@redis.internal:6379';
    const redacted = redactSensitiveTokens(raw);
    expect(redacted).toBe('Connecting to redis://default:*****@redis.internal:6379');
  });

  it('redacts bearer tokens and API keys in JSON and strings', () => {
    const raw = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token12345';
    const redacted = redactSensitiveTokens(raw);
    expect(redacted).toContain('Bearer "[REDACTED]"');
  });

  it('sanitizes nested log objects cleanly', () => {
    const obj = {
      message: 'User login attempt',
      password: 'MySecretPassword!',
      apiKey: 'sec_12345678901234567890',
      safeField: 'hello',
    };

    const sanitized = sanitizeLogObject(obj);
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.apiKey).toBe('[REDACTED]');
    expect(sanitized.safeField).toBe('hello');
  });
});
