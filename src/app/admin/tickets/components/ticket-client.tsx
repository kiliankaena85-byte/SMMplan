'use client';

import { DataTable } from '@/components/ui/data-table';
import { columns, TicketColumn } from './columns';
import { useRouter, useSearchParams } from 'next/navigation';

interface TicketClientProps {
  data: TicketColumn[];
  totalPages: number;
  currentPage: number;
}

export function TicketClient({ data, totalPages, currentPage }: TicketClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get('status') || 'ALL';
  const source = searchParams.get('source') || 'ALL';
  const q = searchParams.get('q') || '';

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'ALL') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set('page', '1'); // Reset to first page
    router.push(`/admin/tickets?${params.toString()}`);
  };

  const renderToolbar = () => (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex flex-col">
        <label className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-widest">Статус</label>
        <select
          value={status}
          className="w-full sm:w-48 bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          onChange={(e) => updateFilters('status', e.target.value)}
        >
          <option value="ALL">Все статусы</option>
          <option value="OPEN">Открытые</option>
          <option value="PENDING">В ожидании</option>
          <option value="CLOSED">Закрытые</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-widest">Канал</label>
        <select
          value={source}
          className="w-full sm:w-48 bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          onChange={(e) => updateFilters('source', e.target.value)}
        >
          <option value="ALL">Все каналы</option>
          <option value="TELEGRAM">Telegram</option>
          <option value="WEB">Web</option>
          <option value="EMAIL">Email</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        columns={columns}
        data={data}
        searchKey="user.email"
        searchPlaceholder="Поиск по клиенту..."
        renderToolbar={renderToolbar}
      />
      
      {/* Basic Pagination Wrapper since DataTable pagination is client side but we need server side */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border mt-2">
          <button
            onClick={() => updateFilters('page', String(currentPage - 1))}
            disabled={currentPage <= 1}
            className="px-4 py-2 text-xs font-bold bg-muted text-muted-foreground rounded-lg disabled:opacity-50"
          >
            ← Назад
          </button>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Стр {currentPage} из {totalPages}
          </span>
          <button
            onClick={() => updateFilters('page', String(currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 text-xs font-bold bg-muted text-muted-foreground rounded-lg disabled:opacity-50"
          >
            Вперед →
          </button>
        </div>
      )}
    </div>
  );
}
