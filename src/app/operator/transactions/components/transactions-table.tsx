'use client';

import * as React from 'react';
import Link from 'next/link';
import { Table } from '@/components/admin/hero-ui';
import { Badge } from '@/components/ui/badge';
import { LedgerEntryDTO } from '@/actions/operator/transactions/get-transactions-list.action';

interface TransactionsTableProps {
  data: LedgerEntryDTO[];
}

const TYPE_COLORS: Record<string, string> = {
  PAYMENT:      'bg-primary/10 text-primary border-transparent',
  REFUND:       'bg-warning/15 text-warning border-transparent',
  COMPENSATION: 'bg-violet-100 dark:bg-violet-900/20 text-violet-800 dark:text-violet-400 border-transparent',
  REROUTE:      'bg-slate-100 dark:bg-slate-900/20 text-slate-700 dark:text-slate-400 border-transparent',
};

const STATUS_COLORS: Record<string, string> = {
  APPROVED:   'bg-success/15 text-success border-transparent',
  QUARANTINE: 'bg-warning/15 text-warning border-transparent font-bold',
  REJECTED:   'bg-destructive/15 text-destructive border-transparent',
};

export function TransactionsTable({ data }: TransactionsTableProps) {
  return (
    <Table.ScrollContainer>
      <Table aria-label="Таблица транзакций Ledger">
        <Table.Header>
          <Table.Column>ID Транзакции</Table.Column>
          <Table.Column>Клиент</Table.Column>
          <Table.Column className="text-right">Сумма</Table.Column>
          <Table.Column>Тип</Table.Column>
          <Table.Column>Статус</Table.Column>
          <Table.Column>Назначение / Описание</Table.Column>
          <Table.Column>Дата</Table.Column>
        </Table.Header>
        <Table.Body emptyContent="Транзакции не найдены">
          {data.map((item) => {
            const isCredit = item.amount > 0;
            const formattedAmount = (item.amount / 100).toLocaleString('ru-RU', {
              minimumFractionDigits: 2,
            });

            return (
              <Table.Row key={item.id}>
                {/* ID */}
                <Table.Cell className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                  {item.id}
                </Table.Cell>

                {/* Client Link */}
                <Table.Cell>
                  <Link
                    href={`/operator/users/${item.userId}`}
                    className="text-primary hover:underline font-mono font-medium text-xs break-all"
                  >
                    {item.userEmail}
                  </Link>
                </Table.Cell>

                {/* Amount */}
                <Table.Cell className="text-right">
                  <span
                    className={`font-mono font-bold text-xs tabular-nums tracking-tight ${
                      isCredit ? 'text-success' : 'text-foreground'
                    }`}
                  >
                    {isCredit ? '+' : ''}
                    {formattedAmount} ₽
                  </span>
                </Table.Cell>

                {/* Type */}
                <Table.Cell>
                  <Badge
                    intent="outline"
                    className={`text-[9px] uppercase font-black tracking-widest px-2 py-0.5 ${
                      TYPE_COLORS[item.transactionType] || 'bg-muted'
                    }`}
                  >
                    {item.transactionType}
                  </Badge>
                </Table.Cell>

                {/* Status */}
                <Table.Cell>
                  <Badge
                    intent="outline"
                    className={`text-[9px] uppercase font-black tracking-widest px-2 py-0.5 ${
                      STATUS_COLORS[item.status] || 'bg-muted'
                    }`}
                  >
                    {item.status}
                  </Badge>
                </Table.Cell>

                {/* Reason */}
                <Table.Cell className="max-w-[280px]">
                  <p className="text-xs text-foreground leading-normal font-medium break-words font-sans">
                    {item.reason}
                  </p>
                </Table.Cell>

                {/* Date */}
                <Table.Cell className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                  {new Date(item.createdAt).toLocaleDateString('ru-RU')} в{' '}
                  {new Date(item.createdAt).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>
    </Table.ScrollContainer>
  );
}
