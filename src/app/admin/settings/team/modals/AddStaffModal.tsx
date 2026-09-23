'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Sparkles, Copy, Check, Shield, Globe, Lock, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import type { StaffRole, StaffPermission } from '@prisma/client';
import { createStaffMemberAction, generateStaffMagicLinkAction } from '@/actions/admin/staff';
import { ROLE_LABELS } from '../ui-helpers';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffRoles?: (StaffRole & { permissions: StaffPermission[] })[];
  currentAdminRole?: string;
  onSuccess?: () => void;
}

export function AddStaffModal({
  isOpen,
  onClose,
  staffRoles = [],
  currentAdminRole = 'ADMIN',
  onSuccess,
}: AddStaffModalProps) {
  const isOwner = currentAdminRole === 'OWNER';

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('SUPPORT');
  const [staffRoleId, setStaffRoleId] = useState('NONE');
  const [password, setPassword] = useState('');
  const [supportLimitRubles, setSupportLimitRubles] = useState(500);
  const [allowedTenants, setAllowedTenants] = useState<string[]>(['smmplan', 'flux']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Auto-generate strong password
  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
    let res = '';
    for (let i = 0; i < 14; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
    toast.info('Сгенерирован надежный пароль');
  };

  const toggleTenant = (t: string) => {
    setAllowedTenants((prev) => {
      if (prev.includes(t)) {
        if (prev.length === 1) {
          toast.warning('Сотрудник должен иметь доступ хотя бы к одной витрине');
          return prev;
        }
        return prev.filter((x) => x !== t);
      }
      return [...prev, t];
    });
  };

  const handleCreate = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast.error('Введите корректный email сотрудника');
      return;
    }
    if (allowedTenants.length === 0) {
      toast.error('Выберите хотя бы один бренд для доступа');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createStaffMemberAction({
        email: email.trim(),
        role: role as any,
        staffRoleId: staffRoleId === 'NONE' ? null : staffRoleId,
        password: password.trim() || undefined,
        supportLimitRubles,
        allowedTenants,
      });

      if (!res.success) {
        toast.error(res.error || 'Ошибка при создании сотрудника');
        return;
      }

      toast.success(`Сотрудник ${email} успешно добавлен в команду!`);

      // Automatically generate a magic link for fast dispatch
      try {
        const linkRes = await generateStaffMagicLinkAction({
          userId: res.userId,
          redirectUrl: '/admin/dashboard',
        });
        if (linkRes.success) {
          setGeneratedLink(linkRes.relativeLink);
        }
      } catch {
        // Suppress link generation error
      }

      onSuccess?.();

      if (!password.trim()) {
        // If no manual password, keep modal open to show generated link
      } else {
        handleClose();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Произошла непредвиденная ошибка');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('SUPPORT');
    setStaffRoleId('NONE');
    setPassword('');
    setSupportLimitRubles(500);
    setAllowedTenants(['smmplan', 'flux']);
    setGeneratedLink(null);
    setCopiedLink(false);
    onClose();
  };

  const copyMagicLink = () => {
    if (!generatedLink) return;
    const fullUrl = `${window.location.origin}${generatedLink}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    toast.success('Ссылка скопирована в буфер обмена');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/15 text-primary rounded-xl border border-primary/20 shrink-0">
              <UserPlus className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Добавление сотрудника в команду
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 font-normal">
                Создание новой учетной записи или назначение роли с правами доступа.
              </p>
            </div>
          </div>
        </DialogHeader>

        {generatedLink ? (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <KeyRound className="w-4 h-4 shrink-0" />
              Сотрудник создан! Одноразовая ссылка для входа:
            </div>
            <p className="text-[11px] text-muted-foreground font-normal">
              Отправьте эту ссылку сотруднику (действует 24 часа), чтобы он вошёл в систему без ввода пароля:
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}${generatedLink}`}
                className="h-8 text-xs font-mono bg-background"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={copyMagicLink}
                className="h-8 px-3 shrink-0 gap-1.5 text-xs font-bold"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Скопировано' : 'Копировать'}
              </Button>
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="button" size="sm" onClick={handleClose} className="h-8 text-xs font-bold">
                Готово
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-1 text-xs">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                Email сотрудника <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                placeholder="operator@company.ru"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-xs"
                autoFocus
              />
            </div>

            {/* System Role Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Системная роль
                </label>
                <Select value={role} onValueChange={(val) => { if (val) setRole(val); }}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPPORT">SUPPORT (Саппорт)</SelectItem>
                    <SelectItem value="OPERATOR">OPERATOR (Оператор)</SelectItem>
                    <SelectItem value="MANAGER">MANAGER (Менеджер)</SelectItem>
                    {isOwner && <SelectItem value="ADMIN">ADMIN (Администратор)</SelectItem>}
                    {isOwner && <SelectItem value="OWNER">OWNER (Владелец)</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Staff Role Group */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Группа прав (RBAC)
                </label>
                <Select value={staffRoleId} onValueChange={(val) => { if (val) setStaffRoleId(val); }}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="По умолчанию" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">— Все права роли —</SelectItem>
                    {staffRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Password Section */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  Начальный пароль (опционально)
                </label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <Sparkles className="w-3 h-3" />
                  Сгенерировать
                </button>
              </div>
              <Input
                type="text"
                placeholder="Оставьте пустым для входа по Magic Link..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            {/* Allowed Tenants (OmniSMM Multi-tenant Brand Access) */}
            <div className="space-y-2 p-3 bg-muted/20 rounded-xl border border-border/60">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-primary" />
                Доступ к витринам (ст. 54.1 НК РФ, multi-tenant):
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={allowedTenants.includes('smmplan')}
                    onChange={() => toggleTenant('smmplan')}
                    className="w-4 h-4 rounded text-primary border-border focus:ring-primary cursor-pointer"
                  />
                  <span>SMMplan (smmplan.pro)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={allowedTenants.includes('flux')}
                    onChange={() => toggleTenant('flux')}
                    className="w-4 h-4 rounded text-primary border-border focus:ring-primary cursor-pointer"
                  />
                  <span>SMMflux (smmflux.ru)</span>
                </label>
              </div>
            </div>

            {/* Daily Support Budget */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Суточный лимит компенсаций саппорта (₽)
              </label>
              <Input
                type="number"
                min={0}
                max={100000}
                value={supportLimitRubles}
                onChange={(e) => setSupportLimitRubles(Number(e.target.value))}
                className="h-9 text-xs"
              />
            </div>
          </div>
        )}

        {!generatedLink && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-xs font-semibold"
            >
              Отмена
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreate}
              disabled={isSubmitting}
              className="text-xs font-bold gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {isSubmitting ? 'Сохранение...' : 'Создать сотрудника'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
