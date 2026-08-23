import { db } from './db';
import { User } from '@prisma/client';

import crypto from 'crypto';

export async function verifyB2BKey(key?: string | null): Promise<User | null> {
  if (!key || key.length < 10) return null;

  try {
    const hashedKey = crypto.createHash('sha256').update(key).digest('hex');
    const user = await db.user.findFirst({
      where: { 
        apiKeyHash: hashedKey,
        isActive: true,
        isDeleted: false,
        role: { not: 'BANNED' }
      }
    });

    return user;
  } catch (error) {
    console.error('B2B Auth Error:', error);
    return null;
  }
}
