'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Spinner, Button } from '@heroui/react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export default function PaymentRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('id');

  const [status, setStatus] = useState<'polling' | 'redirecting' | 'error'>('polling');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!paymentId) {
      setStatus('error');
      setErrorMessage('Неверная ссылка на оплату. Отсутствует идентификатор платежа.');
      return;
    }

    let isMounted = true;
    let pollCount = 0;
    const MAX_POLLS = 20; // 20 * 1500ms = 30 seconds timeout
    let timeoutId: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/payments/${paymentId}/status`);
        
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error('У вас нет доступа к этому платежу.');
          }
          throw new Error('Ошибка сервера при проверке статуса платежа.');
        }

        const data = await res.json();

        if (!isMounted) return;

        if (data.status === 'ERROR' || data.status === 'CANCELED') {
          setStatus('error');
          setErrorMessage('К сожалению, произошла ошибка на стороне платежного шлюза. Пожалуйста, попробуйте выбрать другой способ оплаты.');
          return;
        }

        if (data.checkoutUrl) {
          setStatus('redirecting');
          // Short delay for UX smoothness
          setTimeout(() => {
            if (isMounted) {
              window.location.href = data.checkoutUrl;
            }
          }, 800);
          return;
        }

        // Still pending
        pollCount++;
        if (pollCount >= MAX_POLLS) {
          setStatus('error');
          setErrorMessage('Превышено время ожидания ответа от платежной системы. Платеж отменен.');
          return;
        }

        // Continue polling
        timeoutId = setTimeout(pollStatus, 1500);
      } catch (err: any) {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage(err.message || 'Произошла непредвиденная ошибка соединения.');
      }
    };

    pollStatus();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [paymentId]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 flex flex-col items-center text-center shadow-lg border border-divider">
        {status === 'polling' && (
          <>
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
              <Spinner size="lg" color="current" className="text-primary" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Устанавливаем безопасное соединение...</h1>
            <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-success" />
              Генерируем уникальную ссылку для оплаты
            </p>
          </>
        )}

        {status === 'redirecting' && (
          <>
            <div className="mb-6 w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Соединение установлено!</h1>
            <p className="text-muted-foreground text-sm">
              Перенаправляем вас на страницу банка...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-6 w-16 h-16 bg-danger/20 text-danger rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-semibold text-danger mb-2">Ошибка создания платежа</h1>
            <p className="text-muted-foreground text-sm mb-6">
              {errorMessage}
            </p>
            <Button
              variant="secondary"
              onPress={() => router.back()}
              className="w-full font-medium"
            >
              Вернуться назад
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
