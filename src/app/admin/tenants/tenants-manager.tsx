'use client';

import React, { useState } from 'react';
import { 
  Globe, 
  Plus, 
  ExternalLink, 
  CheckCircle2, 
  PauseCircle, 
  Trash2, 
  Settings, 
  ShieldCheck, 
  Layers, 
  Activity,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { 
  createTenantAction, 
  updateTenantAction, 
  toggleTenantStatusAction, 
  deleteTenantAction 
} from '@/actions/admin/tenants';
import Link from 'next/link';

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  domain: string;
  customDomain: string | null;
  isActive: boolean;
  createdAt: Date | string;
  systemSettings: {
    siteName: string;
    siteDescription: string;
    siteLogoUrl: string | null;
    siteFaviconUrl: string | null;
    isTestMode: boolean;
    maintenanceMode: boolean;
  } | null;
}

interface TenantsManagerProps {
  initialTenants: TenantItem[];
}

export function TenantsManager({ initialTenants }: TenantsManagerProps) {
  const [tenants, setTenants] = useState<TenantItem[]>(initialTenants);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [domain, setDomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDomain(text);
    setTimeout(() => setCopiedDomain(null), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await createTenantAction({
        name,
        slug,
        domain,
        customDomain: customDomain ? customDomain : null,
        themeVariant: 'classic'
      });

      if (res.success && res.data) {
        setIsModalOpen(false);
        setName('');
        setSlug('');
        setDomain('');
        setCustomDomain('');
        // Refresh local state
        window.location.reload();
      } else {
        setError(res.error || 'Ошибка создания бренда');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Произошла непредвиденная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      const res = await toggleTenantStatusAction(id, !currentStatus);
      if (res.success) {
        setTenants(prev => prev.map(t => t.id === id ? { ...t, isActive: !currentStatus } : t));
      } else {
        alert(res.error || 'Ошибка смены статуса');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, brandName: string) => {
    if (!confirm(`Вы действительно хотите удалить бренд "${brandName}" (${id})?`)) return;

    setLoading(true);
    try {
      const res = await deleteTenantAction(id);
      if (res.success) {
        setTenants(prev => prev.filter(t => t.id !== id));
      } else {
        alert(res.error || 'Ошибка удаления бренда');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-3xl p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Globe className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-foreground">Бренды & Домены (White-Label)</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Управляйте сателлитами, подключайте новые домены и настраивайте независимое брендирование
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-sm transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить бренд</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Всего сайтов</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-foreground font-mono">{tenants.length}</span>
            <Layers className="w-5 h-5 text-primary" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Активные бренды</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {tenants.filter(t => t.isActive).length}
            </span>
            <Activity className="w-5 h-5 text-emerald-500" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Изоляция данных</span>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">Multi-Tenant 100%</span>
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenants.map(tenant => {
          const isSystem = tenant.id === 'smmplan' || tenant.id === 'flux';
          
          return (
            <div 
              key={tenant.id}
              className={`bg-card border rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6 transition-all duration-200 ${
                tenant.isActive ? 'border-border hover:border-primary/40' : 'border-border/60 opacity-75'
              }`}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-foreground">{tenant.name}</h3>
                      {isSystem && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary uppercase">
                          Системный
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground block">ID: {tenant.id}</span>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                    tenant.isActive 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}>
                    {tenant.isActive ? <CheckCircle2 className="w-3 h-3" /> : <PauseCircle className="w-3 h-3" />}
                    <span>{tenant.isActive ? 'Активен' : 'Пауза'}</span>
                  </span>
                </div>

                {/* Domain info */}
                <div className="space-y-2 pt-2 border-t border-border/60 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border/40">
                    <div className="flex items-center gap-2 truncate">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="font-mono font-bold text-foreground truncate">{tenant.domain}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleCopy(tenant.domain)}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Скопировать домен"
                      >
                        {copiedDomain === tenant.domain ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a 
                        href={`https://${tenant.domain}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-1 text-muted-foreground hover:text-primary transition-colors"
                        title="Открыть сайт"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {tenant.customDomain && (
                    <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-muted-foreground">
                      <span>Алиас:</span>
                      <span className="font-mono">{tenant.customDomain}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-2">
                <Link
                  href={`/admin/settings`}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 text-foreground flex items-center gap-1.5 transition-all"
                >
                  <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Настройки</span>
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    disabled={isSystem || loading}
                    onClick={() => handleToggle(tenant.id, tenant.isActive)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      tenant.isActive 
                        ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400' 
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {tenant.isActive ? 'Отключить' : 'Включить'}
                  </button>

                  {!isSystem && (
                    <button
                      disabled={loading}
                      onClick={() => handleDelete(tenant.id, tenant.name)}
                      className="p-2 rounded-xl text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all cursor-pointer"
                      title="Удалить бренд"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Dialog: Add New Tenant */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 relative">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Plus className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-black text-foreground">Подключение нового бренда</h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Название бренда (Site Name)</label>
                <input
                  type="text"
                  required
                  placeholder="например, SMM Boost Pro"
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    if (!slug) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
                    }
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-background border border-border focus:border-primary focus:outline-none text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Идентификатор (Slug / ID)</label>
                  <input
                    type="text"
                    required
                    placeholder="boost"
                    value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full px-4 py-3 rounded-2xl bg-background border border-border focus:border-primary focus:outline-none text-foreground font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Основной домен</label>
                  <input
                    type="text"
                    required
                    placeholder="smmboost.ru"
                    value={domain}
                    onChange={e => setDomain(e.target.value.toLowerCase().trim())}
                    className="w-full px-4 py-3 rounded-2xl bg-background border border-border focus:border-primary focus:outline-none text-foreground font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Дополнительный домен / Алиас (Опционально)</label>
                <input
                  type="text"
                  placeholder="www.smmboost.ru"
                  value={customDomain}
                  onChange={e => setCustomDomain(e.target.value.toLowerCase().trim())}
                  className="w-full px-4 py-3 rounded-2xl bg-background border border-border focus:border-primary focus:outline-none text-foreground font-mono"
                />
              </div>

              <div className="p-4 rounded-2xl bg-secondary/40 border border-border/50 space-y-2 text-[11px] text-muted-foreground">
                <span className="font-bold text-foreground block">⚡ DNS Инструкция:</span>
                <p>Направьте А-запись домена <code className="text-primary font-mono">{domain || 'вашего домена'}</code> на публичный IP вашего сервера.</p>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold bg-secondary hover:bg-secondary/80 text-foreground transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all duration-200 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Создание...' : 'Создать бренд'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
