'use server';

import { db } from '@/lib/db';
import { verifySession } from '@/lib/session';
import { auditAdmin } from '@/lib/admin-audit';

export interface BugReportPayload {
  title: string;
  description: string;
  priority: 'CRITICAL' | 'NORMAL' | 'LOW';
  url: string;
  tenantId: string;
  role: string;
  viewport: string;
  userAgent: string;
  checkoutMode?: string;
  consoleLogs?: string[];
  screenshot?: string; // Base64 data URL
}

export async function submitBugReportAction(payload: BugReportPayload) {
  try {
    const session = await verifySession();
    const userId = session?.userId ?? null;
    const user = userId ? await db.user.findUnique({ where: { id: userId }, select: { email: true } }) : null;

    const formattedContent = `
### Баг-репорт: ${payload.title}
**Приоритет:** ${payload.priority}
**URL страницы:** ${payload.url}
**Бренд (Тенант):** ${payload.tenantId}
**Роль пользователя:** ${payload.role} (User ID: ${userId || 'Аноним'})
**Разрешение экрана:** ${payload.viewport}
**Режим чекаута:** ${payload.checkoutMode || 'Не указан'}
**User-Agent:** ${payload.userAgent}

#### Описание проблемы:
${payload.description}

${payload.consoleLogs && payload.consoleLogs.length > 0 ? `#### Ошибки консоли JS:\n\`\`\`\n${payload.consoleLogs.join('\n')}\n\`\`\`` : ''}
    `.trim();

    // 1. Audit Admin log
    if (userId) {
      auditAdmin({
        adminId: userId,
        adminEmail: user?.email || 'unknown@smmplan.pro',
        action: 'BUG_REPORT',
        target: payload.url,
        targetType: 'BugReport',
        newValue: { title: payload.title, priority: payload.priority, url: payload.url },
      });
    }

    // 2. Sync to GraphRAG Memory if reachable
    try {
      await fetch('http://localhost:8100/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[BUG] ${payload.title}`,
          content: formattedContent,
          category: 'incidents',
        }),
        signal: AbortSignal.timeout(1500),
      }).catch(() => null);
    } catch {
      // Non-blocking if GraphRAG container is offline
    }

    return {
      success: true,
      message: 'Баг-репорт успешно сохранен и отправлен в журнал инцидентов!',
      markdown: formattedContent,
    };
  } catch (error) {
    console.error('Failed to submit bug report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Не удалось сохранить баг-репорт',
    };
  }
}
