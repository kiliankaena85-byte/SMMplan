'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ShieldAlert,
  Search,
  Settings2,
  UserMinus,
  Package,
  Users,
  UserPlus,
  Calendar,
  Activity,
  Link as LinkIcon,
  History,
  CheckCircle2,
  XCircle,
  Globe,
} from 'lucide-react';
import type { StaffRole, StaffPermission } from '@prisma/client';
import type { StaffUser } from '../types';
import { RoleBadge, EmailAvatar } from '../ui-helpers';

interface StaffTableSectionProps {
  staffUsers: StaffUser[];
  staffRoles?: (StaffRole & { permissions: StaffPermission[] })[];
  onOpenAddStaff?: () => void;
  onOpenEdit: (u: StaffUser) => void;
  onOpenDemote: (u: StaffUser) => void;
  onToggleStatus?: (u: StaffUser) => void;
  onGenerateMagicLink?: (userId: string) => Promise<void>;
  onViewLogs?: (u: StaffUser) => void;
  canDemote: (role: string) => boolean;
  isPending: boolean;
}

export function StaffTableSection({
  staffUsers,
  staffRoles = [],
  onOpenAddStaff,
  onOpenEdit,
  onOpenDemote,
  onToggleStatus,
  onGenerateMagicLink,
  onViewLogs,
  canDemote,
  isPending,
}: StaffTableSectionProps) {
  const [searchEmail, setSearchEmail] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const filteredStaff = staffUsers.filter((u) => {
    const matchEmail = u.email.toLowerCase().includes(searchEmail.toLowerCase().trim());
    const matchRole = filterRole === 'ALL' || u.role === filterRole || u.staffRoleId === filterRole;
    const isUserActive = u.isActive !== false;
    const matchStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && isUserActive) ||
      (filterStatus === 'SUSPENDED' && !isUserActive);
    return matchEmail && matchRole && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStaff = filteredStaff.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  return (
    <Card className="rounded-2xl border-border shadow-sm bg-card">
      <CardContent className="p-5 sm:p-7 space-y-5">
        {/* Header with Actions & Quick Links */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/15 text-primary rounded-xl border border-primary/20 shrink-0">
              <Users className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">
                  Команда и Escrow Guard
                </h3>
                <Badge intent="outline" className="text-[10px] font-mono font-bold px-2 py-0.2">
                  {filteredStaff.length}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Системные роли, лимиты компенсаций, витрины и наборы прав.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/staff?tab=schedule"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40 text-xs font-bold transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>График смен</span>
            </Link>
            <Link
              href="/admin/staff?tab=activity"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40 text-xs font-bold transition-colors cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span>24ч Мониторинг</span>
            </Link>
            {onOpenAddStaff && (
              <Button
                type="button"
                size="sm"
                onClick={onOpenAddStaff}
                className="h-8 px-3.5 gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Добавить сотрудника</span>
              </Button>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3 bg-muted/20 rounded-xl border border-border/60">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 shrink-0" />
            <Input
              placeholder="Поиск по email..."
              value={searchEmail}
              onChange={(e) => {
                setSearchEmail(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-8 text-xs bg-background"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 bg-background border border-border rounded-lg px-2.5 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none w-36"
            >
              <option value="ALL">Все роли</option>
              <option value="OWNER">OWNER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="SUPPORT">SUPPORT</option>
              <option value="OPERATOR">OPERATOR</option>
              {staffRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  Группа: {r.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as any);
                setCurrentPage(1);
              }}
              className="h-8 bg-background border border-border rounded-lg px-2.5 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none w-36"
            >
              <option value="ALL">Любой статус</option>
              <option value="ACTIVE">Только активные</option>
              <option value="SUSPENDED">Приостановленные</option>
            </select>

            {(searchEmail || filterRole !== 'ALL' || filterStatus !== 'ALL') && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchEmail('');
                  setFilterRole('ALL');
                  setFilterStatus('ALL');
                  setCurrentPage(1);
                }}
                className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 cursor-pointer shrink-0"
              >
                Сброс
              </Button>
            )}
          </div>
        </div>

        {/* Desktop Table */}
        <div className="rounded-xl border border-border overflow-hidden w-full">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="bg-muted/25">
                <TableHead className="px-3.5 py-2.5 text-[10px] font-black uppercase tracking-wider w-[28%]">
                  Сотрудник
                </TableHead>
                <TableHead className="px-2.5 py-2.5 text-[10px] font-black uppercase tracking-wider w-[14%]">
                  Системная роль
                </TableHead>
                <TableHead className="px-2.5 py-2.5 text-[10px] font-black uppercase tracking-wider w-[16%]">
                  Группа прав
                </TableHead>
                <TableHead className="px-2.5 py-2.5 text-[10px] font-black uppercase tracking-wider text-center w-[12%]">
                  Статус
                </TableHead>
                <TableHead className="px-2.5 py-2.5 text-[10px] font-black uppercase tracking-wider text-center w-[14%]">
                  Бренды
                </TableHead>
                <TableHead className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-center w-[16%]">
                  Действия
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-xs text-muted-foreground">
                    Сотрудники не найдены. Нажмите «+ Добавить сотрудника», чтобы пригласить нового оператора.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStaff.map((u) => {
                  const isActive = u.isActive !== false;
                  const isOwner = u.role === 'OWNER';
                  const allowedTenants = u.allowedTenants && u.allowedTenants.length > 0
                    ? u.allowedTenants
                    : ['smmplan'];

                  return (
                    <TableRow key={u.id} className="hover:bg-muted/10 transition-colors">
                      {/* Email */}
                      <TableCell className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <EmailAvatar email={u.email} />
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-xs text-foreground truncate" title={u.email}>
                              {u.email}
                            </p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span>Лимит: {((u.supportLimitCents || 0) / 100).toLocaleString('ru-RU')} ₽</span>
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* System Role */}
                      <TableCell className="px-2.5 py-2.5">
                        <RoleBadge role={u.role} />
                      </TableCell>

                      {/* Custom Group */}
                      <TableCell className="px-2.5 py-2.5">
                        {u.staffRole ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 truncate max-w-full"
                            title={u.staffRole.name}
                          >
                            {u.staffRole.name}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">— Базовые</span>
                        )}
                      </TableCell>

                      {/* Active Status */}
                      <TableCell className="px-2.5 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const fn = onToggleStatus;
                            if (fn) fn(u);
                          }}
                          disabled={isPending || isOwner || !onToggleStatus}
                          title={isOwner ? 'Статус владельца неизменяем' : isActive ? 'Приостановить доступ' : 'Активировать доступ'}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer disabled:cursor-not-allowed ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Активен</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Приостановлен</span>
                            </>
                          )}
                        </button>
                      </TableCell>

                      {/* Allowed Brands */}
                      <TableCell className="px-2.5 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {allowedTenants.includes('smmplan') && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-muted text-foreground border border-border/80">
                              Plan
                            </span>
                          )}
                          {allowedTenants.includes('flux') && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                              Flux
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Edit Modal */}
                          <button
                            type="button"
                            onClick={() => onOpenEdit(u)}
                            title="Редактировать сотрудника"
                            className="h-7 w-7 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-colors cursor-pointer"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Magic Link */}
                          {onGenerateMagicLink && (
                            <button
                              type="button"
                              onClick={() => {
                                const fn = onGenerateMagicLink;
                                if (fn) fn(u.id);
                              }}
                              title="Скопировать ссылку для входа (Magic Link)"
                              className="h-7 w-7 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-sky-500 hover:bg-sky-500/10 hover:border-sky-500/30 transition-colors cursor-pointer"
                            >
                              <LinkIcon className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Personal Logs Drawer */}
                          {onViewLogs && (
                            <button
                              type="button"
                              onClick={() => {
                                const fn = onViewLogs;
                                if (fn) fn(u);
                              }}
                              title="История действий сотрудника"
                              className="h-7 w-7 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10 hover:border-purple-500/30 transition-colors cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Demote to User */}
                          {canDemote(u.role) && (
                            <button
                              type="button"
                              onClick={() => onOpenDemote(u)}
                              disabled={isPending}
                              title="Разжаловать сотрудника"
                              className="h-7 w-7 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-colors disabled:opacity-40 cursor-pointer"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-muted-foreground font-medium">
              {(safePage - 1) * itemsPerPage + 1}–{Math.min(safePage * itemsPerPage, filteredStaff.length)} из{' '}
              {filteredStaff.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 px-3 text-xs font-bold"
              >
                ← Назад
              </Button>
              <span className="px-2 text-xs font-mono font-bold text-foreground">
                {safePage}/{totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-3 text-xs font-bold"
              >
                Вперёд →
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
