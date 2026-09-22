import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { providerBalanceService } from '@/services/admin/provider-balance.service';
import {
  toggleProviderActiveAction,
  resetProviderErrorsAction,
  createMockProviderPresetAction,
  createProvider,
  updateProvider,
} from '@/actions/admin/providers/crud';

vi.mock('@/lib/db', () => ({
  db: {
    provider: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb({
      serviceRoute: { deleteMany: vi.fn() },
      provider: { delete: vi.fn().mockResolvedValue({ id: 'prov-1', name: 'P1', apiUrl: 'http://test' }) },
    })),
  },
}));

vi.mock('@/services/admin/provider-balance.service', () => ({
  providerBalanceService: {
    invalidateGlobalLiquidityCache: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/server/rbac', () => ({
  requireStaffPermission: vi.fn((_module, _action, fn) =>
    fn({ id: 'admin-test-1', email: 'admin@smmplan.pro', role: 'SUPER_ADMIN' })
  ),
}));

vi.mock('@/lib/admin-audit', () => ({
  auditAdminAwaitable: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/utils/get-base-url', () => ({
  getBaseUrlAsync: vi.fn().mockResolvedValue('http://localhost:3000'),
}));

vi.mock('@/lib/vault', () => ({
  VaultService: {
    encrypt: vi.fn((k: string) => `enc_${k}`),
    decrypt: vi.fn((k: string) => k.replace('enc_', '')),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

describe('Providers Live Update & Cache Revalidation Contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggleProviderActiveAction MUST update provider, invalidate liquidity, and trigger revalidatePath', async () => {
    vi.mocked(db.provider.update).mockResolvedValue({
      id: 'prov-live-1',
      name: 'Live Provider',
      isActive: true,
    } as any);

    const result = await toggleProviderActiveAction('prov-live-1', true);

    expect(result.success).toBe(true);
    expect(db.provider.update).toHaveBeenCalledWith({
      where: { id: 'prov-live-1' },
      data: { isActive: true },
    });
    expect(providerBalanceService.invalidateGlobalLiquidityCache).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/admin/providers');
    expect(revalidatePath).toHaveBeenCalledWith('/admin', 'layout');
  });

  it('resetProviderErrorsAction MUST reset errorCount5m, bust liquidity cache, and trigger revalidatePath', async () => {
    vi.mocked(db.provider.update).mockResolvedValue({
      id: 'prov-live-2',
      name: 'Degraded Provider',
      errorCount5m: 0,
    } as any);

    const result = await resetProviderErrorsAction('prov-live-2');

    expect(result.success).toBe(true);
    expect(db.provider.update).toHaveBeenCalledWith({
      where: { id: 'prov-live-2' },
      data: { errorCount5m: 0 },
    });
    expect(providerBalanceService.invalidateGlobalLiquidityCache).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/admin/providers');
    expect(revalidatePath).toHaveBeenCalledWith('/admin', 'layout');
  });

  it('createMockProviderPresetAction MUST trigger revalidatePath and bust liquidity when creating or re-activating', async () => {
    vi.mocked(db.provider.findFirst).mockResolvedValue(null);
    vi.mocked(db.provider.create).mockResolvedValue({
      id: 'mock-prov-new',
      name: 'Mock Provider (Песочница API)',
      apiUrl: 'http://localhost:3000/api/dev/mock-provider',
      isActive: true,
      balanceCurrency: 'RUB',
    } as any);

    const result = await createMockProviderPresetAction();

    expect(result.success).toBe(true);
    expect(providerBalanceService.invalidateGlobalLiquidityCache).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/admin/providers');
    expect(revalidatePath).toHaveBeenCalledWith('/admin', 'layout');
  });

  it('createProvider and updateProvider MUST trigger revalidatePath and invalidate liquidity cache', async () => {
    vi.mocked(db.provider.create).mockResolvedValue({
      id: 'new-prov-1',
      name: 'New Panel',
      apiUrl: 'https://newpanel.com/api/v2',
      isActive: true,
      balanceCurrency: 'USD',
    } as any);

    const createRes = await createProvider({
      name: 'New Panel',
      apiUrl: 'https://newpanel.com/api/v2',
      apiKey: 'sec-key',
      isActive: true,
      balanceCurrency: 'USD',
    });

    expect(createRes.success).toBe(true);
    expect(providerBalanceService.invalidateGlobalLiquidityCache).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/admin/providers');
    expect(revalidatePath).toHaveBeenCalledWith('/admin', 'layout');

    vi.mocked(db.provider.findUnique).mockResolvedValue({
      id: 'new-prov-1',
      name: 'New Panel',
      apiKey: 'enc_sec-key',
    } as any);

    vi.mocked(db.provider.update).mockResolvedValue({
      id: 'new-prov-1',
      name: 'New Panel Updated',
      isActive: false,
    } as any);

    const updateRes = await updateProvider('new-prov-1', {
      name: 'New Panel Updated',
      apiUrl: 'https://newpanel.com/api/v2',
      apiKey: 'sec-key',
      isActive: false,
      balanceCurrency: 'USD',
    });

    expect(updateRes.success).toBe(true);
    expect(providerBalanceService.invalidateGlobalLiquidityCache).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/admin/providers');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/providers/new-prov-1');
  });

  it('client-table.tsx MUST feature optimistic state, prop synchronization, and background live polling', () => {
    const clientTablePath = path.resolve(process.cwd(), 'src/app/admin/providers/client-table.tsx');
    expect(fs.existsSync(clientTablePath)).toBe(true);
    const code = fs.readFileSync(clientTablePath, 'utf-8');

    // 1. Local state initialized from server props
    expect(code).toContain('const [localProviders, setLocalProviders] = useState<ProviderListDTO[]>(providers);');
    // 2. Prop sync
    expect(code).toMatch(/setLocalProviders\(\(prev\) =>/);
    // 3. Background live polling / focus listener
    expect(code).toContain('setInterval(() => router.refresh(), 30000)');
    expect(code).toContain("window.addEventListener('focus', onFocus)");
    // 4. Live update event dispatching
    expect(code).toContain("window.dispatchEvent(new CustomEvent('providers:changed'))");
    // 5. Optimistic active toggle and rollback
    expect(code).toContain('setLocalProviders((prev) => prev.map((p) => (p.id === provider.id ? { ...p, isActive: nextState } : p)))');
    expect(code).toContain('setLocalProviders((prev) => prev.map((p) => (p.id === provider.id ? { ...p, isActive: !nextState } : p)))');
    // 6. Optimistic error reset
    expect(code).toContain('setLocalProviders((prev) => prev.map((p) => (p.id === provider.id ? { ...p, errorCount5m: 0 } : p)))');
    // 7. Max line limit compliance
    const lines = code.split('\n').length;
    expect(lines).toBeLessThanOrEqual(200);
  });

  it('liquidity-dashboard.tsx and provider-balance-cell.tsx MUST support live update events', () => {
    const dashPath = path.resolve(process.cwd(), 'src/app/admin/providers/components/liquidity-dashboard.tsx');
    const cellPath = path.resolve(process.cwd(), 'src/app/admin/providers/components/provider-balance-cell.tsx');
    expect(fs.existsSync(dashPath)).toBe(true);
    expect(fs.existsSync(cellPath)).toBe(true);

    const dashCode = fs.readFileSync(dashPath, 'utf-8');
    const cellCode = fs.readFileSync(cellPath, 'utf-8');

    // LiquidityDashboard must listen for providers:changed and window focus
    expect(dashCode).toContain("window.addEventListener('providers:changed', onProvidersChanged)");
    expect(dashCode).toContain("window.addEventListener('focus', onFocus)");
    expect(dashCode).toContain("setInterval(() => fetchLiquidity(false), 30000)");

    // ProviderBalanceCell must listen for providers:changed and window focus
    expect(cellCode).toContain("window.addEventListener('providers:changed', onProvidersChanged)");
    expect(cellCode).toContain("window.addEventListener('focus', onFocus)");
  });
});
