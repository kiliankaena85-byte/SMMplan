import { useState, useEffect, useMemo } from 'react';
import { validateUrl } from '@/lib/validators/urlValidator';
import { detectPlatformFromUrl } from '@/lib/utils/detectPlatformFromUrl';
import { IntelligencePlatform } from '@/services/analyzer/link-rules';

export function useUrlValidation(url: string, platformId: string) {
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean>(false);
  const [platformDetected, setPlatformDetected] = useState<IntelligencePlatform | null>(null);

  // Auto-detect platform when URL changes
  useEffect(() => {
    if (!url) {
      setPlatformDetected(null);
      return;
    }
    const detected = detectPlatformFromUrl(url);
    if (detected) {
      setPlatformDetected(detected);
    }
  }, [url]);

  // Validate URL with debounce
  useEffect(() => {
    if (!url) {
      setIsValid(false);
      setError(null);
      return;
    }

    const timer = setTimeout(() => {
      // Validate against either the currently selected platform or the detected one
      const platformToValidate = platformId || platformDetected;
      const result = validateUrl(url, platformToValidate);
      
      setIsValid(result.success);
      setError(result.error);
    }, 300);

    return () => clearTimeout(timer);
  }, [url, platformId, platformDetected]);

  return {
    isValid,
    error,
    platformDetected
  };
}
