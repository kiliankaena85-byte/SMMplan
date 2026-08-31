'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useState, useEffect, useTransition, useCallback } from 'react';
import {
  Plus, Trash2, Edit3, Save, Globe, Zap, CheckCircle,
  Loader2, AlertTriangle, Link2,
  ChevronDown, ChevronUp, RefreshCw, Search,
  Radio, Database, ShieldCheck, Sparkles,
} from 'lucide-react';
import {
  listProviderProxiesAction,
  createProviderProxyAction,
  updateProviderProxyAction,
  deleteProviderProxyAction,
  testProviderProxyAction,
  assignProxyToProviderAction,
  getProxyHealthSummaryAction,
  syncSubscriptionAction,
  harvestFreeProxiesAction,
} from '@/actions/admin/provider-proxy';
import type { ProviderProxyWithUsage, ProxyHealthSummary, ProxyProtocol, ProxyCategory } from '@/types/provider-proxy';
import { GEO_OPTIONS, PROXY_PROTOCOL_LABELS } from '@/types/provider-proxy';
import type { Provider } from '@prisma/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FormData {
  label: string;
  description: string;
  protocol: ProxyProtocol;
  category: ProxyCategory;
  host: string;
  port: string;
  username: string;
  password: string;
  isRotating: boolean;
  geoCountry: string;
  tags: string[];
  subscriptionUrl: string;
  expiresAt?: string;
}

const EMPTY_FORM: FormData = {
  label: '',
  description: '',
  protocol: 'socks5',
  category: 'PAID_PREMIUM',
  host: '',
  port: '7891',
  username: '',
  password: '',
  isRotating: false,
  geoCountry: '',
  tags: [],
  subscriptionUrl: '',
  expiresAt: '',
};

interface Props {
  providers?: Provider[];
}

