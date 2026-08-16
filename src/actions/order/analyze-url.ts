"use server";

import { IntelligenceLinkAnalyzer } from "@/services/analyzer/link-analyzer";
import { RateLimitService } from '@/services/core/rate-limit.service';
import { safeUrlForLog } from "@/lib/log-safe";


import { IntelligenceAnalysisResult } from "@/services/analyzer/link-analyzer";

const analyzeCache = new Map<string, { data: IntelligenceAnalysisResult; expiresAt: number }>();

function isUrlSafeForFetch(urlString: string): boolean {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) return false;
  
  const hostname = parsedUrl.hostname.toLowerCase();
  // Block metadata endpoints
  if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal' || hostname.endsWith('.metadata.internal')) {
    return false;
  }
  // Block local/loopback
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;
  // Block private IP ranges (simplified regex check)
  if (/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|0\.)/.test(hostname)) return false;
  
  return true;
}

export async function analyzeUrl(url: string): Promise<{ success: boolean; data?: IntelligenceAnalysisResult; error?: string }> {
  try {
    if (!url || typeof url !== 'string' || url.length > 2048) {
      return { success: false, error: "URL exceeds maximum length of 2048 characters." };
    }

    if (!isUrlSafeForFetch(url)) {
      return { success: false, error: "This URL format is not supported for analysis." };
    }

    const { assertSafeUrl } = await import('@/utils/ssrf-guard');
    try {
      await assertSafeUrl(url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      return { success: false, error: e.message || "This URL format is not supported for analysis." };
    }

    const { getClientIp } = await import('@/utils/ip');
    const ip = await getClientIp();

    const isAllowed = await RateLimitService.checkCustomKey(`analyzeUrl:${ip}`, 15, 60, true);
    if (!isAllowed) {
       return { success: false, error: "Too many URL analysis requests." };
    }

    const cached = analyzeCache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
      return { success: true, data: cached.data };
    }

    const analyzer = new IntelligenceLinkAnalyzer();
    const result = await analyzer.analyze(url);
    
    if (!result) {
        return { success: false, error: "Failed to recognize link" };
    }

    analyzeCache.set(url, { data: result, expiresAt: Date.now() + 60000 });

    return { success: true, data: result };
  } catch (error) {
    console.error(`Link analysis failed for ${safeUrlForLog(url)}:`, error);
    return { success: false, error: "Failed to analyze URL" };
  }
}
