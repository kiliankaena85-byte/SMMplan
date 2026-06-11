import { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { TemplateCommandPalette } from '@/components/support/TemplateCommandPalette';
import { upsertTemplate } from '@/actions/support/template';

export function ChatTemplateManager({
  templatesList,
  setTemplatesList,
  onSelectTemplate,
  onOpenStateChange,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templatesList: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setTemplatesList: React.Dispatch<React.SetStateAction<any[]>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSelectTemplate: (t: any) => void;
  onOpenStateChange?: (isOpen: boolean) => void;
}) {
  const [showLightningPopover, setShowLightningPopover] = useState(false);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [newTemplateLabel, setNewTemplateLabel] = useState('');
  const [newTemplateShortcut, setNewTemplateShortcut] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('GENERAL');
  const [newTemplateText, setNewTemplateText] = useState('');
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  const togglePopover = () => {
    const newState = !showLightningPopover;
    setShowLightningPopover(newState);
    if (onOpenStateChange) {
      onOpenStateChange(newState);
    }
  };

  const handleCreateTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateLabel.trim() || !newTemplateShortcut.trim() || !newTemplateText.trim()) {
      toast.error('Пожалуйста, заполните все обязательные поля');
      return;
    }

    setCreatingTemplate(true);
    try {
      const formData = new FormData();
      formData.append('shortcut', newTemplateShortcut.trim().toLowerCase());
      formData.append('label', newTemplateLabel.trim());
      formData.append('text', newTemplateText.trim());
      formData.append('category', newTemplateCategory);
      formData.append('isActive', 'true');

      await upsertTemplate(formData);

      const newT = {
        id: Math.random().toString(),
        label: newTemplateLabel.trim(),
        text: newTemplateText.trim(),
        shortcut: newTemplateShortcut.trim().toLowerCase(),
        category: newTemplateCategory,
      };

      setTemplatesList((prev) => [...prev, newT]);
      toast.success('Умный шаблон успешно создан!');
      setShowCreateTemplateModal(false);

      setNewTemplateLabel('');
      setNewTemplateShortcut('');
      setNewTemplateText('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error('Ошибка создания шаблона: ' + err.message);
    } finally {
      setCreatingTemplate(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={togglePopover}
        className={`flex items-center gap-1 px-2.5 h-11 text-xs font-semibold rounded-lg border transition-all ${
          showLightningPopover
            ? 'bg-warning/10 border-warning/30 text-warning-text shadow-sm'
            : 'bg-default-50 border-default-200 text-muted-foreground hover:bg-default-100'
        }`}
        title="Быстрые шаблоны ответов"
        aria-label="Быстрые шаблоны ответов"
      >
        <Zap className="w-3.5 h-3.5" />
        <span>Шаблоны</span>
      </button>

      <TemplateCommandPalette
        templates={templatesList}
        isOpen={showLightningPopover}
        onSelect={onSelectTemplate}
        onClose={() => {
          setShowLightningPopover(false);
          if (onOpenStateChange) onOpenStateChange(false);
        }}
        onCreateNew={() => {
          setShowLightningPopover(false);
          if (onOpenStateChange) onOpenStateChange(false);
          setShowCreateTemplateModal(true);
        }}
      />

      <AnimatePresence>
        {showCreateTemplateModal && (
          <div className="fixed inset-0 z-[100] bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border"
            >
              <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <h3 className="font-bold text-foreground">Новый умный шаблон</h3>
                <button
                  onClick={() => setShowCreateTemplateModal(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              <form onSubmit={handleCreateTemplateSubmit} className="p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground">Название шаблона (Label)</label>
                  <input
                    type="text"
                    required
                    value={newTemplateLabel}
                    onChange={(e) => setNewTemplateLabel(e.target.value)}
                    placeholder="Например: Задержка выполнения"
                    className="w-full px-3 py-2 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-default-50 text-foreground"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground">Шорткат (вызов по /шорткат)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-bold text-muted-foreground">/</span>
                    <input
                      type="text"
                      required
                      value={newTemplateShortcut}
                      onChange={(e) => setNewTemplateShortcut(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="delay"
                      className="w-full pl-6 pr-3 py-2 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-default-50 text-foreground"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground">Категория</label>
                  <select
                    value={newTemplateCategory}
                    onChange={(e) => setNewTemplateCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-default-50 text-foreground"
                  >
                    <option value="GENERAL">Общие</option>
                    <option value="ORDER">Заказы</option>
                    <option value="PAYMENT">Оплата</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground">Текст шаблона</label>
                  <textarea
                    required
                    rows={4}
                    value={newTemplateText}
                    onChange={(e) => setNewTemplateText(e.target.value)}
                    placeholder="Используйте переменные: {user_name}, {order_id}, {service_name}, {order_status}, {current_date}"
                    className="w-full px-3 py-2 border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-default-50 text-foreground resize-none"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['{user_name}', '{order_id}', '{service_name}', '{order_status}', '{current_date}'].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setNewTemplateText(prev => prev + tag)}
                        className="text-[9px] font-mono font-bold bg-default-100 hover:bg-default-200 text-muted-foreground px-1.5 py-0.5 rounded transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateTemplateModal(false)}
                    className="px-3 py-2 text-xs font-semibold border border-border hover:bg-default-50 rounded-xl transition-colors text-foreground"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTemplate}
                    className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    {creatingTemplate && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Создать</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
