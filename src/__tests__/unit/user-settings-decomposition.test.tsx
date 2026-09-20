// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mocks for Server Actions & Next.js Navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(''),
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
  getTelegramBindDetailsAction: vi.fn().mockResolvedValue({
    success: true,
    botUsername: 'smmplan_test_bot',
    bindToken: 'tg_bind_testtoken123',
    deepLink: 'https://t.me/smmplan_test_bot?start=tg_bind_testtoken123',
    expiresAt: new Date(Date.now() + 900000).toISOString(),
  }),
  updateTelegramNotificationSettingsAction: vi.fn().mockResolvedValue({
    success: true,
    telegramNotifyOrders: true,
    telegramNotifyBalance: false,
    telegramNotifyTickets: true,
  }),
  unbindTelegramAction: vi.fn().mockResolvedValue({ success: true }),
  updateApiWebhookAction: vi.fn().mockResolvedValue({
    success: true,
    webhookUrl: 'https://api.example.com/webhook',
    webhookSecret: 'sec_test_12345',
    isWebhookActive: true,
  }),
  generateApiKeyAction: vi.fn().mockResolvedValue({
    success: true,
    apiKey: 'smm_test_generated_api_key_123',
  }),
  resetApiKeyAction: vi.fn().mockResolvedValue({
    success: true,
    apiKey: 'smm_test_reset_api_key_456',
  }),
  revokeApiKeyAction: vi.fn().mockResolvedValue({ success: true }),
  updateTaxRequisitesAction: vi.fn().mockResolvedValue({ success: true }),
  confirm152FzConsentAction: vi.fn().mockResolvedValue({
    success: true,
    tosAcceptedAt: new Date(),
    tosAcceptedIp: '127.0.0.1',
  }),
}));

vi.mock('@/actions/auth/password-settings', () => ({
  setPasswordAction: vi.fn().mockResolvedValue({ success: true }),
  changePasswordAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/actions/auth/delete-account', () => ({
  deleteAccountAction: vi.fn().mockResolvedValue({ success: true }),
}));

// Components under test
import TelegramCard from '@/components/dashboard/settings/TelegramCard';
import PasswordCard from '@/components/dashboard/settings/PasswordCard';
import DeleteAccountCard from '@/components/dashboard/settings/DeleteAccountCard';
import ApiKeyManager from '@/app/dashboard/settings/api/ApiKeyManager';
import ApiWebhookCard from '@/components/settings/ApiWebhookCard';
import { SettingsTabsClient } from '@/components/dashboard/settings/SettingsTabsClient';
import { TelegramBindModal } from '@/components/dashboard/settings/telegram/TelegramBindModal';
import { TelegramNotificationToggles } from '@/components/dashboard/settings/telegram/TelegramNotificationToggles';
import { PasswordInputField } from '@/components/dashboard/settings/password/PasswordInputField';

