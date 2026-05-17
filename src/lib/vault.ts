import crypto from 'crypto';

/**
 * VaultService: Unified encryption handler for sensitive application data.
 * Replaces legacy EncryptionService and CryptoService.
 * Uses AES-256-GCM for authenticated encryption.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Validates and retrieves the encryption key from environment variables.
 * Key must be a 64-character hex string (representing 32 bytes).
 */
function getEncryptionKey(): Buffer {
  const hexKey = process.env.APP_ENCRYPTION_KEY;
  if (!hexKey) {
    throw new Error('APP_ENCRYPTION_KEY is not defined in environment variables.');
  }

  // Strict check: must be a 64-character hex string
  if (hexKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(hexKey)) {
    throw new Error('APP_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes) for AES-256-GCM.');
  }

  return Buffer.from(hexKey, 'hex');
}

export class VaultService {
  /**
   * Encrypts a plain text string into a combined format: iv:authTag:encryptedText
   */
  static encrypt(text: string): string {
    if (!text) return text;
    
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encryptedText
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts a combined format string (iv:authTag:encryptedText) back into plain text.
   * Gracefully handles legacy unencrypted data or invalid formats by returning the original string.
   */
  static decrypt(encryptedPayload: string | null | undefined): string {
    if (!encryptedPayload) return '';
    
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) {
      // Legacy unencrypted data or invalid format - return as-is
      return encryptedPayload;
    }
    
    try {
      const [ivHex, authTagHex, encryptedText] = parts;
      
      const key = getEncryptionKey();
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      // W0-5 SECURITY FIX: Throw instead of silent fallback.
      // Silent return was masking APP_ENCRYPTION_KEY rotation failures:
      // encrypted blob would be used as API key, causing all providers to silently fail.
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`[VaultService] Decryption failed — possible key rotation or data corruption: ${msg}`);
    }
  }

  /**
   * Simple hashing for non-reversible sensitive data (e.g. for search indexing if needed)
   */
  static hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}
