'use client';

import React, { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  adminChangeUserPasswordAction,
  adminChangeUserEmailAction,
  adminGenerateMagicLinkAction,
  adminRevokeUserSessionsAction,
} from '@/actions/admin/users';
import {
  Shield,
  Check,
  Copy,
  KeyRound,
  Sparkles,
  X,
  Mail,
  Link as LinkIcon,
  LogOut,
  Edit3,
} from 'lucide-react';
import { UserDTO, LoginLogDTO } from './types';

interface SecurityTabProps {
  user: UserDTO;
  loginLogs: LoginLogDTO[];
}

export function SecurityTab({ user, loginLogs }: SecurityTabProps) {
  const [newPass, setNewPass] = useState('');
  const [copiedPass, setCopiedPass] = useState(false);
  const [isPendingPass, startPassTransition] = useTransition();

  // Magic link state & handler
  const [isPendingMagicLink, startMagicLinkTransition] = useTransition();
  const [copiedMagicLink, setCopiedMagicLink] = useState(false);

  // Revoke sessions handler
  const [isPendingRevoke, startRevokeTransition] = useTransition();

  // Email Change Modal State & Handler
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [editEmail, setEditEmail] = useState(user.email);
  const [emailReason, setEmailReason] = useState(
    'Опечатка при регистрации / Обращение в чат'
  );
  const [isPendingEmailChange, startEmailChangeTransition] = useTransition();

  function generateRandomPassword() {
    const chars =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let res = '';
    for (let i = 0; i < 12; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPass(res);
  }

  async function copyNewPassword() {
    if (!newPass) return;
    try {
      await navigator.clipboard.writeText(newPass);
      setCopiedPass(true);
      toast.success('Пароль скопирован');
      setTimeout(() => setCopiedPass(false), 2000);
    } catch {
      toast.error('Ошибка копирования');
    }
  }

  function savePassword() {
    if (!newPass || newPass.length < 8) {
      toast.error('Пароль должен содержать минимум 8 символов');
      return;
    }
    startPassTransition(async () => {
      const r = await adminChangeUserPasswordAction(user.id, newPass);
      if (r.success) {
        toast.success('🔑 Пароль изменен, сессии клиента сброшены');
        setNewPass('');
      } else {
        toast.error(r.error ?? 'Ошибка при смене пароля');
      }
    });
  }

  function handleGenerateMagicLink() {
    startMagicLinkTransition(async () => {
      const res = await adminGenerateMagicLinkAction(user.id);
      if (res.success && res.magicUrl) {
        const fullUrl = `${window.location.origin}${res.magicUrl}`;
        await navigator.clipboard.writeText(fullUrl);
        setCopiedMagicLink(true);
        toast.success(
          '🔗 Одноразовая ссылка входа скопирована в буфер обмена (действует 15 минут)!'
        );
        setTimeout(() => setCopiedMagicLink(false), 3000);
      } else {
        toast.error(res.error || 'Ошибка при генерации ссылки');
      }
    });
  }

  function handleRevokeSessions() {
    if (
      !confirm(
        'Вы уверены, что хотите завершить все активные сессии пользователя со всех устройств?'
      )
    )
      return;
    startRevokeTransition(async () => {
      const res = await adminRevokeUserSessionsAction(user.id);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.error || 'Ошибка сброса сессий');
      }
    });
  }

  function handleSaveEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!editEmail || !editEmail.includes('@')) {
      toast.error('Введите корректный email');
      return;
    }
    if (!emailReason.trim() || emailReason.trim().length < 3) {
      toast.error('Укажите причину изменения (мин. 3 символа)');
      return;
    }
    startEmailChangeTransition(async () => {
      const res = await adminChangeUserEmailAction(user.id, editEmail, emailReason);
      if (res.success) {
        toast.success(res.message);
        setShowEmailModal(false);
      } else {
        toast.error(res.error || 'Ошибка смены email');
      }
    });
  }

  return (
    <>
      <div className="space-y-5 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Quick Access & Identity */}
          <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-5 ring-1 ring-border/5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span className="bg-primary/10 text-primary p-1 rounded-md">
                    <LinkIcon className="w-3.5 h-3.5" />
                  </span>
                  Быстрый доступ и Сессии
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Генерация одноразовой ссылки прямого входа без пароля (действует 15 минут)
                или принудительный сброс активных сессий при подозрении на взлом.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleGenerateMagicLink}
                disabled={isPendingMagicLink}
                className="w-full h-9 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {copiedMagicLink ? (
                  <Check className="w-3.5 h-3.5 text-success" />
                ) : (
                  <LinkIcon className="w-3.5 h-3.5" />
                )}
                {isPendingMagicLink
                  ? 'Генерация...'
                  : copiedMagicLink
                  ? 'Ссылка скопирована!'
                  : 'Скопировать Magic Link (15 мин)'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditEmail(user.email);
                  setShowEmailModal(true);
                }}
                className="w-full h-9 rounded-xl text-xs font-bold bg-muted text-foreground border border-border/60 hover:bg-muted/80 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                Исправить Email клиента
              </button>

              <button
                type="button"
                onClick={handleRevokeSessions}
                disabled={isPendingRevoke}
                className="w-full h-9 rounded-xl text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                {isPendingRevoke ? 'Сброс...' : 'Завершить все сессии (Force Logout)'}
              </button>
            </div>
          </div>

          {/* Card 2: Password Management */}
          <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-5 ring-1 ring-border/5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span className="bg-amber-500/10 text-amber-600 p-1 rounded-md">
                    <KeyRound className="w-3.5 h-3.5" />
                  </span>
                  Смена пароля клиента
                </h3>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Сгенерировать
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
                    Новый пароль (минимум 8 символов)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={newPass}
                      onChange={e => setNewPass(e.target.value)}
                      placeholder="Введите или сгенерируйте..."
                      className="w-full h-9 text-xs pl-3 pr-9 rounded-xl border border-border/60 bg-background/50 shadow-sm text-foreground font-mono outline-none focus:border-primary"
                    />
                    {newPass && (
                      <button
                        type="button"
                        onClick={copyNewPassword}
                        className="absolute right-2 p-1 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
                        title="Скопировать"
                      >
                        {copiedPass ? (
                          <Check className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!newPass || newPass.length < 8) {
                  toast.error('Пароль должен содержать не менее 8 символов');
                  return;
                }
                savePassword();
              }}
              disabled={isPendingPass}
              className="w-full h-9 rounded-xl text-xs font-bold bg-warning text-warning-foreground shadow-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isPendingPass ? 'Сохранение...' : 'Установить новый пароль'}
            </button>
          </div>

          {/* Card 3: Security Log */}
          <div className="bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-2xl p-5 ring-1 ring-border/5 space-y-3.5 md:col-span-2 lg:col-span-1">
            <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="bg-primary/10 text-primary p-1 rounded-md">
                <Shield className="w-3.5 h-3.5" />
              </span>
              Журнал авторизаций (Logs)
            </h3>
            {loginLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic py-3">
                Логи авторизации отсутствуют
              </p>
            ) : (
              <div className="overflow-x-auto scrollbar-hide max-h-[160px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-[9px] uppercase font-bold tracking-wider text-muted-foreground">
                      <th className="pb-2 pr-2">Дата</th>
                      <th className="pb-2 px-1">IP</th>
                      <th className="pb-2 pl-1 text-right">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-xs">
                    {loginLogs.map(log => (
                      <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-1.5 pr-2 font-mono tabular-nums text-muted-foreground text-[10px]">
                          {new Date(log.createdAt).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-1.5 px-1 font-mono text-foreground text-[10px]">
                          {log.ipAddress}
                        </td>
                        <td className="py-1.5 pl-1 text-right">
                          {log.success ? (
                            <span className="inline-flex items-center text-[8px] font-bold uppercase text-emerald-700 bg-success/15 px-1.5 py-0.2 rounded-full">
                              OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[8px] font-bold uppercase text-rose-700 bg-destructive/15 px-1.5 py-0.2 rounded-full">
                              Сбой
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Change Client Email */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-md p-6 space-y-4 relative">
            <button
              type="button"
              onClick={() => setShowEmailModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <Edit3 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">Замена Email клиента</h3>
                <p className="text-xs text-muted-foreground">
                  Текущий адрес:{' '}
                  <span className="font-mono text-foreground font-semibold">
                    {user.email}
                  </span>
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEmail} className="space-y-3.5 pt-2">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
                  Новый адрес Email
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="ivan@gmail.com"
                  className="w-full h-9 text-xs font-mono px-3 rounded-xl border border-border/60 bg-background/50 text-foreground outline-none focus:border-primary shadow-sm"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1 block">
                  Обоснование смены (для аудита 152-ФЗ)
                </label>
                <input
                  type="text"
                  required
                  value={emailReason}
                  onChange={e => setEmailReason(e.target.value)}
                  placeholder="Опечатка при регистрации / Сверен чек ЮKassa"
                  className="w-full h-9 text-xs px-3 rounded-xl border border-border/60 bg-background/50 text-foreground outline-none focus:border-primary shadow-sm"
                />
              </div>

              <div className="p-3 bg-muted/40 border border-border/40 rounded-xl text-[11px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-primary" /> Протокол безопасности:
                </p>
                <p>• Все активные сессии со старого адреса будут сброшены.</p>
                <p>
                  • Баланс ({((user.balance || 0) / 100).toFixed(2)} ₽) и история заказов
                  полностью сохранятся.
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 h-9 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isPendingEmailChange}
                  className="px-4 h-9 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isPendingEmailChange ? 'Сохранение...' : 'Перенести аккаунт'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
