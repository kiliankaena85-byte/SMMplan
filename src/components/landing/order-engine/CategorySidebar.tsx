import React, { useMemo } from "react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { CategoryIcon, cleanCategoryName } from "@/components/ui/CategoryIcon";
import { ChevronRight } from "lucide-react";

export function CategorySidebar({ engine }: { engine: OrderEngine }) {
  const { availableCategories, categoryId, setCategoryId } = engine;
  
  const sortedCategories = useMemo(() => {
    const PRIORITY = ['подписчик', 'участники', 'просмотр', 'охват', 'лайк', 'нравится', 'реакц', 'сердц', 'коммент', 'отзыв', 'репост', 'поделит', 'авто', 'статистик', 'звезд', 'premium'];
    return [...availableCategories].sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aIdx = PRIORITY.findIndex(p => aName.includes(p));
      const bIdx = PRIORITY.findIndex(p => bName.includes(p));
      
      const scoreA = aIdx === -1 ? 999 : aIdx;
      const scoreB = bIdx === -1 ? 999 : bIdx;
      
      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }
      return a.name.localeCompare(b.name);
    });
  }, [availableCategories]);

  return (
    <div className="hidden md:flex lg:flex-col flex-row flex-wrap lg:flex-nowrap lg:border-r border-slate-100 p-4 lg:p-6 gap-3 bg-slate-50/50 shrink-0 lg:w-[280px] xl:w-[320px] items-center lg:items-stretch lg:sticky lg:top-24">
      {sortedCategories.map(cat => (
        <button
          key={cat.id}
          onClick={(e) => { e.preventDefault(); setCategoryId(cat.id); }}
          className={`text-left px-5 py-3 lg:py-4 rounded-full lg:rounded-[1.5rem] text-[15px] font-bold transition-all duration-200 whitespace-nowrap lg:whitespace-normal shrink-0 lg:shrink group flex items-center justify-between active:scale-95 ${
            categoryId === cat.id 
              ? 'bg-white text-primary shadow-[0_8px_30px_-6px_rgba(0,0,0,0.08)] ring-1 ring-slate-100 scale-[1.02]'
              : 'bg-transparent text-slate-500 hover:bg-slate-100/80 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <CategoryIcon name={cat.name} className={categoryId === cat.id ? "text-primary" : "text-slate-400"} />
            <span>{cleanCategoryName(cat.name)}</span>
          </div>
          {categoryId === cat.id && <ChevronRight className="hidden lg:block w-5 h-5 opacity-100 translate-x-0" />}
        </button>
      ))}
      
      {sortedCategories.length === 0 && (
        <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-border rounded-xl">
          <p className="text-xs text-slate-400 font-medium">Нет категорий</p>
        </div>
      )}
    </div>
  );
}
