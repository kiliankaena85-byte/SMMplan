"use client";

import React from "react";
import { motion } from "framer-motion";
import { X, Link2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LinkModal({
  showLinkModal,
  setShowLinkModal,
  url,
  setUrl,
  handleCheckout,
}: {
  showLinkModal: boolean;
  setShowLinkModal: (show: boolean) => void;
  url: string;
  setUrl: (url: string) => void;
  handleCheckout: () => void;
}) {
  if (!showLinkModal) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={() => setShowLinkModal(false)}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white rounded-3xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.2)] p-8 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-black text-slate-900">Укажите ссылку</h3>
            <p className="text-sm text-slate-500 mt-1">Куда отправить заказ?</p>
          </div>
          <button onClick={() => setShowLinkModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        
        <div className="relative mb-6">
          <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="url" 
            value={url} 
            onChange={e => setUrl(e.target.value)} 
            placeholder="Например: t.me/durov или instagram.com/username"
            autoFocus
            className="w-full h-14 pl-12 pr-6 rounded-2xl border-2 border-slate-200 bg-white text-[15px] font-semibold text-slate-800 placeholder-slate-400 focus:border-sky-400 focus:shadow-[0_8px_20px_-6px_rgba(14,165,233,0.15)] outline-none transition-all"
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val && !/^https?:\/\//i.test(val) && val.includes('.') && !val.includes(' ')) {
                setUrl(`https://${val}`);
              } else {
                setUrl(val);
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && url.trim().length > 0) {
                let finalUrl = url.trim();
                if (!/^https?:\/\//i.test(finalUrl) && finalUrl.includes('.') && !finalUrl.includes(' ')) {
                  finalUrl = `https://${finalUrl}`;
                  setUrl(finalUrl);
                }
                setShowLinkModal(false);
                handleCheckout();
              }
            }}
          />
        </div>

        <div className="flex items-center justify-end gap-4">
          <Button
            onClick={() => {
              if (url.trim().length > 0) {
                setShowLinkModal(false);
                handleCheckout();
              }
            }}
            disabled={url.trim().length === 0}
            className="h-14 px-8 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-base shadow-lg transition-all flex items-center gap-2"
          >
            Продолжить <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
