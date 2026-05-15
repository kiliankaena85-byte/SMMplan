import React, { useMemo } from "react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { cleanCategoryName } from "@/components/ui/CategoryIcon";

export function MobileSelectors({ engine }: { engine: OrderEngine }) {
  const { networkId, setNetworkId, categoryId, setCategoryId, catalog, availableCategories } = engine;

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
    <div className="md:hidden flex flex-col gap-3 p-4 bg-muted border-b border-border">
      <select
        aria-label="Выберите платформу"
        value={networkId || ""}
        onChange={(e) => setNetworkId(e.target.value)}
        className="w-full h-14 px-4 bg-background border border-border shadow-sm font-bold text-foreground rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none outline-none"
      >
        <option value="" disabled>Платформа...</option>
        {catalog.map(n => (
          <option key={n.id} value={n.id}>{n.name}</option>
        ))}
      </select>
      
      {networkId && sortedCategories.length > 0 && (
        <select
          aria-label="Выберите категорию"
          value={categoryId || ""}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full h-14 px-4 bg-primary/5 border border-primary/20 shadow-sm font-bold text-primary rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none outline-none mt-1"
        >
          <option value="" disabled>Категория...</option>
          {sortedCategories.map(c => (
            <option key={c.id} value={c.id}>{cleanCategoryName(c.name)}</option>
          ))}
        </select>
      )}
    </div>
  );
}
