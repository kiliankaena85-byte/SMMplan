"use client";

import { memo, useMemo, useRef, useEffect, useState } from "react";
import { PublicService } from "@/actions/order/catalog";
import { ServiceCard } from "./ServiceCard";
import { useVirtualizer } from "@tanstack/react-virtual";

interface ServiceGridProps {
  services: PublicService[];
  selectedServiceId: string | null;
  onSelect: (id: string) => void;
  platformId: string;
}

export const ServiceGrid = memo(function ServiceGrid({
  services,
  selectedServiceId,
  onSelect,
  platformId
}: ServiceGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  // Update columns based on window width to fake a grid in a virtualized list
  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth >= 1024) setColumns(3); // lg
      else if (window.innerWidth >= 768) setColumns(2); // md
      else setColumns(1); // mobile
    };
    
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // Chunk services into rows
  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < services.length; i += columns) {
      result.push(services.slice(i, i + columns));
    }
    return result;
  }, [services, columns]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140, // Estimated height of a ServiceCard + gap
    overscan: 5,
  });

  if (!services || services.length === 0) {
    return <div className="text-slate-500 p-4 text-center">Нет доступных услуг в этой категории</div>;
  }

  // If few items, no need to virtualize, just use CSS grid
  if (services.length <= 15) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map(service => (
          <ServiceCard
            key={service.id}
            service={service}
            isSelected={selectedServiceId === service.id}
            onSelect={onSelect}
            platformId={platformId}
          />
        ))}
      </div>
    );
  }

  // Virtualized rendering for >15 items
  return (
    <div 
      ref={parentRef} 
      className="w-full h-[600px] overflow-auto pr-2 custom-scrollbar"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowServices = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                paddingBottom: '16px', // gap
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {rowServices.map(service => (
                <div key={service.id}>
                  <ServiceCard
                    service={service}
                    isSelected={selectedServiceId === service.id}
                    onSelect={onSelect}
                    platformId={platformId}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
});
