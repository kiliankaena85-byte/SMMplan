'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { upsertTemplate, deleteTemplate } from '@/actions/support/template';
import { ConfirmModal } from '@/components/ui/confirm-modal';


const CATEGORY_OPTIONS = [
  { value: 'GENERAL', label: 'Общие' },
  { value: 'ORDER', label: 'Заказы' },
  { value: 'PAYMENT', label: 'Оплата' },
] as const;

export type Template = {
  id: string;
  shortcut?: string | null;
  label: string;
  text: string;
  category?: string;
  isActive?: boolean;
  useCount?: number;
  sort: number;
};

export default function TemplateManagerModal({ 
  open, 
  onClose, 
  templates 
}: { 
  open: boolean; 
  onClose: () => void; 
  templates: Template[] 
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [text, setText] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const handleEdit = (tmpl: Template) => {
    setEditingId(tmpl.id);
    setLabel(tmpl.label);
    setText(tmpl.text);
    setShortcut(tmpl.shortcut ?? '');
    setCategory(tmpl.category ?? 'GENERAL');
  };

  const handleCreateNew = () => {
    setEditingId('new');
    setLabel('');
    setText('');
    setShortcut('');
    setCategory('GENERAL');
  };

  const handleSave = () => {
    if (!label.trim() || !text.trim()) return;

    startTransition(async () => {
      const fd = new FormData();
      if (editingId && editingId !== 'new') fd.set('id', editingId);
      fd.set('label', label);
      fd.set('text', text);
      fd.set('shortcut', shortcut);
      fd.set('category', category);
      fd.set('sort', '0');
      
      await upsertTemplate(fd);
      setEditingId(null);
    });
  };

  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  const handleDeleteTrigger = (id: string) => {
    setDeletingTemplateId(id);
  };

  const handleConfirmDelete = () => {
    if (!deletingTemplateId) return;
    const id = deletingTemplateId;
    setDeletingTemplateId(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', id);
      await deleteTemplate(fd);
    });
  };


  return (
    <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4 backdrop-blur-sm shadow-2xl">
      <div className="bg-card rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span>📑</span> Управление шаблонами
          </h2>
          <Button intent="ghost" size="sm" onClick={onClose} aria-label="Закрыть" className="rounded-full w-8 h-8 p-0 text-muted-foreground hover:text-foreground transition-all duration-200">✕</Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-muted/50">
          
          <div className="mb-6 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Добавьте быстрые ответы для часто задаваемых вопросов.</p>
            {editingId !== 'new' && (
              <Button size="sm" onClick={handleCreateNew} className="bg-primary hover:bg-primary text-primary-foreground rounded-xl shadow-sm">
                + Добавить шаблон
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {editingId === 'new' && (
              <div className="p-4 bg-card border border-primary/30 rounded-xl shadow-sm relative">
                <div className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Новый шаблон</div>
                <input 
                  type="text" 
                  placeholder="Метка кнопки (напр. '👋 Приветствие')" 
                  value={label} 
                  onChange={e => setLabel(e.target.value)}
                  aria-label="Метка шаблона"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-3 bg-muted transition-all duration-200"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input 
                    type="text" 
                    placeholder="Шорткат (напр. /hello)" 
                    value={shortcut} 
                    onChange={e => setShortcut(e.target.value)}
                    aria-label="Шорткат шаблона"
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-muted transition-all duration-200"
                  />
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)}
                    aria-label="Категория шаблона"
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-muted transition-all duration-200"
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <textarea 
                  placeholder="Текст ответа..." 
                  value={text} 
                  onChange={e => setText(e.target.value)}
                  aria-label="Текст шаблона"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[100px] resize-y bg-muted leading-relaxed transition-all duration-200"
                />
                <div className="flex gap-2 justify-end mt-4">
                  <Button intent="outline" size="sm" onClick={() => setEditingId(null)} aria-label="Отменить создание" className="rounded-xl border-border transition-all duration-200">Отмена</Button>
                  <Button size="sm" onClick={handleSave} disabled={isPending || !label.trim() || !text.trim()} aria-label="Сохранить шаблон" className="rounded-xl bg-primary text-primary-foreground hover:bg-primary transition-all duration-200">
                    {isPending ? 'Сохранение...' : 'Сохранить шаблон'}
                  </Button>
                </div>
              </div>
            )}

            {templates.length === 0 && editingId !== 'new' && (
              <div className="p-8 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl bg-card">
                Шаблонов пока нет. Добавьте первый!
              </div>
            )}

            {templates.map(tmpl => (
              <div key={tmpl.id}>
                {editingId === tmpl.id ? (
                  <div className="p-4 bg-card border border-primary/30 rounded-xl shadow-sm relative animate-in fade-in">
                     <div className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Редактирование</div>
                    <input 
                      type="text" 
                      placeholder="Метка кнопки" 
                      value={label} 
                      onChange={e => setLabel(e.target.value)}
                      aria-label="Метка шаблона"
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-3 bg-muted transition-all duration-200"
                    />
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input 
                        type="text" 
                        placeholder="Шорткат (напр. /hello)" 
                        value={shortcut} 
                        onChange={e => setShortcut(e.target.value)}
                        aria-label="Шорткат шаблона"
                        className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-muted transition-all duration-200"
                      />
                      <select 
                        value={category} 
                        onChange={e => setCategory(e.target.value)}
                        aria-label="Категория шаблона"
                        className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-muted transition-all duration-200"
                      >
                        {CATEGORY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <textarea 
                      placeholder="Текст ответа" 
                      value={text} 
                      onChange={e => setText(e.target.value)}
                      aria-label="Текст шаблона"
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[100px] resize-y bg-muted leading-relaxed transition-all duration-200"
                    />
                    <div className="flex justify-between items-center mt-4">
                      <Button intent="ghost" size="sm" onClick={() => handleDeleteTrigger(tmpl.id)} aria-label="Удалить шаблон" className="text-destructive hover:text-destructive/80 transition-all duration-200">
                        Удалить
                      </Button>
                      <div className="flex gap-2">
                        <Button intent="outline" size="sm" onClick={() => setEditingId(null)} aria-label="Отменить редактирование" className="rounded-xl border-border transition-all duration-200">Отмена</Button>
                        <Button size="sm" onClick={handleSave} disabled={isPending || !label.trim() || !text.trim()} aria-label="Сохранить изменения" className="rounded-xl bg-primary text-primary-foreground hover:bg-primary transition-all duration-200">
                          {isPending ? 'Сохранение...' : 'Сохранить'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/40 transition-all duration-200 flex flex-col justify-between items-start gap-4 cursor-pointer" onClick={() => handleEdit(tmpl)} role="button" aria-label={`Редактировать шаблон ${tmpl.label}`}>
                     <div className="w-full">
                       <h3 className="font-bold text-sm text-foreground mb-1.5 flex items-center gap-2">
                         <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-[10px] uppercase font-bold">{tmpl.label}</span>
                         <span className="text-xs text-muted-foreground">Использован {tmpl.useCount ?? 0} раз</span>
                       </h3>
                       <p className="text-sm text-muted-foreground truncate opacity-80">{tmpl.text}</p>
                     </div>
                     <div className="text-[10px] text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                       Кликните для редактирования
                     </div>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>

      <ConfirmModal
        isOpen={deletingTemplateId !== null}
        onClose={() => setDeletingTemplateId(null)}
        onConfirm={handleConfirmDelete}
        isDanger
        title="Удалить шаблон"
        confirmText="Удалить"
      >
        Вы действительно хотите удалить этот шаблон?
      </ConfirmModal>
    </div>
  );
}

