"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchExternalServices, importSelectedServices } from "@/actions/admin/providers/import-cherry-pick";
import { adminSyncProviderCatalog } from "@/actions/admin/providers/sync-action";
import { generateAiPreviewAction, saveAiImportedServiceAction } from "@/actions/admin/providers/ai-import";

export function ImportWizard({ categories }: { categories: any[] }) {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [services, setServices] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetCategory, setTargetCategory] = useState<string>(categories[0]?.id || "");
  const [markup, setMarkup] = useState<string>("3.0");

  const [autoSyncLoading, setAutoSyncLoading] = useState(false);

  // AI Import State
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [aiPreviewData, setAiPreviewData] = useState<any>(null);
  const [aiProviderService, setAiProviderService] = useState<any>(null);

  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res: any = await fetchExternalServices();
      if (!res.success) throw new Error(res.error || "Ошибка загрузки");
      setServices(res.services || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
     if (selectedIds.size === services.filter(s => !s.alreadyImported).length) {
         setSelectedIds(new Set());
     } else {
         const newSet = new Set<string>();
         services.forEach(s => {
             if (!s.alreadyImported) newSet.add(String(s.service));
         });
         setSelectedIds(newSet);
     }
  };

  const handleImport = async () => {
     if (selectedIds.size === 0) return setError("Выберите хотя бы 1 услугу");
     if (!targetCategory) return setError("Выберите категорию для импорта");
     
     try {
         setLoading(true);
         setError(null);
         
         const idsArray = Array.from(selectedIds);
         const res = await importSelectedServices(idsArray, targetCategory, parseFloat(markup) || 3.0);
         
         if (res && !res.success) throw new Error(res.error || "Import failed");
         
         setSuccess(`Успешно импортировано ${res.imported || 0} услуг!`);
         setSelectedIds(new Set());
         loadServices(); // Reload to update "alreadyImported" status
         router.refresh();
     } catch (e: any) {
         setError(e.message);
     } finally {
         setLoading(false);
     }
  };

  const handleAutoSync = async () => {
      if (!confirm("Запустить полный Smart Sync? Это может занять несколько секунд, скрипт автоматически проанализирует и создаст все услуги и категории.")) return;
      try {
          setAutoSyncLoading(true);
          setError(null);
          setSuccess(null);
          const res = await adminSyncProviderCatalog();
          if (res && !res.success) throw new Error(res.error || "Sync failed");
          setSuccess((res as any).message || "Smart Sync успешно завершен!");
          loadServices();
      } catch (e: any) {
          setError(e.message);
      } finally {
          setAutoSyncLoading(false);
      }
  };

  const handleAiPreview = async (service: any) => {
      if (!targetCategory) return setError("Выберите категорию для импорта (в блоке выше)");
      setAiLoadingId(String(service.service));
      setError(null);
      
      const desc = service.desc || service.description || service.name;
      const res = await generateAiPreviewAction(service.name, desc);
      
      if (!res.success) {
          setError(res.error || "Ошибка генерации ИИ");
          setAiLoadingId(null);
          return;
      }
      
      setAiPreviewData(res.optimized);
      setAiProviderService(service);
      setAiLoadingId(null);
  };

  const handleAiSave = async () => {
      if (!aiPreviewData || !aiProviderService) return;
      try {
          setLoading(true);
          setError(null);
          const res = await saveAiImportedServiceAction(
              aiProviderService, 
              targetCategory, 
              parseFloat(markup) || 3.0, 
              aiPreviewData
          );
          if (!res.success) throw new Error(res.error || "Ошибка сохранения ИИ-услуги");
          
          setSuccess(`Услуга "${aiPreviewData.newName}" успешно добавлена с ИИ!`);
          setAiPreviewData(null);
          setAiProviderService(null);
          loadServices();
      } catch (e: any) {
          setError(e.message);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="space-y-6">
       
       <div className="bg-primary/10 border border-primary/30 p-4 rounded-md flex justify-between items-center flex-wrap gap-4">
           <div>
               <h3 className="text-indigo-900 font-semibold">Умная Синхронизация (Рекомендуется)</h3>
               <p className="text-sm text-indigo-700">Использует SmartAnalyzer для автоматического распределения всех услуг по категориям, подборки названий и установки наценок.</p>
           </div>
           <button 
              onClick={handleAutoSync} 
              disabled={autoSyncLoading || loading}
              className="bg-primary text-white px-4 py-2 rounded font-medium shadow-sm hover:bg-indigo-700 text-sm"
           >
              {autoSyncLoading ? "Синхронизация..." : "⚡ Запустить Smart Sync"}
           </button>
       </div>

       <div className="bg-background shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg border border-border p-6">
           <h2 className="text-lg font-medium text-foreground mb-4">Ручной импорт услуг (Cherry-Pick)</h2>
           
           {(error || success) && (
               <div className={`p-4 mb-6 rounded-md ${error ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                   {error || success}
               </div>
           )}

           <div className="flex gap-4 items-end mb-6 bg-muted/50 p-4 border rounded-md">
               <div className="flex-1">
                   <label className="block text-xs font-medium text-foreground mb-1">Категория для импорта</label>
                   <select 
                      value={targetCategory} 
                      onChange={e => setTargetCategory(e.target.value)}
                      className="block w-full rounded-md border-border shadow-sm border p-2 text-sm"
                   >
                     <option value="">-- Выберите категорию --</option>
                     {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.platform} • {c.name}</option>
                     ))}
                   </select>
               </div>
               <div className="w-32">
                   <label className="block text-xs font-medium text-foreground mb-1">Базовая Наценка</label>
                   <input 
                      type="number" step="0.1" min="1"
                      value={markup}
                      onChange={e => setMarkup(e.target.value)}
                      className="block w-full rounded-md border-border shadow-sm border p-2 text-sm"
                   />
               </div>
               <div className="w-48">
                    <button 
                       onClick={handleImport} 
                       disabled={loading || selectedIds.size === 0}
                       className="w-full bg-slate-900 text-white px-4 py-2 rounded shadow text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                    >
                       {loading ? "Импорт..." : `Импорт (${selectedIds.size})`}
                    </button>
               </div>
           </div>

           <div className="h-96 overflow-y-auto border rounded-md">
               <table className="min-w-full divide-y divide-slate-300">
                   <thead className="bg-muted sticky top-0">
                       <tr>
                           <th className="px-4 py-3 text-left">
                               <input type="checkbox" onChange={toggleAll} checked={services.length > 0 && selectedIds.size === services.filter(s=>!s.alreadyImported).length} />
                           </th>
                           <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">ID</th>
                           <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Название провайдера</th>
                           <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Категория провайдера</th>
                           <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Цена (Закуп)</th>
                           <th className="px-4 py-3 text-xs font-medium text-primary uppercase">ИИ</th>
                       </tr>
                   </thead>
                   <tbody className="bg-background divide-y divide-slate-200">
                       {services.map(s => (
                           <tr key={s.service} className={s.alreadyImported ? 'bg-muted/50 opacity-60' : 'hover:bg-muted/50'}>
                               <td className="px-4 py-3">
                                   <input 
                                       type="checkbox" 
                                       disabled={s.alreadyImported}
                                       checked={selectedIds.has(String(s.service))}
                                       onChange={() => toggleSelection(String(s.service))}
                                   />
                               </td>
                               <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{s.service}</td>
                               <td className="px-4 py-3 text-sm font-medium text-foreground max-w-sm truncate" title={s.name}>{s.name}</td>
                               <td className="px-4 py-3 text-xs text-muted-foreground">{s.category}</td>
                               <td className="px-4 py-3 text-sm font-mono text-foreground">${parseFloat(s.rate).toFixed(4)}</td>
                               <td className="px-4 py-3">
                                   <button 
                                      onClick={() => handleAiPreview(s)} 
                                      disabled={s.alreadyImported || aiLoadingId === String(s.service)} 
                                      className="text-primary hover:text-indigo-800 disabled:opacity-50 text-xs font-medium flex items-center gap-1 bg-primary/10 px-2 py-1 rounded"
                                   >
                                      {aiLoadingId === String(s.service) ? "⏳ Анализ..." : "✨ AI Импорт"}
                                   </button>
                               </td>
                           </tr>
                       ))}
                       {services.length === 0 && !loading && (
                           <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Нет доступных услуг</td></tr>
                       )}
                   </tbody>
               </table>
           </div>
       </div>

       {aiPreviewData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b bg-muted/50 flex justify-between items-center">
              <h3 className="font-semibold text-foreground flex items-center gap-2">✨ Перепроверка ИИ <span className="text-xs font-normal bg-primary/20 text-indigo-800 px-2 py-0.5 rounded-full">Human-in-the-loop</span></h3>
              <button onClick={() => setAiPreviewData(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Оригинал от провайдера</label>
                <div className="text-xs bg-muted p-3 rounded-md font-mono whitespace-pre-wrap border border-border">
                  <span className="font-bold">{aiProviderService?.name}</span>
                  {"\n"}{aiProviderService?.desc || aiProviderService?.description}
                </div>
              </div>
              <hr className="border-border/50" />
              <div>
                <label className="block text-xs font-medium text-primary mb-1">Сгенерированное Название</label>
                <input 
                  value={aiPreviewData.newName} 
                  onChange={e => setAiPreviewData({...aiPreviewData, newName: e.target.value})}
                  className="w-full border border-border rounded p-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-primary mb-1">Сгенерированное Описание</label>
                <textarea 
                  rows={6}
                  value={aiPreviewData.newDescription} 
                  onChange={e => setAiPreviewData({...aiPreviewData, newDescription: e.target.value})}
                  className="w-full border border-border rounded p-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warning mb-1">Требования к ссылке/профилю (Всплывающее окно для клиента)</label>
                <textarea 
                  rows={2}
                  value={aiPreviewData.requirements.join('\n')} 
                  onChange={e => setAiPreviewData({...aiPreviewData, requirements: e.target.value.split('\n').filter((x: string) => x.trim() !== '')})}
                  className="w-full border border-amber-300 rounded p-2 text-sm bg-warning/10 focus:ring-1 focus:ring-amber-500 outline-none"
                  placeholder="Нет специфичных требований"
                />
                <p className="text-xs text-amber-700 mt-1">Каждое требование пишите с новой строки. Если поле пустое, окно подтверждения клиенту не покажется.</p>
              </div>
            </div>
            <div className="p-4 border-t bg-muted/50 flex justify-end gap-3">
              <button onClick={() => setAiPreviewData(null)} className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors">Отмена</button>
              <button onClick={handleAiSave} disabled={loading} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50">
                {loading ? "Сохранение..." : "💾 Утвердить и Добавить в каталог"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
