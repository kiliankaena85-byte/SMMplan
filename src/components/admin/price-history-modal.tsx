'use client';

import { useState, useTransition } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { History, X } from 'lucide-react';
import { getServiceAuditLogsAction } from '@/actions/admin/catalog/history';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type AuditLog = {
  id: string;
  action: string;
  targetType: string;
  target: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldValue: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValue: any;
  adminEmail: string | null;
  adminId: string | null;
  createdAt: Date;
};

export function PriceHistoryButton({ serviceId }: { serviceId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open && logs.length === 0) {
      startTransition(async () => {
        try {
          const res = await getServiceAuditLogsAction(serviceId);
          if (res.success && res.logs) {
            setLogs(res.logs);
          }
        } catch (err) {
          console.error("Failed to load audit logs", err);
        }
      });
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'SERVICE_MARKUP_UPDATE': return 'Ручное изменение';
      case 'BATCH_MARKUP_SET': return 'Массовое изменение';
      case 'BULK_MARKUP_UPDATE': return 'Глобальное изменение';
      default: return action;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger 
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-warm-text/60 hover:text-warm-accent hover:bg-warm-accent/10 transition-all duration-200 cursor-pointer active:scale-95"
        title="История цен"
      >
        <History className="w-4.5 h-4.5" />
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] bg-warm-card border-warm-border/80">
        <DialogHeader>
          <DialogTitle className="text-warm-text font-bold">История изменений наценки</DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto pr-2 mt-4 space-y-4">
          {isPending ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-warm-accent"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center p-8 text-sm text-warm-text/60 bg-warm-zinc/50 rounded-lg">
              История изменений пуста
            </div>
          ) : (
            <div className="relative border-l border-warm-border/60 ml-3 space-y-6">
              {logs.map((log) => (
                <div key={log.id} className="relative pl-6">
                  <div className="absolute w-2 h-2 bg-warm-accent rounded-full -left-[4.5px] top-1.5 ring-4 ring-warm-card"></div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-warm-text">
                        {getActionLabel(log.action)}
                      </span>
                      <span className="text-[10px] text-warm-text/60 font-mono">
                        {new Date(log.createdAt).toLocaleString('ru-RU', { 
                          day: '2-digit', month: '2-digit', year: '2-digit', 
                          hour: '2-digit', minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    
                    <div className="text-[11px] text-warm-text/60">
                      Изменил(а): <span className="font-medium text-warm-text">{log.adminEmail || log.adminId || 'Система'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1.5 bg-warm-zinc/60 p-2 rounded-md border border-warm-border/50">
                      {log.oldValue && typeof log.oldValue === 'object' && 'markup' in log.oldValue ? (
                        <div className="text-xs text-warm-text/50 font-mono line-through">
                          x{Number(log.oldValue.markup).toFixed(2)}
                        </div>
                      ) : null}
                      {log.oldValue && log.newValue && <span className="text-xs text-warm-text/50">→</span>}
                      {log.newValue && typeof log.newValue === 'object' && 'markup' in log.newValue ? (
                        <div className="text-xs font-mono font-bold text-warm-accent">
                          x{Number(log.newValue.markup).toFixed(2)}
                        </div>
                      ) : null}
                      {(!log.oldValue && !log.newValue?.markup) && (
                        <span className="text-xs text-warm-text/50 italic">Детали не сохранены</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
