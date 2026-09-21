'use server';

import { requireStaffPermission } from '@/lib/server/rbac';
import { AiAgentOrchestratorService } from '@/services/support/ai/ai-agent-orchestrator.service';
import { auditAdminAwaitable } from '@/lib/admin-audit';
import { revalidatePath } from 'next/cache';

export async function takeoverTicketAction(input: {
  ticketId: string;
}): Promise<{ success: boolean; error?: string }> {
  return requireStaffPermission('tickets', 'edit', async (staffUser) => {
    if (!input?.ticketId || typeof input.ticketId !== 'string') {
      return { success: false, error: 'Не указан ID тикета' };
    }

    const success = await AiAgentOrchestratorService.takeoverTicket(input.ticketId, staffUser.email);
    if (!success) {
      return { success: false, error: 'Не удалось перехватить диалог' };
    }

    await auditAdminAwaitable({
      adminId: staffUser.id,
      adminEmail: staffUser.email,
      action: 'AI_SUPPORT_TAKEOVER',
      target: 'TICKET',
      targetType: 'TICKET',
      oldValue: null,
      newValue: { ticketId: input.ticketId, action: 'HUMAN_TAKEOVER' },
    });

    revalidatePath(`/operator/tickets/${input.ticketId}`);
    revalidatePath('/operator/tickets');

    return { success: true };
  });
}
