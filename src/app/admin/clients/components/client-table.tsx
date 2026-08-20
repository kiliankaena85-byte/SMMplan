'use client';

import * as React from 'react';
import { DataTable } from '@/components/ui/data-table';
import { columns, ClientColumn } from './columns';

interface ClientTableProps {
  data: ClientColumn[];
}

export function ClientTable({ data }: ClientTableProps) {
  return (
    <div className="w-full">
      <DataTable 
        columns={columns} 
        data={data} 
        searchKey="email" 
        searchPlaceholder="Быстрая фильтрация на странице..." 
      />
    </div>
  );
}
