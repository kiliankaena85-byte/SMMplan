// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  GeneralMaintenanceSection,
  GeneralBrandingSection,
  GeneralLegalFiscalSection,
} from '@/app/admin/settings/components/general';
import { GeneralSettings } from '@/app/admin/settings/general-settings';
import type { SystemSettings } from '@prisma/client';

vi.mock('@/actions/admin/settings', () => ({
  updateGlobalSettings: vi.fn().mockResolvedValue({ success: true }),
  disconnectTelegramBotAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/actions/admin/tenants', () => ({
  toggleTenantMaintenanceAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }
}));

const mockSettings = {
  id: '1',
  maintenanceMode: false,
  siteName: 'TestSite',
} as unknown as SystemSettings;

describe('General Settings Unit Tests', () => {
  it('renders GeneralMaintenanceSection correctly', () => {
    render(
      <GeneralMaintenanceSection
        maintenance={false}
        isTogglingMaintenance={false}
        isMaintenanceModalOpen={false}
        setIsMaintenanceModalOpen={vi.fn()}
        onToggleMaintenance={vi.fn()}
      />
    );
    expect(screen.getByText(/Режим техработ/i)).toBeDefined();
  });

  it('renders GeneralSettings full orchestrator without crashing', () => {
    render(<GeneralSettings settings={mockSettings} tenantId="smmplan" />);
    expect(screen.getAllByText(/Брендинг/i).length).toBeGreaterThanOrEqual(1);
  });
});
