export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyB2BKey } from '@/lib/b2b-auth';
import { marketingService } from '@/services/marketing.service';
import { orderService } from '@/services/core/order.service';
import { RateLimitService } from '@/services/core/rate-limit.service';
import { z } from 'zod';
import { type User } from '@prisma/client';

// Standard SMM Panel API v2 Implementation
// https://panel.com/api/v2

// Maps internal statuses to standard API representation
function mapInternalStatus(internal: string): string {
  const statusMap: Record<string, string> = {
    'AWAITING_PAYMENT': 'Pending',
    'PENDING': 'Pending',
    'IN_PROGRESS': 'In progress',
    'COMPLETED': 'Completed',
    'PARTIAL': 'Partial',
    'CANCELED': 'Canceled',
    'ERROR': 'Canceled'
  };
  return statusMap[internal] || 'Pending';
}

function mapRefillStatus(internal: string): string {
  const statusMap: Record<string, string> = {
    'PENDING': 'Pending',
    'IN_PROGRESS': 'In progress',
    'COMPLETED': 'Completed',
    'REJECTED': 'Rejected',
    'ERROR': 'Canceled'
  };
  return statusMap[internal] || 'Pending';
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let currentHashedKey = '';
  let currentAction = '';
  let currentFormData: FormData | null = null;

  const sendResponse = (res: NextResponse) => {
    if (currentHashedKey) {
      const latencyMs = Date.now() - startTime;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paramsObj: Record<string, any> = {};
      if (currentFormData) {
        currentFormData.forEach((val, k) => {
          if (k !== 'key') paramsObj[k] = val.toString();
        });
      }
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || null;
      const userAgent = request.headers.get('user-agent') || null;

      db.b2bRequestLog.create({
        data: {
          apiKeyHash: currentHashedKey,
          action: currentAction || 'unknown',
          params: paramsObj,
          httpStatus: res.status,
          latencyMs,
          ip,
          userAgent
        }
      }).catch(() => {});
    }
    return res;
  };

  try {
    // W5-3 SECURITY FIX: Limit content length to prevent DoS via huge payloads before parsing
    const contentLength = request.headers?.get ? request.headers.get('content-length') : null;
    if (contentLength && parseInt(contentLength, 10) > 500 * 1024) {
      return sendResponse(NextResponse.json({ error: 'Payload too large (max 500KB)' }, { status: 413 }));
    }

    // SMM APIs typically send x-www-form-urlencoded data
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return sendResponse(NextResponse.json({ error: 'Invalid request format. Use application/x-www-form-urlencoded' }, { status: 400 }));
    }

    currentFormData = formData;
    const key = formData.get('key')?.toString();
    const action = formData.get('action')?.toString() || '';
    currentAction = action;

    if (!key) {
      return sendResponse(NextResponse.json({ error: 'API key is required' }, { status: 400 }));
    }

    // Rate Limiting (OWASP A04)
    // W3-4 SECURITY FIX: Do not store raw API keys in Redis. Hash them first.
    // Limit: 50 requests per 60 seconds per API key
    const crypto = (await import('crypto')).default;
    const hashedKey = crypto.createHash('sha256').update(key).digest('hex');
    currentHashedKey = hashedKey;

    const isAllowed = await RateLimitService.checkCustomKey(hashedKey, 50, 60);
    if (!isAllowed) {
      return sendResponse(NextResponse.json({ error: 'Too many requests. Limit 50/minute.' }, { status: 429 }));
    }

    // 1. Authenticate User
    const user = await verifyB2BKey(key);
    if (!user) {
      return sendResponse(NextResponse.json({ error: 'Incorrect request or API key' }, { status: 401 }));
    }

    // 2. Route by Action
    switch (action) {
      case 'services':
        return sendResponse(await handleServices(user, formData));
      case 'add':
        return sendResponse(await handleAdd(user, formData));
      case 'add_multi':
        return sendResponse(await handleAddMulti(user, formData));
      case 'status':
        return sendResponse(await handleStatus(user, formData));
      case 'balance':
        return sendResponse(await handleBalance(user));
      case 'refill':
        return sendResponse(await handleRefill(user, formData));
      case 'refill_status':
        return sendResponse(await handleRefillStatus(user, formData));
      case 'cancel':
        return sendResponse(await handleCancel(user, formData));
      default:
        return sendResponse(NextResponse.json({ error: 'Incorrect action' }, { status: 400 }));
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[API v2 Error]:', error);
    return sendResponse(NextResponse.json({ error: 'Internal server error' }, { status: 500 }));
  }
}

// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// ACTION HANDLERS
// ----------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleServices(user: any, formData: FormData) {
  const offset = formData.get('offset')?.toString() || '0';
  const skip = parseInt(offset, 10);

  // SD-15 SECURITY FIX: Cap offset at 1000 and limit at 100 to reduce scraping attractiveness.
  const safeSkip = isNaN(skip) ? 0 : Math.min(skip, 1000);
  const userTenantId = user.tenantId || 'smmplan';

  const services = await db.service.findMany({
    include: { category: true },
    where: {
      isActive: true,
      tenantId: userTenantId,
      category: { tenantId: userTenantId }
    },
    take: 100,
    skip: safeSkip
  });

  const finalFormatted = await marketingService.getB2BFormattedServices(user, services);
  return NextResponse.json(finalFormatted);
}

const addSchema = z.object({
  service: z.coerce.number().int().positive(),
  link: z.string().url().or(z.string().min(1)),
  quantity: z.coerce.number().int().positive(),
  runs: z.coerce.number().int().positive().optional(),
  interval: z.coerce.number().int().positive().optional()
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleAdd(user: any, formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  const parsed = addSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Incorrect parameters' }, { status: 400 });
  }

  const { service: serviceNumericId, link, quantity, runs, interval } = parsed.data;
  const userTenantId = user.tenantId || 'smmplan';

  const service = await db.service.findFirst({
    where: {
      numericId: serviceNumericId,
      isActive: true,
      tenantId: userTenantId,
      category: { tenantId: userTenantId }
    },
    include: { category: true }
  });

  if (!service) {
    await db.securityEvent.create({
      data: {
        event: 'API_V2_CROSS_TENANT_SERVICE_ATTEMPT',
        severity: 'CRITICAL',
        details: { userId: user.id, userTenantId, serviceNumericId }
      }
    });
    return NextResponse.json({ error: 'Incorrect service ID' }, { status: 400 });
  }

  if (quantity < service.minQty || quantity > service.maxQty) {
    return NextResponse.json({ error: 'Quantity out of bounds' }, { status: 400 });
  }

  // B2B panels standard: for DripFeed, "quantity" parameter is quantity *per run*.
  // Our DB schema requires order.quantity to be the *total* overall quantity.
  const totalQuantity = (runs && runs > 0) ? quantity * runs : quantity;

  try {
    const pricing = await marketingService.calculatePrice(user.id, service.id, totalQuantity);

    const result = await orderService.createOrder(user.id, {
      serviceId: service.id,
      link,
      quantity: totalQuantity,
      charge: pricing.totalCents,
      providerCost: pricing.providerCostCents,
      runs,
      interval
    });

    if (!result.success || !result.orderId) {
      throw new Error((result.error === 'Insufficient funds' || result.error?.startsWith('Insufficient funds')) ? 'INSUFFICIENT_FUNDS' : result.error);
    }

    const createdOrder = await db.order.findUnique({ where: { id: result.orderId }, select: { numericId: true }});
    return NextResponse.json({ order: createdOrder?.numericId });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err instanceof Error && err.message === 'INSUFFICIENT_FUNDS') {
      return NextResponse.json({ error: 'Not enough funds on balance' }, { status: 400 });
    }
    // Prisma transaction conflict codes: P2034 (Serializable conflict), P2028 (Deadlock)
    if (err?.code === 'P2034' || err?.code === 'P2028') {
      return NextResponse.json({ error: 'Not enough funds on balance' }, { status: 400 });
    }
    console.error('[API v2 Error]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseOrders(formData: FormData): any[] | null { // Justified: parsing dynamic reseller payload format types
  const ordersStr = formData.get('orders')?.toString();
  if (ordersStr) {
    try {
      const parsed = JSON.parse(ordersStr);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Not a valid JSON array, fallback to form-urlencoded parsing
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ordersMap: Record<number, any> = {}; // Justified: building index map of arbitrary form fields
  let hasEntries = false;
  for (const [key, value] of formData.entries()) {
    const match = key.match(/^orders\[(\d+)\]\[(\w+)\]$/);
    if (match) {
      hasEntries = true;
      const index = parseInt(match[1], 10);
      const field = match[2];
      if (!ordersMap[index]) {
        ordersMap[index] = {};
      }
      ordersMap[index][field] = value.toString();
    }
  }

  if (!hasEntries) return null;

  return Object.keys(ordersMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map(index => ordersMap[index]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleAddMulti(user: any, formData: FormData) { // Justified: user object can be any Prisma User model
  const rawOrders = parseOrders(formData);

  if (!rawOrders || !Array.isArray(rawOrders) || rawOrders.length === 0) {
    return NextResponse.json({ error: 'Incorrect parameters' }, { status: 400 });
  }

  // Cap batch size to prevent DoS (max 50 orders)
  if (rawOrders.length > 50) {
    return NextResponse.json({ error: 'Batch size too large (max 50 orders)' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = []; // Justified: dynamic results array containing orders or errors
  const userTenantId = user.tenantId || 'smmplan';

  for (const rawOrder of rawOrders) {
    const parsed = addSchema.safeParse(rawOrder);
    if (!parsed.success) {
      results.push({ error: 'Incorrect parameters' });
      continue;
    }

    const { service: serviceNumericId, link, quantity, runs, interval } = parsed.data;

    try {
      const service = await db.service.findFirst({
        where: {
          numericId: serviceNumericId,
          isActive: true,
          tenantId: userTenantId,
          category: { tenantId: userTenantId }
        }
      });

      if (!service) {
        await db.securityEvent.create({
          data: {
            event: 'API_V2_CROSS_TENANT_SERVICE_ATTEMPT',
            severity: 'CRITICAL',
            details: { userId: user.id, userTenantId, serviceNumericId }
          }
        });
        results.push({ error: 'Incorrect service ID' });
        continue;
      }

      if (quantity < service.minQty || quantity > service.maxQty) {
        results.push({ error: 'Quantity out of bounds' });
        continue;
      }

      const totalQuantity = (runs && runs > 0) ? quantity * runs : quantity;

      const pricing = await marketingService.calculatePrice(user.id, service.id, totalQuantity);

      const result = await orderService.createOrder(user.id, {
        serviceId: service.id,
        link,
        quantity: totalQuantity,
        charge: pricing.totalCents,
        providerCost: pricing.providerCostCents,
        runs,
        interval
      });

      if (!result.success || !result.orderId) {
        throw new Error((result.error === 'Insufficient funds' || result.error?.startsWith('Insufficient funds')) ? 'INSUFFICIENT_FUNDS' : result.error);
      }

      const createdOrder = await db.order.findUnique({
        where: { id: result.orderId },
        select: { numericId: true }
      });

      results.push({ order: createdOrder?.numericId });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) { // Justified: catching dynamic database or business logic errors
      if (err instanceof Error && err.message === 'INSUFFICIENT_FUNDS') {
        results.push({ error: 'Not enough funds on balance' });
      } else if (err?.code === 'P2034' || err?.code === 'P2028') {
        results.push({ error: 'Not enough funds on balance' });
      } else {
        console.error('[API v2 add_multi item error]:', err);
        results.push({ error: 'Internal server error' });
      }
    }
  }

  return NextResponse.json(results);
}

async function handleStatus(user: User, formData: FormData) {
  const orderStr = formData.get('order')?.toString();
  const ordersStr = formData.get('orders')?.toString();
  const userTenantId = user.tenantId || 'smmplan';

  if (orderStr) {
    // Single
    const numericId = parseInt(orderStr, 10);
    const order = isNaN(numericId) ? null : await db.order.findFirst({
      where: { numericId, userId: user.id, tenantId: userTenantId }
    });

    if (!order) {
      await db.securityEvent.create({
        data: {
          event: 'API_V2_UNAUTHORIZED_ORDER_ACCESS',
          severity: 'WARNING',
          details: { userId: user.id, userTenantId, numericId }
        }
      });
      return NextResponse.json({ error: 'Incorrect order ID' }, { status: 400 });
    }

    return NextResponse.json({
      charge: (Number(order.charge) / 100).toFixed(4),
      start_count: (order.startCount ?? 0).toString(),
      status: mapInternalStatus(order.status),
      remains: order.remains.toString(),
      currency: 'RUB'
    });
  }

  if (ordersStr) {
    // Multiple
    // SD-09 SECURITY FIX: Cap batch size to prevent DoS via massive IN queries
    const ids = ordersStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)).slice(0, 100);
    const orders = await db.order.findMany({
      where: {
        numericId: { in: ids },
        userId: user.id,
        tenantId: userTenantId
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resultMap: Record<string, any> = {};
    for (const id of ids) {
      resultMap[id.toString()] = { error: 'Incorrect order ID' };
    }

    for (const order of orders) {
      resultMap[order.numericId.toString()] = {
        charge: (Number(order.charge) / 100).toFixed(4),
        start_count: (order.startCount ?? 0).toString(),
        status: mapInternalStatus(order.status),
        remains: order.remains.toString(),
        currency: 'RUB'
      };
    }

    return NextResponse.json(resultMap);
  }

  return NextResponse.json({ error: 'Missing order parameter' }, { status: 400 });
}

async function handleBalance(user: User) {
  const freshUser = await db.user.findUnique({ where: { id: user.id }, select: { balance: true } });
  return NextResponse.json({
    balance: (Number(freshUser?.balance || 0) / 100).toFixed(4),
    currency: 'RUB'
  });
}

async function handleCancel(user: User, formData: FormData) {
  const ordersStr = formData.get('orders')?.toString() || formData.get('order')?.toString();
  
  if (!ordersStr) {
    return NextResponse.json({ error: 'Missing order parameter' }, { status: 400 });
  }

  const userTenantId = user.tenantId || 'smmplan';
  const ids = ordersStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)).slice(0, 100);
  
  // Fetch orders with tenant check
  const orders = await db.order.findMany({
    where: { numericId: { in: ids }, userId: user.id, tenantId: userTenantId }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultMap: Record<string, any> = {};

  for (const id of ids) {
    const order = orders.find(o => o.numericId === id);
    if (!order) {
      resultMap[id.toString()] = { error: 'Incorrect order ID' };
      continue;
    }

    if (order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT') {
      const cancelResult = await orderService.cancelPendingOrderClient(order.id, user.id);
      if (cancelResult.success) {
        resultMap[id.toString()] = { cancel: true };
      } else {
        resultMap[id.toString()] = { error: cancelResult.error || 'Cancellation failed' };
      }
    } else {
      resultMap[id.toString()] = { error: 'Cancellation via API is not supported. Contact support.' };
    }
  }

  // If it's a single order request, standard SMM API returns error/success at root level
  if (!formData.get('orders') && ids.length === 1) {
    const singleResult = resultMap[ids[0].toString()];
    if (singleResult.cancel) {
       return NextResponse.json({ cancel: true });
    }
    return NextResponse.json({ error: singleResult.error }, { status: 400 });
  }

  return NextResponse.json(resultMap);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleRefill(user: User, formData: FormData) {
  // Reseller Safety: Automated Refill is completely disabled.
  // We do not pass refills to upstream automatically to prevent silent failures and provider conflicts.
  return NextResponse.json({ error: 'Refill is only available manually via support ticket for reseller platforms.' }, { status: 400 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleRefillStatus(user: any, formData: FormData) {
  const refillStr = formData.get('refill')?.toString();
  const userTenantId = user.tenantId || 'smmplan';

  if (!refillStr) {
    const refillsStr = formData.get('refills')?.toString();
    if (refillsStr) {
      // Multiple
      const ids = refillsStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)).slice(0, 100);
      const refills = await db.refill.findMany({
        where: { numericId: { in: ids }, order: { userId: user.id, tenantId: userTenantId } }
      });
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resultMap: any[] = [];
      for (const refill of refills) {
        resultMap.push({
           refill: refill.numericId,
           status: mapRefillStatus(refill.status)
        });
      }
      return NextResponse.json(resultMap);
    }
    return NextResponse.json({ error: 'Missing refill parameter' }, { status: 400 });
  }

  // Single
  const numericId = parseInt(refillStr, 10);
  if (isNaN(numericId)) return NextResponse.json({ error: 'Incorrect refill ID' }, { status: 400 });

  const refill = await db.refill.findFirst({
    where: { numericId, order: { userId: user.id, tenantId: userTenantId } },
    include: { order: true }
  });

  if (!refill) {
    return NextResponse.json({ error: 'Incorrect refill ID' }, { status: 400 });
  }

  return NextResponse.json({ status: mapRefillStatus(refill.status) });
}


