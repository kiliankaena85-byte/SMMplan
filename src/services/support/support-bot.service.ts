import { db } from '@/lib/db';
import { ticketService } from '@/services/support/ticket.service';
import { bot } from '@/bot';
import fs from 'fs';
import path from 'path';

class SupportBotService {
  private readonly UPLOAD_DIR_BASE = path.join(process.cwd(), 'private', 'uploads', 'tickets');

  constructor() {
    if (!fs.existsSync(this.UPLOAD_DIR_BASE)) {
      fs.mkdirSync(this.UPLOAD_DIR_BASE, { recursive: true });
    }
  }

  /**
   * INBOUND: Handle messages from Telegram Bot and save to Database
   */
  async handleIncomingMessage(ctx: any, userId: string) {
    let text = '';
    let mediaUrl: string | null = null;
    let mediaType: string | null = null;

    // 1. Text
    if (ctx.message.text) {
      text = ctx.message.text;
    }

    // Find or Create Active Ticket FIRST, because we need ticketId for media storage
    const subject = ctx.message.text?.substring(0, 50) || ctx.message.caption?.substring(0, 50) || 'Медиа сообщение';
    let ticket = await ticketService.getOrCreateTicket(userId, subject, 'TELEGRAM');

    // 2. Photo
    if (ctx.message.photo && ctx.message.photo.length > 0) {
      text = ctx.message.caption || '';
      mediaType = 'image';
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      mediaUrl = await this.downloadTelegramFile(ctx, photo.file_id, 'jpg', ticket.id, photo.file_size);
      if (!mediaUrl) return; 
    }

    // 3. Document
    if (ctx.message.document) {
      text = ctx.message.caption || '';
      mediaType = 'document';
      const doc = ctx.message.document;
      
      let ext = 'file';
      if (doc.mime_type === 'image/png') ext = 'png';
      else if (doc.mime_type === 'image/jpeg') ext = 'jpg';
      else if (doc.mime_type === 'application/pdf') ext = 'pdf';
      
      mediaUrl = await this.downloadTelegramFile(ctx, doc.file_id, ext, ticket.id, doc.file_size);
      if (!mediaUrl) return;
    }

    // 4. Voice
    if (ctx.message.voice) {
      text = '🎤 Голосовое сообщение';
      mediaType = 'audio';
      mediaUrl = await this.downloadTelegramFile(ctx, ctx.message.voice.file_id, 'ogg', ticket.id, ctx.message.voice.file_size);
      if (!mediaUrl) return;
    }

    if (!text && !mediaUrl) {
      return ctx.reply('⚠️ Пустое сообщение. Пожалуйста, отправьте текст или файл.');
    }

    // 5. Detect Replies (Swipe to reply in Telegram)
    let replyToId: string | null = null;
    if (ctx.message.reply_to_message?.message_id) {
      const originalTgMsgId = String(ctx.message.reply_to_message.message_id);
      // Find internal message by telegramMsgId
      const originalMsg = await db.ticketMessage.findFirst({
        where: { telegramMsgId: originalTgMsgId }
      });
      if (originalMsg) {
        replyToId = originalMsg.id;
      }
    }



    // 7. Save Message to DB & Update Ticket Status via ticketService
    await ticketService.addMessage(
      ticket.id,
      'USER',
      text,
      mediaUrl || undefined,
      mediaType || undefined,
      replyToId || undefined,
      String(ctx.message.message_id)
    );

    // 9. Client-Centric Reaction/Ack
    // If this is the FIRST message in this specific ticket from the user, or ticket just created
    const userMessageCount = await db.ticketMessage.count({
      where: { ticketId: ticket.id, sender: 'USER' }
    });

    if (userMessageCount <= 1) {
      await ctx.reply('✅ Ваше сообщение передано в поддержку. Ожидайте ответа.', { reply_to_message_id: ctx.message.message_id }).catch(() => {});
    } else {
      // For subsequent messages, just react to avoid spam
      try {
        await ctx.react('👨‍💻');
      } catch(e) {
        // Ignored. Not all chats support reactions.
      }
    }
  }

