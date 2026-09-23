'use client';

import React, { useState } from 'react';
import { Terminal } from 'lucide-react';
import { getCurlCode, getNodeCode, jsonResponse } from './ApiReferenceDocsData';
import { ApiParamsTable } from './ApiParamsTable';
import { ApiCodeSnippet } from './ApiCodeSnippet';

interface ApiReferenceDocsProps {
  userApiKey: string | null;
}

type ApiAction = 'services' | 'add' | 'status' | 'balance';

const ACTIONS: { id: ApiAction; label: string }[] = [
  { id: 'services', label: 'services (Список услуг)' },
  { id: 'add', label: 'add (Новый заказ)' },
  { id: 'status', label: 'status (Статус заказа)' },
  { id: 'balance', label: 'balance (Запрос баланса)' },
];

const METHOD_DESCRIPTIONS: Record<ApiAction, string> = {
  services: 'Возвращает полный каталог активных услуг, доступных лимитов и тарифов с учетом вашей персональной скидки реселлера.',
  add: 'Создает новый заказ в системе продвижения. Сумма заказа рассчитывается автоматически и списывается с баланса вашего API-аккаунта.',
  status: 'Query-опрос состояния заказа. Позволяет узнать остаток невыполненной продвижения (remains) и текущий статус выполнения.',
  balance: 'Быстрый запрос текущего остатка средств на балансе в рублях РФ.',
};

export function ApiReferenceDocs({ userApiKey }: ApiReferenceDocsProps) {
  const [activeAction, setActiveAction] = useState<ApiAction>('services');

  const displayKey = userApiKey || '<ВАШ_API_КЛЮЧ>';
  const host = typeof window !== 'undefined' ? window.location.origin : 'https://smmplan.pro';

  const curlCode = getCurlCode(host, displayKey);
  const nodeCode = getNodeCode(host, displayKey);

  return (
    <div className="space-y-6">
      {/* API Action Selector Tabs */}
      <div className="flex flex-wrap border-b border-border/60 select-none gap-2 pb-2">
        {ACTIONS.map(({ id, label }) => {
          const isActive = activeAction === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveAction(id)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer min-h-[44px] ${
                isActive ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* API Details and Parameter Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Description & Parameters */}
        <div className="space-y-5">
          <div>
            <h4 className="font-extrabold text-foreground text-sm flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary shrink-0" />
              <span>Описание метода</span>
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              {METHOD_DESCRIPTIONS[activeAction]}
            </p>
          </div>

          <ApiParamsTable activeAction={activeAction} />
        </div>

        {/* Right: Code Blocks */}
        <ApiCodeSnippet
          curlCode={curlCode[activeAction]}
          nodeCode={nodeCode[activeAction]}
          jsonResponse={jsonResponse[activeAction]}
        />
      </div>
    </div>
  );
}
