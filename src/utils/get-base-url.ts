import { headers } from "next/headers";

export async function getBaseUrlAsync(reqHost?: string | null, reqProto?: string | null): Promise<string> {
  // Use WEBAPP_URL or APP_URL which are not prefixed with NEXT_PUBLIC_
  // This ensures they are read at RUNTIME from the server's .env file, not baked in locally.
  const envUrl = process.env.WEBAPP_URL || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;

  // 1. If we have a valid public URL in env, use it.
  if (envUrl && !envUrl.includes("0.0.0.0") && !envUrl.includes("127.0.0.1")) {
    return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
  }

  // 2. Fallback to Host header
  try {
    const headersList = await headers();
    let host = headersList.get("x-forwarded-host") || headersList.get("host");
    const proto = headersList.get("x-forwarded-proto") || "https";

    if (host) {
      if (host.includes("0.0.0.0")) host = host.replace("0.0.0.0", "localhost");
      return `${proto}://${host}`;
    }
  } catch {
    // We are outside of a Next.js request context (e.g. background worker)
  }

  // 3. Fallback to provided reqHost
  if (reqHost) {
    let host = reqHost;
    if (host.includes("0.0.0.0")) host = host.replace("0.0.0.0", "localhost");
    const proto = reqProto || "https";
    return `${proto}://${host}`;
  }

  // 4. Absolute fallback
  return "https://smmplan.pro";
}

/**
 * Synchronous version for when we already have the host/proto, 
 * or for places that cannot use async headers().
 */
export function getBaseUrlSync(reqHost?: string | null, reqProto?: string | null): string {
  const envUrl = process.env.WEBAPP_URL || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (envUrl && !envUrl.includes("0.0.0.0") && !envUrl.includes("127.0.0.1")) {
    return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
  }

  if (reqHost) {
    let host = reqHost;
    if (host.includes("0.0.0.0")) host = host.replace("0.0.0.0", "localhost");
    const proto = reqProto || "https";
    return `${proto}://${host}`;
  }

  return "https://smmplan.pro";
}
