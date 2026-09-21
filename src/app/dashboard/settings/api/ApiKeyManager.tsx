'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { generateApiKeyAction, resetApiKeyAction, revokeApiKeyAction } from '@/actions/user/settings-extra';
import { toast } from 'sonner';
import { ApiKeyActiveDisplay } from './components/ApiKeyActiveDisplay';
import { ApiKeyActionButtons } from './components/ApiKeyActionButtons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Key } from 'lucide-react';

export interface ApiKeyManagerProps {
  hasKey: boolean;
  onKeyGenerated?: (key: string | null) => void;
}

export default function ApiKeyManager({
  hasKey,
  onKeyGenerated,
}: ApiKeyManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [isRevoked, setIsRevoked] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const executeGenerate = (pwd?: string) => {
    setError('');
    setPasswordError('');
    if (onKeyGenerated) onKeyGenerated(null);

    startTransition(async () => {
      const res = await (newKey ? resetApiKeyAction(pwd) : generateApiKeyAction(pwd));
      if (!res.success) {
        if (res.requiresPassword) {
          setPasswordModalOpen(true);
          if (pwd) {
            setPasswordError(res.error || 'Неверный пароль');
          }
          return;
        }
        const errMsg = res.error || 'Ошибка при генерации ключа';
        setError(errMsg);
        toast.error(errMsg);
      } else {
        setPasswordModalOpen(false);
        setPasswordInput('');
        setPasswordError('');
        setIsRevoked(false);
        setNewKey(res.apiKey || null);
        toast.success('API-ключ успешно сгенерирован!');
        if (onKeyGenerated && res.apiKey) {
          onKeyGenerated(res.apiKey);
        }
        router.refresh();
      }
    });
  };

  const handleGenerate = () => {
    executeGenerate();
  };

  const handleRevoke = () => {
    if (!confirmRevoke) {
      setConfirmRevoke(true);
      setTimeout(() => setConfirmRevoke(false), 5000);
      return;
    }
    setConfirmRevoke(false);
    setError('');
    if (onKeyGenerated) onKeyGenerated(null);

    startTransition(async () => {
      const res = await revokeApiKeyAction();
      if (!res.success) {
        const errMsg = res.error || 'Ошибка при отзыве ключа';
        setError(errMsg);
        toast.error(errMsg);
      } else {
        setIsRevoked(true);
        setNewKey(null);
        toast.success('API-ключ успешно отозван');
        router.refresh();
      }
    });
  };

  const copyKey = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      toast.success('API-ключ скопирован в буфер обмена');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Не удалось скопировать ключ');
    }
  };

  const hasKeyOrNew = (!isRevoked && hasKey) || !!newKey;

  return (
    <div className="space-y-5">
      {hasKeyOrNew && (
        <ApiKeyActiveDisplay
          newKey={newKey}
          copied={copied}
          onCopyKey={copyKey}
        />
      )}

      <ApiKeyActionButtons
        hasKeyOrNew={hasKeyOrNew}
        isPending={isPending}
        confirmRevoke={confirmRevoke}
        onGenerate={handleGenerate}
        onRevoke={handleRevoke}
      />

      {error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 animate-in slide-in-from-top-1">
          {error}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground pt-1">
        Никогда не передавайте API-ключ третьим лицам. При компрометации немедленно отзовите его.
      </p>

      <Dialog open={passwordModalOpen} onOpenChange={(open) => {
        if (!open) {
          setPasswordModalOpen(false);
          setPasswordInput('');
          setPasswordError('');
        }
      }}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-border bg-background shadow-2xl p-6">
          <DialogHeader className="pb-3 border-b border-border/50">
            <DialogTitle className="text-foreground font-black text-base flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <span>Подтверждение пароля</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Для создания или смены API-ключа требуется подтвердить пароль от вашего аккаунта (Sudo-режим).
            </p>
            <Input
              type="password"
              placeholder="Введите текущий пароль"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && passwordInput.trim() && !isPending) {
                  executeGenerate(passwordInput);
                }
              }}
              className="rounded-xl text-xs h-10"
              autoFocus
            />
            {passwordError && (
              <p className="text-xs text-destructive font-medium">{passwordError}</p>
            )}
          </div>

          <DialogFooter className="mt-2 pt-3 border-t border-border/50 flex justify-end gap-2">
            <Button
              intent="outline"
              size="sm"
              onClick={() => {
                setPasswordModalOpen(false);
                setPasswordInput('');
                setPasswordError('');
              }}
              disabled={isPending}
              className="rounded-xl text-xs h-9"
            >
              Отмена
            </Button>
            <Button
              intent="primary"
              size="sm"
              onClick={() => executeGenerate(passwordInput)}
              disabled={isPending || !passwordInput.trim()}
              className="rounded-xl text-xs h-9 font-semibold"
            >
              {isPending ? 'Проверка...' : 'Подтвердить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
