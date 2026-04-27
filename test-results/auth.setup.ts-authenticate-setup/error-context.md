# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.setup.ts >> authenticate
- Location: e2e\auth.setup.ts:11:6

# Error details

```
PrismaClientKnownRequestError: 
Invalid `prisma.user.create()` invocation in
D:\SMM_plan_2\e2e\auth.setup.ts:19:34

  16 const uniqueId = randomUUID();
  17 const email = `e2e-${uniqueId}@test.com`;
  18 
→ 19 const user = await prisma.user.create(
The column `User.staffRoleId` does not exist in the current database.
```

# Test source

```ts
  1  | import { test as setup, expect } from '@playwright/test';
  2  | import { SignJWT } from 'jose';
  3  | import fs from 'fs';
  4  | import path from 'path';
  5  | import { randomUUID } from 'crypto';
  6  | import { PrismaClient } from '@prisma/client';
  7  | 
  8  | const prisma = new PrismaClient();
  9  | const authFile = path.join(__dirname, 'playwright/.auth/user.json');
  10 | 
  11 | setup('authenticate', async ({ page, context }) => {
  12 |   // 1. Generate fake JWT that matches `session.ts` logic
  13 |   const secretKey = 'fallback-secret-for-dev-only-v2';
  14 |   const encodedKey = new TextEncoder().encode(secretKey);
  15 |   
  16 |   const uniqueId = randomUUID();
  17 |   const email = `e2e-${uniqueId}@test.com`;
  18 | 
> 19 |   const user = await prisma.user.create({
     |                                  ^ PrismaClientKnownRequestError: 
  20 |     data: {
  21 |       email,
  22 |       balance: 100000_00, // 1M RUB
  23 |     }
  24 |   });
  25 | 
  26 |   const session = await prisma.session.create({
  27 |     data: {
  28 |       userId: user.id,
  29 |       expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  30 |     }
  31 |   });
  32 | 
  33 |   const sessionToken = await new SignJWT({ sessionId: session.id, userId: user.id })
  34 |     .setProtectedHeader({ alg: 'HS256' })
  35 |     .setIssuedAt()
  36 |     .setExpirationTime('7d')
  37 |     .sign(encodedKey);
  38 | 
  39 |   // 2. We inject it as a cookie for localhost
  40 |   await context.addCookies([
  41 |     {
  42 |       name: 'session_token',
  43 |       value: sessionToken,
  44 |       domain: 'localhost',
  45 |       path: '/',
  46 |       httpOnly: true,
  47 |       secure: false, // http running locally
  48 |       sameSite: 'Lax',
  49 |     }
  50 |   ]);
  51 | 
  52 |   // 3. Save storage state for remaining tests
  53 |   await context.storageState({ path: authFile });
  54 | });
  55 | 
```