'use client';

/**
 * Chat Messages list with Markdown formatting and Citations
 */

import React, { useState } from 'react';
import type { ChatMessage } from '../types';
import { Bot, User, Copy, Check, FileText, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface ManualChatMessagesProps {
  messages: ChatMessage[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export const ManualChatMessages: React.FC<ManualChatMessagesProps> = ({ messages, scrollRef }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Convert markdown links like [Каталог](/admin/catalog) into Next.js Link
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);

    return parts.map((part, index) => {
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        const isInternal = href.startsWith('/');
        if (isInternal) {
          return (
            <Link
              key={index}
              href={href}
              className="inline-flex items-center gap-0.5 text-primary hover:underline font-semibold"
            >
              <span>{label}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
            </Link>
          );
        }
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-mono text-xs"
          >
            {label}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {msg.role === 'assistant' && (
            <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-4 h-4 text-primary" />
            </div>
          )}

          <div
            className={`max-w-[85%] rounded-lg p-3 relative group ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground ml-6'
                : 'bg-muted/60 dark:bg-muted/30 border border-border/70 text-foreground mr-6'
            }`}
          >
            <div className="whitespace-pre-wrap break-words leading-relaxed">
              {renderFormattedText(msg.content)}
              {msg.isStreaming && (
                <span className="inline-block w-1.5 h-3.5 ml-1 bg-primary animate-pulse align-middle" />
              )}
            </div>

            {/* Chunks/Citations footer */}
            {msg.chunksUsed && msg.chunksUsed.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-border/40 flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <FileText className="w-2.5 h-2.5" /> Фрагменты кода:
                </span>
                {msg.chunksUsed.map((chunk, idx) => (
                  <span
                    key={idx}
                    className="inline-block px-1.5 py-0.5 rounded bg-background/80 border border-border text-[9px] font-mono text-muted-foreground truncate max-w-[140px]"
                    title={chunk.filePath || chunk.title}
                  >
                    {chunk.filePath ? chunk.filePath.split('/').slice(-2).join('/') : chunk.title}
                  </span>
                ))}
              </div>
            )}

            {/* Copy Button */}
            {msg.role === 'assistant' && !msg.isStreaming && (
              <button
                type="button"
                onClick={() => handleCopy(msg.content, msg.id)}
                className="absolute top-2 right-2 p-1 rounded bg-background/80 border border-border/60 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                title="Копировать ответ"
              >
                {copiedId === msg.id ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            )}
          </div>

          {msg.role === 'user' && (
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-4 h-4 text-secondary-foreground" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
