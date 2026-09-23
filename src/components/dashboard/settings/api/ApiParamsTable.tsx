'use client';

import React from 'react';

export interface ApiParamsTableProps {
  activeAction: 'services' | 'add' | 'status' | 'balance';
}

export function ApiParamsTable({ activeAction }: ApiParamsTableProps) {
  return (
    <div className="space-y-3">
      <h5 className="font-extrabold text-foreground text-xs uppercase tracking-wider">Параметры запроса</h5>
      <div className="border border-border/60 rounded-xl overflow-hidden shadow-sm bg-muted/20">
        <table className="w-full text-xs" aria-label="Параметры API">
          <thead>
            <tr className="bg-muted text-left text-[9px] uppercase tracking-wider text-muted-foreground border-b border-border/40 select-none">
              <th className="py-2.5 px-4 font-bold">Поле</th>
              <th className="py-2.5 px-4 font-bold">Тип</th>
              <th className="py-2.5 px-4 font-bold">Обяз.</th>
              <th className="py-2.5 px-4 font-bold">Описание</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/40">
              <td className="py-2.5 px-4 font-mono font-bold text-foreground">key</td>
              <td className="py-2.5 px-4 text-muted-foreground">string</td>
              <td className="py-2.5 px-4 text-rose-500 font-bold">Да</td>
              <td className="py-2.5 px-4 text-muted-foreground">Ваш уникальный API-ключ реселлера.</td>
            </tr>
            <tr className="border-b border-border/40">
              <td className="py-2.5 px-4 font-mono font-bold text-foreground">action</td>
              <td className="py-2.5 px-4 text-muted-foreground">string</td>
              <td className="py-2.5 px-4 text-rose-500 font-bold">Да</td>
              <td className="py-2.5 px-4 text-muted-foreground">
                Название метода: <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{activeAction}</code>
              </td>
            </tr>

            {activeAction === 'services' && (
              <tr>
                <td className="py-2.5 px-4 font-mono font-bold text-foreground">offset</td>
                <td className="py-2.5 px-4 text-muted-foreground">int</td>
                <td className="py-2.5 px-4 text-muted-foreground">Нет</td>
                <td className="py-2.5 px-4 text-muted-foreground">Смещение для пагинации каталога (по умолчанию 0).</td>
              </tr>
            )}

            {activeAction === 'add' && (
              <>
                <tr className="border-b border-border/40">
                  <td className="py-2.5 px-4 font-mono font-bold text-foreground">service</td>
                  <td className="py-2.5 px-4 text-muted-foreground">int</td>
                  <td className="py-2.5 px-4 text-rose-500 font-bold">Да</td>
                  <td className="py-2.5 px-4 text-muted-foreground">ID тарифа (например, из списка услуг).</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2.5 px-4 font-mono font-bold text-foreground">link</td>
                  <td className="py-2.5 px-4 text-muted-foreground">string</td>
                  <td className="py-2.5 px-4 text-rose-500 font-bold">Да</td>
                  <td className="py-2.5 px-4 text-muted-foreground">Ссылка на объект продвижения (профиль, пост, канал).</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-mono font-bold text-foreground">quantity</td>
                  <td className="py-2.5 px-4 text-muted-foreground">int</td>
                  <td className="py-2.5 px-4 text-rose-500 font-bold">Да</td>
                  <td className="py-2.5 px-4 text-muted-foreground">Количество продвижения (в рамках мин/макс лимитов).</td>
                </tr>
              </>
            )}

            {activeAction === 'status' && (
              <>
                <tr className="border-b border-border/40">
                  <td className="py-2.5 px-4 font-mono font-bold text-foreground">order</td>
                  <td className="py-2.5 px-4 text-muted-foreground">int</td>
                  <td className="py-2.5 px-4 text-muted-foreground">Част.</td>
                  <td className="py-2.5 px-4 text-muted-foreground">Порядковый ID заказа для одиночной проверки.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-mono font-bold text-foreground">orders</td>
                  <td className="py-2.5 px-4 text-muted-foreground">string</td>
                  <td className="py-2.5 px-4 text-muted-foreground">Част.</td>
                  <td className="py-2.5 px-4 text-muted-foreground">Список ID через запятую для пакетной проверки (макс 100).</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
