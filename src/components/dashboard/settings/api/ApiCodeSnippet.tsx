'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export interface ApiCodeSnippetProps {
  curlCode: string;
  nodeCode: string;
  jsonResponse: string;
}

export function ApiCodeSnippet({ curlCode, nodeCode, jsonResponse }: ApiCodeSnippetProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Код скопирован!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* CURL Command */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
          <span>CURL Запрос</span>
          <button
            type="button"
            onClick={() => copyCode(curlCode, 'curl')}
            aria-label="Скопировать CURL команду"
            className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer select-none min-h-[44px] px-3 py-2 rounded-lg"
          >
            {copiedId === 'curl' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedId === 'curl' ? 'Скопировано' : 'Копировать'}</span>
          </button>
        </div>
        <div className="bg-zinc-950 text-zinc-100 rounded-xl p-4 font-mono text-[11px] leading-relaxed shadow-inner overflow-x-auto border border-zinc-800">
          {curlCode}
        </div>
      </div>

      {/* Node.js script */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
          <span>Node.js Fetch</span>
          <button
            type="button"
            onClick={() => copyCode(nodeCode, 'node')}
            aria-label="Скопировать Node.js код"
            className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer select-none min-h-[44px] px-3 py-2 rounded-lg"
          >
            {copiedId === 'node' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedId === 'node' ? 'Скопировано' : 'Копировать'}</span>
          </button>
        </div>
        <div className="bg-zinc-950 text-zinc-100 rounded-xl p-4 font-mono text-[11px] leading-relaxed shadow-inner overflow-x-auto border border-zinc-800">
          {nodeCode}
        </div>
      </div>

      {/* JSON Response Model */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
          <span>Пример ответа (JSON)</span>
        </div>
        <div className="bg-zinc-950 text-zinc-100 rounded-xl p-4 font-mono text-[11px] leading-relaxed shadow-inner overflow-x-auto border border-zinc-800">
          {jsonResponse}
        </div>
      </div>
    </div>
  );
}
