'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { getTelegramBindDetailsAction } from '@/actions/user/settings-extra';

export interface UseTelegramBindReturn {
  isModalOpen: boolean;
  deepLink: string;
  botUsername: string;
  copied: boolean;
  isLoadingDeepLink: boolean;
  openBindModal: () => Promise<void>;
  closeBindModal: () => void;
  fetchNewBindLink: () => Promise<void>;
  copyLink: () => Promise<void>;
}

export function useTelegramBind(initialBotUsername = 'SMMplansapport_bot'): UseTelegramBindReturn {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deepLink, setDeepLink] = useState('');
  const [botUsername, setBotUsername] = useState(initialBotUsername);
  const [copied, setCopied] = useState(false);
  const [isLoadingDeepLink, setIsLoadingDeepLink] = useState(false);

  const fetchNewBindLink = async () => {
    setIsLoadingDeepLink(true);
    try {
      const res = await getTelegramBindDetailsAction();
      if (res.success && res.deepLink) {
        setDeepLink(res.deepLink);
        if (res.botUsername) {
          setBotUsername(res.botUsername);
        }
      } else {
        toast.error(res.error || 'Не удалось сгенерировать ссылку привязки');
      }
    } catch {
      toast.error('Ошибка при обращении к серверу');
    } finally {
      setIsLoadingDeepLink(false);
    }
  };

  const openBindModal = async () => {
    setIsModalOpen(true);
    if (!deepLink) {
      await fetchNewBindLink();
    }
  };

  const closeBindModal = () => {
    setIsModalOpen(false);
  };

  const copyLink = async () => {
    if (!deepLink) return;
    try {
      await navigator.clipboard.writeText(deepLink);
      setCopied(true);
      toast.success('Ссылка привязки скопирована в буфер обмена');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Не удалось скопировать ссылку');
    }
  };

  return {
    isModalOpen,
    deepLink,
    botUsername,
    copied,
    isLoadingDeepLink,
    openBindModal,
    closeBindModal,
    fetchNewBindLink,
    copyLink,
  };
}
