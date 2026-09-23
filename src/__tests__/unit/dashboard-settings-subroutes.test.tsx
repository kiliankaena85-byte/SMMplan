// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock next/navigation
let mockPathname = '/dashboard/settings/security';
const mockRedirect = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(''),
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/actions/user/settings-extra', () => ({
  updateApiWebhookAction: vi.fn().mockResolvedValue({ success: true }),
  generateApiKeyAction: vi.fn().mockResolvedValue({ success: true, apiKey: 'smm_test_123' }),
  resetApiKeyAction: vi.fn().mockResolvedValue({ success: true, apiKey: 'smm_test_456' }),
  revokeApiKeyAction: vi.fn().mockResolvedValue({ success: true }),
  getTelegramBindDetailsAction: vi.fn().mockResolvedValue({ success: true }),
  updateTelegramNotificationSettingsAction: vi.fn().mockResolvedValue({ success: true }),
  unbindTelegramAction: vi.fn().mockResolvedValue({ success: true }),
  updateTaxRequisitesAction: vi.fn().mockResolvedValue({ success: true }),
  confirm152FzConsentAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/actions/auth/password-settings', () => ({
  setPasswordAction: vi.fn().mockResolvedValue({ success: true }),
  changePasswordAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/actions/auth/delete-account', () => ({
  deleteAccountAction: vi.fn().mockResolvedValue({ success: true }),
}));

// Session and DB mocks for Server Pages
const mockVerifySession = vi.fn();
vi.mock('@/lib/session', () => ({
  verifySession: () => mockVerifySession(),
}));

const mockDbUserFindUnique = vi.fn();
vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: (args: unknown) => mockDbUserFindUnique(args),
    },
  },
}));

import { SettingsSubNav, SETTINGS_NAV_ITEMS } from '@/components/dashboard/settings/SettingsSubNav';
import { SettingsBreadcrumbs } from '@/components/dashboard/settings/SettingsBreadcrumbs';
import { ProfileSummaryCard } from '@/components/dashboard/settings/ProfileSummaryCard';
import { ApiDashboardClient } from '@/components/dashboard/settings/api/ApiDashboardClient';
import SettingsIndexPage from '@/app/dashboard/settings/page';
import SecuritySettingsPage from '@/app/dashboard/settings/security/page';
import NotificationsSettingsPage from '@/app/dashboard/settings/notifications/page';
import RequisitesSettingsPage from '@/app/dashboard/settings/requisites/page';
import ApiSettingsPage from '@/app/dashboard/settings/api/page';

