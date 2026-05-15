'use client';

import { Table } from '@/components/admin/hero-ui';
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
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Заказы клиента">
            <Table.Header>
              <Table.Column>#</Table.Column>
              <Table.Column>УСЛУГА</Table.Column>
              <Table.Column className="text-right">КОЛ-ВО</Table.Column>
              <Table.Column className="text-right">СУММА</Table.Column>
              <Table.Column>СТАТУС</Table.Column>
              <Table.Column>ДАТА</Table.Column>
            </Table.Header>
            <Table.Body renderEmptyState={() => "Нет заказов"}>
              {orders.map(o => (
                <Table.Row key={o.id}>
                  <Table.Cell>
                    <Link href={`/admin/orders?q=${o.numericId}`} className="font-mono text-xs text-primary hover:underline">
                      #{o.numericId}
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-xs text-foreground truncate max-w-[200px] block">{o.service.name}</span>
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    <span className="text-xs tabular-nums text-muted-foreground">{o.quantity.toLocaleString('ru-RU')}</span>
                  </Table.Cell>
                  <Table.Cell className="text-right">
                    <span className="text-xs font-semibold tabular-nums text-foreground">{(Number(o.charge) / 100).toFixed(2)} ₽</span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {o.status}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString('ru-RU')}
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
