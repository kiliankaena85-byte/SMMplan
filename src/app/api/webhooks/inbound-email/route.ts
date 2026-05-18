import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ticketService } from '@/services/support/ticket.service';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { SettingsProvider } from '@/lib/settings';
import { getMimeType } from '@/lib/mime';

export const dynamic = 'force-dynamic';

function slugifyFileName(name: string): string {
  // Extract base and extension separately
  const extIndex = name.lastIndexOf('.');
  let base = extIndex !== -1 ? name.substring(0, extIndex) : name;
  const ext = extIndex !== -1 ? name.substring(extIndex + 1) : '';

  // Safe slugify map for Russian (Cyrillic) to Latin characters
  const charMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
    'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh',
    'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
    'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts',
    'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu',
    'Я': 'Ya'
  };

  // Convert Cyrillic to Latin
  base = base.split('').map(char => charMap[char] || char).join('');

  // Replace invalid filename characters with hyphens
  base = base
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!base) {
    base = 'attachment';
  }

  // Cap base length to fit path limits
  base = base.substring(0, 50);

  return ext ? `${base}.${ext.toLowerCase()}` : base;
}

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = await SettingsProvider.getInboundEmailWebhookSecret();

    // 1. Content Length Check to prevent memory exhaustion DoS (OOM)
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 10 * 1024 * 1024) { // 10MB limit
      console.error('[CRITICAL] Webhook request body too large (Content-Length). Rejected to prevent OOM.');
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
    }

    // Streaming body consumption to protect against spoofed Content-Length header DoS (OOM mitigation)
    let rawBody = '';
    const bodyStream = req.body;
    if (!bodyStream) {
      console.error('[CRITICAL] Webhook request body stream is null or unavailable.');
      return NextResponse.json({ error: 'Request body unavailable' }, { status: 400 });
    }

    const reader = bodyStream.getReader();
    const decoder = new TextDecoder('utf-8');
    let totalBytes = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          if (totalBytes > 10 * 1024 * 1024) { // 10MB Hard Limit
            console.error('[CRITICAL] Webhook request body too large during stream consumption (spoof protection). Rejected.');
            reader.releaseLock();
            return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
          }
          rawBody += decoder.decode(value, { stream: true });
        }
      }
      rawBody += decoder.decode(); // flush remaining bytes
    } catch (streamError) {
      console.error('Error reading webhook body stream:', streamError);
      reader.releaseLock();
      return NextResponse.json({ error: 'Failed to read request stream' }, { status: 400 });
    }

    // 2. Replay attack protection (timestamp verification)
    const timestampHeader = req.headers.get('x-webhook-timestamp') || 
                            req.headers.get('x-postmark-timestamp') || 
                            req.headers.get('x-timestamp');
    if (timestampHeader) {
      const timestampMs = isNaN(Number(timestampHeader)) 
        ? Date.parse(timestampHeader) 
        : Number(timestampHeader);
        
      if (!isNaN(timestampMs)) {
        const ageSeconds = Math.abs(Date.now() - timestampMs) / 1000;
        if (ageSeconds > 300) { // 5 minutes window (replay attack mitigation)
          console.error('[CRITICAL] Webhook request expired (replay protection check failed).');
          return NextResponse.json({ error: 'Webhook request expired (replay protection)' }, { status: 400 });
        }
      }
    }

    // 3. HMAC or direct token webhook signature validation (C3)
    if (webhookSecret) {
      const signature = req.headers.get('x-webhook-signature') || 
                        req.headers.get('x-postmark-secret') || 
                        req.headers.get('authorization');
                        
      if (!signature) {
        console.error('[CRITICAL] Webhook authorization/signature header missing.');
        return NextResponse.json({ error: 'Signature header missing' }, { status: 401 });
      }

      // Normalise signature to strip standard prefixes (e.g. "sha256=", "sha256-") and lowercase
      let normalisedSignature = signature.trim();
      if (normalisedSignature.startsWith('sha256=')) {
        normalisedSignature = normalisedSignature.substring(7);
      } else if (normalisedSignature.startsWith('sha256-')) {
        normalisedSignature = normalisedSignature.substring(7);
      }
      normalisedSignature = normalisedSignature.toLowerCase();

      // Check 1: Direct secret match (timing-safe comparison to prevent side-channel leaks)
      let isDirectMatch = false;
      try {
        const sigBuffer = Buffer.from(signature.trim(), 'utf-8');
        const secretBuffer = Buffer.from(webhookSecret, 'utf-8');
        if (sigBuffer.length === secretBuffer.length) {
          isDirectMatch = crypto.timingSafeEqual(sigBuffer, secretBuffer);
        }
      } catch (e) {
        // Safe ignore
      }

      // Check 2: HMAC SHA-256 validation (timing-safe comparison of lowercase hex hash)
      let isHmacMatch = false;
      try {
        const computedHmac = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
        const sigBuffer = Buffer.from(normalisedSignature, 'utf-8');
        const computedBuffer = Buffer.from(computedHmac, 'utf-8');
        if (sigBuffer.length === computedBuffer.length) {
          isHmacMatch = crypto.timingSafeEqual(sigBuffer, computedBuffer);
        }
      } catch (e) {
        // Safe fallback if matching fails
      }

      if (!isDirectMatch && !isHmacMatch) {
        let extractedFrom = 'unknown';
        let extractedTicketId = 'unknown';
        try {
          const tempBody = JSON.parse(rawBody);
          extractedFrom = tempBody.From || tempBody.from || 'unknown';
          const toAddress = tempBody.To || tempBody.to || '';
          const match = toAddress.match(/support\+(.+)@/i);
          if (match) extractedTicketId = match[1];
        } catch (e) {
          // ignore parsing error
        }

        console.error(`[CRITICAL] [ACTION REQUIRED] Webhook validation failed. Possible lost email from customer. Signature mismatch. Sender: ${extractedFrom}, TicketID: ${extractedTicketId}`);
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);
    
    // Supports Postmark or generic JSON webhook format
    const toAddress = body.To || body.to || '';
    const fromAddress = body.From || body.from || '';
    let textBody = body.TextBody || body.text || '';
    
    // Extract ticket ID from support+ticketId@domain.com
    const match = toAddress.match(/support\+(.+)@/i);
    if (!match) {
      console.error(`[CRITICAL] [ACTION REQUIRED] Email webhook failed: No ticket ID in To address. To: ${toAddress}, Sender: ${fromAddress}`);
      return NextResponse.json({ error: 'No ticket ID in To address' }, { status: 400 });
    }
    
    const ticketId = match[1];

    // Validate ticketId is a valid CUID pattern to mitigate Path Traversal (C2)
    const cuidSchema = z.string().cuid();
    const parseResult = cuidSchema.safeParse(ticketId);
    if (!parseResult.success) {
      console.error(`[CRITICAL] [ACTION REQUIRED] Email webhook failed: Path Traversal or malformed CUID ticket ID. Ticket ID: ${ticketId}, Sender: ${fromAddress}`);
      return NextResponse.json({ error: 'Invalid ticket ID format' }, { status: 400 });
    }
    
    // Strict order: perform DB check BEFORE any file writes or folder creations (C2)
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: { user: true }
    });
    
    if (!ticket) {
      console.error(`[CRITICAL] [ACTION REQUIRED] Email webhook failed: Ticket not found in database. Ticket ID: ${ticketId}, Sender: ${fromAddress}`);
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }
    
    // Verify that the From address belongs to the ticket owner strictly
    const extractEmail = (addr: string) => {
      const match = addr.match(/<(.+)>/);
      return match ? match[1].trim() : addr.trim();
    };
    const extractedFrom = extractEmail(fromAddress).toLowerCase();

    if (!ticket.user.email || extractedFrom !== ticket.user.email.toLowerCase()) {
      console.error(`[CRITICAL] [ACTION REQUIRED] Email webhook failed: Unauthorized sender. Ticket ID: ${ticketId}, Sender: ${extractedFrom}, Ticket Owner: ${ticket.user.email}`);
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
    const attachmentsToSave: Array<{ url: string; type: string; mimeType: string; name: string; size?: number }> = [];

    if (attachments.length > 0) {
      // Whitelist extension check - whitelisted extensions verified exactly as documented in Whitelist policy
      const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 'doc', 'docx', 'zip']);

      for (const att of attachments) {
        const content = att.Content || att.content; // base64
        const originalName = att.Name || att.name || 'attachment';
        const mimeType = att.ContentType || att.contentType || getMimeType(originalName);
        
        if (content) {
          const buffer = Buffer.from(content, 'base64');
          const cleanName = slugifyFileName(originalName);
          
          // Split clean name into base and extension to insert safe suffix cleanly (Staff UX)
          const extIndex = cleanName.lastIndexOf('.');
          const baseName = extIndex !== -1 ? cleanName.substring(0, extIndex) : cleanName;
          const rawExt = extIndex !== -1 ? cleanName.substring(extIndex + 1) : 'bin';
          
          const actualExt = ALLOWED_EXTENSIONS.has(rawExt.toLowerCase()) ? rawExt.toLowerCase() : 'bin';
          
          // Safe, recognizable name with short random suffix to prevent name collisions
          const fileName = `${baseName}-${crypto.randomBytes(6).toString('hex')}.${actualExt}`;
          
          // Strict folder prefix containment check to double protect against traversal (C2)
          const uploadBase = path.resolve(process.cwd(), 'private', 'uploads', 'tickets');
          const dir = path.resolve(uploadBase, ticketId);
          
          if (!dir.startsWith(uploadBase)) {
            console.error(`[CRITICAL] Path traversal attempt blocked! Dir: ${dir}, Base: ${uploadBase}`);
            return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
          }
          
          try {
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(path.join(dir, fileName), buffer);
            
            const fileUrl = `/tickets/${ticketId}/${fileName}`;
            
            let extractedType = 'document';
            if (mimeType.startsWith('image/')) extractedType = 'image';
            else if (mimeType.startsWith('video/')) extractedType = 'video';
            else if (mimeType.startsWith('audio/')) extractedType = 'audio';
            
            attachmentsToSave.push({
              url: fileUrl,
              type: extractedType,
              mimeType,
              name: originalName, // original filename (до slugify!)
              size: buffer.length
            });
          } catch (fsError) {
            console.error(`[CRITICAL] File system write failed for attachment ${originalName}:`, fsError);
          }
        }
      }
    }
    
    await ticketService.addMessage(
      ticketId, 
      'USER', 
      textBody, 
      undefined, 
      undefined, 
      undefined, 
      undefined, 
      attachmentsToSave
    );
    
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Inbound Email Webhook] Error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
