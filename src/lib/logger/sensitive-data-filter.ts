/**
 * (c) 2024-2026 SMMplan. All rights reserved.
 * Sensitive Data Redactor (Log Masking Filter).
 */

const SENSITIVE_PATTERNS = [
  /("?(?:apiKey|token|secret|password|twoFactorSecret|databaseUrl|redisUrl)"?\s*[:=]\s*)"([^"]+)"/gi,
  /("?(?:apiKey|token|secret|password|twoFactorSecret|databaseUrl|redisUrl)"?\s*[:=]\s*)'([^']+)'/gi,
  /(key=)([a-f0-9]{20,})/gi,
  /(Bearer\s+)([a-zA-Z0-9_.-]{20,})/gi,
  /(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, // postgresql://user:PASSWORD@host
  /(redis(?:s)?:\/\/[^:]+:)([^@]+)(@)/gi,     // redis://user:PASSWORD@host
  /(DATABASE_URL\s*=\s*)([^\s]+)/gi,
  /(REDIS_URL\s*=\s*)([^\s]+)/gi,
];

export function redactSensitiveTokens(logString: string): string {
  if (!logString || typeof logString !== 'string') return logString;

  let sanitized = logString;
  // 1. Redact key-value pairs and bearer tokens
  sanitized = sanitized.replace(/("?(?:apiKey|token|secret|password|twoFactorSecret|databaseUrl|redisUrl)"?\s*[:=]\s*)"([^"]+)"/gi, '$1"[REDACTED]"');
  sanitized = sanitized.replace(/("?(?:apiKey|token|secret|password|twoFactorSecret|databaseUrl|redisUrl)"?\s*[:=]\s*)'([^']+)'/gi, '$1"[REDACTED]"');
  sanitized = sanitized.replace(/(key=)([a-f0-9]{20,})/gi, '$1"[REDACTED]"');
  sanitized = sanitized.replace(/(Bearer\s+)([a-zA-Z0-9_.-]{20,})/gi, '$1"[REDACTED]"');
  sanitized = sanitized.replace(/(DATABASE_URL\s*=\s*)([^\s]+)/gi, '$1"[REDACTED]"');
  sanitized = sanitized.replace(/(REDIS_URL\s*=\s*)([^\s]+)/gi, '$1"[REDACTED]"');

  // 2. Redact passwords in connection URIs (e.g. postgresql://user:password@host)
  sanitized = sanitized.replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi, '$1*****$3');
  sanitized = sanitized.replace(/(redis(?:s)?:\/\/[^:]+:)([^@]+)(@)/gi, '$1*****$3');

  return sanitized;
}

export function sanitizeLogObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  try {
    const str = JSON.stringify(obj);
    const sanitized = redactSensitiveTokens(str);
    return JSON.parse(sanitized) as T;
  } catch {
    return obj;
  }
}

