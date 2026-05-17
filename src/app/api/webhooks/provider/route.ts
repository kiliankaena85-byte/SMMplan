import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { providerService } from "@/services/providers/provider.service";
import { RefundPolicyService } from "@/services/financial/refund-policy.service";
import { sendOrderCompletedMail } from "@/lib/smtp";
import { QuarantineService } from "@/services/providers/quarantine.service";

/**
 * PUSH Webhook for Provider Sync (Zero-Trust Signal Pattern)
 * 
 * Flow:
 * 1. Provider sends a webhook that an order changed.
 * 2. We validate the secret.
 * 3. We DO NOT trust the payload status (prevents spoofing).
 * 4. We query the provider API directly to confirm the true status.
 * 5. We apply the status, refund math, and quarantine rules.
 */
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    
    // In production, configure WEBHOOK_SECRET in .env
    const expectedSecret = process.env.WEBHOOK_SECRET || "smmplan-secure-webhook-2026";
    if (secret !== expectedSecret) {
      console.warn(`[Webhook] Unauthorized access attempt. Secret mismatch.`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      // If it's x-www-form-urlencoded
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    }

    const externalId = body?.order?.toString() || body?.id?.toString() || searchParams.get("order");
    
    if (!externalId) {
      return NextResponse.json({ error: "Missing order ID in payload" }, { status: 400 });
    }

    console.info(`[Webhook] Received update signal for external ID: ${externalId}`);

    // 1. Find the order
    const order = await db.order.findFirst({
      where: {
        status: { in: ["IN_PROGRESS", "AWAITING_PAYMENT", "PENDING"] },
        OR: [
          { externalId },
          { dripExternalIds: { has: externalId } }
        ]
      },
      include: { service: true, user: { select: { email: true } } }
    });

    if (!order) {
      console.info(`[Webhook] Order with external ID ${externalId} not found or not active.`);
      return NextResponse.json({ message: "Order not found or not active" }, { status: 200 });
    }

    if (!order.providerId) {
      return NextResponse.json({ error: "Order has no assigned provider" }, { status: 400 });
    }

    // 2. Fetch the true state from Provider (Zero-Trust)
    const providerDef = await db.provider.findUnique({ where: { id: order.providerId } });
    if (!providerDef) {
      return NextResponse.json({ error: "Provider not found" }, { status: 400 });
    }

    const providerInstance = await providerService.getWorkerProviderInstance(providerDef);
    const statuses = await providerInstance.getMultiOrderStatus([externalId]);
    const s = statuses[externalId];

    if (!s || typeof s === 'string') {
      return NextResponse.json({ error: "Provider API returned invalid status during verification" }, { status: 400 });
    }

    const providerStatus = s.status.toUpperCase();
    const parsedRemains = parseInt(s.remains || "0", 10);

    console.info(`[Webhook] Verified true status for ${externalId}: ${providerStatus}`);

    // 3. Apply standard Sync Logic
    if (order.isDripFeed) {
      // For drip-feed, we just blindly update the specific run. 
      // The massive Cron worker will eventually finalize the overarching drip order.
      // But we can trigger a micro-update here.
      if (['COMPLETED', 'PARTIAL', 'CANCELED'].includes(providerStatus)) {
        console.info(`[Webhook] DripFeed run ${externalId} completed/canceled. Waiting for main Cron to aggregate.`);
      }
      return NextResponse.json({ success: true, message: "DripFeed signal acknowledged" });
    }

    // 4. Single Order Logic
    if (['CANCELED'].includes(providerStatus)) {
      const updated = await db.order.update({ where: { id: order.id }, data: { status: 'CANCELED', remains: parsedRemains } });
      await RefundPolicyService.processRefund({ ...updated, charge: Number(updated.charge) }, '(Отмена на стороне провайдера)');
      
      // Trigger Quarantine Check (Silent Failures)
      QuarantineService.evaluateTriggerB(order.serviceId).catch(console.error);
      
    } else if (['PARTIAL'].includes(providerStatus)) {
      const updated = await db.order.update({ where: { id: order.id }, data: { status: 'PARTIAL', remains: parsedRemains } });
      await RefundPolicyService.processRefund({ ...updated, charge: Number(updated.charge) });
      
    } else if (['COMPLETED'].includes(providerStatus)) {
      await db.order.update({ where: { id: order.id }, data: { status: 'COMPLETED', remains: 0 } });
      sendOrderCompletedMail(order.user.email, order.numericId.toString(), order.service.name).catch(console.error);
      
    } else {
      await db.order.update({ where: { id: order.id }, data: { remains: parsedRemains } });
    }

    return NextResponse.json({ success: true, verifiedStatus: providerStatus });

  } catch (error: any) {
    console.error(`[Webhook] Fatal error:`, error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

