'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Link as LinkIcon, AlertCircle, ShoppingCart } from 'lucide-react';
import { Service } from '@prisma/client';
import { basketCheckoutAction } from '@/actions/order/basketCheckout';
import { toast } from 'sonner';

interface MassOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service;
  initialQuantity: number;
  initialEmail: string;
}

export function MassOrderModal({ isOpen, onClose, service, initialQuantity, initialEmail }: MassOrderModalProps) {
  const [items, setItems] = useState([{ id: Date.now().toString(), link: '', quantity: initialQuantity }]);
  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = () => {
    setItems(prev => [...prev, { id: Date.now().toString(), link: '', quantity: initialQuantity }]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: 'link' | 'quantity', value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const totalCharge = items.reduce((acc, item) => acc + ((item.quantity / 1000) * service.rate), 0);

  const handleCheckout = async () => {
    // Validate
    const invalidItems = items.filter(i => !i.link || !i.link.startsWith('http'));
    if (invalidItems.length > 0) {
      toast.error('Проверьте ссылки: некоторые имеют неверный формат');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = items.map(i => ({
        serviceId: service.id,
        link: i.link,
        quantity: i.quantity,
        email: email
      }));

      const res = await basketCheckoutAction({ items: payload, gateway: 'yookassa' }) as { success?: boolean, paymentUrl?: string, error?: string };
      if (res?.success && res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        toast.error(res?.error || 'Ошибка оформления корзины');
        setIsSubmitting(false);
      }
    } catch (e) {
      toast.error('Ошибка сервера');
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            onClick={!isSubmitting ? onClose : undefined}
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-content1 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-border/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-foreground">Пакетный заказ</h3>
                  <p className="text-sm font-medium text-muted-foreground line-clamp-1">{service.name}</p>
                </div>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className="text-muted-foreground hover:text-muted-foreground p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
               {items.map((item, index) => (
                 <div key={item.id} className="group relative bg-content2 border border-border/50 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 transition-all focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Ссылка {index + 1}</label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input 
                          type="url"
                          value={item.link}
                          onChange={e => updateItem(item.id, 'link', e.target.value)}
                          placeholder="https://..."
                          className="w-full h-10 pl-9 pr-4 bg-content1 border border-border rounded-xl text-sm font-medium outline-none transition-all placeholder:text-slate-300"
                        />
                      </div>
                    </div>
                    <div className="w-full sm:w-32 space-y-1 shrink-0">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Кол-во</label>
                      <input 
                        type="number"
                        min={service.minQty}
                        max={service.maxQty}
                        value={item.quantity}
                        onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || service.minQty)}
                        className="w-full h-10 px-4 bg-content1 border border-border rounded-xl text-sm font-medium outline-none text-center"
                      />
                    </div>
                    {items.length > 1 && (
                      <button 
                         onClick={() => removeItem(item.id)}
                         className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-500 flex items-center justify-center rounded-full shadow-sm hover:bg-red-500 hover:text-white transition-colors z-10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                 </div>
               ))}

               <button 
                 onClick={addItem}
                 className="w-full h-12 rounded-2xl border-2 border-dashed border-border text-muted-foreground font-bold hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
               >
                 <Plus className="w-4 h-4" /> Добавить ссылку
               </button>

               <div className="pt-4 mt-4 border-t border-border/50 space-y-2">
                 <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email (для квитанции)</label>
                 <input 
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full h-12 px-4 rounded-xl border border-border bg-content1 text-sm font-medium outline-none focus:border-primary/50 transition-all"
                 />
               </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border/50 bg-content2 shrink-0">
               <div className="flex items-center justify-between mb-4">
                 <div className="text-sm font-medium text-muted-foreground">Итого {items.length} пакетов</div>
                 <div className="text-2xl font-extrabold text-foreground">{totalCharge.toFixed(2)} ₽</div>
               </div>
               
               <button 
                 onClick={handleCheckout}
                 disabled={isSubmitting}
                 className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
               >
                 {isSubmitting ? (
                   <span className="animate-pulse">Обработка...</span>
                 ) : (
                   <>Оплатить сборный заказ</>
                 )}
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
