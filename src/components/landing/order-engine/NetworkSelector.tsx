import React, { useMemo, useState, useEffect } from "react";
import { OrderEngine } from "@/hooks/useOrderEngine";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { GripHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function NetworkSelector({ engine }: { engine: OrderEngine }) {
  const { networkId, setNetworkId, catalog } = engine;
  const [showAllNetworks, setShowAllNetworks] = useState(false);

  const DEFAULT_TOP = useMemo(() => ['telegram', 'vk', 'instagram', 'youtube', 'tiktok', 'twitch'], []);
  const [topSlugs, setTopSlugs] = useState<string[]>(DEFAULT_TOP);

  // Восстановление памяти клиента при загрузке (Client-side memory)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('smmplan_network_prefs');
      if (stored) {
        const prefs: Record<string, number> = JSON.parse(stored);
        const sortedPrefs = Object.entries(prefs)
          .sort((a, b) => b[1] - a[1])
          .map(entry => entry[0]);
        
        const combined = Array.from(new Set([...sortedPrefs, ...DEFAULT_TOP]));
        setTopSlugs(combined.slice(0, 6));
      }
    } catch (e) {
      // ignore
    }
  }, [DEFAULT_TOP]);

  const handleNetworkSelect = (net: any) => {
    setNetworkId(net.id);
    setShowAllNetworks(false);

    try {
      const slug = net.slug.toLowerCase();
      const stored = localStorage.getItem('smmplan_network_prefs');
      const prefs: Record<string, number> = stored ? JSON.parse(stored) : {};
      prefs[slug] = (prefs[slug] || 0) + 1;
      localStorage.setItem('smmplan_network_prefs', JSON.stringify(prefs));

      const sortedPrefs = Object.entries(prefs)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);
      
      const combined = Array.from(new Set([...sortedPrefs, ...DEFAULT_TOP]));
      setTopSlugs(combined.slice(0, 6));
    } catch (e) {
      // ignore
    }
  };

  const { topNetworks, otherNetworks } = useMemo(() => {
    const top = catalog.filter(n => topSlugs.includes(n.slug.toLowerCase()));
    top.sort((a,b) => topSlugs.indexOf(a.slug.toLowerCase()) - topSlugs.indexOf(b.slug.toLowerCase()));
    
    // Если выбранная сеть не входит в ТОП-6, добавляем её в конец верхнего ряда
    const selectedNet = catalog.find(n => n.id === networkId);
    if (selectedNet && !top.some(t => t.id === selectedNet.id)) {
      top.push(selectedNet);
    }

    const other = catalog.filter(n => !top.some(t => t.id === n.id));
    return { topNetworks: top, otherNetworks: other };
  }, [catalog, topSlugs, networkId]);

  return (
    <div className="hidden md:flex bg-content2 border-b border-border/50 p-4 shrink-0 flex-col gap-4">
      {/* Top Platforms Row */}
      <div className="flex flex-wrap gap-2 py-2 items-center justify-center">
        {topNetworks.map(net => {
          const isActive = networkId === net.id;
          return (
            <button
              key={net.id}
              onClick={(e) => { e.preventDefault(); handleNetworkSelect(net); }}
              title={net.name}
              className={`group relative flex flex-col items-center justify-center gap-1 font-bold text-[11px] origin-center shrink-0 transition-all duration-300 ${
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-[0_8px_24px_-6px] shadow-primary/50 rounded-2xl h-16 md:h-[72px] px-4 md:px-5 scale-[1.02]'
                  : 'bg-content1 border border-border/50 text-muted-foreground hover:bg-content2 hover:shadow-md hover:text-foreground rounded-2xl w-16 h-16 md:w-[72px] md:h-[72px] shadow-sm'
              }`}
            >
              <SocialIcon 
                slug={net.slug} 
                size={22}
                className={`shrink-0 z-10 transition-all duration-300 ${
                  isActive 
                   ? 'drop-shadow-sm scale-110 brightness-0 invert' 
                   : 'grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100'
                }`} 
              />
              <span className={`z-10 tracking-tight whitespace-nowrap transition-colors duration-200 ${
                isActive ? 'text-primary-foreground font-bold text-xs' : 'text-muted-foreground group-hover:text-foreground'
              }`}>
                {isActive ? net.name : net.slug.length <= 3 ? net.slug.toUpperCase() : net.slug.charAt(0).toUpperCase() + net.slug.slice(1, 4)}
              </span>
            </button>
          );
        })}
        
        {/* More Button */}
        {otherNetworks.length > 0 && (
          <button
            onClick={(e) => { e.preventDefault(); setShowAllNetworks(!showAllNetworks); }}
            title={showAllNetworks ? 'Скрыть' : `Ещё ${otherNetworks.length} платформ`}
            className={`flex items-center justify-center gap-2 h-12 md:h-14 rounded-full font-bold text-sm transition-all duration-300 shrink-0 ${
              showAllNetworks 
                ? 'bg-primary/10 text-primary shadow-inner px-5' 
                : 'bg-content1 border border-border/50 text-muted-foreground hover:bg-content2 hover:shadow-md hover:text-foreground w-12 md:w-14 shadow-sm'
            }`}
          >
            <GripHorizontal className={`w-6 h-6 transition-transform duration-300 ${showAllNetworks ? 'rotate-180' : ''}`} />
            {showAllNetworks && <span>Скрыть</span>}
          </button>
        )}
      </div>

      {/* Expanded Grid for Other Platforms */}
      <AnimatePresence>
        {showAllNetworks && (
          <motion.div
            initial={{ height: 0, opacity: 0, scale: 0.95 }}
            animate={{ height: "auto", opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 pt-2 pb-4">
              {otherNetworks.map(net => {
                const isActive = networkId === net.id;
                return (
                  <button
                    key={net.id}
                    onClick={(e) => { e.preventDefault(); handleNetworkSelect(net); }}
                    title={net.name}
                    className={`group flex flex-col items-center justify-center gap-2 py-3 rounded-2xl transition-all duration-300 ${
                      isActive 
                        ? 'bg-primary/10 text-primary shadow-inner ring-1 ring-primary/30 scale-105'
                        : 'bg-content1 border border-border/50 hover:bg-content2 hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    <SocialIcon 
                      slug={net.slug} 
                      size={20}
                      className={`transition-all duration-300 ${
                        isActive ? 'scale-110 drop-shadow-sm' : 'grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100'
                      }`} 
                    />
                    <span className={`text-[10px] font-bold tracking-tight px-1 text-center truncate w-full ${
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    }`}>
                      {net.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