describe('User Settings Decomposition Suite (Wave 2026)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TelegramCard & Subcomponents', () => {
    it('renders connected state with masked Telegram ID and bot link', () => {
      render(
        <TelegramCard
          telegramId="987654321"
          notifyOrders={true}
          notifyBalance={true}
          notifyTickets={true}
        />
      );

      expect(screen.getByText('Smart Bind Telegram')).toBeDefined();
      expect(screen.getByText('Подключено')).toBeDefined();
      expect(screen.getByText('tg: 987****')).toBeDefined();
      expect(screen.getByText('Бот')).toBeDefined();
    });

    it('renders unconnected state with alert badge and 1-click bind button', () => {
      render(
        <TelegramCard
          telegramId={null}
          notifyOrders={true}
          notifyBalance={true}
          notifyTickets={true}
        />
      );

      expect(screen.getByText('Не привязано')).toBeDefined();
      expect(screen.getByText('Привязать в 1 клик')).toBeDefined();
    });

    it('renders TelegramNotificationToggles with accessible switches', () => {
      const onToggle = vi.fn();
      render(
        <TelegramNotificationToggles
          notifyOrders={true}
          notifyBalance={false}
          notifyTickets={true}
          isPending={false}
          onToggle={onToggle}
        />
      );

      const switches = screen.getAllByRole('switch');
      expect(switches).toHaveLength(3);

      expect(switches[0].getAttribute('aria-checked')).toBe('true');
      expect(switches[1].getAttribute('aria-checked')).toBe('false');
      expect(switches[2].getAttribute('aria-checked')).toBe('true');

      fireEvent.click(switches[1]);
      expect(onToggle).toHaveBeenCalledWith('notifyBalance', false);
    });

    it('renders TelegramBindModal and supports link copying', () => {
      const onCopy = vi.fn();
      const onClose = vi.fn();
      const onRefresh = vi.fn();

      render(
        <TelegramBindModal
          isOpen={true}
          onClose={onClose}
          deepLink="https://t.me/smmplan_test_bot?start=token123"
          isLoading={false}
          copied={false}
          onCopyLink={onCopy}
          onRefresh={onRefresh}
        />
      );

      expect(screen.getByText('Привязка Telegram в 1 клик')).toBeDefined();
      expect(screen.getByText('Открыть Telegram-бот')).toBeDefined();

      const copyBtn = screen.getByLabelText('Скопировать ссылку');
      fireEvent.click(copyBtn);
      expect(onCopy).toHaveBeenCalled();
    });
  });

  describe('PasswordCard & PasswordInputField', () => {
    it('renders PasswordInputField with show/hide password toggle', () => {
      const onChange = vi.fn();
      const onToggle = vi.fn();

      const { rerender } = render(
        <PasswordInputField
          id="test-pass"
          label="Тестовый пароль"
          value="secret123"
          onChange={onChange}
          showPasswordToggle={true}
          showPassword={false}
          onToggleShowPassword={onToggle}
        />
      );

      const input = screen.getByPlaceholderText('••••••••') as HTMLInputElement;
      expect(input.type).toBe('password');

      const toggleBtn = screen.getByLabelText('Показать пароль');
      fireEvent.click(toggleBtn);
      expect(onToggle).toHaveBeenCalled();

      // Rerender as visible
      rerender(
        <PasswordInputField
          id="test-pass"
          label="Тестовый пароль"
          value="secret123"
          onChange={onChange}
          showPasswordToggle={true}
          showPassword={true}
          onToggleShowPassword={onToggle}
        />
      );

      expect(input.type).toBe('text');
    });

    it('renders PasswordCard in update password mode when hasPassword=true', () => {
      render(<PasswordCard hasPassword={true} />);

      expect(screen.getByText('Смена пароля')).toBeDefined();
      expect(screen.getByLabelText('Текущий пароль')).toBeDefined();
      expect(screen.getByText('Обновить пароль')).toBeDefined();
    });

    it('renders PasswordCard in initial setup mode when hasPassword=false', () => {
      render(<PasswordCard hasPassword={false} />);

      expect(screen.getByText('Защита аккаунта')).toBeDefined();
      expect(screen.getByText('Установить пароль')).toBeDefined();
      expect(screen.queryByLabelText('Текущий пароль')).toBeNull();
    });
  });

  describe('DeleteAccountCard & DeleteAccountModal', () => {
    it('opens confirmation modal and enforces "УДАЛИТЬ" confirmation text', () => {
      render(<DeleteAccountCard hasPassword={false} />);

      expect(screen.getByText('Опасная зона')).toBeDefined();
      const triggerBtn = screen.getByRole('button', { name: 'Удалить аккаунт' });
      fireEvent.click(triggerBtn);

      expect(screen.getByText('Подтвердите удаление')).toBeDefined();
      expect(screen.getByText('Это действие необратимо')).toBeDefined();

      const submitBtns = screen.getAllByRole('button', { name: 'Удалить аккаунт' });
      const modalSubmitBtn = submitBtns[submitBtns.length - 1] as HTMLButtonElement;
      expect(modalSubmitBtn.disabled).toBe(true);

      const input = screen.getByPlaceholderText('УДАЛИТЬ');
      fireEvent.change(input, { target: { value: 'УДАЛИТЬ' } });

      expect(modalSubmitBtn.disabled).toBe(false);
    });
  });

  describe('ApiKeyManager & Subcomponents', () => {
    it('renders ungenerated state when hasKey=false', () => {
      render(<ApiKeyManager hasKey={false} />);

      expect(screen.getByText(/У вас ещё не создан API-ключ/)).toBeDefined();
      expect(screen.getByText('Сгенерировать API-ключ')).toBeDefined();
    });

    it('renders active key view with SHA-256 protection notice when hasKey=true', () => {
      render(<ApiKeyManager hasKey={true} />);

      expect(screen.getByText('API-ключ активен (SHA-256)')).toBeDefined();
      expect(screen.getByText('Сгенерировать новый')).toBeDefined();
      expect(screen.getByText('Отозвать')).toBeDefined();
    });

    it('requires 2-step confirmation to revoke API key safely and transitions to ungenerated state', async () => {
      render(<ApiKeyManager hasKey={true} />);

      const revokeBtn = screen.getByText('Отозвать');
      fireEvent.click(revokeBtn);

      expect(screen.getByText('Отозвать ключ навсегда?')).toBeDefined();
      const confirmBtn = screen.getByRole('button', { name: 'Да, удалить' });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByText(/У вас ещё не создан API-ключ/)).toBeDefined();
      });
    });
  });

  describe('ApiWebhookCard', () => {
    it('renders webhook configuration with active power switch', () => {
      render(
        <ApiWebhookCard
          initialData={{
            webhookUrl: 'https://example.com/hook',
            webhookSecret: 'sec_123',
            isWebhookActive: true,
          }}
        />
      );

      expect(screen.getByText('Webhook & Автоматизация')).toBeDefined();
      expect(screen.getByText('Активен')).toBeDefined();
      expect(screen.getByLabelText('Скопировать секрет вебхука')).toBeDefined();
    });
  });

  describe('SettingsTabsClient Orchestration', () => {
    it('renders all 4 tabs and allows switching', () => {
      const mockUser = {
        email: 'user@smmplan.pro',
        hasPassword: true,
        canResetPassword: false,
        telegramId: null,
        telegramNotifyOrders: true,
        telegramNotifyBalance: true,
        telegramNotifyTickets: true,
        tosAcceptedAt: new Date(),
        tosAcceptedIp: '127.0.0.1',
        apiKeyHash: 'hash123',
        companyName: null,
        inn: null,
        kpp: null,
        ogrn: null,
        legalAddress: null,
      };

      render(<SettingsTabsClient user={mockUser} />);

      expect(screen.getByText('Безопасность')).toBeDefined();
      expect(screen.getByText('Уведомления')).toBeDefined();
      expect(screen.getByText('API')).toBeDefined();
      expect(screen.getByText('Реквизиты')).toBeDefined();

      // Switch to Notifications tab
      const notificationsTab = screen.getByRole('tab', { name: /Уведомления/ });
      fireEvent.click(notificationsTab);

      expect(screen.getByText('Smart Bind Telegram')).toBeDefined();
      expect(screen.getByText('Согласие по 152-ФЗ (Персональные данные)')).toBeDefined();

      // Switch to API tab
      const apiTab = screen.getByRole('tab', { name: /API/ });
      fireEvent.click(apiTab);

      expect(screen.getByText('Управление API-ключами')).toBeDefined();
      expect(screen.getByText('Webhook & Автоматизация')).toBeDefined();

      // Switch to Company tab
      const companyTab = screen.getByRole('tab', { name: /Реквизиты/ });
      fireEvent.click(companyTab);

      expect(screen.getByText('Реквизиты организации и налоговые данные')).toBeDefined();
    });
  });
});
