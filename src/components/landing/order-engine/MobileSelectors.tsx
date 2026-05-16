import React, { useMemo } from "react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { cleanCategoryName } from "@/components/ui/CategoryIcon";

import { Tabs, Tab } from "@heroui/react";

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
    <div className="md:hidden flex flex-col gap-4 p-4 bg-background border-b border-border shadow-sm sticky top-16 z-30">
      {/* Платформа */}
      <div className="relative w-full -mx-4 px-4">
        {/* Градиентная маска для показа скролла */}
        <div className="w-full overflow-x-auto scrollbar-hide pb-1 [mask-image:linear-gradient(to_right,white_85%,transparent_100%)]">
          <Tabs
            aria-label="Платформы"
            selectedKey={networkId || undefined}
            onSelectionChange={(key) => setNetworkId(key as string)}
            className="w-full"
          >
            <Tabs.List className="bg-default-100/50 p-1 flex w-full rounded-full">
              {catalog.map(n => (
                <Tabs.Tab id={n.id} key={n.id} className="font-semibold text-sm px-5 py-2.5 cursor-pointer transition-all duration-300 data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground data-[selected=true]:shadow-md rounded-full">
                  {n.name}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        </div>
      </div>

      {/* Категории */}
      {networkId && sortedCategories.length > 0 && (
        <div className="relative w-full -mx-4 px-4">
          <div className="w-full overflow-x-auto scrollbar-hide pb-1 [mask-image:linear-gradient(to_right,white_85%,transparent_100%)]">
            <Tabs
              aria-label="Категории"
              selectedKey={categoryId || undefined}
              onSelectionChange={(key) => setCategoryId(key as string)}
              className="w-full"
            >
              <Tabs.List className="bg-primary/5 p-1 border border-primary/10 flex w-full rounded-full">
                {sortedCategories.map(c => (
                  <Tabs.Tab id={c.id} key={c.id} className="font-semibold text-[13px] px-5 py-2.5 cursor-pointer transition-all duration-300 data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground data-[selected=true]:shadow-md rounded-full">
                    {cleanCategoryName(c.name)}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}
