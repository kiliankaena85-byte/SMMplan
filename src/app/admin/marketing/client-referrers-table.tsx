'use client';

import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@/components/admin/hero-ui';
import Link from 'next/link';
import { PayoutButton } from './payout-button';

type ReferrerType = {
  id: string;
  email: string;
  referralBalance: number;
  _count: { referrals: number };
};

export function ReferrersTable({ referrers }: { referrers: ReferrerType[] }) {
  return (
    <>
      <Table aria-label="Топ рефоводов">
        <TableHeader>
          <TableColumn>КЛИЕНТ</TableColumn>
          <TableColumn className="text-right">PENDING</TableColumn>
          <TableColumn className="text-right">РЕФЕРАЛЫ</TableColumn>
          <TableColumn className="text-right">ДЕЙСТВИЕ</TableColumn>
        </TableHeader>
        <TableBody renderEmptyState={() => "Нет активных реферальных балансов"}>
          {referrers.map(u => (
            <TableRow key={u.id}>
              <TableCell>
                <Link 
                  href={`/admin/clients?q=${encodeURIComponent(u.email)}`}
                  className="text-primary hover:underline font-mono text-xs font-semibold"
                >
                  {u.email}
                </Link>
              </TableCell>
              <TableCell className="text-right">
                <span className="font-black text-success tabular-nums">{(u.referralBalance / 100).toFixed(2)} ₽</span>
              </TableCell>
              <TableCell className="text-right text-muted-foreground tabular-nums">
                <span className="px-2 py-1 rounded-md bg-muted text-[10px] font-bold">{u._count.referrals} чел.</span>
              </TableCell>
              <TableCell className="text-right">
                <PayoutButton userId={u.id} amount={u.referralBalance} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
