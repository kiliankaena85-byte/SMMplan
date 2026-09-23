import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { ticketService } from '@/services/support/ticket.service';
import { resolveTenantFromHeaders } from '@/lib/tenant-resolver-edge';

export const dynamic = 'force-dynamic';

export default async function ClientTicketsPage() {
  const session = await verifySession();
  if (!session) redirect('/login');

  const reqHeaders = await headers();
  const tenantId = resolveTenantFromHeaders(reqHeaders);

  // Retrieve or create active (non-CLOSED) support live-chat session for the client
  const ticket = await ticketService.getOrCreateTicket(
    session.userId,
    'Чат с поддержкой',
    'WEB',
    tenantId
  );

  // Instantly redirect client to the active chat room
  redirect(`/dashboard/tickets/${ticket.id}`);
}
