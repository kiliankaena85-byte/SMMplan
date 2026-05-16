'use client';

import { useState, useTransition } from 'react';
import { History, X } from 'lucide-react';
import { getServiceAuditLogsAction } from '@/actions/admin/catalog/history';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type AuditLog = {
  id: string;
  action: string;
  targetType: string;
  target: string;
  oldValue: any;
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
        className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        title="История цен"
      >
        <History className="w-4 h-4" />
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>История изменений наценки</DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto pr-2 mt-4 space-y-4">
          {isPending ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center p-8 text-sm text-muted-foreground bg-muted/30 rounded-lg">
              История изменений пуста
            </div>
          ) : (
            <div className="relative border-l border-border/50 ml-3 space-y-6">
              {logs.map((log) => (
                <div key={log.id} className="relative pl-6">
                  <div className="absolute w-2 h-2 bg-primary rounded-full -left-[4.5px] top-1.5 ring-4 ring-background"></div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        {getActionLabel(log.action)}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(log.createdAt).toLocaleString('ru-RU', { 
                          day: '2-digit', month: '2-digit', year: '2-digit', 
                          hour: '2-digit', minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    
                    <div className="text-[11px] text-muted-foreground">
                      Изменил(а): <span className="font-medium text-foreground">{log.adminEmail || log.adminId || 'Система'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1.5 bg-muted/40 p-2 rounded-md border border-border/50">
                      {log.oldValue && typeof log.oldValue === 'object' && 'markup' in log.oldValue ? (
                        <div className="text-xs text-muted-foreground font-mono line-through">
                          x{Number(log.oldValue.markup).toFixed(2)}
                        </div>
                      ) : null}
                      {log.oldValue && log.newValue && <span className="text-xs text-muted-foreground">→</span>}
                      {log.newValue && typeof log.newValue === 'object' && 'markup' in log.newValue ? (
                        <div className="text-xs font-mono font-bold text-primary">
                          x{Number(log.newValue.markup).toFixed(2)}
                        </div>
                      ) : null}
                      {(!log.oldValue && !log.newValue?.markup) && (
                        <span className="text-xs text-muted-foreground italic">Детали не сохранены</span>
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
