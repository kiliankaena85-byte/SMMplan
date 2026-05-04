'use client';

import React, { useState, useRef } from 'react';
import { createMassOrderAction } from '@/actions/order/mass-order';
import { ActionForm } from '@/components/admin/action-form';
import { ArrowRight, Info } from 'lucide-react';

/** Превращает URL в тексте в кликабельную ссылку */
function linkifyText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 break-all">{part}</a>
    ) : part
  );
}

const inputCls =
  'w-full rounded-xl border border-border bg-background text-foreground ' +
  'text-sm outline-none placeholder:text-muted-foreground ' +
  'focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200';

export function MassOrderForm() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<{success?: boolean; message?: string} | null>(null);
  
  const formRef = useRef<HTMLFormElement>(null);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [requirementsConfirmed, setRequirementsConfirmed] = useState(false);
  const [modalRequirements, setModalRequirements] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setRequirementsConfirmed(false);
  };

  const confirmRequirementsAndSubmit = () => {
    setRequirementsConfirmed(true);
    setShowRequirementsModal(false);
    setTimeout(() => {
       formRef.current?.requestSubmit();
    }, 50);
  };

  const handleAction = async () => {
    if (text.length < 10) return { error: 'Введите список заказов' };
    setLoading(true);
    try {
      const res = await createMassOrderAction({ text, requirementsConfirmed });
      
      if (res.success) {
        if (res.data?.requiresConfirmation) {
           setModalRequirements(res.data.aggregatedRequirements || []);
           setShowRequirementsModal(true);
           setLoading(false);
           return; 
        }

        setResult(res.data);
        setText('');
        setRequirementsConfirmed(false);
        setLoading(false);
        return { success: true };
      } else {
        setLoading(false);
        return { error: res.error || 'Ошибка' };
      }
    } catch (e: any) {
       setLoading(false);
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

      <ActionForm action={handleAction} className="space-y-4" formRef={formRef}>
        <div>
           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
             Список заказов
           </label>
           <textarea
             value={text}
             onChange={handleTextChange}
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
          disabled={text.length < 10 || loading}
          className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
            text.length >= 10 && !loading
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          {loading ? 'Обработка...' : 'Запустить массовый заказ'} <ArrowRight className="w-4 h-4" />
        </button>
      </ActionForm>

      {/* REQUIREMENTS MODAL */}
      {showRequirementsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-200">
            <div className="p-6 pb-0">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Важные требования</h3>
              <p className="text-sm text-slate-500 mb-4">
                Одна или несколько выбранных услуг имеют жесткие требования. Если их не соблюсти, часть массового заказа может зависнуть:
              </p>
              
              <ul className="space-y-3 mb-6 bg-amber-50/50 p-4 rounded-xl border border-amber-100 max-h-60 overflow-y-auto">
                {modalRequirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-800 font-medium">
                    <span className="text-amber-500 mt-0.5">•</span> <span>{linkifyText(req)}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="p-6 pt-2 flex flex-col sm:flex-row gap-3">
              <button 
                type="button"
                onClick={() => { setShowRequirementsModal(false); setLoading(false); }} 
                className="flex-1 px-4 py-3 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Отмена
              </button>
              <button 
                type="button"
                onClick={confirmRequirementsAndSubmit} 
                className="flex-1 px-4 py-3 text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 rounded-xl transition-colors shadow-sm"
              >
                Я ознакомился, оплатить
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
