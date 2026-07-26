"use server";

import { IntelligenceLinkAnalyzer } from "@/services/analyzer/link-analyzer";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
import { RateLimitService } from '@/services/core/rate-limit.service';


import { IntelligenceAnalysisResult } from "@/services/analyzer/link-analyzer";

const analyzeCache = new Map<string, { data: IntelligenceAnalysisResult; expiresAt: number }>();

export async function analyzeUrl(url: string): Promise<{ success: boolean; data?: IntelligenceAnalysisResult; error?: string }> {
  try {
    if (!url || typeof url !== 'string' || url.length > 2048) {
      return { success: false, error: "URL exceeds maximum length of 2048 characters." };
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
    console.error("Link analysis failed:", error);
    return { success: false, error: "Failed to analyze URL" };
  }
}
