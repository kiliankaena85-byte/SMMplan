'use client';

import { useTransition, useState } from 'react';
import { adminToggleTestMode, adminClearTestData } from '@/actions/admin/test-mode.actions';

interface TestModePanelProps {
  initialIsTestMode: boolean;
}

/**
 * Interactive Test Mode control panel.
 * Allows admin to toggle Ghost Proxy and clear test data.
 */
export function TestModePanel({ initialIsTestMode }: TestModePanelProps) {
  const [isTestMode, setIsTestMode] = useState(initialIsTestMode);
  const [isPending, startTransition] = useTransition();
  const [clearPending, startClearTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleToggle() {
    const newValue = !isTestMode;
    startTransition(async () => {
      const result = await adminToggleTestMode(newValue);
      if ('success' in result && result.success) {
        setIsTestMode(newValue);
        setMessage((result as { message: string }).message);
        // Force page reload to update the global banner
        window.location.reload();
      }
    });
  }

  function handleClearTestData() {
    if (!confirm('Вы уверены? Все тестовые заказы будут БЕЗВОЗВРАТНО удалены.')) return;
    startClearTransition(async () => {
      const result = await adminClearTestData();
      if ('success' in result && result.success) {
        setMessage((result as { message: string }).message);
      } else {
        setMessage('error' in result ? (result as { error: string }).error : 'Ошибка очистки');
      }
    });
  }

  return (
    <div className={`rounded-xl border-2 p-5 transition-all duration-300 ${
      isTestMode 
        ? 'border-amber-400 bg-warning/10/80 shadow-amber-100 shadow-lg' 
        : 'border-emerald-200 bg-success/10/50'
    }`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{isTestMode ? '🧪' : '🟢'}</span>
            <h3 className="font-bold text-foreground">
              {isTestMode ? 'Тестовый режим АКТИВЕН' : 'Боевой режим'}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isTestMode 
              ? 'Заказы НЕ отправляются реальным провайдерам. Все запросы перехватываются Ghost Proxy и направляются во внутренний эмулятор. Оплата через тестовые ключи Юкассы.'
              : 'Все заказы отправляются реальным провайдерам. Оплата через боевые ключи Юкассы. Расходуются реальные средства.'
            }
          </p>
        </div>

        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isTestMode 
              ? 'bg-warning focus:ring-amber-500' 
              : 'bg-success focus:ring-emerald-500'
          } ${isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-background shadow-md transition-transform duration-300 ${
              isTestMode ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {isTestMode && (
        <div className="mt-4 pt-4 border-t border-amber-300/50 flex items-center justify-between">
          <p className="text-xs text-amber-800 font-medium">
            💡 Не забудьте выключить после тестирования!
          </p>
          <button
            onClick={handleClearTestData}
            disabled={clearPending}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition-colors disabled:opacity-50"
          >
            {clearPending ? 'Очистка...' : '🗑 Очистить тестовые данные'}
          </button>
        </div>
      )}

      {message && (
        <div className="mt-3 text-xs font-medium text-muted-foreground bg-background/80 rounded-lg px-3 py-2 border border-border">
          ✅ {message}
        </div>
      )}
    </div>
  );
}
