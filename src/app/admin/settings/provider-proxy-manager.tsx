'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useState, useEffect, useTransition, useCallback } from 'react';
import {
  Plus, Trash2, Edit3, Save, X, Globe, Zap, CheckCircle,
  Loader2, AlertTriangle, Link2, Unlink,
  ChevronDown, ChevronUp, RefreshCw, Search,
  Radio, Database,
} from 'lucide-react';
import {
  listProviderProxiesAction,
  createProviderProxyAction,
  updateProviderProxyAction,
  deleteProviderProxyAction,
  testProviderProxyAction,
  assignProxyToProviderAction,
  toggleProxyActiveAction,
  getProxyHealthSummaryAction,
} from '@/actions/admin/provider-proxy';
import type { ProviderProxyWithUsage, ProxyHealthSummary, ProxyProtocol } from '@/types/provider-proxy';
import { GEO_OPTIONS, PROXY_PROTOCOL_LABELS } from '@/types/provider-proxy';
import type { Provider } from '@prisma/client';

interface FormData {
  label: string;
  description: string;
  protocol: ProxyProtocol;
  host: string;
  port: string;
  username: string;
  password: string;
  isRotating: boolean;
  geoCountry: string;
  tags: string[];
}

const EMPTY_FORM: FormData = {
  label: '',
  description: '',
  protocol: 'https',
  host: '',
  port: '3128',
  username: '',
  password: '',
  isRotating: false,
  geoCountry: '',
  tags: [],
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProtocol, setFilterProtocol] = useState<string>('');
  const [expandedProxyId, setExpandedProxyId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [testUrl, setTestUrl] = useState('https://httpbin.org/ip');

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
    if (!confirm(`Удалить прокси "${label}"?\nВсе привязанные провайдеры будут переведены на прямое подключение.`)) return;
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

  const handleToggle = (id: string, isActive: boolean) => {
    startTransition(async () => {
      const res = await toggleProxyActiveAction(id, isActive);
      if (res.success) {
        toast.success(res.message);
        loadData();
      } else {
        toast.error(res.error || 'Ошибка смены статуса');
      }
    });
  };

  const startEdit = (p: ProviderProxyWithUsage) => {
    setEditingId(p.id);
    setForm({
      label: p.label,
      description: p.description,
      protocol: p.protocol,
      host: p.host,
      port: String(p.port),
      username: p.username || '',
      password: '',
      isRotating: p.isRotating,
      geoCountry: p.geoCountry || '',
      tags: p.tags,
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

  const filtered = proxies.filter((p) =>
    (!searchQuery || p.label.toLowerCase().includes(searchQuery.toLowerCase()) || p.host.includes(searchQuery)) &&
    (!filterProtocol || p.protocol === filterProtocol),
  );

  const isEditing = editingId !== null;
  const getProxyLabel = (proxyId: string | null) => {
    if (!proxyId) return null;
    return proxies.find((p) => p.id === proxyId)?.label || null;
  };

  return (
    <div className="space-y-6">
      {/* ── HEALTH SUMMARY ── */}
      {health && (
        <Card className="rounded-3xl border border-border/80 shadow-sm bg-card p-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-border/60">
            <span className="p-1 px-2.5 bg-primary/10 text-primary rounded-md text-[10px] font-bold">OVERVIEW</span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Сводка по прокси</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
            {[
              { label: 'Всего прокси', value: health.total, icon: Globe, color: 'text-primary' },
              { label: 'Активных', value: health.active, icon: CheckCircle, color: 'text-emerald-500' },
              { label: 'С ошибками', value: health.withErrors, icon: AlertTriangle, color: 'text-rose-500' },
              { label: 'Провайдеров через прокси', value: health.providersUsingProxy, icon: Link2, color: 'text-indigo-400' },
              { label: 'Прямое подкл.', value: health.providersDirect, icon: Radio, color: 'text-cyan-400' },
              { label: 'Avg Latency', value: health.avgLatencyMs ? `${Math.round(health.avgLatencyMs)}ms` : '—', icon: Zap, color: 'text-amber-400' },
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

      {/* ── TOOLBAR ── */}
      <Card className="rounded-3xl border border-border/80 shadow-sm bg-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="p-1 px-2.5 bg-primary/10 text-primary rounded-md text-[10px] font-bold">PROXY</span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Пул прокси-серверов</h3>
          </div>
          <div className="flex items-center gap-2">
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

        {/* Search & Filter */}
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
            {['', 'http', 'https', 'socks5'].map((p) => (
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
                {p ? PROXY_PROTOCOL_LABELS[p as ProxyProtocol] : 'Все'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── PROXY LIST ── */}
      {filtered.length === 0 && !loading && (
        <Card className="rounded-2xl p-8 text-center bg-card border border-border">
          <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-xs text-muted-foreground">Прокси не настроены. Добавьте первый прокси-сервер.</p>
        </Card>
      )}

      {filtered.map((p) => {
        const isExpanded = expandedProxyId === p.id;
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
                    p.protocol === 'socks5' ? 'bg-indigo-600' : 'bg-primary'
                  }`}
                >
                  {p.protocol === 'socks5' ? 'S5' : p.protocol.toUpperCase().substring(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-foreground">{p.label}</h4>
                    <span className="text-[9px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                      {p.protocol.toUpperCase()}
                    </span>
                    {p.geoCountry && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40">
                        {p.geoCountry}
                      </span>
                    )}
                    {p.isRotating && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        ROTATING
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
                  {testingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
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
                              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/30 hover:bg-rose-500/20 cursor-pointer flex items-center gap-1 transition-colors"
                            >
                              <Unlink className="w-3 h-3" /> Прямое
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAssign(pr.id, p.id)}
                              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 cursor-pointer flex items-center gap-1 transition-colors"
                            >
                              <Link2 className="w-3 h-3" /> Назначить
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

      {/* ── CREATE / EDIT FORM ── */}
      {(showCreate || isEditing) && (
        <Card className="rounded-3xl border border-primary/30 shadow-lg bg-card p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              {isEditing ? 'Редактировать прокси' : 'Новый прокси'}
            </h3>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setEditingId(null); setForm(EMPTY_FORM); }}
              className="p-1.5 rounded-lg hover:bg-muted cursor-pointer transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Название *</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="EU Proxy Amsterdam"
                maxLength={128}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Протокол</Label>
              <select
                value={form.protocol}
                onChange={(e) => setForm((prev) => ({ ...prev, protocol: e.target.value as ProxyProtocol }))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {(['https', 'http', 'socks5'] as const).map((pr) => (
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
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Хост *</Label>
              <Input
                value={form.host}
                onChange={(e) => setForm((prev) => ({ ...prev, host: e.target.value }))}
                placeholder="proxy.example.com"
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
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Описание</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Опционально"
                maxLength={512}
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
            <div className="flex items-end gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={form.isRotating}
                  onCheckedChange={(c) => setForm((prev) => ({ ...prev, isRotating: !!c }))}
                />
                <span className="text-xs text-foreground">Ротирующийся IP</span>
              </div>
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
                      className="text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Test URL config */}
          <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
            <div className="flex gap-2 items-center">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                URL для теста
              </Label>
              <Input
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                className="font-mono text-xs flex-1"
                placeholder="https://httpbin.org/ip"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <p className="text-[10px] text-amber-400 leading-relaxed">
              <b>Безопасность:</b> Пароли шифруются AES-256-GCM. Прокси-данные не возвращаются в клиентские ответы. Все действия логируются в AdminAuditLog.
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
