"use client";

import { memo, useEffect, useRef, useState } from "react";
import { PublicService } from "@/actions/order/catalog";
import { ServiceCard } from "./ServiceCard";
import { X } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface MobileServiceDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  services: PublicService[];
  selectedServiceId: string | null;
  onSelect: (id: string) => void;
  platformId: string;
}

export const MobileServiceDropdown = memo(function MobileServiceDropdown({
  isOpen,
  onClose,
  services,
  selectedServiceId,
  onSelect,
  platformId
}: MobileServiceDropdownProps) {
  const [startY, setStartY] = useState<number | null>(null);
  const [currentY, setCurrentY] = useState(0);
  const parentRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap & body scroll lock
  useEffect(() => {
    let originalOverflow = "";
    if (isOpen) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      dialogRef.current?.focus();
    } else {
      document.body.style.overflow = "";
      setStartY(null);
      setCurrentY(0);
    }
    
    return () => {
      document.body.style.overflow = originalOverflow || "";
    };
  }, [isOpen]);

  const rowVirtualizer = useVirtualizer({
    count: services.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 130, // ServiceCard height approx
    overscan: 5,
  });

  const handleTouchStart = (e: React.TouchEvent) => setStartY(e.touches[0].clientY);
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === null) return;
    const y = e.touches[0].clientY;
    const delta = y - startY;
    if (delta > 0 && parentRef.current?.scrollTop === 0) {
      setCurrentY(delta);
    }
  };

  const handleTouchEnd = () => {
    if (currentY > 100) onClose();
    else setCurrentY(0);
    setStartY(null);
  };

  if (!isOpen && currentY === 0) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`fixed inset-x-0 bottom-0 z-[101] bg-content1 rounded-t-3xl shadow-2xl transition-transform duration-300 outline-none overscroll-contain flex flex-col`}
        style={{ 
          height: '85vh',
          transform: `translateY(${isOpen ? currentY : 100}%)`, 
          opacity: isOpen || currentY > 0 ? 1 : 0 
        }}
      >
        {/* Header with swipe indicator */}
        <div className="flex-shrink-0 flex flex-col items-center p-4 border-b border-border/50">
          <div className="w-12 h-1.5 bg-default-200 rounded-full mb-4" />
          <div className="w-full flex justify-between items-center">
            <h3 className="font-bold text-lg">Выберите тариф</h3>
            <button onClick={onClose} className="p-2 text-muted-foreground hover:text-muted-foreground rounded-full bg-default-100 min-h-12 min-w-12 flex items-center justify-center">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Virtualized Content */}
        <div 
          ref={parentRef}
          className="flex-1 overflow-y-auto p-4 custom-scrollbar overscroll-contain"
        >
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const service = services[virtualRow.index];
              return (
                <div
                  key={virtualRow.index}
                  style={{
                    position: 'absolute', top: 0, left: 0, width: '100%',
                    height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)`, paddingBottom: '12px',
                  }}
                >
                  <ServiceCard
                    service={service}
                    isSelected={selectedServiceId === service.id}
                    onSelect={(id) => { onSelect(id); onClose(); }}
                    platformId={platformId}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
});