  /**
   * OUTBOUND: Send reply from Admin panel to Telegram
   */
  async sendSupportReply(telegramId: string, text: string, replyToTgMsgId?: string): Promise<string | null> {
    try {
      const extra: any = { parse_mode: 'HTML' };
      if (replyToTgMsgId) {
        extra.reply_to_message_id = Number(replyToTgMsgId);
      }
      
      // We prepend '👨‍💻 Саппорт:\n' to make it clear
      const msg = await bot.telegram.sendMessage(telegramId, `👨‍💻 <b>Саппорт:</b>\n\n${text}`, extra);
      return String(msg.message_id);
    } catch (e: any) {
      console.error('[SupportBot] Failed to send to telegram:', e.message);
      // If reply_to_message_id failed (message deleted), retry without reply
      if (e.message.includes('message to reply not found') && replyToTgMsgId) {
        try {
          const msg = await bot.telegram.sendMessage(telegramId, `👨‍💻 <b>Саппорт:</b>\n\n${text}`, { parse_mode: 'HTML' });
          return String(msg.message_id);
        } catch (innerE) {
          console.error('[SupportBot] Failed retry send:', innerE);
        }
      }
      return null;
    }
  }

  /**
   * EDIT: Admin edits message in Admin panel -> sync to Telegram
   */
  async editSupportReply(telegramId: string, telegramMsgId: string, newText: string): Promise<boolean> {
    try {
      await bot.telegram.editMessageText(
        telegramId,
        Number(telegramMsgId),
        undefined,
        `👨‍💻 <b>Саппорт:</b>\n\n${newText}\n\n<i>(изменено)</i>`,
        { parse_mode: 'HTML' }
      );
      return true;
    } catch (e: any) {
      console.error('[SupportBot] Failed to edit telegram message:', e.message);
      if (e.message.includes('message is not modified')) return true; // It's fine
      throw new Error(e.message); // throw to show Toast in Admin
    }
  }

  /**
   * DELETE: Admin deletes message in Admin panel -> sync to Telegram
   */
  async deleteSupportReply(telegramId: string, telegramMsgId: string): Promise<boolean> {
    try {
      await bot.telegram.deleteMessage(telegramId, Number(telegramMsgId));
      return true;
    } catch (e: any) {
      console.error('[SupportBot] Failed to delete telegram message:', e.message);
      throw new Error(e.message);
    }
  }

  // --- Helper ---
  private async downloadTelegramFile(ctx: any, fileId: string, ext: string, ticketId: string, fileSize?: number): Promise<string | null> {
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB (Reduced from 20MB for safety)
    if (fileSize && fileSize > MAX_SIZE) {
      await ctx.reply('⚠️ Файл слишком большой (макс. 10 МБ). Загрузите его на файлообменник и отправьте ссылку.');
      return null;
    }
    
    // Anti-Flood: Check if user uploaded too many files in last 24h
    try {
       const userRecentMediaCount = await db.ticketMessage.count({
          where: { 
            ticketId, 
            mediaUrl: { not: null },
            createdAt: { gt: new Date(Date.now() - 24 * 3600 * 1000) } 
          }
       });
       if (userRecentMediaCount > 15) {
          await ctx.reply('⚠️ Прием медиафайлов временно ограничен (сработал антиспам). Опишите проблему текстом.');
          return null;
       }
    } catch {}

    try {
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const response = await fetch(fileLink.toString());
      if (!response.ok) throw new Error('Failed to fetch file');
      
      const buffer = Buffer.from(await response.arrayBuffer());
      const fileName = `tg_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      
      const ticketDir = path.join(this.UPLOAD_DIR_BASE, ticketId);
      if (!fs.existsSync(ticketDir)) {
         fs.mkdirSync(ticketDir, { recursive: true });
      }
      
      const filePath = path.join(ticketDir, fileName);
      fs.writeFileSync(filePath, buffer);
      
      // Store relative path exactly as the API expects
      return `tickets/${ticketId}/${fileName}`;
    } catch (e) {
      console.error('[SupportBot] File download error:', e);
      await ctx.reply('❌ Ошибка при скачивании файла сервером.');
      return null;
    }
  }
}

export const supportBotService = new SupportBotService();
