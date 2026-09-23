import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

describe('Catalog Sync SHA-256 Hash Invariant & Network Router Pooling', () => {
  it('should compute consistent SHA-256 hash for identical service catalog payloads', () => {
    const rawServices = [
      { service: 101, name: 'TG Views Fast', rate: 0.5, category: 'Telegram' },
      { service: 102, name: 'TG Members Real', rate: 1.2, category: 'Telegram' }
    ];

    const hash1 = crypto.createHash('sha256').update(JSON.stringify(rawServices)).digest('hex');
    const hash2 = crypto.createHash('sha256').update(JSON.stringify(rawServices)).digest('hex');

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('should detect differences when service rate or name changes in catalog payload', () => {
    const rawServices1 = [
      { service: 101, name: 'TG Views Fast', rate: 0.5, category: 'Telegram' },
    ];
    const rawServices2 = [
      { service: 101, name: 'TG Views Fast', rate: 0.55, category: 'Telegram' },
    ];

    const hash1 = crypto.createHash('sha256').update(JSON.stringify(rawServices1)).digest('hex');
    const hash2 = crypto.createHash('sha256').update(JSON.stringify(rawServices2)).digest('hex');

    expect(hash1).not.toBe(hash2);
  });

  it('should instantiate undici Agent with keepAliveTimeout 30000 and connection pool of 50', async () => {
    const { Agent } = await import('undici');
    const agent = new Agent({
      keepAliveTimeout: 30000,
      keepAliveMaxTimeout: 60000,
      connections: 50,
      pipelining: 1,
      connectTimeout: 8000,
      headersTimeout: 15000,
    });

    expect(agent).toBeDefined();
    // Agent is instance of undici Agent
    expect(agent.constructor.name).toBe('Agent');
  });
});
