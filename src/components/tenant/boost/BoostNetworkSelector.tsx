'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { PublicNetwork } from '@/actions/order/catalog';

interface BoostNetworkSelectorProps {
  networks: PublicNetwork[];
  selectedNetworkId: string;
  onSelectNetwork: (networkId: string) => void;
}

const NETWORK_THEMES: Record<string, { bg: string; text: string; ring: string }> = {
  telegram: {
    bg: 'bg-gradient-to-r from-[#039BE5] to-[#0081C0] text-primary-foreground',
    text: 'text-primary-foreground',
    ring: 'ring-2 ring-[#039BE5]/60 shadow-md shadow-[#039BE5]/20',
  },
  vk: {
    bg: 'bg-gradient-to-r from-[#0077FF] to-[#0055CC] text-primary-foreground',
    text: 'text-primary-foreground',
    ring: 'ring-2 ring-[#0077FF]/60 shadow-md shadow-[#0077FF]/20',
  },
  instagram: {
    bg: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-primary-foreground',
    text: 'text-primary-foreground',
    ring: 'ring-2 ring-[#FD1D1D]/60 shadow-md shadow-[#FD1D1D]/20',
  },
  tiktok: {
    bg: 'bg-gradient-to-r from-[#000000] to-[#25F4EE]/40 text-primary-foreground dark:from-[#1E1E1E] dark:to-[#FE2C55]/30',
    text: 'text-primary-foreground',
    ring: 'ring-2 ring-[#25F4EE]/60 shadow-md shadow-black/20',
  },
  youtube: {
    bg: 'bg-gradient-to-r from-[#FF0000] to-[#CC0000] text-primary-foreground',
    text: 'text-primary-foreground',
    ring: 'ring-2 ring-[#FF0000]/60 shadow-md shadow-[#FF0000]/20',
  },
  rutube: {
    bg: 'bg-gradient-to-r from-[#002B49] to-[#005691] text-primary-foreground',
    text: 'text-primary-foreground',
    ring: 'ring-2 ring-[#005691]/60 shadow-md shadow-[#005691]/20',
  },
  dzen: {
    bg: 'bg-gradient-to-r from-[#FF4500] to-[#E03D00] text-primary-foreground',
    text: 'text-primary-foreground',
    ring: 'ring-2 ring-[#FF4500]/60 shadow-md shadow-[#FF4500]/20',
  },
  twitch: {
    bg: 'bg-gradient-to-r from-[#9146FF] to-[#6441A5] text-primary-foreground',
    text: 'text-primary-foreground',
    ring: 'ring-2 ring-[#9146FF]/60 shadow-md shadow-[#9146FF]/20',
  },
  discord: {
    bg: 'bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-primary-foreground',
    text: 'text-primary-foreground',
    ring: 'ring-2 ring-[#5865F2]/60 shadow-md shadow-[#5865F2]/20',
  },
  twitter: {
    bg: 'bg-gradient-to-r from-[#1DA1F2] to-[#0C85D0] text-primary-foreground',
    text: 'text-primary-foreground',
    ring: 'ring-2 ring-[#1DA1F2]/60 shadow-md shadow-[#1DA1F2]/20',
  },
};

const DEFAULT_THEME = {
  bg: 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground',
  text: 'text-primary-foreground',
  ring: 'ring-2 ring-primary/60 shadow-md shadow-primary/20',
};

export const BoostNetworkSelector: React.FC<BoostNetworkSelectorProps> = ({
  networks,
  selectedNetworkId,
  onSelectNetwork,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!networks || networks.length === 0) return null;

  // Split into Top 5 Quick Networks + Extended List
  const TOP_LIMIT = 5;
  const topNetworks = networks.slice(0, TOP_LIMIT);
  const remainingNetworks = networks.slice(TOP_LIMIT);

  // Filtered networks for search
  const filteredNetworks = networks.filter((n) =>
    n.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const selectedNetwork = networks.find((n) => n.id === selectedNetworkId) || networks[0];
  const isSelectedInRemaining = remainingNetworks.some((n) => n.id === selectedNetworkId);

  return (
    <div className="space-y-2 w-full">
      {/* 1. Quick Access Bar (Top Popular Networks + More Dropdown) */}
      <div className="flex flex-wrap items-center gap-1.5 w-full">
        {topNetworks.map((net) => {
          const isSelected = net.id === selectedNetworkId;
          const theme = NETWORK_THEMES[net.slug] || DEFAULT_THEME;

          return (
            <button
              key={net.id}
              type="button"
              onClick={() => onSelectNetwork(net.id)}
              className={`
                px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5
                transition-all duration-150 cursor-pointer select-none border outline-none
                active:scale-95
                ${isSelected
                  ? `${theme.bg} ${theme.ring} border-transparent font-bold`
                  : 'bg-background hover:bg-muted/60 text-muted-foreground hover:text-foreground border-border/80'
                }
              `}
            >
              <span>{net.name}</span>
            </button>
          );
        })}

        {/* 'More Platforms' dropdown if there are 6+ networks */}
        {remainingNetworks.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className={`
                px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5
                transition-all duration-150 cursor-pointer select-none border outline-none
                active:scale-95
                ${isSelectedInRemaining
                  ? 'bg-primary text-primary-foreground font-bold border-transparent shadow-xs ring-2 ring-primary/20'
                  : 'bg-background hover:bg-muted/60 text-muted-foreground hover:text-foreground border-border/80'
                }
              `}
            >
              <span>{isSelectedInRemaining ? selectedNetwork.name : `Ещё (${remainingNetworks.length})`}</span>
              <span className="text-[10px] opacity-70">▼</span>
            </button>

            {/* Dropdown Menu with Search */}
            {isDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-card rounded-2xl border border-border shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск платформы..."
                  autoFocus
                  className="w-full h-9 px-3 rounded-xl bg-background border border-border text-xs mb-2 outline-none focus:border-primary"
                />

                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredNetworks.map((net) => {
                    const isSel = net.id === selectedNetworkId;
                    return (
                      <button
                        key={net.id}
                        type="button"
                        onClick={() => {
                          onSelectNetwork(net.id);
                          setIsDropdownOpen(false);
                          setSearchQuery('');
                        }}
                        className={`
                          w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between
                          transition-colors cursor-pointer
                          ${isSel ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-foreground'}
                        `}
                      >
                        <span>{net.name}</span>
                        {isSel && <span className="text-primary text-xs">✓</span>}
                      </button>
                    );
                  })}
                  {filteredNetworks.length === 0 && (
                    <p className="text-[11px] text-muted-foreground text-center py-2">Ничего не найдено</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
