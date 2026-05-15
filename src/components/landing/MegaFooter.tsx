import React from "react";
import Link from "next/link";
import { Zap, Shield, CreditCard } from "lucide-react";

export function MegaFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 pt-20 pb-10 rounded-t-[3rem] mt-auto relative overflow-hidden">
      {/* Glow effect for footer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 mb-16 relative z-10">
        
        {/* Column 1: Brand & Payments */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-card/10 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight">Smmplan</span>
          </div>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
            Профессиональная платформа для продвижения. Работаем официально, чеки отправляются автоматически.
          </p>
          <div className="pt-4 flex gap-3 text-zinc-600">
             <CreditCard className="w-8 h-8" />
             <Shield className="w-8 h-8" />
          </div>
          <p className="text-[10px] text-zinc-600 max-w-xs leading-relaxed">
            * Сервисы Instagram и Facebook принадлежат компании Meta, признанной экстремистской организацией и запрещенной в РФ.
          </p>
        </div>

        {/* Column 2: Legal Links */}
        <div className="space-y-6 md:pl-10">
          <h4 className="text-white font-bold tracking-wide">Документы</h4>
          <ul className="space-y-4 text-sm font-medium">
            <li><Link href="/p/offer" className="hover:text-white transition-colors">Публичная оферта</Link></li>
            <li><Link href="/p/privacy" className="hover:text-white transition-colors">Политика конфиденциальности</Link></li>
            <li><Link href="/p/refund" className="hover:text-white transition-colors">Правила возврата средств</Link></li>
            <li><Link href="/p/terms" className="hover:text-white transition-colors">Правила использования</Link></li>
          </ul>
        </div>

        {/* Column 3: Contact & Support */}
        <div className="space-y-6">
          <h4 className="text-white font-bold tracking-wide">Нужна помощь?</h4>
          <p className="text-sm">Служба поддержки работает 24/7. Время ответа до 15 минут.</p>
          <Link 
            href="/dashboard/tickets"
            className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-primary/10 text-primary font-bold text-sm border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all w-full sm:w-auto"
          >
            Задать вопрос
          </Link>
          <div className="pt-4 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">Служба поддержки работает круглосуточно</p>
            <p className="text-xs text-zinc-500 mt-1">support@smmplan.ru</p>
          </div>
        </div>

      </div>

      <div className="max-w-6xl mx-auto px-6 border-t border-zinc-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-zinc-600 relative z-10">
        <p>© {new Date().getFullYear()} Smmplan Lite. Все права защищены.</p>
        <p>Made with ❤️ in CIS</p>
      </div>
    </footer>
  );
}
