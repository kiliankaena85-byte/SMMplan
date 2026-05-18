import { NextResponse } from "next/server";
import { checkoutAction } from "@/actions/order/checkout";
import { db } from "@/lib/db";
import { SettingsManager } from "@/lib/settings";

export async function GET(req: Request) {
  // W0-1 SECURITY FIX: Block in production — this endpoint leaks payment secrets
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not Found', { status: 404 });
  }

  // OSAD-V2: Even in dev, require OWNER auth — this endpoint exposes payment secrets
  const { verifySession } = await import('@/lib/session');
  const { db } = await import('@/lib/db');
  const session = await verifySession();
  if (!session) return new Response('Unauthorized', { status: 401 });
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.role !== 'OWNER') return new Response('Forbidden', { status: 403 });

  const secrets = await SettingsManager.getPaymentSecrets();
  const isTest = await SettingsManager.isTestMode();
  
  const service = await db.service.findFirst();
  if (!service) return NextResponse.json({ error: "No service" });
  
  const res = await checkoutAction({
    serviceId: service.id,
    link: "https://test.com",
    quantity: 100,
    email: "test@smmplan.pro",
    gateway: "yookassa"
  });
  
  return NextResponse.json({ secrets: { shopId: secrets.yookassaShopId, secret: secrets.yookassaSecretKey?.substring(0,5) }, isTest, res });
}
