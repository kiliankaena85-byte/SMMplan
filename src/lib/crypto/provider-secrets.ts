/**
 * (c) 2024-2026 SMMplan. All rights reserved.
 * Provider API Key Encryption at Rest (AES-256-GCM).
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

const getProviderEncryptionKey = (): Buffer => {
  const keyStr = process.env.PROVIDER_KEYS_ENCRYPTION_KEY || process.env.VAULT_MASTER_KEY || 'smmplan_provider_vault_key_2026_secure';
  return createHash('sha256').update(keyStr).digest();
};

/**
 * Encrypts provider API key using AES-256-GCM.
 * Format: iv:authTag:cipherHex
 */
export function encryptProviderSecret(plainSecret: string): string {
  if (!plainSecret || typeof plainSecret !== 'string') return plainSecret;

  const iv = randomBytes(IV_LENGTH);
  const key = getProviderEncryptionKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainSecret.trim(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts provider API key from AES-256-GCM.
 */
export function decryptProviderSecret(cipherText: string): string {
  if (!cipherText || typeof cipherText !== 'string') return cipherText;

  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    // If plaintext legacy key, return as is
    return cipherText;
  }

  try {
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const key = getProviderEncryptionKey();
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('[ProviderSecrets] Decryption failed, falling back to raw value:', err);
    return cipherText;
  }
}

/**
 * Masks provider API key for safe UI and logs display.
 */
export function maskProviderKey(key: string): string {
  if (!key || key.length < 8) return '••••••••';
  const clean = key.includes(':') ? decryptProviderSecret(key) : key;
  if (clean.length <= 8) return '••••••••';
  return `••••••••${clean.slice(-4)}`;
}
