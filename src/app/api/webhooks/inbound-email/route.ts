import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ticketService } from '@/services/support/ticket.service';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Supports Postmark or generic JSON webhook format
    const toAddress = body.To || body.to || '';
    const fromAddress = body.From || body.from || '';
    let textBody = body.TextBody || body.text || '';
    
    // Extract ticket ID from support+ticketId@domain.com
    const match = toAddress.match(/support\+(.+)@/i);
    if (!match) {
      return NextResponse.json({ error: 'No ticket ID in To address' }, { status: 400 });
    }
    
    const ticketId = match[1];
    
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: { user: true }
    });
    
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }
    
    // Verify that the From address belongs to the ticket owner
    if (!ticket.user.email || !fromAddress.toLowerCase().includes(ticket.user.email.toLowerCase())) {
      console.warn(`[Email Webhook] Unauthorized sender: ${fromAddress} for ticket ${ticketId}`);
      return NextResponse.json({ error: 'Unauthorized sender' }, { status: 403 });
    }
    
    // Basic email reply stripping (removes quoted history)
    textBody = textBody.split(/\r?\nOn .+ wrote:/i)[0]
                       .split(/\r?\n> /)[0]
                       .split('--- \r\n')[0]
                       .trim();

    if (!textBody) {
      textBody = '[Пустое сообщение]';
    }

    // Process attachments (if any)
    const attachments = body.Attachments || body.attachments || [];
    let mediaUrl: string | undefined = undefined;
    let mediaType: string | undefined = undefined;

    if (attachments.length > 0) {
      const att = attachments[0]; // Take first attachment for MVP
      const content = att.Content || att.content; // base64
      const mimeType = att.ContentType || att.contentType || 'application/octet-stream';
      
      if (content) {
        const buffer = Buffer.from(content, 'base64');
        const ext = mimeType.split('/')[1] || 'bin';
        const fileName = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
        const dir = path.join(process.cwd(), 'private', 'uploads', 'tickets', ticketId);
        
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, fileName), buffer);
        
        mediaUrl = `/tickets/${ticketId}/${fileName}`;
        
        if (mimeType.startsWith('image/')) mediaType = 'image';
        else if (mimeType.startsWith('video/')) mediaType = 'video';
        else if (mimeType.startsWith('audio/')) mediaType = 'audio';
        else mediaType = 'document';
      }
    }
    
    await ticketService.addMessage(ticketId, 'USER', textBody, mediaUrl, mediaType);
    
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Inbound Email Webhook] Error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
