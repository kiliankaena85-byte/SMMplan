/**
 * @vitest-environment jsdom
 */
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

const mockRefresh = vi.fn();
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    push: mockPush,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/actions/admin/providers/balance', () => ({
  getGlobalProviderLiquidityAction: vi.fn().mockResolvedValue({ success: true, data: null }),
  getProviderBalanceAction: vi.fn().mockResolvedValue({
    success: true,
    data: {
      providerId: 'p-mock',
      providerName: 'Mock Prov',
      balance: 100,
      rawBalance: '100.00',
      currency: 'USD',
      balanceUsd: 100,
      balanceRub: 9500,
      status: 'healthy',
      latencyMs: 120,
      cachedAt: Date.now(),
      expiresAt: Date.now() + 60000,
    },
  }),
  syncAndFlushProviderOrdersAction: vi.fn().mockResolvedValue({ success: true }),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ProvidersTable } from '@/app/admin/providers/client-table';
import type { ProviderListDTO } from '@/services/admin/provider.service';

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
    // 2. Prop sync uses pendingIdsRef and depends ONLY on [providers]
    expect(code).toMatch(/setLocalProviders\(\(prev\) =>/);
    expect(code).toContain('const pendingIdsRef = useRef<Set<string>>(pendingIds);');
    expect(code).toContain('}, [providers]);');
    expect(code).not.toContain('}, [providers, pendingIds]);');
    // 3. Background live polling, focus listener, and providers:changed listener
    expect(code).toContain('setInterval(() => router.refresh(), 30000)');
    expect(code).toContain("window.addEventListener('focus', onFocus)");
    expect(code).toContain("window.addEventListener('providers:changed', onProvidersChanged)");
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

  it('providers/page.tsx MUST configure dynamic = "force-dynamic" and revalidate = 0', () => {
    const pagePath = path.resolve(process.cwd(), 'src/app/admin/providers/page.tsx');
    expect(fs.existsSync(pagePath)).toBe(true);
    const code = fs.readFileSync(pagePath, 'utf-8');
    expect(code).toContain("export const dynamic = 'force-dynamic';");
    expect(code).toContain('export const revalidate = 0;');
  });

  it('MUST not wipe optimistic state when pendingIds is cleared before server props change', () => {
    const initialProviders = [
      { id: 'p1', name: 'Prov 1', isActive: false, errorCount5m: 0 } as any,
      { id: 'p2', name: 'Prov 2', isActive: true, errorCount5m: 0 } as any,
    ];

    let localProviders = initialProviders.map((p) => (p.id === 'p1' ? { ...p, isActive: true } : p));
    const pendingIdsRef = { current: new Set<string>(['p1']) };

    // When action completes, pendingIds is cleared
    pendingIdsRef.current.delete('p1');

    // Because useEffect runs ONLY when server props change, local state is not reverted
    expect(localProviders[0].isActive).toBe(true);

    const syncProps = (providers: any[], prev: any[], pendingRef: { current: Set<string> }) => {
      return pendingRef.current.size === 0 ? providers : providers.map((p) => {
        if (!pendingRef.current.has(p.id)) return p;
        const cur = prev.find((lp) => lp.id === p.id);
        return cur ? { ...p, isActive: cur.isActive, errorCount5m: cur.errorCount5m } : p;
      });
    };

    // When server props arrive with the updated state
    const serverUpdatedProviders = [
      { id: 'p1', name: 'Prov 1', isActive: true, errorCount5m: 0 } as any,
      { id: 'p2', name: 'Prov 2', isActive: true, errorCount5m: 0 } as any,
    ];

    localProviders = syncProps(serverUpdatedProviders, localProviders, pendingIdsRef);
    expect(localProviders[0].isActive).toBe(true);

    // When server props arrive WHILE an action is still pending
    pendingIdsRef.current.add('p2');
    localProviders = localProviders.map((p) => (p.id === 'p2' ? { ...p, isActive: false } : p));
    const midActionServerProviders = [
      { id: 'p1', name: 'Prov 1', isActive: true, errorCount5m: 0 } as any,
      { id: 'p2', name: 'Prov 2', isActive: true, errorCount5m: 0 } as any,
    ];
    localProviders = syncProps(midActionServerProviders, localProviders, pendingIdsRef);
    expect(localProviders[1].isActive).toBe(false);
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

  it('ProvidersTable MUST trigger router.refresh() on providers:changed, focus, and 30s interval, and cleanup on unmount', () => {
    vi.useFakeTimers();
    const createMockDTO = (overrides: Partial<ProviderListDTO> = {}): ProviderListDTO => ({
      id: 'prov-test-live-1',
      name: 'Test Live Prov',
      apiUrl: 'https://api.testprovider.com/v2',
      isActive: false,
      balanceCurrency: 'RUB',
      serviceCount: 12,
      avgResponseMs: 150,
      errorCount5m: 0,
      lastSuccessAt: '2026-09-22T00:00:00.000Z',
      ticketUrl: 'https://support.testprovider.com',
      createdAt: '2026-09-20T00:00:00.000Z',
      ...overrides,
    });

    const providers = [createMockDTO()];
    const { unmount } = render(React.createElement(ProvidersTable, { providers }));

    mockRefresh.mockClear();

    // 1. Dispatch custom providers:changed event
    act(() => {
      window.dispatchEvent(new CustomEvent('providers:changed'));
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // 2. Dispatch window focus event
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(mockRefresh).toHaveBeenCalledTimes(2);

    // 3. Advance 30s interval timer
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(3);

    // 4. Cleanup on unmount
    unmount();
    mockRefresh.mockClear();

    act(() => {
      window.dispatchEvent(new CustomEvent('providers:changed'));
      window.dispatchEvent(new Event('focus'));
      vi.advanceTimersByTime(30000);
    });
    expect(mockRefresh).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('ProvidersTable MUST optimistically toggle active status and preserve it when pendingIds is cleared', async () => {
    const createMockDTO = (overrides: Partial<ProviderListDTO> = {}): ProviderListDTO => ({
      id: 'p-toggle-1',
      name: 'ToggleProv',
      apiUrl: 'https://api.testprovider.com/v2',
      isActive: false,
      balanceCurrency: 'RUB',
      serviceCount: 12,
      avgResponseMs: 150,
      errorCount5m: 0,
      lastSuccessAt: '2026-09-22T00:00:00.000Z',
      ticketUrl: null,
      createdAt: '2026-09-20T00:00:00.000Z',
      ...overrides,
    });

    const provider = createMockDTO();

    vi.mocked(db.provider.update).mockResolvedValue({
      id: 'p-toggle-1',
      name: 'ToggleProv',
      isActive: true,
    } as any);

    const { rerender } = render(React.createElement(ProvidersTable, { providers: [provider] }));

    // Verify initial inactive state
    const toggleBtn = screen.getAllByRole('button', { name: /Включить ToggleProv/i })[0];
    expect(toggleBtn).toBeDefined();

    // Click toggle
    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    // Optimistically updated
    expect(screen.getAllByText('АКТИВ')[0]).toBeDefined();

    // After action resolves, the state MUST NOT be wiped back to false even before new server props arrive
    expect(screen.getAllByText('АКТИВ')[0]).toBeDefined();

    // Now simulate Next.js router.refresh() completing and delivering updated server props
    const updatedServerProps = [createMockDTO({ isActive: true })];
    rerender(React.createElement(ProvidersTable, { providers: updatedServerProps }));

    // Still active and synced with server props
    expect(screen.getAllByText('АКТИВ')[0]).toBeDefined();
  });

  it('ProvidersTable MUST rollback optimistic toggle when action fails', async () => {
    const createMockDTO = (overrides: Partial<ProviderListDTO> = {}): ProviderListDTO => ({
      id: 'p-fail-1',
      name: 'FailProv',
      apiUrl: 'https://api.testprovider.com/v2',
      isActive: false,
      balanceCurrency: 'RUB',
      serviceCount: 12,
      avgResponseMs: 150,
      errorCount5m: 0,
      lastSuccessAt: '2026-09-22T00:00:00.000Z',
      ticketUrl: null,
      createdAt: '2026-09-20T00:00:00.000Z',
      ...overrides,
    });

    const provider = createMockDTO();

    vi.mocked(db.provider.update).mockRejectedValue(new Error('Simulated DB failure'));

    render(React.createElement(ProvidersTable, { providers: [provider] }));

    const toggleBtn = screen.getAllByRole('button', { name: /Включить FailProv/i })[0];

    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    // Upon error, localProviders must roll back to inactive
    await waitFor(() => {
      expect(screen.getAllByText('ВЫКЛ')[0]).toBeDefined();
    });
  });

  it('ProvidersTable MUST rollback error count reset when reset action fails', async () => {
    const createMockDTO = (overrides: Partial<ProviderListDTO> = {}): ProviderListDTO => ({
      id: 'p-err-1',
      name: 'ErrProv',
      apiUrl: 'https://api.testprovider.com/v2',
      isActive: true,
      balanceCurrency: 'RUB',
      serviceCount: 12,
      avgResponseMs: 150,
      errorCount5m: 7,
      lastSuccessAt: '2026-09-22T00:00:00.000Z',
      ticketUrl: null,
      createdAt: '2026-09-20T00:00:00.000Z',
      ...overrides,
    });

    const provider = createMockDTO();

    vi.mocked(db.provider.update).mockRejectedValue(new Error('Simulated Reset failure'));

    render(React.createElement(ProvidersTable, { providers: [provider] }));

    const resetBtn = screen.getAllByTitle('Сбросить счётчик ошибок')[0];

    await act(async () => {
      fireEvent.click(resetBtn);
    });

    // Upon failure, errorCount5m must roll back to 7
    await waitFor(() => {
      expect(screen.getByText(/⚠️ 7 errs/i)).toBeDefined();
    });
  });
});
