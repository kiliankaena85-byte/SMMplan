/**
 * Ghost Proxy v2: Test Mode vs Production Mode
 * 
 * This test suite verifies the core architectural invariant:
 * - In TEST mode: workers route to internal mock-provider (localhost)
 * - In PRODUCTION mode: workers route to real external provider (Vexboost)
 * - Admin functions ALWAYS route to real provider regardless of mode
 * 
 * Standards: ISTQB §4.4 (Decision Table Testing), ISO 25010 §6.5 (Security)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Hoisted mocks ----
const { mockSettingsDb, mockProviderDb } = vi.hoisted(() => ({
  mockSettingsDb: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  mockProviderDb: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    systemSettings: mockSettingsDb,
    provider: mockProviderDb,
  },
}));

// Don't mock EncryptionService — let CryptoService use the test key from setup.ts
// Don't mock UniversalProvider — we want to verify the URL it receives

import { ProviderService } from '@/services/providers/provider.service';
import { SettingsManager } from '@/lib/settings';

// ---- Test Data ----
const REAL_PROVIDER_CONFIG = {
  id: 'prov-vexboost',
  name: 'Vexboost',
  apiUrl: 'https://smm.vexboost.com/v2',
  apiKey: 'encrypted_real_key_abc123',
  isActive: true,
  metadata: {},
  syncLock: false,
  balanceCurrency: 'USD',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_PROVIDER_URL_SUBSTRING = '/api/dev/mock-provider';

function settingsRecord(isTestMode: boolean) {
  return {
    id: 'global',
    taxRate: 6.0,
    opexMonthly: 0,
    maintenanceMode: false,
    isTestMode,
    siteName: 'Smmplan',
    siteDescription: '',
    yookassaShopId: null,
    yookassaSecretKey: null,
    cryptoBotToken: null,
    defaultPaymentGateway: 'yookassa',
    paymentGateways: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Ghost Proxy v2: Routing Architecture', () => {
  let service: ProviderService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProviderService();
  });

  // =============================================
  // PRODUCTION MODE (isTestMode = false)
  // =============================================
  describe('🟢 PRODUCTION MODE (isTestMode=false)', () => {
    beforeEach(() => {
      mockSettingsDb.findUnique.mockResolvedValue(settingsRecord(false));
    });

    it('GP-PROD-001: getProviderInstance → returns REAL provider URL', async () => {
      const instance = await service.getProviderInstance(REAL_PROVIDER_CONFIG as any);
      // Access the private apiUrl via cast
      const apiUrl = (instance as any).apiUrl;
      expect(apiUrl).toBe('https://smm.vexboost.com/v2');
      expect(apiUrl).not.toContain(MOCK_PROVIDER_URL_SUBSTRING);
    });

    it('GP-PROD-002: getWorkerProviderInstance → returns REAL provider URL', async () => {
      const instance = await service.getWorkerProviderInstance(REAL_PROVIDER_CONFIG as any);
      const apiUrl = (instance as any).apiUrl;
      expect(apiUrl).toBe('https://smm.vexboost.com/v2');
      expect(apiUrl).not.toContain(MOCK_PROVIDER_URL_SUBSTRING);
    });

    it('GP-PROD-003: getDefaultProvider → returns REAL provider URL', async () => {
      mockProviderDb.findFirst.mockResolvedValue(REAL_PROVIDER_CONFIG);
      const instance = await service.getDefaultProvider();
      const apiUrl = (instance as any).apiUrl;
      expect(apiUrl).toBe('https://smm.vexboost.com/v2');
    });

    it('GP-PROD-004: SettingsManager.isTestMode() returns false', async () => {
      const result = await SettingsManager.isTestMode();
      expect(result).toBe(false);
    });
  });

  // =============================================
  // TEST MODE (isTestMode = true)
  // =============================================
  describe('🟡 TEST MODE (isTestMode=true)', () => {
    beforeEach(() => {
      mockSettingsDb.findUnique.mockResolvedValue(settingsRecord(true));
    });

    it('GP-TEST-001: getWorkerProviderInstance → returns MOCK provider URL', async () => {
      const instance = await service.getWorkerProviderInstance(REAL_PROVIDER_CONFIG as any);
      const apiUrl = (instance as any).apiUrl;
      expect(apiUrl).toContain(MOCK_PROVIDER_URL_SUBSTRING);
      expect(apiUrl).not.toContain('vexboost');
    });

    it('GP-TEST-002: getWorkerProviderInstance → mock API key is "test"', async () => {
      const instance = await service.getWorkerProviderInstance(REAL_PROVIDER_CONFIG as any);
      const apiKey = (instance as any).apiKey;
      // The key passed is 'test', but UniversalProvider tries to decrypt it.
      // EncryptionService.decrypt('test') returns null, fallback is the raw key 'test'
      expect(apiKey).toBe('test');
    });

    it('GP-TEST-003: getProviderInstance → STILL returns REAL provider (admin safety)', async () => {
      const instance = await service.getProviderInstance(REAL_PROVIDER_CONFIG as any);
      const apiUrl = (instance as any).apiUrl;
      expect(apiUrl).toBe('https://smm.vexboost.com/v2');
      expect(apiUrl).not.toContain(MOCK_PROVIDER_URL_SUBSTRING);
    });

    it('GP-TEST-004: getDefaultProvider → STILL returns REAL provider (admin safety)', async () => {
      mockProviderDb.findFirst.mockResolvedValue(REAL_PROVIDER_CONFIG);
      const instance = await service.getDefaultProvider();
      const apiUrl = (instance as any).apiUrl;
      expect(apiUrl).toBe('https://smm.vexboost.com/v2');
    });

    it('GP-TEST-005: SettingsManager.isTestMode() returns true', async () => {
      const result = await SettingsManager.isTestMode();
      expect(result).toBe(true);
    });
  });

  // =============================================
  // MODE TRANSITION (Switch between modes)
  // =============================================
  describe('🔄 MODE TRANSITION', () => {
    it('GP-SWITCH-001: Switching from test→prod changes worker routing immediately', async () => {
      // First call: test mode
      mockSettingsDb.findUnique.mockResolvedValue(settingsRecord(true));
      const testInstance = await service.getWorkerProviderInstance(REAL_PROVIDER_CONFIG as any);
      expect((testInstance as any).apiUrl).toContain(MOCK_PROVIDER_URL_SUBSTRING);

      // Second call: production mode
      mockSettingsDb.findUnique.mockResolvedValue(settingsRecord(false));
      const prodInstance = await service.getWorkerProviderInstance(REAL_PROVIDER_CONFIG as any);
      expect((prodInstance as any).apiUrl).toBe('https://smm.vexboost.com/v2');
    });

    it('GP-SWITCH-002: Switching from prod→test changes worker routing immediately', async () => {
      // First call: production mode
      mockSettingsDb.findUnique.mockResolvedValue(settingsRecord(false));
      const prodInstance = await service.getWorkerProviderInstance(REAL_PROVIDER_CONFIG as any);
      expect((prodInstance as any).apiUrl).toBe('https://smm.vexboost.com/v2');

      // Second call: test mode
      mockSettingsDb.findUnique.mockResolvedValue(settingsRecord(true));
      const testInstance = await service.getWorkerProviderInstance(REAL_PROVIDER_CONFIG as any);
      expect((testInstance as any).apiUrl).toContain(MOCK_PROVIDER_URL_SUBSTRING);
    });

    it('GP-SWITCH-003: Admin methods are NEVER affected by mode switch', async () => {
      // Test mode
      mockSettingsDb.findUnique.mockResolvedValue(settingsRecord(true));
      const adminTest = await service.getProviderInstance(REAL_PROVIDER_CONFIG as any);
      expect((adminTest as any).apiUrl).toBe('https://smm.vexboost.com/v2');

      // Production mode
      mockSettingsDb.findUnique.mockResolvedValue(settingsRecord(false));
      const adminProd = await service.getProviderInstance(REAL_PROVIDER_CONFIG as any);
      expect((adminProd as any).apiUrl).toBe('https://smm.vexboost.com/v2');
    });
  });

  // =============================================
  // EDGE CASES & SECURITY
  // =============================================
  describe('🛡️ SECURITY EDGE CASES', () => {
    it('GP-SEC-001: No active provider → throws meaningful error', async () => {
      mockSettingsDb.findUnique.mockResolvedValue(settingsRecord(false));
      mockProviderDb.findFirst.mockResolvedValue(null);
      await expect(service.getDefaultProvider()).rejects.toThrow('No active providers');
    });

    it('GP-SEC-002: Multiple rapid test-mode calls → each reads fresh DB state', async () => {
      mockSettingsDb.findUnique
        .mockResolvedValueOnce(settingsRecord(true))
        .mockResolvedValueOnce(settingsRecord(true))
        .mockResolvedValueOnce(settingsRecord(false));

      const r1 = await service.getWorkerProviderInstance(REAL_PROVIDER_CONFIG as any);
      const r2 = await service.getWorkerProviderInstance(REAL_PROVIDER_CONFIG as any);
      const r3 = await service.getWorkerProviderInstance(REAL_PROVIDER_CONFIG as any);

      expect((r1 as any).apiUrl).toContain(MOCK_PROVIDER_URL_SUBSTRING);
      expect((r2 as any).apiUrl).toContain(MOCK_PROVIDER_URL_SUBSTRING);
      expect((r3 as any).apiUrl).toBe('https://smm.vexboost.com/v2');

      expect(mockSettingsDb.findUnique).toHaveBeenCalledTimes(3);
    });
  });
});
