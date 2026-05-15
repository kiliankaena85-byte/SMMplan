'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { approveQuarantineAction, rejectQuarantineAction } from '@/actions/admin/users';
import { AlertTriangle, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTransition } from 'react';

interface QuarantineEntry {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  reason: string;
  adminId: string | null;
  createdAt: Date;
}

interface QuarantineListProps {
  entries: QuarantineEntry[];
}

export function QuarantineList({ entries }: QuarantineListProps) {
  const [isPending, startTransition] = useTransition();

  const handleAction = (id: string, action: 'approve' | 'reject') => {
    const msg = action === 'approve' ? 'Одобрить транзакцию?' : 'Отклонить транзакцию?';
    if (!confirm(msg)) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.append('entryId', id);
      
      try {
        await (action === 'approve' ? approveQuarantineAction(fd) : rejectQuarantineAction(fd));
        toast.success(action === 'approve' ? 'Транзакция одобрена' : 'Транзакция отклонена');
      } catch (err) {
        toast.error('Ошибка выполнения операции');
      }
    });
  };

  if (entries.length === 0) return null;

  return (
    <div className="border-2 border-amber-200 bg-warning/10/50 rounded-2xl overflow-hidden shadow-sm animate-in slide-in-from-top duration-500">
      <div className="px-6 py-4 flex items-center gap-4 border-b border-amber-200 bg-warning/20/50">
        <div className="p-2 bg-amber-200 text-amber-700 rounded-lg">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-amber-900 text-sm uppercase tracking-wider">
            {entries.length} транзакций в карантине Escrow
          </span>
          <p className="text-[11px] text-amber-700 font-medium opacity-80 mt-0.5">
            Превышен лимит доверия. Требуется подтверждение Владельца.
          </p>
        </div>
      </div>
      <div className="divide-y divide-amber-100">
        {entries.map(entry => (
          <div key={entry.id} className="px-6 py-4 flex items-center justify-between gap-6 hover:bg-warning/20/30 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="font-black text-amber-900 text-base tabular-nums">
                  {(entry.amount / 100).toLocaleString('ru-RU')} ₽
                </span>
                <Badge intent="secondary" className="font-mono font-bold text-[10px] bg-warning/20 text-amber-700 border-amber-200">
                  {entry.userEmail}
                </Badge>
              </div>
              <p className="text-xs text-amber-800 font-medium opacity-90">{entry.reason}</p>
              <div className="flex items-center gap-2 text-[10px] text-warning font-bold uppercase tracking-tighter">
                <span>Agent: {entry.adminId || 'System'}</span>
                <span>•</span>
                <span>{entry.createdAt.toLocaleString('ru-RU')}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                intent="destructive"
                className="font-bold text-[10px] uppercase tracking-wider h-8"
                disabled={isPending}
                onClick={() => handleAction(entry.id, 'reject')}
              >
                <X className="w-3.5 h-3.5 mr-1" /> Отклонить
              </Button>
              <Button
                size="sm"
                className="font-bold text-[10px] uppercase tracking-wider h-8 shadow-md text-white bg-emerald-500 hover:bg-emerald-600"
                disabled={isPending}
                onClick={() => handleAction(entry.id, 'approve')}
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Одобрить
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
