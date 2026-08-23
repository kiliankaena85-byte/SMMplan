/**
 * (c) 2024-2026 SMMplan. All rights reserved.
 * GDPR & 152-FZ Encryption at Rest (AES-256-GCM & Search Hashing).
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const DEFAULT_SALT = 'smmplan_privacy_salt_2026_default_secure_vault';

const getKey = (): Buffer => {
  const keyStr = process.env.DATA_ENCRYPTION_KEY || process.env.VAULT_MASTER_KEY || 'smmplan_default_32_bytes_data_key_2026';
  // Ensure exactly 32 bytes (256 bits)
  return createHash('sha256').update(keyStr).digest();
};

const getSalt = (): string => {
  return process.env.DATA_SALT || DEFAULT_SALT;
};

/**
 * Encrypts plaintext string using AES-256-GCM with random IV.
 * Output format: iv:authTag:cipherHex
 */
export function encrypt(text: string): string {
  if (!text || typeof text !== 'string') return text;

  const iv = randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM ciphertext in iv:authTag:cipherHex format.
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData || typeof encryptedData !== 'string') return encryptedData;

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    // If not in encrypted format, return as is (fallback for unencrypted legacy fields)
    return encryptedData;
  }

  try {
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const key = getKey();
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('[Encryption] Decryption failed:', err);
    return encryptedData;
  }
}

/**
 * Computes deterministic HMAC/SHA-256 search hash for indexing and unique constraints.
 */
export function hashForSearch(value: string): string {
  if (!value || typeof value !== 'string') return '';
  const normalized = value.trim().toLowerCase();
  return createHash('sha256').update(`${normalized}:${getSalt()}`).digest('hex');
}

/**
 * Masks an email for safe logs/UI (e.g. j***n@example.com).
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '••••••••';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 5))}${local.slice(-1)}@${domain}`;
}
