/**
 * Lightweight Telegram Bot notification service for critical admin alerts.
 * Uses raw fetch() — no external dependencies required.
 * 
 * Setup:
 * 1. Create a bot via @BotFather
 * 2. Create a private channel/group for alerts
 * 3. Add bot to the channel as admin
 * 4. Set ADMIN_ALERT_BOT_TOKEN and ADMIN_ALERT_CHAT_ID in .env
 */

const TELEGRAM_BOT_TOKEN = process.env.ADMIN_ALERT_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.ADMIN_ALERT_CHAT_ID;

type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

const SEVERITY_EMOJI: Record<AlertSeverity, string> = {
  INFO: 'ℹ️',
  WARNING: '⚠️',
  CRITICAL: '🚨',
};

import { telegramQueue } from '../workers/queues';

/**
 * Queues a formatted alert to the admin Telegram channel via BullMQ.
 * Non-blocking (fire-and-forget). Never throws.
 */
export function sendAdminAlert(message: string, severity: AlertSeverity = 'INFO') {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return;
  }
  
  telegramQueue.add('admin-alert', { message, severity }).catch(err => {
    console.error('[NotificationService] Failed to queue Telegram alert:', err);
  });
}

/**
 * Worker-only method to actually execute the HTTP request to Telegram.
 */
export async function sendAdminAlertSync(message: string, severity: AlertSeverity = 'INFO') {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const emoji = SEVERITY_EMOJI[severity];
  const text = `${emoji} <b>Smmplan [${severity}]</b>\n\n${message}\n\n<i>${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}</i>`;

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch (err) {
    console.error('[NotificationService] Telegram alert sync failed:', err);
  }
}
