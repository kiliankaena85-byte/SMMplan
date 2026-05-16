'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

export async function generateApiKey() {
  const session = await verifySession();
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  // Generate a random hex key
  const newKey = 'smm_' + crypto.randomBytes(32).toString('hex');
  const hashedKey = crypto.createHash('sha256').update(newKey).digest('hex');

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
