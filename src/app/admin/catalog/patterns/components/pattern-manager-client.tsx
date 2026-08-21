"use client";

import React, { useState, useTransition } from "react";
import {
  saveLinkPatternAction,
  deleteLinkPatternAction,
  testLinkPatternAction,
  generateAiPatternAction,
  dryRunHistoryAction
} from "@/actions/admin/link-patterns";
import { SafeRegexValidator } from "@/services/analyzer/safe-regex.validator";
import {
  Sparkles,
  Plus,
  Play,
  Trash2,
  Edit2,
  ShieldCheck,
  AlertCircle,
  Clock,
  History,
  CheckCircle2,
  XCircle,
  Copy
} from "lucide-react";
import { toast } from "sonner";

export interface PatternItem {
  id: string;
  networkId: string;
  networkName: string;
  networkSlug?: string;
  pattern: string;
  contentType: string;
  sort: number;
  createdAt: string;
}

export interface NetworkItem {
  id: string;
  name: string;
  slug: string;
}

const CONTENT_TYPES = [
  { value: "post", label: "Пост / Публикация" },
  { value: "channel", label: "Канал / Сообщество / Группа" },
  { value: "profile", label: "Профиль / Пользователь" },
  { value: "video", label: "Видео / Клип / Shorts" },
  { value: "reel", label: "Reels / Клип" },
  { value: "story", label: "Истории (Stories)" },
  { value: "poll", label: "Опрос / Голосование" },
  { value: "bot", label: "Бот / Автоматизация" },
  { value: "custom", label: "Кастомные данные" }
];

