// Augment the Window interface for third-party analytics SDKs
declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  try {
    if (typeof window !== "undefined") {
      // Check if Yandex Metrika is available
      if (window.ym) {
        window.ym(96000000, "reachGoal", eventName, params);
      }
      
      // Check if Google Analytics (gtag) is available
      if (window.gtag) {
        window.gtag("event", eventName, params);
      }

      // Also fallback to dataLayer
      if (window.dataLayer) {
        window.dataLayer.push({
          event: eventName,
          ...params
        });
      }
      
      if (process.env.NODE_ENV === "development") {
        console.info(`[Analytics Track]: ${eventName}`, params);
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Analytics error:", e);
    }
  }
}
