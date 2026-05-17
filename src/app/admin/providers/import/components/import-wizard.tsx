"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fetchPaginatedExternalServices, importSelectedServices, fetchExternalServices } from "@/actions/admin/providers/import-cherry-pick";
import { FilterSidebar } from "./filter-sidebar";
import { ServicesTable } from "./services-table";

export function ImportWizard({ categories, providers }: { categories: any[], providers: any[] }) {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  
  const [services, setServices] = useState<any[]>([]);
  const [providerId, setProviderId] = useState<string>(providers[0]?.id || "");
  const [isEmptyCache, setIsEmptyCache] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetCategory, setTargetCategory] = useState<string>(categories[0]?.id || "");
  const [markup, setMarkup] = useState<string>("50");
  const [priceMode, setPriceMode] = useState<'per1000' | 'per1'>('per1000');

  const [filters, setFilters] = useState({
      page: 1,
      pageSize: 50,
      platform: "ALL",
      geo: "ALL",
      velocity: "ALL",
      hasRefill: false,
      hasAnomaly: false,
      hideImported: true,
      search: "",
      sortBy: "none"
  });

  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, pageSize: 50 });
  const [importProgress, setImportProgress] = useState<{current: number, total: number} | null>(null);

  const handleForceSync = async () => {
    if (!providerId) return;
    try {
      setSyncing(true);
      setError(null);
      setIsEmptyCache(false);
      setServices([]);
      
      const res: any = await fetchExternalServices(providerId, true);
      if (!res.success) {
        throw new Error(res.error || "Ошибка синхронизации каталога");
      }
      
      // Load paginated services after sync
      await loadServices();
    } catch (e: any) {
      setError(e.message);
      setIsEmptyCache(true); // show sync button again if failed
    } finally {
      setSyncing(false);
    }
  };

  const loadServices = useCallback(async () => {
    if (!providerId) return;
    try {
      setLoading(true);
      setError(null);
      
      const res: any = await fetchPaginatedExternalServices(providerId, filters, filters.page, filters.pageSize);
      
      if (!res.success) {
          if (res.emptyCache) {
              setIsEmptyCache(true);
              setServices([]);
              setPagination({ page: 1, totalPages: 1, total: 0, pageSize: 50 });
              return;
          }
          throw new Error(res.error || "Ошибка загрузки данных из кэша");
      }
      
      setIsEmptyCache(false);
      setServices(res.data || []);
      setPagination(res.pagination);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [providerId, filters]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
     const importableCount = services.filter(s => !s.alreadyImported).length;
     // If all current page importable items are selected, clear selection (only current page items)
     const currentPageIds = services.filter(s => !s.alreadyImported).map(s => String(s.service));
     const allSelected = currentPageIds.every(id => selectedIds.has(id)) && currentPageIds.length > 0;

     const newSet = new Set(selectedIds);
     if (allSelected) {
         currentPageIds.forEach(id => newSet.delete(id));
     } else {
         currentPageIds.forEach(id => newSet.add(id));
     }
     setSelectedIds(newSet);
  };

  const handleBatchImport = async () => {
     if (selectedIds.size === 0) return setError("Выберите хотя бы 1 услугу");
     if (!targetCategory) return setError("Выберите категорию для импорта");
     
     try {
         setError(null);
         setSuccess(null);
         
         const idsArray = Array.from(selectedIds);
         const total = idsArray.length;
         setImportProgress({ current: 0, total });

         const BATCH_SIZE = 50;
         let importedCount = 0;

         for (let i = 0; i < total; i += BATCH_SIZE) {
             const chunk = idsArray.slice(i, i + BATCH_SIZE);
             
             // Convert percentage (e.g. 50%) to multiplier (1.5)
             const percentVal = parseFloat(markup);
             const multiplier = (isNaN(percentVal) || percentVal <= 0) ? 0 : 1 + (percentVal / 100);

             const res = await importSelectedServices(chunk, targetCategory, multiplier, providerId);
             
             if (res && !res.success) {
                 throw new Error(res.error || `Ошибка на пачке ${i}-${i+BATCH_SIZE}`);
             }
             
             importedCount += (res?.imported || 0);
             setImportProgress({ current: Math.min(i + BATCH_SIZE, total), total });
         }
         
         setSuccess(`✅ Успешно импортировано ${importedCount} услуг!`);
         setSelectedIds(new Set());
         startTransition(() => {
             loadServices();
             router.refresh();
         });
     } catch (e: any) {
         setError(e.message);
     } finally {
         setImportProgress(null);
     }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-background border border-border p-4 rounded-xl flex flex-wrap items-end gap-4 shadow-sm">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Провайдер</label>
          <select 
            value={providerId} 
            onChange={(e) => setProviderId(e.target.value)}
            className="w-full text-sm border-border border rounded-md p-2 bg-background focus:ring-1 focus:ring-primary outline-none"
          >
            {providers.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Категория назначения</label>
          <select 
            value={targetCategory} 
            onChange={(e) => setTargetCategory(e.target.value)}
            className="w-full text-sm border-border border rounded-md p-2 bg-background focus:ring-1 focus:ring-primary outline-none"
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.network.name} • {c.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="w-32">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Наценка (%)</label>
          <input 
            type="number" step="1" min="0"
            value={markup} 
            onChange={(e) => setMarkup(e.target.value)}
            className="w-full text-sm border-border border rounded-md p-2 bg-background focus:ring-1 focus:ring-primary outline-none"
          />
        </div>

        <div className="w-48 flex flex-col">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Отображение цен</label>
          <div className="flex bg-muted p-1 rounded-md h-[38px]">
            <button 
               className={`flex-1 text-xs py-1 rounded transition-all ${priceMode === 'per1000' ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
               onClick={() => setPriceMode('per1000')}
            >
              За 1000
            </button>
            <button 
               className={`flex-1 text-xs py-1 rounded transition-all ${priceMode === 'per1' ? 'bg-background shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
               onClick={() => setPriceMode('per1')}
            >
              За 1 шт
            </button>
          </div>
        </div>

        <div>
          <button 
            onClick={handleBatchImport} 
            disabled={importProgress !== null || selectedIds.size === 0 || isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-md font-medium text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 h-[38px]"
          >
            {importProgress !== null ? (
              <>⏳ Импорт: {importProgress.current} / {importProgress.total}</>
            ) : (
              <>📥 Импортировать ({selectedIds.size})</>
            )}
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-md text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-500/10 text-green-700 border border-green-500/20 rounded-md text-sm">{success}</div>}

      {/* Main Workspace: Sidebar + Table */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <FilterSidebar filters={filters} setFilters={setFilters} />
        
        <div className="flex-1 min-w-0">
          {isEmptyCache ? (
            <div className="flex flex-col items-center justify-center py-24 bg-card border border-border rounded-xl shadow-sm">
               <div className="text-4xl mb-4">📥</div>
               <h3 className="text-lg font-bold mb-2">Теневой каталог пуст</h3>
               <p className="text-muted-foreground text-sm max-w-sm text-center mb-6">
                 Сначала необходимо загрузить полный каталог услуг от провайдера в кэш. Это может занять несколько секунд.
               </p>
               <button 
                 onClick={handleForceSync}
                 disabled={syncing}
                 className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-2.5 rounded-lg shadow-sm disabled:opacity-50 transition-all flex items-center gap-2"
               >
                 {syncing ? '⏳ Синхронизация (до 15 сек)...' : 'Синхронизировать прайс'}
               </button>
            </div>
          ) : (
            <ServicesTable 
               services={services}
               selectedIds={selectedIds}
               toggleSelection={toggleSelection}
               toggleAll={toggleAll}
               loading={loading || syncing}
               filters={filters}
               setFilters={setFilters}
               pagination={pagination}
               priceMode={priceMode}
               markup={parseFloat(markup) || 0}
            />
          )}
        </div>
      </div>
    </div>
  );
}
