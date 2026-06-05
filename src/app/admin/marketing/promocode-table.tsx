'use client';

import * as React from 'react';
import { DataTable } from '@/components/ui/data-table';
import { columns, PromoCodeWithUsages } from './promocode-columns';

interface PromoCodeTableProps {
  data: PromoCodeWithUsages[];
}

export function PromoCodeTable({ data }: PromoCodeTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="code"
      searchPlaceholder="Поиск по коду..."
    />
  );
}
