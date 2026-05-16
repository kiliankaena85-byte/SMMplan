'use client';

import { Table } from '@/components/admin/hero-ui';
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
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Заявки на докрутку (Refills)">
            <Table.Header>
              <Table.Column isRowHeader>REFILL ID</Table.Column>
              <Table.Column>ЗАКАЗ</Table.Column>
              <Table.Column>КЛИЕНТ</Table.Column>
              <Table.Column>УСЛУГА</Table.Column>
              <Table.Column className="text-right">СТАТУС</Table.Column>
              <Table.Column className="text-right">ДАТА</Table.Column>
            </Table.Header>
            <Table.Body renderEmptyState={() => "Нет заявок на докрутку"}>
              {refills.map(r => (
                <Table.Row key={r.id}>
                  <Table.Cell>
                    <span className="font-mono text-xs font-bold text-foreground">#{r.numericId}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <Link href={`/admin/orders?q=${r.order.numericId}`} className="text-primary hover:underline text-xs font-mono font-bold">
                      #{r.order.numericId}
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-xs font-mono text-muted-foreground">{r.order.user.email}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-xs font-semibold text-foreground max-w-[200px] truncate block">{r.order.service.name}</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase font-bold rounded-md border ${
                      r.status === 'COMPLETED' ? 'bg-success/10 text-emerald-700 border-emerald-100' :
                      r.status === 'ERROR' || r.status === 'REJECTED' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                      'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </>
  );
}
