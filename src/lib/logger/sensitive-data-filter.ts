/**
 * (c) 2024-2026 SMMplan. All rights reserved.
 * Sensitive Data Redactor (Log Masking Filter).
 */

const SENSITIVE_PATTERNS = [
  /("?(?:apiKey|token|secret|password|twoFactorSecret)"?\s*[:=]\s*)"([^"]+)"/gi,
  /("?(?:apiKey|token|secret|password|twoFactorSecret)"?\s*[:=]\s*)'([^']+)'/gi,
  /(key=)([a-f0-9]{20,})/gi,
  /(Bearer\s+)([a-zA-Z0-9_.-]{20,})/gi,
];

export function redactSensitiveTokens(logString: string): string {
  if (!logString || typeof logString !== 'string') return logString;

  let sanitized = logString;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '$1"[REDACTED]"');
  }
  return sanitized;
}
