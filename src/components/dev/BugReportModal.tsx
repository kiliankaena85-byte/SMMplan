'use client';

import React, { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Bug, 
  Copy, 
  Check, 
  Send, 
  AlertTriangle, 
  Monitor, 
  Globe, 
  User, 
  Terminal,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { submitBugReportAction } from "@/actions/admin/bug-reports";

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTenant: string;
  checkoutMode: string;
}

export function BugReportModal({
  isOpen,
  onClose,
  currentTenant,
  checkoutMode,
}: BugReportModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"CRITICAL" | "NORMAL" | "LOW">("NORMAL");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [context, setContext] = useState({
    url: "",
    viewport: "",
    userAgent: "",
    role: "Определяется...",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const match = document.cookie.match(/auth_token=([^;]+)/);
      const isOwner = document.cookie.includes("owner") || window.location.pathname.startsWith("/admin");
      const userRole = isOwner ? "Владелец / Администратор" : match ? "Авторизованный клиент" : "Анонимный гость";

      setContext({
        url: window.location.pathname + window.location.search,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        userAgent: navigator.userAgent,
        role: userRole,
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const buildMarkdownReport = () => {
    return `### 🐛 БАГ-РЕПОРТ: ${title || "Без названия"}
**Приоритет:** ${priority === "CRITICAL" ? "🔴 КРИТИЧЕСКИЙ" : priority === "NORMAL" ? "🟡 СРЕДНИЙ" : "🟢 МИНОРНЫЙ"}
**URL:** \`${context.url || "/"}\`
**Бренд:** \`${currentTenant.toUpperCase()}\`
**Режим чекаута:** \`${checkoutMode}\`
**Роль:** ${context.role}
**Разрешение:** ${context.viewport}

#### 📝 Описание проблемы и шаги воспроизведения:
${description || "Описание не указано"}
`;
  };

  const handleCopyMarkdown = async () => {
    const md = buildMarkdownReport();
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      toast.success("📋 Markdown-отчет скопирован в буфер! Вставьте его в чат с AI.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не удалось скопировать в буфер");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Пожалуйста, укажите заголовок бага");
      return;
    }

    startTransition(async () => {
      const res = await submitBugReportAction({
        title: title.trim(),
        description: description.trim(),
        priority,
        url: context.url,
        tenantId: currentTenant,
        role: context.role,
        viewport: context.viewport,
        userAgent: context.userAgent,
        checkoutMode,
      });

      if (res.success) {
        toast.success(res.message);
        onClose();
        setTitle("");
        setDescription("");
      } else {
        toast.error(res.error || "Ошибка при отправке");
      }
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="w-full max-w-xl bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <Bug className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Быстрый Баг-Репорт</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[10px] font-mono border border-zinc-700">QA Tool</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Мгновенная фиксация инцидента с авто-сбором тех-контекста
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* 1. Title */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                Заголовок бага <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Кнопка «Оплатить» не реагирует при выборе СБП"
                className="w-full h-9 px-3 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                autoFocus
              />
            </div>

            {/* 2. Priority */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                Приоритет проблемы
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "CRITICAL", label: "🔴 Критический (Блокер)", cls: "hover:bg-red-500/10 active:bg-red-500/20", activeCls: "bg-red-500/20 text-red-300 border-red-500/50 font-bold" },
                  { id: "NORMAL", label: "🟡 Средний (Баг UI/UX)", cls: "hover:bg-amber-500/10 active:bg-amber-500/20", activeCls: "bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold" },
                  { id: "LOW", label: "🟢 Минорный (Косметика)", cls: "hover:bg-emerald-500/10 active:bg-emerald-500/20", activeCls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id as "LOW" | "NORMAL" | "CRITICAL")}
                    className={`h-8 px-2 rounded-lg border text-[11px] transition-all cursor-pointer flex items-center justify-center ${
                      priority === p.id
                        ? p.activeCls
                        : `bg-zinc-900 border-zinc-800 text-zinc-400 ${p.cls}`
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Description */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                Что пошло не так / Шаги воспроизведения
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="1. Зашел на страницу оформления&#10;2. Выбрал Telegram -> Подписчики&#10;3. Нажал оплату, форма затряслась, но заказ не создался..."
                rows={3}
                className="w-full p-3 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 outline-none transition-all resize-none"
              />
            </div>

            {/* 4. Auto-gathered technical context */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                <span className="flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-emerald-400" />
                  Авто-собранный тех-контекст:
                </span>
                <span className="text-emerald-400">Captured ✓</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 text-zinc-400 truncate">
                  <Globe className="w-3 h-3 text-zinc-500 shrink-0" />
                  <span className="truncate" title={context.url}>URL: <strong className="text-zinc-200">{context.url || "/"}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400 truncate">
                  <Monitor className="w-3 h-3 text-zinc-500 shrink-0" />
                  <span>Экран: <strong className="text-zinc-200">{context.viewport}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400 truncate">
                  <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
                  <span>Бренд: <strong className="text-zinc-200 uppercase">{currentTenant}</strong> ({checkoutMode})</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400 truncate">
                  <User className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">Роль: <strong className="text-zinc-200">{context.role}</strong></span>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="h-9 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 text-[11px]"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Скопировано!" : "Копировать для AI"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white font-medium transition-all cursor-pointer text-[11px]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isPending || !title.trim()}
                  className="h-9 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-red-600/20 active:scale-95 text-[11px]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isPending ? "Отправка..." : "Отправить баг-репорт"}</span>
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
