import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { POST } from '@/app/api/v2/route';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

describe('Security & Concurrency (Race Conditions)', () => {
  let user: any;
  let service: any;

  beforeEach(async () => {
    const apiKey = `RACE_SECRET_${Date.now()}_${Math.random()}`;
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    // 1. Seed user with precisely enough balance for ONLY 1 order
    user = await db.user.create({
      data: {
        email: 'race.user@test.com',
        apiKeyHash: hashedKey,
        balance: 30000, // 300 RUB
      }
    });
    // Add raw api key property just for tests 
    user.apiKey = apiKey;

    const category = await db.category.create({
      data: { name: 'Race Test Services' }
    });

    // 2. Seed a service with fixed cost
    service = await db.service.create({
      data: {
        name: 'API Service Race',
        categoryId: category.id,
        rate: 100 / 95, 
        markup: 3.0, // Total cost per 1k should be 300 RUB = 30000 cents
        minQty: 10,
        maxQty: 10000,
        isActive: true,
        numericId: 999
      }
    });

    // Disable rate limiting for this user to allow parallel execution test
    await db.rateLimit.deleteMany();
  });

  const makeRequest = async (payload: Record<string, string>) => {
    const searchParams = new URLSearchParams(payload);
    const req = new NextRequest('http://localhost/api/v2', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: searchParams
    });
    return POST(req);
  };

  it('Prevents balance dropping below zero on parallel B2B requests (Double Spend Attack)', async () => {
    // Launch 10 simultaneous requests to buy a 1k item.
    // The user ONLY has enough balance for 1 item (30000 cents).
    
    // Create an array of 50 promises running exactly at the same time
    const promises = Array.from({ length: 50 }).map(() => makeRequest({ 
      key: user.apiKey, 
      action: 'add',
      service: '999',
      link: 'https://example.com/race',
      quantity: '1000' 
    }));

    const responses = await Promise.all(promises);

    let successCount = 0;
    let failCount = 0;

    for (const res of responses) {
      if (res.status === 200) {
        successCount++;
      } else {
        failCount++;
      }
    }

    // Only 1 transaction should have succeeded, the rest should fail with INSUFFICIENT_FUNDS
    expect(successCount).toBe(1);
    expect(failCount).toBe(49);

    // Verify DB
    const checkDbUser = await db.user.findUnique({ where: { id: user.id } });
    expect(checkDbUser!.balance).toBe(0n); // 30000 - 30000
    
    // Only 1 order should have been created
    const orders = await db.order.count({ where: { userId: user.id } });
    expect(orders).toBe(1);
  });
});
