import { headers } from "next/headers";

export async function getBaseUrlAsync(reqHost?: string | null, reqProto?: string | null): Promise<string> {
  const envUrl = process.env.WEBAPP_URL || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;

  // 1. Fallback to Host header if inside a request context
  try {
    const headersList = await headers();
    let host = headersList.get("x-forwarded-host") || headersList.get("host");
    const proto = headersList.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");

    if (host) {
      if (host.includes("0.0.0.0")) host = host.replace("0.0.0.0", "localhost");
      return `${proto}://${host}`;
    }
  } catch {
    // We are outside of a Next.js request context (e.g. background worker)
  }

  // 2. If we have a valid URL in env, use it.
  if (envUrl) {
    return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
  }

  // 3. Fallback to provided reqHost
  if (reqHost) {
    let host = reqHost;
    if (host.includes("0.0.0.0")) host = host.replace("0.0.0.0", "localhost");
    const proto = reqProto || (process.env.NODE_ENV === "production" ? "https" : "http");
    return `${proto}://${host}`;
  }

  // 4. Absolute fallback
  return process.env.NODE_ENV === "production" ? "https://smmplan.pro" : "http://localhost:3000";
}

/**
 * Synchronous version for when we already have the host/proto, 
 * or for places that cannot use async headers().
 */
export function getBaseUrlSync(reqHost?: string | null, reqProto?: string | null): string {
  const envUrl = process.env.WEBAPP_URL || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (reqHost) {
    let host = reqHost;
    if (host.includes("0.0.0.0")) host = host.replace("0.0.0.0", "localhost");
    const proto = reqProto || (process.env.NODE_ENV === "production" ? "https" : "http");
    return `${proto}://${host}`;
  }

  if (envUrl) {
    return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
  }

  return process.env.NODE_ENV === "production" ? "https://smmplan.pro" : "http://localhost:3000";
}
