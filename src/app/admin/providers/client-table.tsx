'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { ProviderListDTO } from "@/services/admin/provider.service";
import { ProviderBalanceCell } from "./components/provider-balance-cell";
import { SyncProviderButton } from "./components/sync-provider-button";

export function ProvidersTable({ providers }: { providers: ProviderListDTO[] }) {
  return (
    <div className="w-full">
      <div className="rounded-2xl border border-border shadow-sm bg-card backdrop-blur-xl overflow-hidden p-0">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%] bg-muted/50 py-4 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Название / API</TableHead>
              <TableHead className="w-[10%] bg-muted/50 py-4 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Услуги</TableHead>
              <TableHead className="w-[15%] bg-muted/50 py-4 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Баланс (Sync)</TableHead>
              <TableHead className="w-[10%] bg-muted/50 py-4 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">SLA</TableHead>
              <TableHead className="w-[10%] bg-muted/50 py-4 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Статус</TableHead>
              <TableHead className="w-[25%] bg-muted/50 py-4 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
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
                </TableCell>
              </TableRow>
            ) : (
              providers.map((provider) => (
                <TableRow
                  key={provider.id}
                  className="hover:bg-muted/50 transition-all duration-200 group"
                >
                  {/* Name / URL */}
                  <TableCell className="py-4 px-4">
                    <div className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
                      {provider.name}
                    </div>
                    <div
                      className="text-muted-foreground/70 font-mono text-[10px] mt-0.5 truncate max-w-xs"
                      title={provider.apiUrl}
                    >
                      {provider.apiUrl}
                    </div>
                  </TableCell>

                  {/* Service count */}
                  <TableCell className="py-4 px-4">
                    <div className="font-bold text-foreground tabular-nums">
                      {provider.serviceCount.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                      связано
                    </div>
                  </TableCell>

                  {/* Balance */}
                  <TableCell className="py-4 px-4">
                    {provider.isActive ? (
                      <ProviderBalanceCell providerId={provider.id} />
                    ) : (
                      <span className="text-[11px] font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border">
                        OFFLINE
                      </span>
                    )}
                  </TableCell>

                  {/* SLA */}
                  <TableCell className="py-4 px-4">
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
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-4 px-4">
                    <Badge
                      intent={!provider.isActive ? "secondary" : provider.errorCount5m > 0 ? "destructive" : "primary"}
                      className={`font-bold text-[10px] uppercase tracking-widest ${
                        !provider.isActive
                          ? "bg-muted text-muted-foreground border-border hover:bg-muted"
                          : provider.errorCount5m > 0
                          ? "bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30"
                          : "bg-success/20 text-success border-emerald-500/30 hover:bg-success/30"
                      }`}
                    >
                      {!provider.isActive 
                        ? "ОТКЛЮЧЕН" 
                        : provider.errorCount5m > 0 
                        ? "СБОЙ API" 
                        : "ВКЛЮЧЕН"}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <SyncProviderButton providerId={provider.id} />
                      <Link
                        href={`/admin/providers/${provider.id}`}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-all duration-200 shadow-sm inline-block"
                      >
                        Настроить
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
