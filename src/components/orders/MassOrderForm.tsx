'use client';

import { Clock } from 'lucide-react';

/**
 * MassOrderForm — массовые заказы.
 * TODO Sprint 2.8: подключить Server Action createMassOrder().
 * Пока показываем coming-soon UI согласно AGENTS.md Dead-UI Prevention.
 */
export function MassOrderForm() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
        <Clock className="w-6 h-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold text-foreground text-sm">Массовые заказы — скоро</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Функция массовой отправки заказов находится в разработке. 
          Используйте стандартный режим заказа пока она недоступна.
        </p>
      </div>
    </div>
  );
}
