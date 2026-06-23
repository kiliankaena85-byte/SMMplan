import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

test.describe("Guest Mass Order Flow on Landing Page", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  let prisma: PrismaClient;

  test.beforeAll(async () => {
    prisma = new PrismaClient();
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("Guest can switch to mass order tab, fill visual form, calculate prices and proceed to payment modal", async ({ page }) => {
    // 1. Prepare E2E Test Catalog Data
    const networkSlug = "telegram";
    const networkName = "Telegram";
    let network = await prisma.network.findUnique({ where: { slug: networkSlug } });
    if (!network) {
      network = await prisma.network.create({
        data: { name: networkName, slug: networkSlug, sort: 1, isActive: true }
      });
    }

    const categoryName = "E2E Guest Mass Category";
    let category = await prisma.category.findFirst({ where: { name: categoryName } });
    if (!category) {
      category = await prisma.category.create({
        data: { name: categoryName, networkId: network.id, sort: 1 }
      });
    }

    const serviceName = "E2E Guest Mass Service";
    let service = await prisma.service.findFirst({ where: { name: serviceName } });
    if (!service) {
      service = await prisma.service.create({
        data: {
          name: serviceName,
          categoryId: category.id,
          rate: 10.0, // rate per 1k = 10 USD
          markup: 3.0,
          minQty: 10,
          maxQty: 10000,
          isActive: true,
          targetType: "CHANNEL",
          pricePer1000Cents: 2700, // 27 RUB per 1k (rate * markup * 90)
        }
      });
    }

    // 2. Clear out any previous test users to prevent unique email constraint failures
    const testEmail = "guest-mass-tester@test.com";
    await prisma.user.deleteMany({ where: { email: testEmail } });

    // Catch page errors
    page.on("pageerror", (error) => console.error("PAGE ERROR:", error));

    // 3. Navigate to Home/Landing Page
    await page.goto("/");
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

    // 4. Click the Mass Order Tab Switcher
    const massTabBtn = page.getByRole("button", { name: "Массовый заказ" });
    await expect(massTabBtn).toBeVisible();
    await massTabBtn.click();

    // Verify Mass Order form inputs are rendered
    const visualModeIndicator = page.getByText("Визуальный режим");
    try {
      await expect(visualModeIndicator).toBeVisible({ timeout: 2000 });
    } catch {
      console.log("Tab switcher click did not trigger visual mode rendering. Retrying...");
      await massTabBtn.click();
      await expect(visualModeIndicator).toBeVisible({ timeout: 5000 });
    }

    // 5. Select Network/Platform (Telegram)
    const platformBtn = page.getByRole("button", { name: networkName, exact: true });
    await expect(platformBtn).toBeVisible();
    await platformBtn.click();

    // 6. Select Category from dropdown
    const categorySelect = page.locator("#guest-category-select");
    await expect(categorySelect).toBeVisible();
    await categorySelect.selectOption(category.id);

    // 7. Select Service from dropdown
    const serviceSelect = page.locator("#guest-service-select");
    await expect(serviceSelect).toBeVisible();
    await serviceSelect.selectOption(service.id);

    // 8. Enter links in Visual Mode textarea
    const linksTextarea = page.locator("#guest-links-input");
    await expect(linksTextarea).toBeVisible();
    await linksTextarea.fill(
      "https://t.me/e2e_mass_1\nhttps://t.me/e2e_mass_2"
    );

    // 9. Enter Quantity
    const qtyInput = page.locator("#guest-qty-input");
    await expect(qtyInput).toBeVisible();
    await qtyInput.fill("100");

    // 10. Verify calculation is performed and checkout summary updates
    const checkoutSummaryHeader = page.getByText("Сводка по пакету");
    await expect(checkoutSummaryHeader).toBeVisible({ timeout: 5000 });

    const validCountText = page.locator("span.text-success.font-bold.tabular-nums");
    await expect(validCountText).toHaveText("2");

    // 11. Click "Оформить пакет" to open email confirmation modal
    const checkoutBtn = page.getByRole("button", { name: "Оформить пакет" });
    await expect(checkoutBtn).toBeVisible();
    await checkoutBtn.click();

    // 12. Verify Mass Confirm Email Modal
    const emailModalHeader = page.getByText("Подтверждение заказа");
    await expect(emailModalHeader).toBeVisible();

    // Check legal checkbox if it exists or fill in email
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill(testEmail);

    const emailConfirmBtn = page.getByRole("button", { name: "Да, перейти к оплате" });
    await expect(emailConfirmBtn).toBeVisible();
    await emailConfirmBtn.click();

    // 13. Verify Payment Gateway Modal
    const paymentGatewayHeader = page.getByText("Способ оплаты");
    await expect(paymentGatewayHeader).toBeVisible();

    // Clean up created entities
    await prisma.service.delete({ where: { id: service.id } });
    await prisma.category.delete({ where: { id: category.id } });
  });
});
