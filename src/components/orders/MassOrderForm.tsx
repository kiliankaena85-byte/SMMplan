'use client';

import { useState } from 'react';
import { createMassOrderAction } from '@/actions/order/mass-order';
import { ActionForm } from '@/components/admin/action-form';
import { ArrowRight, Info } from 'lucide-react';

const inputCls =
  'w-full rounded-xl border border-border bg-background text-foreground ' +
  'text-sm outline-none placeholder:text-muted-foreground ' +
  'focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200';

export function MassOrderForm() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<{success?: boolean; message?: string} | null>(null);

  const handleAction = async () => {
    if (text.length < 10) return { error: 'Введите список заказов' };
    try {
      const res = await createMassOrderAction({ text });
      if (res.success) {
        setResult(res);
        setText('');
        return { success: true };
      } else {
        return { error: res.error || 'Ошибка' };
      }
    } catch (e: any) {
       return { error: e.message || 'Ошибка' };
    }
  };

  return (
    <div className="bg-white shadow-sm ring-1 ring-slate-100 rounded-2xl p-6 space-y-6">
      <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-4 text-sm text-sky-800">
        <h4 className="font-bold flex items-center gap-2 mb-2">
          <Info className="w-4 h-4" /> Формат ввода
        </h4>
        <p className="mb-2">Каждый заказ с новой строки:</p>
        <code className="bg-white/60 px-2 py-1 rounded text-xs font-mono text-sky-900 block">
          service_id | link | quantity<br />
          102 | https://t.me/durov | 1000<br />
          55 | https://t.me/telegram | 500
        </code>
        <p className="mt-2 text-xs text-sky-700/80">Оплата списывается автоматически с внутреннего баланса.</p>
      </div>

      <ActionForm action={handleAction} className="space-y-4">
        <div>
           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
             Список заказов
           </label>
           <textarea
             value={text}
             onChange={e => setText(e.target.value)}
             className={`${inputCls} min-h-[200px] py-3 px-4 resize-y font-mono text-xs`}
             placeholder="102 | https://t.me/durov | 1000"
             required
           />
        </div>
        
        {result?.success && (
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-sm font-semibold text-center border border-emerald-100">
            {result.message}
          </div>
        )}

        <button
          type="submit"
          disabled={text.length < 10}
          className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
            text.length >= 10
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          Запустить массовый заказ <ArrowRight className="w-4 h-4" />
        </button>
      </ActionForm>
    </div>
  );
}
