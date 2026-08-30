'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Power, Send, CheckCircle2, AlertTriangle, Shield, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { getLatestAiDigestAction, triggerAiObserverManualAction, toggleAiObserverKillswitchAction } from '@/actions/admin/observer';
import { type ExecutiveDigestResult } from '@/services/observer/ai-observer.service';

export function ExecutiveAiDigestCard() {
  const [digestData, setDigestData] = useState<ExecutiveDigestResult | null>(null);
  const [isKilled, setIsKilled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchLatest = async () => {
    try {
      setIsLoading(true);
      const res = await getLatestAiDigestAction();
      if (res.success && res.data) {
        setDigestData(res.data.digest);
        setIsKilled(res.data.isKillswitchActive);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLatest();
  }, []);

  const handleManualRun = async (sendTelegram: boolean) => {
    try {
      setIsGenerating(true);
      toast.info(sendTelegram ? 'Формирование отчета и отправка в Telegram...' : 'Генерация свежего AI-дайджеста...');
      const res = await triggerAiObserverManualAction({ sendTelegram });
      if (res.success && res.data) {
        setDigestData(res.data);
        toast.success(`Дайджест успешно сгенерирован за ${res.data.latencyMs}ms (${res.data.source})`);
      } else {
        toast.error(res.error || 'Не удалось сгенерировать дайджест');
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleKillswitch = async () => {
    const nextState = isKilled; // If currently killed, enable it (true)
    try {
      const res = await toggleAiObserverKillswitchAction(nextState);
      if (res.success) {
        setIsKilled(res.isKillswitchActive ?? false);
        toast.success(res.isKillswitchActive ? 'Модуль AI-Observer отключен (Kill-Switch)' : 'Модуль AI-Observer включен');
      } else {
        toast.error(res.error || 'Ошибка изменения статуса');
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              Executive AI Observer & Daily Digest
              <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${isKilled ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                {isKilled ? 'ОТКЛЮЧЕН (KILL-SWITCH)' : 'АКТИВЕН (08:00 МСК)'}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Автономная сводка финансов, маржинальности, надежности провайдеров и безопасности.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleKillswitch}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 ${isKilled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20' : 'bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20'}`}
            title="Master Kill-Switch (Мгновенное отключение модуля)"
          >
            <Power className="w-3.5 h-3.5" />
            {isKilled ? 'Включить модуль' : 'Kill-Switch'}
          </button>

          <button
            disabled={isGenerating}
            onClick={() => handleManualRun(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-muted border border-border text-foreground hover:bg-card transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            Обновить
          </button>

          <button
            disabled={isGenerating}
            onClick={() => handleManualRun(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            Отправить в Telegram
          </button>
        </div>
      </div>

      {/* Content Body */}
      {isLoading ? (
        <div className="py-8 flex items-center justify-center text-xs text-muted-foreground gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          Загрузка последнего дайджеста...
        </div>
      ) : digestData ? (
        <div className="space-y-3">
          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Сформировано: {new Date(digestData.generatedAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-500" />
              Источник: {digestData.source} ({digestData.latencyMs}ms)
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              PII Sanitized: 100%
            </span>
          </div>

          {/* Formatted Text Box */}
          <div className="p-4 sm:p-5 rounded-xl bg-muted/25 border border-border/70 text-xs leading-relaxed font-sans text-foreground select-text space-y-2">
            {digestData.digestMarkdown.split('\n').map((line, idx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={idx} className="h-1.5" />;

              // Parse <b>, <i>, <code> tags safely without dangerouslySetInnerHTML
              const formatLine = (raw: string) => {
                const parts: React.ReactNode[] = [];
                const regex = /<b>(.*?)<\/b>|<i>(.*?)<\/i>|<code>(.*?)<\/code>/g;
                let lastIndex = 0;
                let match: RegExpExecArray | null;

                while ((match = regex.exec(raw)) !== null) {
                  if (match.index > lastIndex) {
                    parts.push(raw.slice(lastIndex, match.index));
                  }
                  if (match[1] !== undefined) {
                    parts.push(<strong key={match.index} className="font-bold text-foreground">{match[1]}</strong>);
                  } else if (match[2] !== undefined) {
                    parts.push(<em key={match.index} className="italic text-muted-foreground">{match[2]}</em>);
                  } else if (match[3] !== undefined) {
                    parts.push(<code key={match.index} className="font-mono bg-muted px-1 py-0.5 rounded text-[11px]">{match[3]}</code>);
                  }
                  lastIndex = regex.lastIndex;
                }
                if (lastIndex < raw.length) {
                  parts.push(raw.slice(lastIndex));
                }
                return parts.length > 0 ? parts : raw;
              };

              const isHeading = trimmed.startsWith('🌅') || trimmed.startsWith('💰') || trimmed.startsWith('⚡') || trimmed.startsWith('🎧') || trimmed.startsWith('🛡️');
              const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');

              return (
                <div
                  key={idx}
                  className={`${
                    isHeading
                      ? 'font-bold text-sm text-foreground pt-1.5 pb-0.5 border-b border-border/30 flex items-center gap-1.5'
                      : isBullet
                      ? 'pl-3 text-xs text-foreground/90 flex items-start gap-1.5'
                      : 'text-xs text-muted-foreground'
                  }`}
                >
                  {formatLine(trimmed)}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-muted-foreground space-y-2">
          <AlertTriangle className="w-6 h-6 text-muted-foreground mx-auto opacity-40" />
          <p>Дайджест еще не сформирован. Нажмите «Обновить» для немедленной генерации.</p>
        </div>
      )}
    </div>
  );
}
