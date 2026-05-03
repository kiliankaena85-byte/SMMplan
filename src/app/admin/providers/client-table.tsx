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

export function ProvidersTable({ providers }: { providers: ProviderListDTO[] }) {
  return (
    <div className="rounded-2xl border border-slate-100/50 shadow-sm bg-white/60 backdrop-blur-xl overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow>
            <TableHead className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Название / API
            </TableHead>
            <TableHead className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Услуги</TableHead>
            <TableHead className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Валюта</TableHead>
            <TableHead className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">SLA</TableHead>
            <TableHead className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Статус</TableHead>
            <TableHead className="py-4 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {providers.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-12 text-center">
                <p className="text-slate-500 font-medium mb-3">
                  Нет добавленных провайдеров.
                </p>
                <Link
                  href="/admin/providers/new"
                  className="text-sky-600 font-bold hover:underline transition-colors text-sm"
                >
                  Подключить первую панель →
                </Link>
              </TableCell>
            </TableRow>
          )}
          {providers.map((provider) => (
            <TableRow
              key={provider.id}
              className="hover:bg-slate-50/80 transition-all duration-200 group"
            >
              {/* Name / URL */}
              <TableCell className="py-4 px-4">
                <div className="font-semibold text-slate-900 group-hover:text-sky-600 transition-colors duration-200">
                  {provider.name}
                </div>
                <div
                  className="text-slate-400 font-mono text-[10px] mt-0.5 truncate max-w-xs"
                  title={provider.apiUrl}
                >
                  {provider.apiUrl}
                </div>
              </TableCell>

              {/* Service count */}
              <TableCell className="py-4 px-4">
                <div className="font-bold text-slate-900 tabular-nums">
                  {provider.serviceCount.toLocaleString('ru-RU')}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  связано
                </div>
              </TableCell>

              {/* Currency */}
              <TableCell className="py-4 px-4">
                <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {provider.balanceCurrency}
                </span>
              </TableCell>

              {/* SLA */}
              <TableCell className="py-4 px-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-400">Ping:</span>
                    <span className={`text-xs font-mono font-bold ${provider.avgResponseMs > 2000 ? 'text-rose-500' : provider.avgResponseMs > 500 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {provider.avgResponseMs}ms
                    </span>
                  </div>
                  {provider.errorCount5m > 0 && (
                    <div className="text-[10px] font-bold text-rose-500">
                      ⚠️ {provider.errorCount5m} errs / 5m
                    </div>
                  )}
                  {provider.lastSuccessAt && (
                    <div className="text-[9px] text-slate-400 font-medium">
                      Sync: {new Date(provider.lastSuccessAt).toLocaleTimeString('ru-RU')}
                    </div>
                  )}
                </div>
              </TableCell>

              {/* Status */}
              <TableCell className="py-4 px-4">
                <Badge
                  className={`font-bold text-[10px] uppercase tracking-widest ${
                    provider.isActive 
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                      : "bg-rose-100 text-rose-700 border-rose-200"
                  }`}
                >
                  {provider.isActive ? 'Активен' : 'Отключен'}
                </Badge>
              </TableCell>

              {/* Actions */}
              <TableCell className="py-4 px-4 text-right">
                <Link
                  href={`/admin/providers/${provider.id}`}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all duration-200 shadow-sm"
                >
                  Настроить
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