export function ProviderProxyManager({ providers = [] }: Props) {
  const [proxies, setProxies] = useState<ProviderProxyWithUsage[]>([]);
  const [health, setHealth] = useState<ProxyHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProtocol, setFilterProtocol] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [expandedProxyId, setExpandedProxyId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [testUrl, setTestUrl] = useState('https://httpbin.org/ip');
  const [proxyToDelete, setProxyToDelete] = useState<{ id: string; label: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([
        listProviderProxiesAction(),
        getProxyHealthSummaryAction(),
      ]);
      if (p.success) {
        setProxies(p.data);
      }
      if (h.success) {
        setHealth(h.data);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = () => {
    startTransition(async () => {
      const res = await createProviderProxyAction({
        ...form,
        port: parseInt(form.port, 10) || 80,
      });
      if (res.success) {
        toast.success(res.message);
        setForm(EMPTY_FORM);
        setShowCreate(false);
        loadData();
      } else {
        toast.error(res.error || 'Не удалось создать прокси');
      }
    });
  };

  const handleUpdate = () => {
    if (!editingId) return;
    startTransition(async () => {
      const res = await updateProviderProxyAction({
        id: editingId,
        ...form,
        port: parseInt(form.port, 10) || 80,
      });
      if (res.success) {
        toast.success(res.message);
        setEditingId(null);
        loadData();
      } else {
        toast.error(res.error || 'Не удалось обновить прокси');
      }
    });
  };

  const handleDelete = (id: string, label: string) => {
    setProxyToDelete({ id, label });
  };

  const confirmDeleteProxy = () => {
    if (!proxyToDelete) return;
    const { id } = proxyToDelete;
    setProxyToDelete(null);

    startTransition(async () => {
      const res = await deleteProviderProxyAction(id);
      if (res.success) {
        toast.success(res.message);
        loadData();
      } else {
        toast.error(res.error || 'Не удалось удалить прокси');
      }
    });
  };

  const handleTest = (id: string) => {
    setTestingId(id);
    startTransition(async () => {
      const res = await testProviderProxyAction({ proxyId: id, targetUrl: testUrl });
      if (res.success && res.data) {
        toast[res.data.success ? 'success' : 'error'](
          res.data.success
            ? `OK: ${res.data.latencyMs}ms (IP: ${res.data.resolvedIp || 'н/д'})`
            : `Ошибка: ${res.data.error}`,
        );
      } else {
        toast.error(res.error || 'Тест не удался');
      }
      setTestingId(null);
      loadData();
    });
  };

  const handleSyncSubscription = (id: string) => {
    setSyncingId(id);
    startTransition(async () => {
      const res = await syncSubscriptionAction(id);
      if (res.success) {
        toast.success(res.message);
        loadData();
      } else {
        toast.error(res.error || 'Ошибка синхронизации подписки');
      }
      setSyncingId(null);
    });
  };

  const handleHarvestFree = () => {
    setIsHarvesting(true);
    startTransition(async () => {
      const res = await harvestFreeProxiesAction();
      if (res.success) {
        toast.success(res.message);
        loadData();
      } else {
        toast.error(res.error || 'Ошибка сбора прокси');
      }
      setIsHarvesting(false);
    });
  };

  const handleAssign = (providerId: string, proxyId: string | null) => {
    startTransition(async () => {
      const res = await assignProxyToProviderAction({ providerId, proxyId });
      if (res.success) {
        toast.success(res.message);
        loadData();
      } else {
        toast.error(res.error || 'Ошибка назначения');
      }
    });
  };

  const startEdit = (p: ProviderProxyWithUsage) => {
    setEditingId(p.id);
    setForm({
      label: p.label,
      description: p.description,
      protocol: p.protocol,
      category: p.category || 'PAID_PREMIUM',
      host: p.host,
      port: String(p.port),
      username: p.username || '',
      password: '',
      isRotating: p.isRotating,
      geoCountry: p.geoCountry || '',
      tags: p.tags,
      subscriptionUrl: p.subscriptionUrl || '',
      expiresAt: p.expiresAt ? new Date(p.expiresAt).toISOString().split('T')[0] : '',
    });
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || form.tags.includes(t)) return;
    if (form.tags.length >= 10) {
      toast.error('Максимум 10 тегов');
      return;
    }
    setForm((prev) => ({ ...prev, tags: [...prev.tags, t] }));
    setTagInput('');
  };

  const filtered = proxies.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.host.includes(searchQuery);
    const matchesProtocol = !filterProtocol || p.protocol === filterProtocol;
    const matchesCategory = !filterCategory || p.category === filterCategory;
    return matchesSearch && matchesProtocol && matchesCategory;
  });

  const isEditing = editingId !== null;
  const getProxyLabel = (proxyId: string | null) => {
    if (!proxyId) return null;
    return proxies.find((p) => p.id === proxyId)?.label || null;
  };

  const formatTraffic = (bytes: bigint | null | undefined) => {
    if (!bytes || bytes === BigInt(0)) return '0 GB';
    const gb = Number(bytes) / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const getDaysLeft = (expiresAt: Date | null | undefined) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Proxy Deletion Confirmation Dialog */}
      <Dialog open={!!proxyToDelete} onOpenChange={(open) => !open && setProxyToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <div className="flex items-center gap-3 text-rose-500 pb-2">
              <AlertTriangle className="w-6 h-6" />
              <DialogTitle className="text-lg font-bold">Удаление прокси-сервера</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Вы уверены, что хотите удалить прокси <strong className="text-foreground">«{proxyToDelete?.label}»</strong>?
              <br /><br />
              ⚠️ Все провайдеры услуг, привязанные к данному прокси, будут автоматически переведены на прямое подключение без защиты прокси.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setProxyToDelete(null)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={confirmDeleteProxy}
              className="font-bold gap-1.5"
            >
              Удалить прокси
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── HEALTH SUMMARY ── */}
      {health && (
        <Card className="rounded-3xl border border-border/80 shadow-sm bg-card p-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-border/60">
            <span className="p-1 px-2.5 bg-primary/10 text-primary rounded-md text-[10px] font-bold">OVERVIEW</span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Сводка по прокси и подпискам</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
            {[
              { label: 'Всего прокси', value: health.total, icon: Globe, color: 'text-primary' },
              { label: 'Активных', value: health.active, icon: CheckCircle, color: 'text-emerald-500' },
              { label: 'С ошибками', value: health.withErrors, icon: AlertTriangle, color: 'text-rose-500' },
              { label: 'Провайдеров через прокси', value: health.providersUsingProxy, icon: Link2, color: 'text-primary' },
              { label: 'Прямое подкл.', value: health.providersDirect, icon: Radio, color: 'text-muted-foreground' },
              { label: 'Avg Latency', value: health.avgLatencyMs ? `${Math.round(health.avgLatencyMs)}ms` : '—', icon: Zap, color: 'text-amber-500' },
            ].map((m) => (
              <div key={m.label} className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
                <p className="text-lg font-extrabold font-mono text-foreground">{m.value}</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase">{m.label}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── TOOLBAR & TABS ── */}
      <Card className="rounded-3xl border border-border/80 shadow-sm bg-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="p-1 px-2.5 bg-primary/10 text-primary rounded-md text-[10px] font-bold">PROXY POOL</span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Пул прокси-серверов и подписок</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleHarvestFree}
              disabled={isHarvesting}
              className="font-bold text-xs h-8 gap-1.5 cursor-pointer"
            >
              {isHarvesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-primary" />}
              Собрать бесплатные SOCKS5
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => { setShowCreate(true); setForm(EMPTY_FORM); }}
              className="font-bold text-xs h-8 gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Добавить
            </Button>
            <button
              type="button"
              onClick={loadData}
              className="p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
              title="Обновить данные"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Categories Tabs */}
        <div className="flex gap-2 border-b border-border/40 pb-3 flex-wrap">
          {[
            { id: '', label: `Все (${proxies.length})` },
            { id: 'PAID_PREMIUM', label: `💎 Платные Quattro VPN (${proxies.filter(p => p.category === 'PAID_PREMIUM').length})` },
            { id: 'FREE_PUBLIC', label: `🌿 Бесплатные пулы (${proxies.filter(p => p.category === 'FREE_PUBLIC').length})` },
            { id: 'BACKUP_RESERVE', label: `🛡️ Резерв (${proxies.filter(p => p.category === 'BACKUP_RESERVE').length})` },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategory(cat.id)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                filterCategory === cat.id
                  ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                  : 'border-border/60 text-muted-foreground hover:bg-muted/40'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Protocol Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию или хосту..."
              className="pl-9 text-xs"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {['', 'socks5', 'http', 'https'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setFilterProtocol(p)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                  filterProtocol === p
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {p ? PROXY_PROTOCOL_LABELS[p as ProxyProtocol] : 'Все протоколы'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── PROXY LIST ── */}
      {filtered.length === 0 && !loading && (
        <Card className="rounded-2xl p-8 text-center bg-card border border-border">
          <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-xs text-muted-foreground">Прокси не найдены в выбранной категории.</p>
        </Card>
      )}

      {filtered.map((p) => {
        const isExpanded = expandedProxyId === p.id;
        const daysLeft = getDaysLeft(p.expiresAt);

        return (
          <Card
            key={p.id}
            className={`rounded-2xl border overflow-hidden transition-colors bg-card ${
              !p.isActive ? 'opacity-50' : p.consecutiveFailures > 3 ? 'border-rose-500/40' : 'border-border/80'
            }`}
          >
            {/* Header Row */}
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0 ${
                    p.category === 'PAID_PREMIUM'
                      ? 'bg-primary'
                      : p.category === 'FREE_PUBLIC'
                      ? 'bg-emerald-600'
                      : 'bg-muted-foreground'
                  }`}
                >
                  {p.category === 'PAID_PREMIUM' ? '💎' : p.category === 'FREE_PUBLIC' ? '🌿' : '🛡️'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-foreground">{p.label}</h4>
                    <span className="text-[9px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                      {p.protocol.toUpperCase()}
                    </span>
                    {p.category === 'PAID_PREMIUM' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                        PREMIUM
                      </span>
                    )}
                    {daysLeft !== null && (
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          daysLeft > 14
                            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                            : daysLeft > 2
                            ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                        }`}
                      >
                        {daysLeft > 0 ? `Осталось ${daysLeft} дн.` : 'Истекла'}
                      </span>
                    )}
                    {p.geoCountry && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40">
                        {p.geoCountry}
                      </span>
                    )}
                    {p._count?.providers ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {p._count.providers} пров.
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                    {p.host}:{p.port}
                  </p>

                  {/* Traffic bar if present */}
                  {p.trafficTotalBytes && p.trafficTotalBytes > BigInt(0) && (
                    <div className="flex items-center gap-2 mt-1.5 max-w-xs">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (Number(p.trafficUsedBytes || BigInt(0)) / Number(p.trafficTotalBytes)) * 100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {formatTraffic(p.trafficUsedBytes)} / {formatTraffic(p.trafficTotalBytes)}
                      </span>
                    </div>
                  )}

                  {p.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {p.tags.map((t) => (
                        <span key={t} className="text-[9px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center gap-3 shrink-0">
                {p.lastTestAt && (
                  <div className="text-right hidden sm:block">
                    <span className={`text-[10px] font-mono font-bold ${p.lastTestSuccess ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {p.lastTestSuccess ? `${p.lastTestLatencyMs}ms` : 'FAIL'}
                    </span>
                    <p className="text-[9px] text-muted-foreground">{new Date(p.lastTestAt).toLocaleString('ru-RU')}</p>
                  </div>
                )}
                {p.subscriptionUrl && (
                  <button
                    type="button"
                    onClick={() => handleSyncSubscription(p.id)}
                    disabled={syncingId === p.id}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    title="Синхронизировать подписку"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-primary ${syncingId === p.id ? 'animate-spin' : ''}`} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setExpandedProxyId(isExpanded ? null : p.id)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  title="Привязки провайдеров"
                >
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleTest(p.id)}
                  disabled={testingId === p.id}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  title="Тест подключения"
                >
                  {testingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <Zap className="w-3.5 h-3.5 text-amber-500" />}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  className="p-1.5 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  title="Редактировать"
                >
                  <Edit3 className="w-3.5 h-3.5 text-primary" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id, p.label)}
                  className="p-1.5 rounded-lg hover:bg-rose-500/10 cursor-pointer transition-colors"
                  title="Удалить"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                </button>
              </div>
            </div>

            {/* Expanded: Provider Bindings */}
            {isExpanded && providers.length > 0 && (
              <div className="px-4 pb-4 border-t border-border/40 pt-3 space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Привязка к провайдерам API</p>
                <div className="space-y-1.5">
                  {providers.map((pr) => {
                    const assignedProxyLabel = getProxyLabel(pr.proxyId);
                    const isThis = pr.proxyId === p.id;
                    return (
                      <div
                        key={pr.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                          isThis ? 'border-primary/40 bg-primary/5' : 'border-border/60 hover:bg-muted/20'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Database className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs font-medium text-foreground truncate">{pr.name}</span>
                          <code className="text-[9px] font-mono text-muted-foreground truncate max-w-[200px]">{pr.apiUrl}</code>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {assignedProxyLabel && !isThis && (
                            <span className="text-[9px] font-mono text-muted-foreground">через {assignedProxyLabel}</span>
                          )}
                          {isThis ? (
                            <button
                              type="button"
                              onClick={() => handleAssign(pr.id, null)}
                              className="text-[10px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
                            >
                              Отвязать
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAssign(pr.id, p.id)}
                              className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                            >
                              Привязать
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {/* ── CREATE / EDIT MODAL ── */}
      {(showCreate || isEditing) && (
        <Card className="rounded-3xl border border-border/80 shadow-sm bg-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              {isEditing ? `Редактирование прокси` : 'Новый прокси-сервер или подписка'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Название *</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="Quattro VPN - Основной"
                className="text-xs"
                maxLength={128}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Категория</Label>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as ProxyCategory }))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="PAID_PREMIUM">💎 Платный Premium (Quattro VPN)</option>
                <option value="FREE_PUBLIC">🌿 Бесплатный публичный пул</option>
                <option value="BACKUP_RESERVE">🛡️ Резервный канал</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Протокол</Label>
              <select
                value={form.protocol}
                onChange={(e) => setForm((prev) => ({ ...prev, protocol: e.target.value as ProxyProtocol }))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {(['socks5', 'https', 'http'] as const).map((pr) => (
                  <option key={pr} value={pr}>
                    {PROXY_PROTOCOL_LABELS[pr]} {pr === 'socks5' ? '(рекомендуется для РФ)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Гео-локация</Label>
              <select
                value={form.geoCountry}
                onChange={(e) => setForm((prev) => ({ ...prev, geoCountry: e.target.value }))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">Не указана</option>
                {GEO_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Хост / IP *</Label>
              <Input
                value={form.host}
                onChange={(e) => setForm((prev) => ({ ...prev, host: e.target.value }))}
                placeholder="127.0.0.1 или IP"
                className="font-mono text-xs"
                maxLength={253}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Порт *</Label>
              <Input
                type="number"
                min={1}
                max={65535}
                value={form.port}
                onChange={(e) => setForm((prev) => ({ ...prev, port: e.target.value }))}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                URL подписки (Subscription-Userinfo)
              </Label>
              <Input
                value={form.subscriptionUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, subscriptionUrl: e.target.value }))}
                placeholder="https://quattro-tech.ru/sub/... (для авто-продления срока)"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Имя пользователя</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="(опционально)"
                className="text-xs"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Пароль</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder={isEditing ? 'Оставьте пустым для сохранения' : '(опционально)'}
                className="text-xs"
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Теги</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Новый тег и Enter"
                className="text-xs flex-1"
                maxLength={32}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTag}
                disabled={!tagInput.trim()}
                className="text-xs cursor-pointer"
              >
                +
              </Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[10px] font-mono bg-muted/60 text-foreground px-2 py-1 rounded-lg border border-border"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, tags: prev.tags.filter((x) => x !== t) }))}
                      className="text-rose-500 hover:text-rose-400 cursor-pointer"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <b className="text-foreground">Безопасность OWASP 2026:</b> Пароли шифруются AES-256-GCM. При заполнении URL подписки дата окончания тарифа и объем трафика подтягиваются автоматически.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setShowCreate(false); setEditingId(null); setForm(EMPTY_FORM); }}
              className="text-xs"
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={isEditing ? handleUpdate : handleCreate}
              disabled={isPending || !form.label || !form.host}
              className="font-bold text-xs gap-1.5 cursor-pointer"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {isEditing ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
