'use client';

import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@/components/admin/hero-ui';
import Link from 'next/link';

type RefillProps = {
  id: string;
  numericId: number;
  status: string;
  createdAt: Date;
  order: {
    numericId: number;
    link: string;
    quantity: number;
    user: { email: string };
    service: { name: string };
  };
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнен',
  REJECTED: 'Отклонён',
  ERROR: 'Ошибка',
};

export function RefillsTable({ refills }: { refills: RefillProps[] }) {
  return (
    <>
      <Table aria-label="Заявки на докрутку (Refills)">
        <TableHeader>
          <TableColumn>REFILL ID</TableColumn>
          <TableColumn>ЗАКАЗ</TableColumn>
          <TableColumn>КЛИЕНТ</TableColumn>
          <TableColumn>УСЛУГА</TableColumn>
          <TableColumn className="text-right">СТАТУС</TableColumn>
          <TableColumn className="text-right">ДАТА</TableColumn>
        </TableHeader>
        <TableBody renderEmptyState={() => "Нет заявок на докрутку"}>
          {refills.map(r => (
            <TableRow key={r.id}>
              <TableCell>
                <span className="font-mono text-xs font-bold text-foreground">#{r.numericId}</span>
              </TableCell>
              <TableCell>
                <Link href={`/admin/orders?q=${r.order.numericId}`} className="text-primary hover:underline text-xs font-mono font-bold">
                  #{r.order.numericId}
                </Link>
              </TableCell>
              <TableCell>
                <span className="text-xs font-mono text-muted-foreground">{r.order.user.email}</span>
              </TableCell>
              <TableCell>
                <span className="text-xs font-semibold text-foreground max-w-[200px] truncate block">{r.order.service.name}</span>
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase font-bold rounded-md border ${
                  r.status === 'COMPLETED' ? 'bg-success/10 text-emerald-700 border-emerald-100' :
                  r.status === 'ERROR' || r.status === 'REJECTED' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                  'bg-primary/10 text-primary border-primary/20'
                }`}>
                  {STATUS_LABELS[r.status] || r.status}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
