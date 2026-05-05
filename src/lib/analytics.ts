export function trackEvent(eventName: string, params?: Record<string, any>) {
  try {
    if (typeof window !== "undefined") {
      // Check if Yandex Metrika is available
      // @ts-ignore
      if (window.ym) {
        // @ts-ignore
        window.ym(96000000, "reachGoal", eventName, params);
      }
      
      // Check if Google Analytics (gtag) is available
      // @ts-ignore
      if (window.gtag) {
        // @ts-ignore
        window.gtag("event", eventName, params);
      }

      // Also fallback to dataLayer
      // @ts-ignore
      if (window.dataLayer) {
        // @ts-ignore
        window.dataLayer.push({
          event: eventName,
          ...params
        });
      }
      
      if (process.env.NODE_ENV === "development") {
        console.log(`[Analytics Track]: ${eventName}`, params);
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Analytics error:", e);
    }
  }
}
