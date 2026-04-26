import { test as setup, expect } from '@playwright/test';
import { SignJWT } from 'jose';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const authFile = path.join(__dirname, 'playwright/.auth/user.json');

setup('authenticate', async ({ page, context }) => {
  // 1. Generate fake JWT that matches `session.ts` logic
  const secretKey = 'fallback-secret-for-dev-only-v2';
  const encodedKey = new TextEncoder().encode(secretKey);
  
  const uniqueId = randomUUID();
  const email = `e2e-${uniqueId}@test.com`;

  const user = await prisma.user.create({
    data: {
      email,
      balance: 100000_00, // 1M RUB
    }
  });

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  const sessionToken = await new SignJWT({ sessionId: session.id, userId: user.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey);

  // 2. We inject it as a cookie for localhost
  await context.addCookies([
    {
      name: 'session_token',
      value: sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false, // http running locally
      sameSite: 'Lax',
    }
  ]);

  // 3. Save storage state for remaining tests
  await context.storageState({ path: authFile });
});
