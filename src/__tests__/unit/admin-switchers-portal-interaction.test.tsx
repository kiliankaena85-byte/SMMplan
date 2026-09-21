/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnvironmentModeSwitcher } from '@/components/admin/EnvironmentModeSwitcher';
import { TenantSwitcher } from '@/components/admin/tenant-switcher';

// Mock Next.js navigation
const mockRefresh = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    replace: mockReplace,
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/admin/dashboard',
}));

// Mock Server Actions
const mockSetEnvironmentModeAction = vi.fn().mockResolvedValue({ success: true, mode: 'PRODUCTION' });
const mockGetEnvironmentModeAction = vi.fn().mockResolvedValue({ success: true, mode: 'HYBRID' });
vi.mock('@/actions/admin/environment-mode', () => ({
  setEnvironmentModeAction: (...args: any[]) => mockSetEnvironmentModeAction(...args),
  getEnvironmentModeAction: (...args: any[]) => mockGetEnvironmentModeAction(...args),
}));

const mockSwitchAdminTenantAction = vi.fn().mockResolvedValue({ success: true, tenantId: 'flux' });
vi.mock('@/actions/admin/tenants', () => ({
  switchAdminTenantAction: (...args: any[]) => mockSwitchAdminTenantAction(...args),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Admin Switchers Portal Interaction (Zero Unmount on Mousedown)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('EnvironmentModeSwitcher', () => {
    it('opens dropdown on trigger click and does not prematurely unmount when clicking an option', async () => {
      render(<EnvironmentModeSwitcher initialMode="HYBRID" readOnly={false} />);

      // Wait for initial render
      const trigger = screen.getByRole('button', { name: /Режим окружения/i });
      expect(trigger).toBeDefined();

      // Open dropdown
      fireEvent.click(trigger);

      // Verify portal dropdown is visible
      const sandboxOption = await screen.findByText('Песочница (100% Mock)');
      expect(sandboxOption).toBeDefined();

      // Simulate mousedown on option: it should NOT close the menu
      fireEvent.mouseDown(sandboxOption);
      expect(screen.queryByText('Песочница (100% Mock)')).not.toBeNull();

      // Complete click on option
      fireEvent.click(sandboxOption);

      // Verify action was executed
      await waitFor(() => {
        expect(mockSetEnvironmentModeAction).toHaveBeenCalledWith(
          expect.objectContaining({ mode: 'SANDBOX' })
        );
      });
    });

    it('closes on outside click', async () => {
      render(
        <div>
          <div data-testid="outside-element">Outside</div>
          <EnvironmentModeSwitcher initialMode="HYBRID" readOnly={false} />
        </div>
      );

      const trigger = screen.getByRole('button', { name: /Режим окружения/i });
      fireEvent.click(trigger);

      expect(await screen.findByText('Песочница (100% Mock)')).toBeDefined();

      // Click outside
      const outside = screen.getByTestId('outside-element');
      fireEvent.mouseDown(outside);

      await waitFor(() => {
        expect(screen.queryByText('Песочница (100% Mock)')).toBeNull();
      });
    });

    it('closes on Escape key press', async () => {
      render(<EnvironmentModeSwitcher initialMode="HYBRID" readOnly={false} />);

      const trigger = screen.getByRole('button', { name: /Режим окружения/i });
      fireEvent.click(trigger);

      expect(await screen.findByText('Песочница (100% Mock)')).toBeDefined();

      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('Песочница (100% Mock)')).toBeNull();
      });
    });
  });

  describe('TenantSwitcher', () => {
    it('opens dropdown on trigger click and switches tenant when clicking an alternative tenant', async () => {
      render(<TenantSwitcher currentTenant="smmplan" isOwner={true} />);

      const trigger = screen.getByRole('button', { expanded: false });
      expect(trigger).toBeDefined();

      // Open dropdown
      fireEvent.click(trigger);

      // Verify portal dropdown displays both tenants
      const fluxOption = await screen.findByText('smmflux.ru');
      expect(fluxOption).toBeDefined();

      // Simulate mousedown on flux option: it should NOT close the menu prematurely
      fireEvent.mouseDown(fluxOption);
      expect(screen.queryByText('smmflux.ru')).not.toBeNull();

      // Complete click on flux option
      fireEvent.click(fluxOption);

      // Verify action was executed
      await waitFor(() => {
        expect(mockSwitchAdminTenantAction).toHaveBeenCalledWith('flux');
        expect(mockReplace).toHaveBeenCalled();
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('closes on outside click', async () => {
      render(
        <div>
          <div data-testid="outside-element">Outside</div>
          <TenantSwitcher currentTenant="smmplan" isOwner={true} />
        </div>
      );

      const trigger = screen.getByRole('button', { expanded: false });
      fireEvent.click(trigger);

      expect(await screen.findByText('Список сайтов')).toBeDefined();

      // Click outside
      const outside = screen.getByTestId('outside-element');
      fireEvent.mouseDown(outside);

      await waitFor(() => {
        expect(screen.queryByText('Список сайтов')).toBeNull();
      });
    });

    it('closes on Escape key press', async () => {
      render(<TenantSwitcher currentTenant="smmplan" isOwner={true} />);

      const trigger = screen.getByRole('button', { expanded: false });
      fireEvent.click(trigger);

      expect(await screen.findByText('Список сайтов')).toBeDefined();

      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('Список сайтов')).toBeNull();
      });
    });
  });
});
