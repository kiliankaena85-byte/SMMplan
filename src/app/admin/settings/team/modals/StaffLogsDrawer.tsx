'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  History, Clock, Moon, MessageSquare, Package, 
  CreditCard, Shield, Settings, AlertCircle, RefreshCw 
} from 'lucide-react';
import { getStaffPersonalLogsAction, HumanReadableLog } from '@/actions/admin/staff';
import type { StaffUser } from '../types';
import { RoleBadge } from '../ui-helpers';

interface StaffLogsDrawerProps {
  user: StaffUser | null;
  onClose: () => void;
}

const ICON_MAP = {
  ticket: MessageSquare,
  order: Package,
  money: CreditCard,
  role: Shield,
  auth: Clock,
  settings: Settings,
  night: Moon,
  generic: AlertCircle,
};

export function StaffLogsDrawer({ user, onClose }: StaffLogsDrawerProps) {
  const [logs, setLogs] = useState<HumanReadableLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setLogs([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    getStaffPersonalLogsAction(user.id, 50)
      .then((res) => {
        if (isMounted && res.success) {
          setLogs(res.logs);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (!user) return null;

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 text-primary rounded-xl border border-primary/20 shrink-0">
                <History className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  История действий: {user.email}
                  <RoleBadge role={user.role} />
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-normal">
                  Хронологический лог действий сотрудника на русском языке (последние 50 операций).
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsLoading(true);
                getStaffPersonalLogsAction(user.id, 50).then((res) => {
                  if (res.success) setLogs(res.logs);
                  setIsLoading(false);
                });
              }}
              disabled={isLoading}
              className="h-7 px-2.5 text-xs font-bold gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-2.5 min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-primary shrink-0" />
              <p className="text-xs font-medium">Загрузка журнала аудита...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <History className="w-8 h-8 opacity-20 shrink-0" />
              <p className="text-xs font-medium">Действий сотрудника пока не зафиксировано</p>
            </div>
          ) : (
            logs.map((log) => {
              const Icon = ICON_MAP[log.iconType] || AlertCircle;
              const dateObj = new Date(log.createdAt);
              const timeStr = dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const dateStr = dateObj.toLocaleDateString('ru-RU');

              return (
                <div
                  key={log.id}
                  className={`p-3 rounded-xl border text-xs transition-colors flex items-start gap-3 ${
                    log.isNightActivity
                      ? 'bg-purple-500/5 border-purple-500/20'
                      : 'bg-muted/20 border-border/60 hover:bg-muted/30'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg border shrink-0 mt-0.5 ${
                      log.isNightActivity
                        ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20'
                        : 'bg-primary/10 text-primary border-primary/20'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-foreground text-xs truncate min-w-0">
                        {log.actionTitle}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-muted-foreground font-mono">
                        {log.isNightActivity && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-sans font-bold">
                            Ночная смена
                          </span>
                        )}
                        <span>{dateStr} {timeStr}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {log.actionDescription}
                    </p>
                    {log.ipAddress && (
                      <p className="text-[10px] text-muted-foreground font-mono mt-1 opacity-75">
                        IP: {log.ipAddress}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
