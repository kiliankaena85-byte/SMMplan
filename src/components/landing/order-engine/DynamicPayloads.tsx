"use client";

import { memo } from "react";
import { PublicService } from "@/actions/order/catalog";
import { AlertTriangle, Info } from "lucide-react";

interface DynamicPayloadsProps {
  service: PublicService | null;
  customData: string;
  onCustomDataChange: (val: string) => void;
}

export const DynamicPayloads = memo(function DynamicPayloads({
  service,
  customData,
  onCustomDataChange
}: DynamicPayloadsProps) {
  if (!service) return null;

  const nameLower = service.name.toLowerCase();
  
  // Custom comments trigger
  const needsCustomComments = nameLower.includes("свои") || nameLower.includes("коммент");
  // Custom keywords trigger
  const needsKeywords = nameLower.includes("ключевые") || nameLower.includes("поиск");
  // Poll answer trigger
  const isPoll = nameLower.includes("опрос") || nameLower.includes("голос");

  // Warnings
  const isStream = nameLower.includes("стрим") || nameLower.includes("трансляц");
  const isPrivate = nameLower.includes("приватн") || nameLower.includes("закрыт");

  if (!needsCustomComments && !needsKeywords && !isPoll && !isStream && !isPrivate) {
    return null;
  }

  return (
    <div className="w-full mt-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
      
      {/* Stream Warning */}
      {isStream && (
        <div className="p-4 rounded-2xl bg-pink-50 border border-pink-100 flex gap-3 text-pink-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-pink-500" />
          <div className="text-sm">
            <strong>Внимание!</strong> Для зрителей на стрим делайте заказ <strong>ДО начала</strong> трансляции. 
            Накрутка стартует автоматически при запуске эфира.
          </div>
        </div>
      )}

      {/* Private Channel Warning */}
      {isPrivate && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-3 text-amber-800">
          <Info className="w-5 h-5 flex-shrink-0 text-amber-500" />
          <div className="text-sm">
            Убедитесь, что бот добавлен в закрытый канал, или ссылка является пригласительной.
          </div>
        </div>
      )}

      {/* Inputs */}
      {needsCustomComments && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Свой текст комментариев (каждый с новой строки):</label>
          <textarea
            value={customData}
            onChange={e => onCustomDataChange(e.target.value)}
            className="w-full p-4 rounded-2xl border border-slate-200 focus:border-sky-300 outline-none text-base min-h-[120px] resize-y custom-scrollbar"
            placeholder="Супер!\nОтличное видео!\nЖду продолжения..."
          />
          <div className="text-xs text-slate-500 text-right">
            {customData.split('\n').filter(l => l.trim()).length} строк
          </div>
        </div>
      )}

      {needsKeywords && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Ключевые слова:</label>
          <input
            type="text"
            value={customData}
            onChange={e => onCustomDataChange(e.target.value)}
            className="w-full p-4 rounded-2xl border border-slate-200 focus:border-sky-300 outline-none text-base"
            placeholder="Например: криптовалюта, инвестиции"
          />
        </div>
      )}

      {isPoll && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Номер варианта ответа (цифрой):</label>
          <input
            type="number"
            min="1"
            max="10"
            value={customData}
            onChange={e => onCustomDataChange(e.target.value)}
            className="w-full p-4 rounded-2xl border border-slate-200 focus:border-sky-300 outline-none text-base"
            placeholder="Например: 2"
          />
        </div>
      )}
    </div>
  );
});
