"use client";

import { memo } from "react";
import { PublicCategory } from "@/actions/order/catalog";
import { CategoryIcon, cleanCategoryName } from "@/components/ui/CategoryIcon";

interface CategorySidebarProps {
  categories: PublicCategory[];
  selectedCategoryId: string;
  onSelect: (id: string) => void;
}

export const CategorySidebar = memo(function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelect
}: CategorySidebarProps) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="w-full">
      {/* Mobile view: Native select */}
      <div className="md:hidden">
        <select
          value={selectedCategoryId || ""}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full p-4 rounded-2xl bg-white border border-slate-200 text-base min-h-12 outline-none focus:border-sky-300"
        >
          <option value="" disabled>Выберите категорию</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {cleanCategoryName(category.name)}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop view: Sidebar list */}
      <div className="hidden md:flex flex-col gap-1 w-64 flex-shrink-0">
        {categories.map(category => {
          const isSelected = selectedCategoryId === category.id;
          const cleanedName = cleanCategoryName(category.name);
          
          return (
            <button
              key={category.id}
              onClick={() => onSelect(category.id)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 min-h-12 text-left touch-manipulation
                ${isSelected 
                  ? 'bg-sky-50 text-sky-700 font-semibold shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
              `}
            >
              <CategoryIcon name={category.name} className={isSelected ? 'text-sky-500' : 'text-slate-400'} size={20} />
              <span className="flex-1 truncate leading-tight">{cleanedName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});
