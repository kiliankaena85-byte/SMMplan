import { inferTargetTypeFromCategory, isTargetTypeCompatible } from '@/utils/target-type';
import { resolveServiceTargetType } from '@/utils/target-type-mapper';
import type { ExternalServiceItem, CategoryItem } from '../../types';

function findService(
  services: ExternalServiceItem[] | Map<string, ExternalServiceItem>,
  id: string
): ExternalServiceItem | undefined {
  if (services instanceof Map) return services.get(id);
  return services.find((s) => String(s.service) === id);
}

export function computeReadyAndAttention(
  services: ExternalServiceItem[],
  selectedCategories: Record<string, string>,
  autoMappedCategories: Record<string, string>,
  minPriceStr: string,
  maxPriceStr: string
) {
  const minPrice = parseFloat(minPriceStr) || 0;
  const maxPrice = parseFloat(maxPriceStr) || Infinity;

  const ready = services.filter((s) => {
    const catId = selectedCategories[String(s.service)] || autoMappedCategories[String(s.service)];
    const isPriceValid =
      (s.pricePerUnitProcurementRub ?? 0) >= minPrice &&
      (s.pricePerUnitProcurementRub ?? 0) <= maxPrice;
    return !!catId && isPriceValid;
  });

  const attention = services.filter((s) => {
    const catId = selectedCategories[String(s.service)] || autoMappedCategories[String(s.service)];
    const isPriceValid =
      (s.pricePerUnitProcurementRub ?? 0) >= minPrice &&
      (s.pricePerUnitProcurementRub ?? 0) <= maxPrice;
    return !catId || !isPriceValid || s.metrics?.priceAnomaly;
  });

  return { ready, attention };
}

export function computePlatformBreakdown(
  selectedIds: Set<string>,
  services: ExternalServiceItem[] | Map<string, ExternalServiceItem>
) {
  const counts: Record<string, number> = {};
  selectedIds.forEach((id) => {
    const svc = findService(services, id);
    if (!svc) return;
    const platform = (svc.metrics?.platform || 'other').toLowerCase();
    counts[platform] = (counts[platform] || 0) + 1;
  });

  const iconMap: Record<string, string> = {
    telegram: '✈️',
    instagram: '📸',
    vk: '💙',
    youtube: '▶️',
    tiktok: '🎵',
  };
  const nameMap: Record<string, string> = {
    telegram: 'Telegram',
    instagram: 'Instagram',
    vk: 'ВКонтакте',
    youtube: 'YouTube',
    tiktok: 'TikTok',
  };

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({
      name: nameMap[key] || key,
      icon: iconMap[key] || '🌐',
      count,
    }));
}

export function computeIncompatibleIds(
  selectedIds: Set<string>,
  services: ExternalServiceItem[] | Map<string, ExternalServiceItem>,
  selectedCategories: Record<string, string>,
  autoMappedCategories: Record<string, string>,
  localCategories: CategoryItem[]
): Set<string> {
  const set = new Set<string>();
  selectedIds.forEach((id) => {
    const svc = findService(services, id);
    const catId = selectedCategories[id] || autoMappedCategories[id];
    if (svc && catId) {
      const cat = localCategories.find((c) => c.id === catId);
      if (cat) {
        const serviceType = resolveServiceTargetType({ name: svc.name, targetType: svc.metrics?.targetType });
        const catType = inferTargetTypeFromCategory(cat.name);
        if (!isTargetTypeCompatible(serviceType, catType)) {
          set.add(id);
        }
      }
    }
  });
  return set;
}
