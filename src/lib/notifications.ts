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

function getTelegramConfig() {
  const token = process.env.ADMIN_ALERT_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.ADMIN_ALERT_CHAT_ID || '268747191';
  return { token, chatId };
}

type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

const SEVERITY_EMOJI: Record<AlertSeverity, string> = {
  INFO: 'ℹ️',
  WARNING: '⚠️',
  CRITICAL: '🚨',
};

import { telegramQueue } from '@/lib/queue-manager';
import { EmergencyEmailService } from '@/lib/emergency-email';

/**
 * Queues or dispatches a formatted alert to the admin Telegram channel.
 * Non-blocking (fire-and-forget). Never throws.
 */
export function sendAdminAlert(message: string, severity: AlertSeverity = 'INFO') {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) {
    // If Telegram not configured, send directly via Email for CRITICAL/WARNING
    if (severity === 'CRITICAL' || severity === 'WARNING') {
      EmergencyEmailService.sendAlert({
        severity,
        title: `[${severity}] SMMpanel Alert (Telegram Unset)`,
        details: message,
      }).catch(() => {});
    }
    return;
  }
  
  // Direct async dispatch ensures alerts arrive immediately even if BullMQ worker is paused
  sendAdminAlertSync(message, severity).catch((err) => {
    console.error('[NotificationService] Failed to dispatch Telegram alert:', err);
  });
}

/**
 * Worker-only method to actually execute the HTTP request to Telegram.
 */
export async function sendAdminAlertSync(message: string, severity: AlertSeverity = 'INFO') {
  const { token, chatId } = getTelegramConfig();
  
  // Multi-Channel Cascade: Always send emergency email for CRITICAL incidents
  if (severity === 'CRITICAL') {
    EmergencyEmailService.sendAlert({
      severity: 'CRITICAL',
      title: 'P0 Critical Incident Detected',
      details: message,
    }).catch((err) => {
      console.error('[NotificationService] Emergency email cascade failed:', err);
    });
  }

  if (!token || !chatId) return;

  const emoji = SEVERITY_EMOJI[severity];
  const text = `${emoji} <b>SMMplan [${severity}]</b>\n\n${message}\n\n<i>${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}</i>`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[NotificationService] Telegram API error (${res.status}):`, errBody);

      // Failover to Email if Telegram API rejected or blocked the message
      EmergencyEmailService.sendAlert({
        severity: severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
        title: `Telegram Delivery Failed (${res.status})`,
        details: `${message}\n\nTelegram Error Details: ${errBody}`,
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[NotificationService] Telegram alert sync failed:', err);
    // Failover to Email if network to Telegram failed
    EmergencyEmailService.sendAlert({
      severity: severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
      title: 'Telegram Network Connection Error',
      details: `${message}\n\nNetwork Error: ${(err as Error).message}`,
    }).catch(() => {});
  }
}
