export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jwtVerify } from 'jose';
import { Prisma } from '@prisma/client';

if (!process.env.JWT_SECRET) throw new Error('FATAL: JWT_SECRET is required');
const secretKey = process.env.JWT_SECRET;
const encodedKey = new TextEncoder().encode(secretKey);

export async function GET(req: NextRequest) {
  // Auth errors → 401
  let userId: string;
  try {
    // Auth check via cookie
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] });
    userId = payload.userId as string;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Business logic errors → 500
  try {
    const ticketId = req.nextUrl.searchParams.get('ticketId');
    const after = req.nextUrl.searchParams.get('after'); // ISO date — only get messages after this time

    if (!ticketId) return NextResponse.json({ error: 'ticketId required' }, { status: 400 });

    // Verify access: user owns ticket OR is staff
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isStaff = ['ADMIN', 'SUPPORT', 'OWNER'].includes(user.role);
    let ticket;

    if (isStaff) {
      ticket = await db.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    } else {
      ticket = await db.ticket.findFirst({
        where: { id: ticketId, userId: userId }
      });
      if (!ticket) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const whereClause: Prisma.TicketMessageWhereInput = { ticketId };
    if (after) {
      whereClause.createdAt = { gt: new Date(after) };
    }

    // For clients, filter out INTERNAL notes
    if (!isStaff) {
      whereClause.sender = { not: 'INTERNAL' };
    }

    const limit = Math.min(
      Math.max(parseInt(req.nextUrl.searchParams.get('limit') || '50', 10), 1),
      100
    );
    const cursor = req.nextUrl.searchParams.get('cursor') || undefined;

    let messages;
    let nextCursor: string | null = null;

    if (after) {
      // Polling mode: get all new messages in chronological order
      messages = await db.ticketMessage.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' },
        include: { replyTo: true, attachments: true }
      });
    } else {
      // Pagination mode: get messages in reverse chronological order
      const fetchedMessages = await db.ticketMessage.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        include: { replyTo: true, attachments: true },
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
      });

      if (fetchedMessages.length > limit) {
        const nextPageItem = fetchedMessages.pop();
        nextCursor = nextPageItem?.id || null;
      }

      // Reverse so the client receives them chronologically (oldest first)
      messages = fetchedMessages.reverse();
    }

    const mappedMessages = messages.map(m => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      mediaUrl: m.mediaUrl || (m.attachments[0]?.url ?? null),
      mediaType: m.mediaType || (m.attachments[0]?.type ?? null),
      createdAt: m.createdAt.toISOString(),
      isDeleted: m.isDeleted,
      isEdited: m.isEdited,
      originalText: m.originalText,
      replyTo: m.replyTo ? {
        id: m.replyTo.id,
        text: m.replyTo.text,
        sender: m.replyTo.sender
      } : null,
      attachments: m.attachments.map(att => ({
        id: att.id,
        url: att.url,
        type: att.type,
        mimeType: att.mimeType,
        name: att.name,
        size: att.size,
        createdAt: att.createdAt.toISOString()
      }))
    }));

    return NextResponse.json({ 
      messages: mappedMessages, 
      ticketStatus: ticket.status,
      nextCursor 
    });
  } catch (error) {
    console.error('[messages/route] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

