'use client';

import { Table } from "@heroui/react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { ProviderListDTO } from "@/services/admin/provider.service";

export function ProvidersTable({ providers }: { providers: ProviderListDTO[] }) {
  return (
    <div className="w-full">
      <Table aria-label="Провайдеры" className="rounded-2xl border border-border shadow-sm bg-card backdrop-blur-xl overflow-hidden p-0">
        <Table.Header>
          <Table.Column className="bg-muted/50 py-4 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Название / API</Table.Column>
          <Table.Column className="bg-muted/50 py-4 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Услуги</Table.Column>
          <Table.Column className="bg-muted/50 py-4 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Валюта</Table.Column>
          <Table.Column className="bg-muted/50 py-4 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">SLA</Table.Column>
          <Table.Column className="bg-muted/50 py-4 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Статус</Table.Column>
          <Table.Column className="bg-muted/50 py-4 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">Действия</Table.Column>
        </Table.Header>

        {/* @ts-ignore */}
        <Table.Body renderEmptyState={() => (
          <div className="py-12 text-center">
            <p className="text-muted-foreground font-medium mb-3">
              Нет добавленных провайдеров.
            </p>
            <Link
              href="/admin/providers/new"
              className="text-primary font-bold hover:underline transition-colors text-sm"
            >
              Подключить первую панель →
            </Link>
          </div>
        )}>
          {providers.map((provider) => (
            <Table.Row
              key={provider.id}
              className="hover:bg-muted/50 transition-all duration-200 group"
            >
              {/* Name / URL */}
              <Table.Cell className="py-4 px-4">
                <div className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
                  {provider.name}
                </div>
                <div
                  className="text-muted-foreground/70 font-mono text-[10px] mt-0.5 truncate max-w-xs"
                  title={provider.apiUrl}
                >
                  {provider.apiUrl}
                </div>
              </Table.Cell>

              {/* Service count */}
              <Table.Cell className="py-4 px-4">
                <div className="font-bold text-foreground tabular-nums">
                  {provider.serviceCount.toLocaleString('ru-RU')}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  связано
                </div>
              </Table.Cell>

              {/* Currency */}
              <Table.Cell className="py-4 px-4">
                <span className="text-[11px] font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
                  {provider.balanceCurrency}
                </span>
              </Table.Cell>

              {/* SLA */}
              <Table.Cell className="py-4 px-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground/70">Ping:</span>
                    <span className={`text-xs font-mono font-bold ${provider.avgResponseMs > 2000 ? 'text-destructive' : provider.avgResponseMs > 500 ? 'text-warning' : 'text-success'}`}>
                      {provider.avgResponseMs}ms
                    </span>
                  </div>
                  {provider.errorCount5m > 0 && (
                    <div className="text-[10px] font-bold text-destructive">
                      ⚠️ {provider.errorCount5m} errs / 5m
                    </div>
                  )}
                  {provider.lastSuccessAt && (
                    <div className="text-[9px] text-muted-foreground/70 font-medium">
                      Sync: {new Date(provider.lastSuccessAt).toLocaleTimeString('ru-RU')}
                    </div>
                  )}
                </div>
              </Table.Cell>

              {/* Status */}
              <Table.Cell className="py-4 px-4">
                <Badge
                  className={`font-bold text-[10px] uppercase tracking-widest ${
                    provider.isActive 
                      ? "bg-emerald-500/20 text-success border-emerald-500/30" 
                      : "bg-destructive/20 text-destructive border-destructive/30"
                  }`}
                >
                  {provider.isActive ? 'Активен' : 'Отключен'}
                </Badge>
              </Table.Cell>

              {/* Actions */}
              <Table.Cell className="py-4 px-4">
                <div className="flex justify-end">
                  <Link
                    href={`/admin/providers/${provider.id}`}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-all duration-200 shadow-sm inline-block"
                  >
                    Настроить
                  </Link>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}
