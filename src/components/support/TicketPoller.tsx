'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function TicketPoller({ ticketId, isClosed }: { ticketId: string; isClosed: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (isClosed) return;

    // Fast polling for better UX, could be tuned based on last message time
    const interval = setInterval(() => {
      // In Next.js App Router, router.refresh() re-fetches Server Components.
      // This is the simplest way to get new messages without complex state management.
      router.refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [ticketId, isClosed, router]);

  return null;
}
