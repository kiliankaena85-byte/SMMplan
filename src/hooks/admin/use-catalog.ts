'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { CatalogServiceDTO } from '@/types/catalog.dto';

export function useCatalogManagement({ initialServices }: { initialServices: CatalogServiceDTO[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Currency & Volume presentation state
  const [currency, setCurrency] = useState<'RUB' | 'USD'>('RUB');
  const [volume, setVolume] = useState<'UNIT' | '1K'>('1K');

  // Input states for filters
  const currentSearch = searchParams.get('q') || '';
  const currentExternalId = searchParams.get('externalId') || '';
  
  const [searchVal, setSearchVal] = useState(currentSearch);
  const [extIdVal, setExtIdVal] = useState(currentExternalId);

  // Sync state if URL changes externally
  const [prevSearch, setPrevSearch] = useState(currentSearch);
  if (currentSearch !== prevSearch) {
    setPrevSearch(currentSearch);
    setSearchVal(currentSearch);
  }
  
  const [prevExtId, setPrevExtId] = useState(currentExternalId);
  if (currentExternalId !== prevExtId) {
    setPrevExtId(currentExternalId);
    setExtIdVal(currentExternalId);
  }

  function toggleAll() {
    if (selected.size === initialServices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(initialServices.map(s => s.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('cursor'); // Reset pagination
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function resetFilters() {
    setSearchVal('');
    setExtIdVal('');
    router.push(pathname, { scroll: false });
  }

  return {
    selected,
    setSelected,
    toggleAll,
    toggleOne,
    currency,
    setCurrency,
    volume,
    setVolume,
    searchVal,
    setSearchVal,
    extIdVal,
    setExtIdVal,
    updateFilter,
    resetFilters,
    allSelected: initialServices.length > 0 && selected.size === initialServices.length,
    selectedIds: Array.from(selected)
  };
}
