'use client';

import React, { useState } from 'react';
import { Search, AlertTriangle, Check, Copy, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ProviderErrorCode {
  code: string;
  meaning: string;
  action: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  clientScript: string;
}

const ERROR_CODES_REGISTRY: ProviderErrorCode[] = [
  {
    code: 'Bad Link / Invalid URL',
    meaning: 'Формат ссылки некорректен или не поддерживается поставщиком',
    action: 'Проверить targetType услуги и ссылку клиента. Перезапустить с корректным форматом или оформить возврат.',
    severity: 'MEDIUM',
    clientScript: '«Здравствуйте! Ссылка в заказе указана в неподдерживаемом формате. Средства возвращены на баланс — оформите заказ заново с прямой ссылкой!»',
  },
  {
    code: 'Quantity out of range (Min/Max)',
    meaning: 'Заказанный объем не попадает в лимиты провайдера',
    action: 'Сверить service.minQty и service.maxQty с параметрами поставщика. При Drip-Feed проверить floor(Q/N).',
    severity: 'HIGH',
    clientScript: '«Здравствуйте! Объем заказа превысил текущие лимиты поставщика. Мы скорректировали настройки и вернули остаток на баланс.»',
  },
  {
    code: 'Account / Post is private',
    meaning: 'Целевой профиль или канал закрыт настройками приватности',
    action: 'Уведомить клиента об открытии аккаунта. Отменить заказ с 100% авто-возвратом на баланс.',
    severity: 'LOW',
    clientScript: '«Здравствуйте! Ваш аккаунт/канал закрыт. Пожалуйста, откройте его в настройках приватности и перезапустите заказ с баланса!»',
  },
  {
    code: 'Provider balance low / Insufficient funds',
    meaning: 'На шлюзе провайдера закончились денежные средства',
    action: 'P0 Инцидент! Срочно пополнить баланс провайдера в Казначействе либо выполнить Failover на резервный шлюз.',
    severity: 'HIGH',
    clientScript: '«Здравствуйте! Заказ находится в обработке и выполняется на резервной серверной линии. Задержка не превысит 15 минут!»',
  },
  {
    code: 'Rate limit exceeded (429)',
    meaning: 'Превышен лимит параллельных запросов к API провайдера',
    action: 'BullMQ автоматически повторит запрос через экспоненциальный бэкофф. Вмешательства не требуется.',
    severity: 'MEDIUM',
    clientScript: '«Здравствуйте! Идет распределение запросов по пулам серверов. Скорость выполнения будет восстановлена автоматически.»',
  },
  {
    code: 'Order already exists / Duplicate',
    meaning: 'Повторный заказ на ту же ссылку до завершения предыдущего',
    action: 'Большинство провайдеров блокируют дубли. Дождаться COMPLETED предыдущего либо вернуть средства.',
    severity: 'LOW',
    clientScript: '«Здравствуйте! Предыдущий заказ на эту же ссылку еще выполняется поставщиком. Средства за повторный заказ возвращены на баланс!»',
  },
];

export function InteractiveErrorCodeLookup() {
  const [search, setSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filtered = ERROR_CODES_REGISTRY.filter((item) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      item.code.toLowerCase().includes(q) ||
      item.meaning.toLowerCase().includes(q) ||
      item.action.toLowerCase().includes(q)
    );
  });

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      toast.success('Скрипт для тикета скопирован');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error('Не удалось скопировать');
    }
  };

  return (
    <div className="my-6 p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-bold text-foreground">
            Справочник кодов ошибок провайдеров API (Том VIII, Глава 37)
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
          50+ Кодов API
        </span>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по ошибке (например: private, balance, rate limit, duplicate)..."
          className="w-full h-10 pl-10 pr-10 text-xs rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-bold"
          >
            ✕
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {filtered.map((item, idx) => (
          <div key={idx} className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                    item.severity === 'HIGH'
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                      : item.severity === 'MEDIUM'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                  }`}
                >
                  {item.severity}
                </span>
                <span className="text-xs font-bold text-foreground font-mono">{item.code}</span>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(item.clientScript, `err-${idx}`)}
                className="px-2.5 py-1 rounded-lg bg-background hover:bg-muted text-xs font-semibold text-foreground border border-border flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                {copiedCode === `err-${idx}` ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedCode === `err-${idx}` ? 'Скопировано' : 'Скопировать ответ'}</span>
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Значение:</strong> {item.meaning}
            </p>
            <p className="text-xs text-foreground bg-background/60 p-2 rounded-lg border border-border/40 leading-relaxed">
              <strong>Действие оператора:</strong> {item.action}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
