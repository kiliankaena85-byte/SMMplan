"use client";

import { Table } from '@heroui/react';

export function TopServicesTable({ topServices }: { topServices: any[] }) {
  return (
    <Table aria-label="Топ услуг по кликам" className="w-full text-xs">
      <Table.Header>
          <Table.Column className="px-4 py-3 text-left font-bold text-muted-foreground uppercase tracking-widest">Услуга</Table.Column>
          <Table.Column className="px-4 py-3 text-right font-bold text-muted-foreground uppercase tracking-widest">Кликов</Table.Column>
      </Table.Header>
      <Table.Body renderEmptyState={() => <div className="px-4 py-12 text-center text-muted-foreground font-medium">Нет данных</div>}>
        {topServices.map((srv, idx) => (
          <Table.Row key={idx} className="hover:bg-muted/30 transition-colors">
            <Table.Cell className="px-4 py-3 font-bold text-foreground">{srv.name}</Table.Cell>
            <Table.Cell className="px-4 py-3 text-right tabular-nums font-black text-primary">{srv.clicks}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

export function ProfitCategoriesTable({ categories, fmt }: { categories: any[], fmt: (v: number) => string }) {
  return (
    <Table aria-label="Рентабельность по категориям" className="w-full text-xs">
      <Table.Header>
          <Table.Column className="px-4 py-3 text-left font-bold text-muted-foreground uppercase tracking-widest">Категория</Table.Column>
          <Table.Column className="px-4 py-3 text-right font-bold text-muted-foreground uppercase tracking-widest">Заказов</Table.Column>
          <Table.Column className="px-4 py-3 text-right font-bold text-muted-foreground uppercase tracking-widest">Выручка</Table.Column>
          <Table.Column className="px-4 py-3 text-right font-bold text-muted-foreground uppercase tracking-widest">Себест.</Table.Column>
          <Table.Column className="px-4 py-3 text-right font-bold text-foreground uppercase tracking-widest">Прибыль</Table.Column>
          <Table.Column className="px-4 py-3 text-right font-bold text-muted-foreground uppercase tracking-widest">Маржа %</Table.Column>
      </Table.Header>
      <Table.Body renderEmptyState={() => <div className="py-12 text-center text-muted-foreground">Нет данных о продажах</div>}>
        {categories.map((c, i) => (
          <Table.Row key={i} className="hover:bg-muted/30 transition-colors">
            <Table.Cell className="px-4 py-3 font-bold text-foreground">{c.categoryName}</Table.Cell>
            <Table.Cell className="px-4 py-3 text-right tabular-nums text-muted-foreground">{c.ordersCount}</Table.Cell>
            <Table.Cell className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(c.revenue)}</Table.Cell>
            <Table.Cell className="px-4 py-3 text-right tabular-nums text-muted-foreground">{fmt(c.cogs)}</Table.Cell>
            <Table.Cell className="px-4 py-3 text-right tabular-nums font-black text-success">{fmt(c.profit)}</Table.Cell>
            <Table.Cell className="px-4 py-3 text-right">
               <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${c.marginPct > 40 ? 'bg-emerald-500/15 text-success' : 'bg-amber-500/15 text-warning'}`}>
                 {c.marginPct.toFixed(1)}%
               </span>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

export function ProfitServicesTable({ services, fmt }: { services: any[], fmt: (v: number) => string }) {
  return (
    <Table aria-label="Рентабельность по услугам (Топ 15)" className="w-full text-xs">
      <Table.Header>
          <Table.Column className="px-4 py-3 text-left font-bold text-muted-foreground uppercase tracking-widest">Услуга</Table.Column>
          <Table.Column className="px-4 py-3 text-right font-bold text-muted-foreground uppercase tracking-widest">Заказов</Table.Column>
          <Table.Column className="px-4 py-3 text-right font-bold text-muted-foreground uppercase tracking-widest">Выручка</Table.Column>
          <Table.Column className="px-4 py-3 text-right font-bold text-foreground uppercase tracking-widest">Прибыль</Table.Column>
          <Table.Column className="px-4 py-3 text-right font-bold text-muted-foreground uppercase tracking-widest">Маржа %</Table.Column>
      </Table.Header>
      <Table.Body renderEmptyState={() => <div className="py-12 text-center text-muted-foreground">Нет данных о продажах</div>}>
        {services.slice(0, 15).map((s, i) => (
          <Table.Row key={i} className="hover:bg-muted/30 transition-colors">
            <Table.Cell className="px-4 py-3">
              <div className="flex flex-col">
                <span className="font-bold text-foreground">{s.serviceName}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">{s.categoryName}</span>
              </div>
            </Table.Cell>
            <Table.Cell className="px-4 py-3 text-right tabular-nums text-muted-foreground">{s.ordersCount}</Table.Cell>
            <Table.Cell className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(s.revenue)}</Table.Cell>
            <Table.Cell className="px-4 py-3 text-right tabular-nums font-black text-primary">{fmt(s.profit)}</Table.Cell>
            <Table.Cell className="px-4 py-3 text-right">
               <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${s.marginPct > 50 ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                 {s.marginPct.toFixed(1)}%
               </span>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
