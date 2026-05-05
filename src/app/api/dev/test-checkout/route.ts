import { NextResponse } from "next/server";
import { checkoutAction } from "@/actions/order/checkout";
import { db } from "@/lib/db";
import { SettingsManager } from "@/lib/settings";

export async function GET(req: Request) {
  const secrets = await SettingsManager.getPaymentSecrets();
  const isTest = await SettingsManager.isTestMode();
  
  const service = await db.service.findFirst();
  if (!service) return NextResponse.json({ error: "No service" });
  
  const res = await checkoutAction({
    serviceId: service.id,
    link: "https://test.com",
    quantity: 100,
    email: "test@smmplan.ru",
    gateway: "yookassa"
  });
  
  return NextResponse.json({ secrets: { shopId: secrets.yookassaShopId, secret: secrets.yookassaSecretKey?.substring(0,5) }, isTest, res });
}
