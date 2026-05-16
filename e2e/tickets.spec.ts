import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

test.describe('Support Tickets Flow', () => {

  test('Optimistic UI: Admin replies to a ticket', async ({ page }) => {
    // 1. Seed a test user and an OPEN ticket
    const prisma = new PrismaClient();
    let testUser = await prisma.user.findUnique({ where: { email: 'e2e_ticket_user@test.local' } });
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'e2e_ticket_user@test.local',
          role: 'USER',
        }
      });
    }

    let ticket = await prisma.ticket.findFirst({
      where: { subject: 'E2E Test Ticket' }
    });

    if (!ticket) {
      ticket = await prisma.ticket.create({
        data: {
          subject: 'E2E Test Ticket',
          status: 'OPEN',
          userId: testUser.id,
          messages: {
            create: {
              text: 'I need help with my E2E order.',
              sender: 'USER',
            }
          }
        }
      });
    } else {
      // Ensure it's OPEN
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'OPEN' }
      });
    }
    await prisma.$disconnect();

    // 2. Go to the ticket page
    await page.goto(`/admin/tickets/${ticket.id}`);

    // 3. Verify ticket subject is visible
    await expect(page.getByText('E2E Test Ticket').first()).toBeVisible({ timeout: 10000 });

    // 4. Find the textarea and send a message
    const messageInput = page.getByPlaceholder(/Введите ваше сообщение/i).first();
    await expect(messageInput).toBeVisible();
    await messageInput.fill('Hello from Playwright E2E');

    // Submit the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Отправить"), button[aria-label="Отправить"]').first();
    await submitButton.click();

    // 5. Verify optimistic UI - message should appear immediately
    const messageText = page.getByText('Hello from Playwright E2E').first();
    await expect(messageText).toBeVisible({ timeout: 5000 });

    // 6. Verify ticket status changed to PENDING in the database
    // We wait a moment for the server action to fully persist
    await page.waitForTimeout(1000);
    
    const prismaValidate = new PrismaClient();
    const updatedTicket = await prismaValidate.ticket.findUnique({
      where: { id: ticket.id }
    });
    await prismaValidate.$disconnect();
    
    expect(updatedTicket?.status).toBe('PENDING');
  });

});
