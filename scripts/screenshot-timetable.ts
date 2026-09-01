import { chromium } from 'playwright';
import { db } from '../src/lib/db';
import { SignJWT } from 'jose';
import { getEncodedKey } from '../src/lib/session-edge';

async function createJwt(userId: string, role: string, tenantId = 'smmplan') {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await db.session.create({
    data: {
      userId,
      expiresAt,
      userAgent: 'stage-screenshot-agent',
      ipAddress: '127.0.0.1',
    },
  });

  return new SignJWT({
    sessionId: session.id,
    userId,
    canResetPassword: false,
    role,
    tenantId,
    contour: 'test',
    sessionVer: 1,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getEncodedKey());
}

async function main() {
  const supportUser = await db.user.findFirst({
    where: { role: 'SUPPORT' },
  });

  if (!supportUser) {
    console.error('Support user not found');
    process.exit(1);
  }

  const token = await createJwt(supportUser.id, 'SUPPORT');

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addCookies([
    {
      name: 'session_token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
    },
  ]);

  const page = await context.newPage();
  await page.goto('http://localhost:3005/admin/staff', { waitUntil: 'networkidle' });

  // Click on "График смен & Календарь"
  await page.click('button:has-text("График смен & Календарь")');
  await page.waitForTimeout(1000);

  // Take screenshot of "Сетка месяца" (default active view)
  const monthScreenshotPath = 'C:\\Users\\Артём\\.gemini\\antigravity\\brain\\825b8dde-0bec-45fa-8205-d3b2d05f1962\\50_stage_staff_schedule_month_grid_fixed.png';
  await page.screenshot({ path: monthScreenshotPath, fullPage: false });
  console.log('📸 Month Grid Screenshot saved to:', monthScreenshotPath);

  // Click on "Расписание недели"
  await page.click('button:has-text("Расписание недели")');
  await page.waitForTimeout(1000);

  // Take screenshot of "Расписание недели"
  const weekScreenshotPath = 'C:\\Users\\Артём\\.gemini\\antigravity\\brain\\825b8dde-0bec-45fa-8205-d3b2d05f1962\\51_stage_staff_schedule_week_matrix_fixed.png';
  await page.screenshot({ path: weekScreenshotPath, fullPage: false });
  console.log('📸 Week Timetable Screenshot saved to:', weekScreenshotPath);

  await browser.close();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
