'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { generateApiKeyAction, resetApiKeyAction, revokeApiKeyAction } from '@/actions/user/settings-extra';
import { toast } from 'sonner';
import { ApiKeyActiveDisplay } from './components/ApiKeyActiveDisplay';
import { ApiKeyActionButtons } from './components/ApiKeyActionButtons';

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

  const handleGenerate = () => {
    setError('');
    setNewKey(null);
    if (onKeyGenerated) onKeyGenerated(null);

    startTransition(async () => {
      const res = await (newKey ? resetApiKeyAction() : generateApiKeyAction());
      if (!res.success) {
        const errMsg = res.error || 'Ошибка при генерации ключа';
        setError(errMsg);
        toast.error(errMsg);
      } else {
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
    </div>
  );
}