describe('Settings Nested Sub-Routes Suite (Option A 2026)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/dashboard/settings/security';
  });

  describe('1. SettingsSubNav Component', () => {
    it('renders all 4 tabs with proper links, text and Touch Target >= 44px', () => {
      render(<SettingsSubNav />);

      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeDefined();

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(4);

      expect(screen.getByText('Безопасность')).toBeDefined();
      expect(screen.getByText('Уведомления')).toBeDefined();
      expect(screen.getByText('API и вебхуки')).toBeDefined();
      expect(screen.getByText('Реквизиты компании')).toBeDefined();

      tabs.forEach((tab) => {
        expect(tab.className).toContain('min-h-[44px]');
      });
    });

    it('correctly marks active tab based on current pathname', () => {
      mockPathname = '/dashboard/settings/notifications';
      const { rerender } = render(<SettingsSubNav />);

      const notificationsTab = screen.getByRole('tab', { name: /Уведомления/ });
      expect(notificationsTab.getAttribute('aria-selected')).toBe('true');

      const securityTab = screen.getByRole('tab', { name: /Безопасность/ });
      expect(securityTab.getAttribute('aria-selected')).toBe('false');

      // Change to requisites
      mockPathname = '/dashboard/settings/requisites';
      rerender(<SettingsSubNav />);

      const requisitesTab = screen.getByRole('tab', { name: /Реквизиты компании/ });
      expect(requisitesTab.getAttribute('aria-selected')).toBe('true');

      // Default to security when on root settings path
      mockPathname = '/dashboard/settings';
      rerender(<SettingsSubNav />);
      const defaultSecurityTab = screen.getByRole('tab', { name: /Безопасность/ });
      expect(defaultSecurityTab.getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('1.1 SettingsBreadcrumbs Component', () => {
    it('renders root breadcrumb on /dashboard/settings', () => {
      mockPathname = '/dashboard/settings';
      render(<SettingsBreadcrumbs />);

      expect(screen.getByText('Настройки')).toBeDefined();
    });

    it('renders subroute breadcrumbs with link to /dashboard/settings and active subpage crumb', () => {
      mockPathname = '/dashboard/settings/api';
      const { rerender } = render(<SettingsBreadcrumbs />);

      const settingsLink = screen.getByRole('link', { name: 'Настройки' });
      expect(settingsLink).toBeDefined();
      expect(settingsLink.getAttribute('href')).toBe('/dashboard/settings');

      expect(screen.getByText('API и вебхуки')).toBeDefined();

      // Test notifications
      mockPathname = '/dashboard/settings/notifications';
      rerender(<SettingsBreadcrumbs />);
      expect(screen.getByText('Уведомления')).toBeDefined();

      // Test security
      mockPathname = '/dashboard/settings/security';
      rerender(<SettingsBreadcrumbs />);
      expect(screen.getByText('Безопасность')).toBeDefined();

      // Test requisites
      mockPathname = '/dashboard/settings/requisites';
      rerender(<SettingsBreadcrumbs />);
      expect(screen.getByText('Реквизиты компании')).toBeDefined();
    });
  });

  describe('2. ProfileSummaryCard Component', () => {
    it('renders user details, initials, and basic tier for low spent', () => {
      render(
        <ProfileSummaryCard
          email="client@smmplan.pro"
          balance={BigInt(150000)} // 1500.00 ₽
          totalSpent={BigInt(50000)} // 500.00 ₽
          createdAt={new Date('2026-01-15')}
          orderCount={12}
          referralCount={3}
        />
      );

      expect(screen.getByText('client@smmplan.pro')).toBeDefined();
      expect(screen.getByText('CL')).toBeDefined();
      expect(screen.getByText(/Базовый/)).toBeDefined();
      expect(screen.getByText('12')).toBeDefined();
      expect(screen.getByText('3')).toBeDefined();
      expect(screen.getByText(/1.*500.*₽/)).toBeDefined();
    });

    it('renders Platinum tier for totalSpent >= 50,000 ₽', () => {
      render(
        <ProfileSummaryCard
          email="vip@smmplan.pro"
          balance={BigInt(5000000)}
          totalSpent={BigInt(6000000)} // 60,000 ₽
          createdAt={new Date('2025-06-01')}
          orderCount={150}
          referralCount={45}
        />
      );

      expect(screen.getByText(/Платиновый/)).toBeDefined();
      expect(screen.getByText('150')).toBeDefined();
    });

    it('renders Gold and Silver tiers at respective thresholds', () => {
      const { rerender } = render(
        <ProfileSummaryCard
          email="gold@smmplan.pro"
          balance={BigInt(100000)}
          totalSpent={BigInt(1500000)} // 15,000 ₽ -> Gold
          createdAt={new Date('2025-06-01')}
          orderCount={20}
          referralCount={5}
        />
      );
      expect(screen.getByText(/Золотой/)).toBeDefined();

      rerender(
        <ProfileSummaryCard
          email="silver@smmplan.pro"
          balance={BigInt(100000)}
          totalSpent={BigInt(300000)} // 3,000 ₽ -> Silver
          createdAt={new Date('2025-06-01')}
          orderCount={5}
          referralCount={1}
        />
      );
      expect(screen.getByText(/Серебряный/)).toBeDefined();
    });

    it('safely handles fallback initials when email is unusual or empty', () => {
      render(
        <ProfileSummaryCard
          email=""
          balance={0}
          totalSpent={0}
          createdAt={new Date()}
          orderCount={0}
          referralCount={0}
        />
      );
      expect(screen.getByText('US')).toBeDefined();
      expect(screen.getByText(/Базовый/)).toBeDefined();
    });
  });

  describe('3. SettingsIndexPage Backwards-Compatibility Redirects', () => {
    it('redirects to /dashboard/settings/security by default when tab is missing', async () => {
      await expect(
        SettingsIndexPage({ searchParams: Promise.resolve({}) })
      ).rejects.toThrow('REDIRECT:/dashboard/settings/security');
    });

    it('redirects to /dashboard/settings/api when ?tab=api is passed', async () => {
      await expect(
        SettingsIndexPage({ searchParams: Promise.resolve({ tab: 'api' }) })
      ).rejects.toThrow('REDIRECT:/dashboard/settings/api');
    });

    it('redirects to /dashboard/settings/notifications when ?tab=notifications is passed', async () => {
      await expect(
        SettingsIndexPage({ searchParams: Promise.resolve({ tab: 'notifications' }) })
      ).rejects.toThrow('REDIRECT:/dashboard/settings/notifications');
    });

    it('redirects to /dashboard/settings/requisites when ?tab=company or ?tab=requisites is passed', async () => {
      await expect(
        SettingsIndexPage({ searchParams: Promise.resolve({ tab: 'company' }) })
      ).rejects.toThrow('REDIRECT:/dashboard/settings/requisites');

      await expect(
        SettingsIndexPage({ searchParams: Promise.resolve({ tab: 'requisites' }) })
      ).rejects.toThrow('REDIRECT:/dashboard/settings/requisites');
    });
  });

  describe('4. ApiDashboardClient Component Consolidation', () => {
    it('renders tabs selector for Keys & Webhooks vs Documentation with Touch Target >= 44px', () => {
      render(
        <ApiDashboardClient
          hasKey={true}
          webhookInitialData={{
            webhookUrl: 'https://webhook.site/test',
            webhookSecret: 'sec_123',
            isWebhookActive: true,
          }}
        />
      );

      const keysTab = screen.getByRole('tab', { name: /Ключи и Вебхуки/ });
      const docsTab = screen.getByRole('tab', { name: /Документация API v2/ });

      expect(keysTab).toBeDefined();
      expect(docsTab).toBeDefined();
      expect(keysTab.className).toContain('min-h-[44px]');
      expect(docsTab.className).toContain('min-h-[44px]');

      // Shows keys & webhooks content by default
      expect(screen.getByText('Управление API-ключами')).toBeDefined();
      expect(screen.getByText('Webhook & Автоматизация')).toBeDefined();

      // Switch to Docs
      fireEvent.click(docsTab);
      expect(screen.getByText('Интеграционная документация API v2')).toBeDefined();
      expect(screen.getByText('services (Список услуг)')).toBeDefined();
    });
  });

  describe('5. Isolated Server Components with Zero Overfetching', () => {
    it('SecuritySettingsPage verifies session and queries only passwordHash', async () => {
      mockVerifySession.mockResolvedValue({ userId: 'usr_1', canResetPassword: false, tenantId: 'smmplan' });
      mockDbUserFindUnique.mockResolvedValue({ passwordHash: 'hash_xyz' });

      const pageElement = await SecuritySettingsPage();
      expect(mockDbUserFindUnique).toHaveBeenCalledWith({
        where: { id: 'usr_1' },
        select: { passwordHash: true },
      });

      render(pageElement);
      expect(screen.getByText('Смена пароля')).toBeDefined();
      expect(screen.getByText('Сессия и безопасность')).toBeDefined();
      expect(screen.getByText('Опасная зона')).toBeDefined();
    });

    it('NotificationsSettingsPage queries only telegram and consent fields', async () => {
      mockVerifySession.mockResolvedValue({ userId: 'usr_2' });
      mockDbUserFindUnique.mockResolvedValue({
        telegramId: '123456789',
        telegramNotifyOrders: true,
        telegramNotifyBalance: false,
        telegramNotifyTickets: true,
        tosAcceptedAt: new Date('2026-01-01'),
        tosAcceptedIp: '192.168.1.1',
      });

      const pageElement = await NotificationsSettingsPage();
      expect(mockDbUserFindUnique).toHaveBeenCalledWith({
        where: { id: 'usr_2' },
        select: {
          telegramId: true,
          telegramNotifyOrders: true,
          telegramNotifyBalance: true,
          telegramNotifyTickets: true,
          tosAcceptedAt: true,
          tosAcceptedIp: true,
        },
      });

      render(pageElement);
      expect(screen.getByText('Smart Bind Telegram')).toBeDefined();
      expect(screen.getByText('Согласие по 152-ФЗ (Персональные данные)')).toBeDefined();
    });

    it('RequisitesSettingsPage queries only company requisition fields', async () => {
      mockVerifySession.mockResolvedValue({ userId: 'usr_3' });
      mockDbUserFindUnique.mockResolvedValue({
        companyName: 'ООО Ромашка',
        inn: '7701234567',
        kpp: '770101001',
        ogrn: '1234567890123',
        legalAddress: 'г. Москва, ул. Ленина, д. 1',
      });

      const pageElement = await RequisitesSettingsPage();
      expect(mockDbUserFindUnique).toHaveBeenCalledWith({
        where: { id: 'usr_3' },
        select: {
          companyName: true,
          inn: true,
          kpp: true,
          ogrn: true,
          legalAddress: true,
        },
      });

      render(pageElement);
      expect(screen.getByText('Реквизиты организации и налоговые данные')).toBeDefined();
    });

    it('ApiSettingsPage queries only apiKeyHash and apiConfig', async () => {
      mockVerifySession.mockResolvedValue({ userId: 'usr_4' });
      mockDbUserFindUnique.mockResolvedValue({
        apiKeyHash: 'keyhash_123',
        apiConfig: {
          webhookUrl: 'https://webhook.site/smm',
          webhookSecret: 'secret_abc',
          isWebhookActive: true,
        },
      });

      const pageElement = await ApiSettingsPage();
      expect(mockDbUserFindUnique).toHaveBeenCalledWith({
        where: { id: 'usr_4' },
        select: {
          apiKeyHash: true,
          apiConfig: {
            select: {
              webhookUrl: true,
              webhookSecret: true,
              isWebhookActive: true,
            },
          },
        },
      });

      render(pageElement);
      expect(screen.getByText('Ключи и Вебхуки')).toBeDefined();
      expect(screen.getByText('Документация API v2')).toBeDefined();
    });
  });
});
