'use client';

import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@/components/admin/hero-ui';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  PENDING:    'bg-warning/20  text-amber-700',
  PROCESSING: 'bg-blue-100   text-blue-700',
  COMPLETED:  'bg-success/20 text-emerald-700',
  FAILED:     'bg-destructive/20   text-rose-700',
  CANCELLED:  'bg-muted  text-muted-foreground',
  PARTIAL:    'bg-orange-100 text-orange-700',
};

type OrderType = {
  id: string;
  numericId: number;
  status: string;
  quantity: number;
  charge: any;
  createdAt: Date;
  service: { name: string };
};

export function ClientOrdersTable({ orders }: { orders: OrderType[] }) {
  return (
    <>
      <Table aria-label="Заказы клиента">
        <TableHeader>
          <TableColumn>#</TableColumn>
          <TableColumn>УСЛУГА</TableColumn>
          <TableColumn className="text-right">КОЛ-ВО</TableColumn>
          <TableColumn className="text-right">СУММА</TableColumn>
          <TableColumn>СТАТУС</TableColumn>
          <TableColumn>ДАТА</TableColumn>
        </TableHeader>
        <TableBody renderEmptyState={() => "Нет заказов"}>
          {orders.map(o => (
            <TableRow key={o.id}>
              <TableCell>
                <Link href={`/admin/orders?q=${o.numericId}`} className="font-mono text-xs text-primary hover:underline">
                  #{o.numericId}
                </Link>
              </TableCell>
              <TableCell>
                <span className="text-xs text-foreground truncate max-w-[200px] block">{o.service.name}</span>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-xs tabular-nums text-muted-foreground">{o.quantity.toLocaleString('ru-RU')}</span>
              </TableCell>
              <TableCell className="text-right">
                <span className="text-xs font-semibold tabular-nums text-foreground">{(Number(o.charge) / 100).toFixed(2)} ₽</span>
              </TableCell>
              <TableCell>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] ?? 'bg-muted text-muted-foreground'}`}>
                  {o.status}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground">
                  {new Date(o.createdAt).toLocaleDateString('ru-RU')}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
