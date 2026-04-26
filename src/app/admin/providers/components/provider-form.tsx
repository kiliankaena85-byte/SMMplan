'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createProvider,
  updateProvider,
  checkProviderConnection,
} from '@/actions/admin/providers/crud';
import type { ProviderDetailDTO } from '@/services/admin/provider.service';

interface ProviderFormProps {
  /** If provided — edit mode. DTO-safe: never includes raw apiKey. */
  initialData?: ProviderDetailDTO;
}

// Input classes reused across all form controls
const inputCls =
  'block w-full rounded-lg border border-border bg-background text-foreground ' +
  'text-sm p-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ' +
  'placeholder:text-muted-foreground transition-all duration-200';

const labelCls = 'block text-sm font-medium text-foreground mb-1';

export function ProviderForm({ initialData }: ProviderFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; error: boolean } | null>(null);

  const [formData, setFormData] = useState({
    name:            initialData?.name           || '',
    apiUrl:          initialData?.apiUrl          || '',
    apiKey:          '',   // always empty — only set when explicitly changing
    isActive:        initialData?.isActive        ?? true,
    balanceCurrency: initialData?.balanceCurrency || 'USD',
    httpMethod:      initialData?.httpMethod      || 'POST',
    requestType:     initialData?.requestType     || 'form',
    headersText:     initialData?.headersJson     || '{\n  "User-Agent": "Smmplan/1.0"\n}',
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSave() {
    try {
      setLoading(true);
      setStatusMsg(null);

      let headersParsed: Record<string, string> = {};
      try {
        headersParsed = JSON.parse(formData.headersText || '{}');
      } catch {
        throw new Error('HTTP Заголовки должны быть в формате валидного JSON.');
      }

      if (!initialData && !formData.apiKey) {
        throw new Error('API Ключ обязателен при создании провайдера.');
      }

      const payload = {
        name:            formData.name,
        apiUrl:          formData.apiUrl,
        apiKey:          formData.apiKey,
        isActive:        formData.isActive,
        balanceCurrency: formData.balanceCurrency,
        httpMethod:      formData.httpMethod,
        requestType:     formData.requestType,
        headers:         headersParsed,
      };

      if (initialData) {
        await updateProvider(initialData.id, payload);
        setStatusMsg({ text: 'Настройки провайдера сохранены.', error: false });
      } else {
        await createProvider(payload);
        setStatusMsg({ text: 'Провайдер успешно добавлен.', error: false });
        router.push('/admin/providers');
      }

      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setStatusMsg({ text: msg, error: true });
    } finally {
      setLoading(false);
    }
  }

  async function handleCheck() {
    if (!initialData) return;
    setCheckLoading(true);
    setStatusMsg(null);
    try {
      const res = await checkProviderConnection(initialData.id);
      if (res.success && res.balance !== undefined) {
        setStatusMsg({
          text: `✅ Успешно! Баланс: ${String(res.balance)} ${res.currency}`,
          error: false,
        });
      } else {
        setStatusMsg({
          text: `❌ Ошибка: ${(res as { error?: string }).error || 'Нет ответа от сервера'}`,
          error: true,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка соединения';
      setStatusMsg({ text: msg, error: true });
    } finally {
      setCheckLoading(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      {/* Status message */}
      {statusMsg && (
        <div
          className={`p-4 mb-6 rounded-lg text-sm font-medium ${
            statusMsg.error
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">

          {/* Name */}
          <div className="sm:col-span-3">
            <label className={labelCls} htmlFor="provider-name">
              Название панели
            </label>
            <input
              id="provider-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Например: VexBoost"
              className={inputCls}
              aria-label="Название провайдера"
            />
          </div>

          {/* Currency */}
          <div className="sm:col-span-3">
            <label className={labelCls} htmlFor="provider-currency">
              Валюта баланса
            </label>
            <select
              id="provider-currency"
              name="balanceCurrency"
              value={formData.balanceCurrency}
              onChange={handleChange}
              className={inputCls}
            >
              <option value="USD">USD ($)</option>
              <option value="RUB">RUB (₽)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>

          {/* API URL */}
          <div className="sm:col-span-6">
            <label className={labelCls} htmlFor="provider-url">API URL</label>
            <input
              id="provider-url"
              type="url"
              name="apiUrl"
              placeholder="https://example.com/api/v2"
              value={formData.apiUrl}
              onChange={handleChange}
              className={`${inputCls} font-mono`}
              aria-label="API URL провайдера"
            />
          </div>

          {/* API Key */}
          <div className="sm:col-span-6 bg-amber-50/60 border border-amber-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-amber-900 mb-1" htmlFor="provider-key">
              API Key / Secret
            </label>
            <p className="text-xs text-amber-700 mb-2">
              Ключ шифруется (AES-256-GCM) до сохранения в БД.
              {initialData?.hasApiKey && (
                <span className="ml-1 text-emerald-700 font-semibold">Текущий ключ установлен — оставьте поле пустым чтобы не менять.</span>
              )}
            </p>
            <input
              id="provider-key"
              type="password"
              name="apiKey"
              placeholder={initialData?.hasApiKey ? '******** (Скрыто)' : 'Введите API ключ...'}
              value={formData.apiKey}
              onChange={handleChange}
              autoComplete="new-password"
              className={`${inputCls} font-mono border-amber-300 bg-white/80`}
              aria-label="API ключ провайдера"
            />
          </div>

          {/* Technical Settings Section */}
          <div className="sm:col-span-6 pt-4 border-t border-border">
            <h3 className="text-base font-semibold text-foreground">Технические параметры API</h3>
            <p className="text-sm text-muted-foreground mt-0.5 mb-4">
              Тонкая настройка для проприетарных панелей (N1Panel, PerfectPanel).
            </p>
          </div>

          {/* HTTP Method */}
          <div className="sm:col-span-3">
            <label className={labelCls} htmlFor="provider-method">Метод (HTTP)</label>
            <select
              id="provider-method"
              name="httpMethod"
              value={formData.httpMethod}
              onChange={handleChange}
              className={inputCls}
            >
              <option value="POST">POST (Стандарт API v2)</option>
              <option value="GET">GET (VexBoost и др.)</option>
            </select>
          </div>

          {/* Request Type */}
          <div className="sm:col-span-3">
            <label className={labelCls} htmlFor="provider-reqtype">Формат Payload</label>
            <select
              id="provider-reqtype"
              name="requestType"
              value={formData.requestType}
              onChange={handleChange}
              className={inputCls}
            >
              <option value="form">x-www-form-urlencoded</option>
              <option value="json">application/json</option>
            </select>
          </div>

          {/* Custom Headers */}
          <div className="sm:col-span-6">
            <label className={labelCls} htmlFor="provider-headers">
              Кастомные Заголовки (JSON)
            </label>
            <textarea
              id="provider-headers"
              name="headersText"
              rows={4}
              value={formData.headersText}
              onChange={handleChange}
              className={`${inputCls} font-mono text-xs`}
              aria-label="HTTP заголовки в формате JSON"
            />
          </div>

          {/* isActive toggle */}
          <div className="sm:col-span-6 flex items-center gap-3 pt-2">
            <input
              id="provider-active"
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 cursor-pointer"
            />
            <label htmlFor="provider-active" className="text-sm text-foreground cursor-pointer select-none">
              Включить провайдера: принимать заказы и разрешить синхронизацию каталога
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-5 border-t border-border flex justify-between items-center">
          {/* Test connection */}
          <div>
            {initialData && (
              <button
                type="button"
                onClick={handleCheck}
                disabled={checkLoading}
                aria-label="Протестировать API соединение"
                className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-all duration-200 disabled:opacity-50"
              >
                {checkLoading ? '⟳ Проверка...' : '🔌 Тест соединения'}
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/admin/providers')}
              aria-label="Отменить изменения"
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-all duration-200"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              aria-label={initialData ? 'Сохранить изменения провайдера' : 'Создать провайдера'}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Сохранение...' : initialData ? 'Сохранить' : 'Создать подключение'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