export function PatternManagerClient({
  initialPatterns,
  networks
}: {
  initialPatterns: PatternItem[];
  networks: NetworkItem[];
}) {
  const [patterns, setPatterns] = useState<PatternItem[]>(initialPatterns);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    networkId: networks[0]?.id || "",
    pattern: "",
    contentType: "post",
    sort: 0,
    mask: "",
    mode: "mask" as "mask" | "regex" | "ai"
  });

  // AI Generator state
  const [aiUrls, setAiUrls] = useState<string>("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Live Sandbox state
  const [sandboxUrl, setSandboxUrl] = useState("");
  const [sandboxPattern, setSandboxPattern] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Dry Run state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [isRunningDry, setIsRunningDry] = useState(false);

  // Filtered patterns
  const filteredPatterns = patterns.filter(p => {
    const matchesNet = selectedNetwork === "ALL" || p.networkId === selectedNetwork;
    const matchesSearch =
      searchQuery === "" ||
      p.pattern.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.networkName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contentType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesNet && matchesSearch;
  });

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      networkId: networks[0]?.id || "",
      pattern: "",
      contentType: "post",
      sort: patterns.length * 10,
      mask: "",
      mode: "mask"
    });
    setAiUrls("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: PatternItem) => {
    setEditingId(item.id);
    setFormData({
      networkId: item.networkId,
      pattern: item.pattern,
      contentType: item.contentType,
      sort: item.sort,
      mask: "",
      mode: "regex"
    });
    setIsModalOpen(true);
  };

  // Convert Mask to Regex
  const handleMaskChange = (maskValue: string) => {
    const generatedRegex = SafeRegexValidator.maskToRegex(maskValue);
    setFormData(prev => ({
      ...prev,
      mask: maskValue,
      pattern: generatedRegex
    }));
  };

  // AI Generation
  const handleAiGenerate = async () => {
    const sampleUrls = aiUrls
      .split("\n")
      .map(u => u.trim())
      .filter(Boolean);

    if (sampleUrls.length === 0) {
      toast.error("Вставьте хотя бы 1-2 примера ссылок");
      return;
    }

    const networkObj = networks.find(n => n.id === formData.networkId);
    setIsGeneratingAi(true);

    try {
      const res = await generateAiPatternAction({
        platformName: networkObj?.name || "Social Media",
        sampleUrls,
        contentTypeHint: formData.contentType
      });

      if (res.success && 'data' in res && res.data) {
        setFormData(prev => ({
          ...prev,
          pattern: res.data.pattern,
          contentType: res.data.contentType || prev.contentType,
          mode: "regex"
        }));
        toast.success("✨ Правило успешно сгенерировано нейросетью!");
      } else {
        toast.error(('error' in res && res.error) || "Не удалось сгенерировать правило");
      }
    } catch {
      toast.error("Сбой запроса к AI");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Save Pattern
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pattern.trim()) {
      toast.error("Укажите регулярное выражение или маску");
      return;
    }

    startTransition(async () => {
      const res = await saveLinkPatternAction({
        id: editingId || undefined,
        networkId: formData.networkId,
        pattern: formData.pattern.trim(),
        contentType: formData.contentType,
        sort: Number(formData.sort)
      });

      if (res.success) {
        toast.success(editingId ? "Паттерн обновлен" : "Новый паттерн создан");
        setIsModalOpen(false);
        // Refresh local list
        const networkObj = networks.find(n => n.id === formData.networkId);
        if (editingId) {
          setPatterns(prev =>
            prev.map(p =>
              p.id === editingId
                ? {
                    ...p,
                    networkId: formData.networkId,
                    networkName: networkObj?.name || p.networkName,
                    pattern: formData.pattern,
                    contentType: formData.contentType,
                    sort: formData.sort
                  }
                : p
            )
          );
        } else {
          setPatterns(prev => [
            ...prev,
            {
              id: `temp-${Date.now()}`,
              networkId: formData.networkId,
              networkName: networkObj?.name || "Соцсеть",
              pattern: formData.pattern,
              contentType: formData.contentType,
              sort: formData.sort,
              createdAt: new Date().toISOString()
            }
          ]);
        }
      } else {
        toast.error(res.error || "Ошибка сохранения");
      }
    });
  };

  // Delete Pattern
  const handleDelete = (id: string) => {
    if (!confirm("Удалить этот шаблон распознавания?")) return;

    startTransition(async () => {
      const res = await deleteLinkPatternAction(id);
      if (res.success) {
        toast.success("Паттерн удален");
        setPatterns(prev => prev.filter(p => p.id !== id));
      } else {
        toast.error(('error' in res && res.error) || "Ошибка удаления");
      }
    });
  };

  // Run Live Sandbox Test
  const handleRunSandbox = async () => {
    if (!sandboxUrl.trim() || !sandboxPattern.trim()) {
      toast.error("Заполните ссылку и регулярное выражение для теста");
      return;
    }

    setIsTesting(true);
    try {
      const res = await testLinkPatternAction({
        pattern: sandboxPattern,
        sampleUrl: sandboxUrl
      });

      if (res.success && 'data' in res && res.data) {
        setSandboxResult(res.data);
      } else {
        toast.error(('error' in res && res.error) || "Ошибка тестирования");
      }
    } finally {
      setIsTesting(false);
    }
  };

  // Run Dry Run
  const handleRunDryRun = async () => {
    if (!sandboxPattern.trim()) {
      toast.error("Сначала выберите или введите паттерн");
      return;
    }

    setIsRunningDry(true);
    try {
      const res = await dryRunHistoryAction(sandboxPattern, 200);
      if (res.success && 'data' in res && res.data) {
        setDryRunResult(res.data);
        toast.success(`Проверено ${res.data.totalTested} заказов! Совпадений: ${res.data.matchCount}`);
      } else {
        toast.error(('error' in res && res.error) || "Ошибка Dry-Run анализа");
      }
    } finally {
      setIsRunningDry(false);
    }
  };

  const loadIntoSandbox = (item: PatternItem) => {
    setSandboxPattern(item.pattern);
    setSandboxResult(null);
    setDryRunResult(null);
    toast.info(`Паттерн ${item.networkName} (${item.contentType}) загружен в песочницу`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Активных правил</div>
              <div className="text-xl font-bold text-foreground">{patterns.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">ReDoS Защита</div>
              <div className="text-xl font-bold text-foreground">100% Active</div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">AI Генератор</div>
              <div className="text-xl font-bold text-foreground">gemini-3-flash</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Patterns List + Live Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Patterns Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Network Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedNetwork("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedNetwork === "ALL"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Все ({patterns.length})
              </button>
              {networks.map(n => {
                const count = patterns.filter(p => p.networkId === n.id).length;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setSelectedNetwork(n.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedNetwork === n.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {n.name} ({count})
                  </button>
                );
              })}
            </div>

            {/* Create Button */}
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 transition-all ml-auto"
            >
              <Plus className="w-4 h-4" />
              Добавить шаблон
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Поиск по регулярке, соцсети или типу контента..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Patterns Table */}
          <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                    <th className="px-3 py-2.5">Соцсеть</th>
                    <th className="px-3 py-2.5">Тип</th>
                    <th className="px-3 py-2.5">Шаблон (RegEx / Mask)</th>
                    <th className="px-3 py-2.5 text-center">Приоритет</th>
                    <th className="px-3 py-2.5 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredPatterns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        Шаблонов не найдено. Нажмите «Добавить шаблон», чтобы создать первое правило.
                      </td>
                    </tr>
                  ) : (
                    filteredPatterns.map(p => (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2 font-bold text-foreground whitespace-nowrap">
                          {p.networkName}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold text-[11px]">
                            {p.contentType}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-foreground max-w-[200px] truncate" title={p.pattern}>
                          {p.pattern}
                        </td>
                        <td className="px-3 py-2 text-center text-muted-foreground font-mono">
                          {p.sort}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => loadIntoSandbox(p)}
                              title="Загрузить в песочницу"
                              className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              title="Редактировать"
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p.id)}
                              title="Удалить"
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Live Sandbox & Dry-Run Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Play className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-foreground">Интерактивная Песочница</h3>
              </div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-0.5 rounded-md bg-muted">
                Live Test
              </span>
            </div>

            {/* Pattern under test */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground">Тестируемый RegEx:</label>
              <textarea
                rows={2}
                value={sandboxPattern}
                onChange={e => setSandboxPattern(e.target.value)}
                placeholder="Вставьте RegEx или нажмите ▶ у любого правила слева..."
                className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Sample URL Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground">Тестовая ссылка от клиента:</label>
              <input
                type="text"
                value={sandboxUrl}
                onChange={e => setSandboxUrl(e.target.value)}
                placeholder="https://t.me/durov/42?si=tracker123"
                className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunSandbox}
                disabled={isTesting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                {isTesting ? "Тестирование..." : "Проверить ссылку"}
              </button>

              <button
                type="button"
                onClick={handleRunDryRun}
                disabled={isRunningDry}
                title="Прогнать по 200 реальным заказам из базы данных"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-xs font-semibold hover:bg-muted/80 transition-all disabled:opacity-50"
              >
                <History className="w-3.5 h-3.5 text-muted-foreground" />
                {isRunningDry ? "Dry-run..." : "Dry-Run 200"}
              </button>
            </div>

            {/* Sandbox Result View */}
            {sandboxResult && (
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2.5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {sandboxResult.isMatch ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Успешно распознано
                      </span>
                    ) : (
                      <span className="text-destructive flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        Не совпадает
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                    <Clock className="w-3 h-3" />
                    {sandboxResult.executionTimeMs} мс
                  </div>
                </div>

                {sandboxResult.error && (
                  <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[11px]">
                    {sandboxResult.error}
                  </div>
                )}

                {sandboxResult.cleanedUrl && (
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-semibold">Очищенный URL:</span>{" "}
                    <span className="font-mono text-foreground">{sandboxResult.cleanedUrl}</span>
                  </div>
                )}

                {sandboxResult.extractedGroups && sandboxResult.extractedGroups.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-muted-foreground">Извлеченные переменные:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {sandboxResult.extractedGroups.map((grp: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-card border border-border font-mono text-[11px] text-foreground"
                        >
                          ${idx + 1}: {grp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dry Run Result View */}
            {dryRunResult && (
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2 animate-in fade-in duration-300 text-xs">
                <div className="font-bold text-primary flex items-center justify-between">
                  <span>📊 Результат Dry-Run анализа</span>
                  <span className="font-mono">{dryRunResult.matchRate}% совпадений</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Проверено заказов: <strong className="text-foreground">{dryRunResult.totalTested}</strong> |
                  Найдено совпадений: <strong className="text-foreground">{dryRunResult.matchCount}</strong> |
                  Время анализа: <strong className="text-foreground">{dryRunResult.executionTimeMs} мс</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Create / Edit Pattern */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">
                {editingId ? "Редактировать правило распознавания" : "Создать правило распознавания"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Mode Switcher */}
              <div className="flex rounded-xl bg-muted p-1 gap-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, mode: "mask" }))}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    formData.mode === "mask" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🧩 No-Code Маска
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, mode: "regex" }))}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    formData.mode === "regex" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ⚡ Прямой RegEx
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, mode: "ai" }))}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    formData.mode === "ai" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ✨ AI Генератор
                </button>
              </div>

              {/* Network and Content Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Соцсеть:</label>
                  <select
                    value={formData.networkId}
                    onChange={e => setFormData(p => ({ ...p, networkId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {networks.map(n => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Тип контента:</label>
                  <select
                    value={formData.contentType}
                    onChange={e => setFormData(p => ({ ...p, contentType: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {CONTENT_TYPES.map(ct => (
                      <option key={ct.value} value={ct.value}>
                        {ct.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mode: No-Code Mask */}
              {formData.mode === "mask" && (
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-muted-foreground">Маска ссылки:</label>
                  <input
                    type="text"
                    value={formData.mask}
                    onChange={e => handleMaskChange(e.target.value)}
                    placeholder="t.me/{channel}/{postId} или instagram.com/p/{id}"
                    className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                  <div className="text-[10px] text-muted-foreground">
                    Доступные плейсхолдеры: <code className="text-primary">{`{channel}`}</code>,{" "}
                    <code className="text-primary">{`{postId}`}</code>, <code className="text-primary">{`{username}`}</code>,{" "}
                    <code className="text-primary">{`{id}`}</code>
                  </div>
                </div>
              )}

              {/* Mode: AI Generator */}
              {formData.mode === "ai" && (
                <div className="space-y-2 p-3 rounded-2xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-primary flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Вставьте 2-3 примера реальных ссылок:
                    </label>
                  </div>
                  <textarea
                    rows={3}
                    value={aiUrls}
                    onChange={e => setAiUrls(e.target.value)}
                    placeholder="https://threads.net/@user/post/123&#10;https://threads.net/@another/post/456"
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono resize-none"
                  />
                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={isGeneratingAi}
                    className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isGeneratingAi ? "Нейросеть генерирует правило..." : "Сгенерировать RegEx через AI"}
                  </button>
                </div>
              )}

              {/* Compiled RegExp output / Direct Editor */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Результирующий RegEx:</label>
                <textarea
                  rows={2}
                  value={formData.pattern}
                  onChange={e => setFormData(p => ({ ...p, pattern: e.target.value }))}
                  placeholder="t\.me\/[\w-]+\/(\d+)"
                  className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono resize-none"
                />
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Приоритет (Sort Order):</label>
                <input
                  type="number"
                  value={formData.sort}
                  onChange={e => setFormData(p => ({ ...p, sort: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="text-[10px] text-muted-foreground">
                  Меньшее число проверяется раньше (например, специфический пост = 10, общий канал = 50).
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-semibold hover:bg-muted/80 transition-all"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {isPending ? "Сохранение..." : editingId ? "Сохранить изменения" : "Создать правило"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
