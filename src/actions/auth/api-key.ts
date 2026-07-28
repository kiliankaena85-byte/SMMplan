'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { hashPassword } from '@/lib/auth/password';
import { revalidatePath } from 'next/cache';
import { RateLimitService } from '@/services/core/rate-limit.service';

export async function generateApiKey() {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  const isAllowed = await RateLimitService.check(`generate-api-key:${session.userId}`, 5, 3600);
  if (!isAllowed) {
    return { success: false, error: 'Too many API keys generated recently. Please try again later.' };
  }

  // Generate a random hex key
  const newKey = 'smm_' + crypto.randomBytes(32).toString('hex');
  const hashedKey = await hashPassword(newKey);

  try {
    await db.user.update({
      where: { id: session.userId },
      data: { apiKeyHash: hashedKey }
    });

    revalidatePath('/dashboard/settings/api');
    return { success: true, apiKey: newKey };
  } catch (error) {
    console.error('Failed to generate API Key:', error);
    return { success: false, error: 'Failed to update API key' };
  }
}

export async function revokeApiKey() {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  const isAllowed = await RateLimitService.check(`revoke-api-key:${session.userId}`, 10, 3600);
  if (!isAllowed) {
    return { success: false, error: 'Too many requests.' };
  }

  try {
    await db.user.update({
      where: { id: session.userId },
      data: { apiKeyHash: null }
    });

    revalidatePath('/dashboard/settings/api');
    return { success: true };
  } catch (error) {
    console.error('Failed to revoke API Key:', error);
    return { success: false, error: 'Failed to update API key' };
  }
}
