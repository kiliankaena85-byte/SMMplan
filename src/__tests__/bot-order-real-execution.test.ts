import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { orderService } from "@/services/core/order.service";
import { WalletOps } from "@/services/financial/wallet-ops";
import { isLinkServiceCompatible, normalizeServiceTargetType } from "@/constants/link-service-compatibility";
import { IntelligenceLinkAnalyzer } from "@/services/analyzer/link-analyzer";

describe("Bot Real Order Execution Flow", () => {
  it("verifies link compatibility for telegram channel and channel-posts services", async () => {
    const link = "https://t.me/smmMarket69";
    const analyzer = new IntelligenceLinkAnalyzer();
    const analysis = await analyzer.analyze(link);
    expect(analysis?.type).toBe("channel");
    expect(analysis?.platform).toBe("TELEGRAM");

    // Service: 5 последних постов
    const s5 = await db.service.findFirst({
      where: { name: { contains: "5 последних постов" }, isActive: true }
    });
    expect(s5).toBeDefined();
    expect(s5?.targetType).toBe("CHANNEL_POSTS");
    expect(isLinkServiceCompatible("channel", normalizeServiceTargetType(s5?.targetType))).toBe(true);

    // Service: Подписчики
    const sSubs = await db.service.findFirst({
      where: { name: "Telegram Подписчики", isActive: true }
    });
    expect(sSubs).toBeDefined();
    expect(isLinkServiceCompatible("channel", normalizeServiceTargetType(sSubs?.targetType))).toBe(true);
  });

  it("successfully creates a real bot order without SYSTEM_HALT or LINK_SERVICE_MISMATCH", async () => {
    // 1. Resolve user
    const tgUser = await db.user.findFirst({
      where: { telegramId: "1382446520" }
    });
    expect(tgUser).toBeDefined();

    // Ensure balance
    if (Number(tgUser!.balance) < 500) {
      await db.$transaction(async (tx) => {
        await WalletOps.adminAdjust(
          tx,
          tgUser!.id,
          5000,
          "Test balance for bot order verification",
          { adminId: "admin-system-test" }
        );
      });
    }

    const service = await db.service.findFirst({
      where: { name: "Telegram Подписчики", isActive: true }
    });
    expect(service).toBeDefined();

    const testLink = "https://t.me/smmMarket69";
    const res = await orderService.createOrder(tgUser!.id, {
      serviceId: service!.id,
      link: testLink,
      quantity: 100,
      charge: 500, // 5.00 RUB in cents
      providerCost: 150,
      runs: 1,
      interval: 0,
    });

    expect(res.success).toBe(true);
    expect(res.orderId).toBeDefined();
    expect(res.error).toBeUndefined();

    // Verify order in database
    const orderInDb = await db.order.findUnique({
      where: { id: res.orderId }
    });
    expect(orderInDb).toBeDefined();
    expect(orderInDb?.link).toBe(testLink);
    expect(orderInDb?.quantity).toBe(100);
    expect(orderInDb?.charge).toBe(BigInt(500));
  });

  it("verifies that category filtering selects only compatible categories for a channel link", async () => {
    const { BotCatalogService } = await import("@/bot/services/bot-catalog.service");
    const { isLinkServiceCompatible, normalizeServiceTargetType } = await import("@/constants/link-service-compatibility");
    const { inferTargetTypeFromName } = await import("@/utils/target-type-mapper");

    const network = await BotCatalogService.findNetworkByPlatform("TELEGRAM", "smmplan");
    expect(network).toBeDefined();

    const allCategories = await BotCatalogService.getVisibleCategories(network!.id, "smmplan");
    expect(allCategories.length).toBeGreaterThan(0);

    const detectedType = "channel";
    const compatibleCategories: Array<{ id: string; name: string }> = [];

    for (const c of allCategories) {
      const svcs = await BotCatalogService.getVisibleServices(c.id, "smmplan");
      const hasCompatible = svcs.some((s: { targetType?: string | null; name: string }) => {
        const rawTarget = s.targetType || inferTargetTypeFromName(s.name);
        return isLinkServiceCompatible(detectedType, normalizeServiceTargetType(rawTarget));
      });
      if (hasCompatible) {
        compatibleCategories.push(c);
      }
    }

    // Must include "Подписчики"
    const hasSubscribersCategory = compatibleCategories.some(c => c.name.includes("Подписчик"));
    expect(hasSubscribersCategory).toBe(true);

    console.log("Filtered categories for channel link:", compatibleCategories.map(c => c.name));
  });
});