'use client';

import { useState, useTransition, useCallback } from 'react';
import { toast } from 'sonner';
import { getPaymentsAction, type PaymentsPageResult, type PaymentDTO } from '@/actions/admin/finance/payments';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { columns as paymentColumns } from '../payment-columns';
import { 
  Download, 
  RotateCcw,
  Search
} from 'lucide-react';
import { 
  PERIOD_OPTIONS, 
  PAYMENT_STATUS_OPTIONS, 
  GATEWAY_OPTIONS, 
  downloadCsvExport, 
  renderMobilePayments 
} from './finance-helpers';
import { 
  ManualPaymentApprovalModal, 
  PendingPaymentTarget 
} from '@/components/admin/finance/manual-payment-approval-modal';

export interface FinancePaymentsTabProps {
  initial: PaymentsPageResult;
  period: string;
  tenantId?: string;
}

export function FinancePaymentsTab({ initial, period: initPeriod, tenantId }: FinancePaymentsTabProps) {
  const [period, setPeriod]       = useState(initPeriod);
  const [status, setStatus]       = useState<string>('ALL');
  const [gateway, setGateway]     = useState<string>('ALL');
  const [search, setSearch]       = useState<string>('');
  const [data,   setData]         = useState<PaymentsPageResult>(initial);
  const [approvalTarget, setApprovalTarget] = useState<PendingPaymentTarget | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback((newPeriod: string, newStatus: string, newGateway: string, newSearch: string) => {
    startTransition(async () => {
      const r = await getPaymentsAction({
        period:   newPeriod as 'today' | 'week' | 'month' | 'all',
        status:   newStatus as 'ALL' | 'SUCCEEDED' | 'PENDING' | 'CANCELED',
        gateway:  newGateway === 'ALL' ? undefined : newGateway,
        search:   newSearch.trim() || undefined,
        pageSize: 100,
        tenantId,
      });
      if (!('error' in r)) {
        setData(r);
      } else {
        toast.error(r.error);
      }
    });
  }, [tenantId]);

  function applyPeriod(v: string | null) {
    if (!v) return;
    setPeriod(v);
    load(v, status, gateway, search);
  }

  function applyStatus(v: string | null) {
    if (!v) return;
    setStatus(v);
    load(period, v, gateway, search);
  }

  function applyGateway(v: string | null) {
    if (!v) return;
    setGateway(v);
    load(period, status, v, search);
  }

  function applySearch(val: string) {
    setSearch(val);
    load(period, status, gateway, val);
  }

  return (
    <div className="space-y-6">
      {/* Action Bar: Filters, Search & 1-Click CSV Export */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Период:</span>
            <Select defaultValue={period} onValueChange={applyPeriod}>
              <SelectTrigger className="w-[130px] h-9 text-xs" size="sm">
                <SelectValue placeholder="Период">
                  {(value: string) => PERIOD_OPTIONS.find(p => p.value === value)?.label ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(p => (
                  <SelectItem key={p.value} value={p.value} label={p.label}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Статус:</span>
            <Select defaultValue={status} onValueChange={applyStatus}>
              <SelectTrigger className="w-[140px] h-9 text-xs" size="sm">
                <SelectValue placeholder="Статус">
                  {(value: string) => PAYMENT_STATUS_OPTIONS.find(s => s.value === value)?.label ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value} label={s.label}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Шлюз:</span>
            <Select defaultValue={gateway} onValueChange={applyGateway}>
              <SelectTrigger className="w-[130px] h-9 text-xs" size="sm">
                <SelectValue placeholder="Шлюз">
                  {(value: string) => GATEWAY_OPTIONS.find(g => g.value === value)?.label ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {GATEWAY_OPTIONS.map(g => (
                  <SelectItem key={g.value} value={g.value} label={g.label}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            onClick={() => load(period, status, gateway, search)}
            disabled={isPending}
            className="h-9 px-3 border border-border bg-card hover:bg-muted text-foreground"
            title="Обновить"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Search & Export Buttons */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => applySearch(e.target.value)}
              placeholder="Поиск по email или ID..."
              className="pl-8 h-9 text-xs bg-background/80"
            />
          </div>

          <Button
            size="sm"
            onClick={() => downloadCsvExport({ type: 'payments', period, status, tenantId, search })}
            className="h-9 gap-1.5 font-bold uppercase tracking-wider text-[11px] shadow-xs shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Экспорт в CSV</span>
          </Button>
        </div>
      </div>

      {/* Main DataTable / Mobile Cards */}
      <div className="w-full">
        <DataTable
          columns={paymentColumns}
          data={data.items}
          renderMobileView={renderMobilePayments}
          meta={{
            onApprovePayment: (p: PaymentDTO) => {
              setApprovalTarget({
                id: p.id,
                userEmail: p.userEmail,
                amountCents: p.amount,
                gateway: p.gateway,
                gatewayId: p.gatewayId,
                createdAt: p.createdAt,
              });
            },
          }}
        />
      </div>

      {approvalTarget && (
        <ManualPaymentApprovalModal
          payment={approvalTarget}
          currentUserRole="ADMIN"
          supportLimitRub={3000}
          onClose={() => setApprovalTarget(null)}
          onSuccess={() => {
            setApprovalTarget(null);
            load(period, status, gateway, search);
          }}
        />
      )}
    </div>
  );
}
