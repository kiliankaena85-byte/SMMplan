import type { PiiScrubResult } from '@/types/ai-support';

export class PiiScrubberService {
  /**
   * Scans and scrubs personal identifiable information (PII) under Federal Law 152-FZ.
   * Completely redacts emails, phone numbers, payment card PANs, and auth tokens.
   */
  public static scrub(text: string, clientEmail?: string): PiiScrubResult {
    if (!text || typeof text !== 'string') {
      return { scrubbedText: '', tokensMap: {}, hasSensitiveData: false };
    }

    const tokensMap: Record<string, string> = {};
    let scrubbed = text;
    let hasSensitiveData = false;

    // 1. Client specific email
    if (clientEmail && clientEmail.trim()) {
      const cleanEmail = clientEmail.trim();
      if (scrubbed.toLowerCase().includes(cleanEmail.toLowerCase())) {
        hasSensitiveData = true;
        tokensMap['[CLIENT_EMAIL]'] = cleanEmail;
        const escaped = cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        scrubbed = scrubbed.replace(new RegExp(escaped, 'gi'), '[CLIENT_EMAIL]');
      }
    }

    // 2. Generic Email Addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    if (emailRegex.test(scrubbed)) {
      hasSensitiveData = true;
      scrubbed = scrubbed.replace(emailRegex, (match) => {
        const token = `[EMAIL_${Object.keys(tokensMap).length + 1}]`;
        tokensMap[token] = match;
        return '[EMAIL_MASKED]';
      });
    }

    // 3. Payment Card PANs (13 to 19 digits with optional spaces or dashes)
    const cardRegex = /\b(?:\d[ -]*?){13,19}\b/g;
    if (cardRegex.test(scrubbed)) {
      // Filter out small numbers or typical order ids by digit count
      scrubbed = scrubbed.replace(cardRegex, (match) => {
        const rawDigits = match.replace(/\D/g, '');
        if (rawDigits.length >= 13 && rawDigits.length <= 19) {
          hasSensitiveData = true;
          return '[CARD_MASKED]';
        }
        return match;
      });
    }

    // 4. Russian & International Phone Numbers (+7, 8, etc.)
    const phoneRegex = /(?:\+?7|8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}\b/g;
    if (phoneRegex.test(scrubbed)) {
      hasSensitiveData = true;
      scrubbed = scrubbed.replace(phoneRegex, '[PHONE_MASKED]');
    }

    // 5. Auth Tokens & JWT (Bearer tokens, eyJ...)
    const jwtRegex = /\bey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*\b/g;
    if (jwtRegex.test(scrubbed)) {
      hasSensitiveData = true;
      scrubbed = scrubbed.replace(jwtRegex, '[AUTH_TOKEN_MASKED]');
    }

    return {
      scrubbedText: scrubbed,
      tokensMap,
      hasSensitiveData,
    };
  }
}
