import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

/**
 * Хэширует пароль с использованием встроенного алгоритма Node.js scrypt и уникальной соли.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Проверяет соответствие пароля хэшу.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const [salt, key] = hash.split(':');
    if (!salt || !key) return false;
    
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    const keyBuffer = Buffer.from(key, 'hex');
    
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch (e) {
    console.error('[VerifyPassword] Hashing match check failed:', e);
    return false;
  }
}
