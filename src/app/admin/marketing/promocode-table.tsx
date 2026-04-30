'use client';

import * as React from 'react';
import { DataTable } from '@/components/ui/data-table';
import { columns } from './promocode-columns';
import { PromoCode } from '@prisma/client';

interface PromoCodeTableProps {
  data: PromoCode[];
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
