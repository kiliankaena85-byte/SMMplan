'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { runCopSimulation } from '@/actions/admin/settings';
import { toast } from 'sonner';
import { Shield, Sparkles, AlertCircle, CheckCircle2, Play, Users, MessageSquare, ShoppingCart, ArrowRight } from 'lucide-react';

interface SimStep {
  name: string;
  clicks: number;
  cognitiveLoad: number;
}

interface SimulationResult {
  frictionScore: number;
  rating: 'PREMIUM' | 'ACCEPTABLE' | 'HIGH';
  steps: SimStep[];
}

export function CopSimulator() {
  const [selectedFlow, setSelectedFlow] = useState<'CLIENT_ORDER' | 'SUPPORT_TICKET' | 'ROLE_CHANGE'>('CLIENT_ORDER');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const scenarios = [
    {
      id: 'CLIENT_ORDER' as const,
      title: 'Оформление заказа клиентом',
      description: 'Анализ пути пользователя от выбора услуги в каталоге до подтверждения оплаты заказа.',
      icon: ShoppingCart,
    },
    {
      id: 'SUPPORT_TICKET' as const,
      title: 'Создание тикета поддержки',
      description: 'Анализ взаимодействия при возникновении проблемы: выбор темы, ввод текста и отправка запроса.',
      icon: MessageSquare,
    },
    {
      id: 'ROLE_CHANGE' as const,
      title: 'Изменение роли сотрудника',
      description: 'Анализ B2B-интерфейса управления доступом при смене роли персонала в админ-панели.',
      icon: Users,
    },
  ];

  async function handleRunSimulation() {
    setLoading(true);
    setResult(null);
    try {
      const res = await runCopSimulation(selectedFlow);
      if (res && 'success' in res && res.success) {
        setResult({
          frictionScore: res.frictionScore,
          rating: res.rating,
          steps: res.steps as SimStep[],
        });
        toast.success('Симуляция успешно завершена!');
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toast.error((res as any)?.error || 'Произошла ошибка при выполнении симуляции');
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || 'Ошибка симуляции');
    } finally {
      setLoading(false);
    }
  }

  const getRatingBadge = (rating: SimulationResult['rating']) => {
    switch (rating) {
      case 'PREMIUM':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-success/20 text-success border border-success/30 animate-pulse">
            <CheckCircle2 className="w-3.5 h-3.5" /> Premium (Отличный UX)
          </span>
        );
      case 'ACCEPTABLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-warning/20 text-warning border border-warning/30 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" /> Acceptable (Приемлемо)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-destructive/20 text-destructive border border-destructive/30 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" /> High Friction (Высокое трение)
          </span>
        );
    }
  };

  const getRatingCardStyle = (rating: SimulationResult['rating']) => {
    switch (rating) {
      case 'PREMIUM':
        return 'bg-success/5 border-success/20';
      case 'ACCEPTABLE':
        return 'bg-warning/5 border-warning/20';
      default:
        return 'bg-destructive/5 border-destructive/20';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-border shadow-sm bg-card/60 backdrop-blur-xl">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-primary rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">COP Симулятор трения интерфейса</h3>
              <p className="text-[11px] text-muted-foreground font-medium">Симуляция когнитивной нагрузки и количества кликов по формуле Usability Friction Score.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenarios.map((sc) => {
              const Icon = sc.icon;
              return (
                <div
                  key={sc.id}
                  onClick={() => setSelectedFlow(sc.id)}
                  className={`p-5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 hover:shadow-md ${
                    selectedFlow === sc.id
                      ? 'border-primary bg-primary/5 shadow-inner'
                      : 'border-border bg-card/40 hover:bg-card/80'
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedFlow(sc.id);
                    }
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${selectedFlow === sc.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-foreground">{sc.title}</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{sc.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] font-mono text-muted-foreground">ID: {sc.id}</span>
                    {selectedFlow === sc.id && <div className="w-2 h-2 rounded-full bg-primary animate-ping" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <Button
              disabled={loading}
              onClick={handleRunSimulation}
              className="h-11 px-8 font-bold uppercase tracking-wider text-xs shadow-md transition-all duration-200 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  Выполнение...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Запустить симуляцию
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {result && (
        <Card className={`rounded-2xl border transition-all duration-300 shadow-md ${getRatingCardStyle(result.rating)}`}>
          <div className="p-8 space-y-8 animate-in fade-in duration-300">
            {/* Header / Score */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-6">
              <div className="space-y-1">
                <h4 className="text-sm font-bold uppercase tracking-widest text-foreground">Результаты расчёта UX-метрик</h4>
                <p className="text-[11px] text-muted-foreground">Анализ завершен успешно на базе стандартов WCAG 2.2 AA (цели &gt;= 44px).</p>
              </div>
              <div>
                {getRatingBadge(result.rating)}
              </div>
            </div>

            {/* Score Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 bg-card border border-border/60 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Индекс Трения (Friction)</span>
                <span className="text-3xl font-black text-foreground pt-2">{result.frictionScore.toFixed(1)}</span>
                <span className="text-[10px] text-muted-foreground pt-1 leading-normal">
                  Friction = (Clicks × 1.5) + (Load × 2.0) - (SizeWeight × 0.5)
                </span>
              </div>

              <div className="p-6 bg-card border border-border/60 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Всего кликов (Clicks)</span>
                <span className="text-3xl font-black text-foreground pt-2">
                  {result.steps.reduce((acc, curr) => acc + curr.clicks, 0)}
                </span>
                <span className="text-[10px] text-muted-foreground pt-1 leading-normal">
                  Суммарное количество взаимодействий пользователя.
                </span>
              </div>

              <div className="p-6 bg-card border border-border/60 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Когнитивный вес (Load)</span>
                <span className="text-3xl font-black text-foreground pt-2">
                  {result.steps.reduce((acc, curr) => acc + curr.cognitiveLoad, 0)}
                </span>
                <span className="text-[10px] text-muted-foreground pt-1 leading-normal">
                  Уровень когнитивного сопротивления интерфейса.
                </span>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold uppercase tracking-widest text-foreground">Пошаговый сценарий пути (Timeline)</h5>
              <div className="relative border-l border-border/70 ml-3 pl-6 space-y-6 pt-2">
                {result.steps.map((st, idx) => (
                  <div key={idx} className="relative group">
                    {/* Circle Node */}
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border border-border bg-background flex items-center justify-center group-hover:border-primary transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                    {/* Content */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 border border-border/40 hover:border-border rounded-lg bg-card/30 hover:bg-card/50 transition-all duration-150">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-primary">0{idx + 1}.</span>
                        <span className="text-xs font-semibold text-foreground">{st.name}</span>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground">
                          Кликов: {st.clicks}
                        </span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground hidden sm:block" />
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground">
                          Когнитивно: {st.cognitiveLoad}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
