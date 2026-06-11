import { useEffect } from 'react';
import { Message } from './useChatMessages';

export function useChatSSE({
  ticketId,
  isClosed,
  addNewMessages,
  lastCheckedRef,
}: {
  ticketId: string;
  isClosed: boolean;
  addNewMessages: (msgs: Message[]) => void;
  lastCheckedRef: React.MutableRefObject<string>;
}) {
  useEffect(() => {
    if (isClosed) return;

    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let failCount = 0;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    const MAX_FAILURES = 3;
    const MAX_BACKOFF_MS = 16000;

    const startPollingFallback = () => {
      if (fallbackInterval) return;
      fallbackInterval = setInterval(async () => {
        if (document.hidden) return;
        try {
          const res = await fetch(
            `/api/support/messages?ticketId=${ticketId}&after=${encodeURIComponent(
              lastCheckedRef.current
            )}`
          );
          if (!res.ok) return;
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            addNewMessages(data.messages);
            lastCheckedRef.current = data.messages[data.messages.length - 1].createdAt;
          }
        } catch {
          /* silent */
        }
      }, 5000);
    };

    const connectSSE = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      try {
        eventSource = new EventSource(`/api/support/chat/stream?ticketId=${ticketId}`);

        eventSource.onopen = () => {
          failCount = 0; // Reset on successful connection
          // Stop fallback polling if SSE recovered
          if (fallbackInterval) {
            clearInterval(fallbackInterval);
            fallbackInterval = null;
          }
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'connected') return; // Initial handshake
            if (data.id && data.text !== undefined) {
              addNewMessages([data as Message]);
              lastCheckedRef.current = data.createdAt || new Date().toISOString();
            }
          } catch {
            /* malformed SSE data, ignore */
          }
        };

        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
          failCount++;

          if (failCount >= MAX_FAILURES) {
            // Degrade gracefully to polling
            startPollingFallback();
            return;
          }

          // Exponential backoff: 1s, 2s, 4s, 8s, 16s cap
          const backoffMs = Math.min(1000 * Math.pow(2, failCount - 1), MAX_BACKOFF_MS);
          reconnectTimer = setTimeout(connectSSE, backoffMs);
        };
      } catch {
        // EventSource constructor failed (e.g. blocked by CSP)
        startPollingFallback();
      }
    };

    connectSSE();

    return () => {
      eventSource?.close();
      eventSource = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [ticketId, isClosed, addNewMessages, lastCheckedRef]);
}
