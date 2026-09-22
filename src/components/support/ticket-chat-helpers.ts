import type { Message } from './chat/useChatMessages';
import type { ChatInputOrder } from './chat/ChatInput';

export interface DbTicketMessage {
  id: string;
  sender: string;
  text: string;
  mediaUrl: string | null;
  mediaType: string | null;
  createdAt: Date;
  isDeleted: boolean;
  isEdited: boolean;
  originalText: string | null;
  orderId: string | null;
  replyTo?: { id: string; text: string; sender: string } | null;
  attachments: Array<{
    id: string;
    url: string;
    type: string;
    mimeType: string | null;
    name: string | null;
    size: number | bigint | null;
    createdAt: Date;
  }>;
  order?: {
    id: string;
    numericId: number;
    status: string;
    charge: number | bigint;
    createdAt: Date;
    service?: { name: string } | null;
  } | null;
}

export interface DbHistoricalTicket {
  id: string;
  subject: string;
  messages: DbTicketMessage[];
}

export function mapHistoricalMessages(historicalTickets: DbHistoricalTicket[]): Message[] {
  const mapped: Message[] = [];
  const reversedHistorical = [...historicalTickets].reverse();

  for (const hTicket of reversedHistorical) {
    for (const m of hTicket.messages) {
      mapped.push({
        id: m.id,
        sender: m.sender,
        text: m.text,
        mediaUrl: m.mediaUrl,
        mediaType: m.mediaType,
        createdAt: m.createdAt.toISOString(),
        isDeleted: m.isDeleted,
        isEdited: m.isEdited,
        originalText: m.originalText,
        orderId: m.orderId,
        order: m.order ? {
          id: m.order.id,
          numericId: m.order.numericId,
          status: m.order.status,
          charge: Number(m.order.charge),
          createdAt: m.order.createdAt.toISOString(),
          serviceName: m.order.service?.name || 'Услуга'
        } : null,
        replyTo: m.replyTo ? {
          id: m.replyTo.id,
          text: m.replyTo.text,
          sender: m.replyTo.sender
        } : null,
        attachments: m.attachments.map(a => ({
          id: a.id,
          url: a.url,
          type: a.type,
          mimeType: a.mimeType,
          name: a.name,
          size: a.size ? Number(a.size) : null,
          createdAt: a.createdAt.toISOString()
        })),
        isHistorical: true,
        historicalTicketId: hTicket.id,
        historicalSubject: hTicket.subject
      });
    }
  }

  return mapped;
}

export function mapActiveMessages(rawMessages: DbTicketMessage[]): { messages: Message[]; nextCursor: string | null } {
  let nextCursor: string | null = null;
  const activeMessages = [...rawMessages];
  if (activeMessages.length > 50) {
    const extraItem = activeMessages.pop();
    nextCursor = extraItem?.id || null;
  }
  activeMessages.reverse();

  const messages: Message[] = activeMessages.map(m => ({
    id: m.id,
    sender: m.sender,
    text: m.text,
    mediaUrl: m.mediaUrl,
    mediaType: m.mediaType,
    createdAt: m.createdAt.toISOString(),
    isDeleted: m.isDeleted,
    isEdited: m.isEdited,
    originalText: m.originalText,
    orderId: m.orderId,
    order: m.order ? {
      id: m.order.id,
      numericId: m.order.numericId,
      status: m.order.status,
      charge: Number(m.order.charge),
      createdAt: m.order.createdAt.toISOString(),
      serviceName: m.order.service?.name || 'Услуга'
    } : null,
    replyTo: m.replyTo ? {
      id: m.replyTo.id,
      text: m.replyTo.text,
      sender: m.replyTo.sender
    } : null,
    attachments: m.attachments.map(a => ({
      id: a.id,
      url: a.url,
      type: a.type,
      mimeType: a.mimeType,
      name: a.name,
      size: a.size ? Number(a.size) : null,
      createdAt: a.createdAt.toISOString()
    }))
  }));

  return { messages, nextCursor };
}

export interface DbInitialOrder {
  id: string;
  numericId: number;
  createdAt: Date;
  status: string;
  charge: number | bigint;
  service?: { name: string } | null;
}

export function mapInitialOrders(initialOrders: DbInitialOrder[]): ChatInputOrder[] {
  return initialOrders.map(o => ({
    id: o.id,
    numericId: o.numericId,
    createdAt: o.createdAt.toISOString(),
    status: o.status,
    charge: Number(o.charge),
    serviceName: o.service?.name || 'Услуга'
  }));
}
