"use client";
import { memo } from "react";
import { PublicNetwork } from "@/actions/order/catalog";
import { getBrandColor } from "@/lib/constants/brandColors";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { trackEvent } from "@/lib/analytics";
import { SocialIcon } from "@/components/ui/SocialIcon";

interface PlatformSelectorProps {
  catalog: PublicNetwork[];
  selectedNetworkId: string;
  onSelect: (id: string) => void;
}

export const PlatformSelector = memo(function PlatformSelector({
  catalog,
  selectedNetworkId,
  onSelect
}: PlatformSelectorProps) {
  if (!catalog || catalog.length === 0) return null;

  // We show top 6, rest in a generic select or "More" dropdown
  const topNetworks = catalog.slice(0, 6);
  const otherNetworks = catalog.slice(6);
  
  const isOtherSelected = otherNetworks.some(n => n.id === selectedNetworkId);

  return (
    <div className="w-full">
      {/* Mobile view: Native select */}
      <div className="md:hidden">
        <select
          value={selectedNetworkId || ""}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full p-4 rounded-2xl bg-white border border-slate-200 text-base min-h-12 outline-none focus:border-sky-300"
        >
          <option value="" disabled>Выберите платформу</option>
          {catalog.map(network => (
            <option key={network.id} value={network.id}>
              {network.name}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop view: Tabs */}
      <div className="hidden md:flex flex-wrap gap-2">
        {topNetworks.map(network => {
          const isSelected = selectedNetworkId === network.id;
          const brand = getBrandColor(network.id);
          
          return (
            <button
              key={network.id}
              onClick={() => {
                onSelect(network.id);
                trackEvent("platform_selected", { platform: network.name });
              }}
              className={`
                flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all duration-300 min-h-12 min-w-12 touch-manipulation
                ${isSelected 
                  ? `${brand.bg} text-white shadow-lg border-transparent` 
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                }
              `}
              style={isSelected ? { backgroundColor: brand.bg, boxShadow: `0 4px 14px 0 ${brand.shadow}` } : undefined}
            >
              <CategoryIcon name={network.name} className="flex-shrink-0" size={24} />
              <span className="font-medium">{network.name}</span>
            </button>
          );
        })}
        
        {/* Dropdown for other networks */}
        {otherNetworks.length > 0 && (
          <div className="relative group">
            <select
              value={isOtherSelected ? selectedNetworkId : ""}
              onChange={(e) => onSelect(e.target.value)}
              className={`
                appearance-none flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all duration-300 min-h-12 outline-none
                ${isOtherSelected 
                  ? 'bg-slate-800 text-white shadow-lg border-transparent' 
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }
              `}
            >
              <option value="" disabled>Еще {otherNetworks.length}...</option>
              {otherNetworks.map(network => (
                <option key={network.id} value={network.id}>
                  {network.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
});
