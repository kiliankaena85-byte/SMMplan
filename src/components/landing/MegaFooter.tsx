import React from "react";
import Link from "next/link";
import { Zap, ShieldCheck, CreditCard, Mail, ArrowUpRight } from "lucide-react";
import { ROUTES } from "@/lib/routes";

export function MegaFooter() {
  return (
    <footer className="bg-background text-foreground pt-24 pb-12 border-t border-border relative overflow-hidden mt-auto">
      {/* Premium Glow & Grid */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-30 mask-image:linear-gradient(to_bottom,white,transparent)" />
      
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12 mb-16 relative z-10">
        
        {/* Column 1: Brand & Payments (Takes more space) */}
        <div className="md:col-span-5 space-y-6 pr-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center shadow-inner">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-2xl font-black tracking-tight text-foreground">Smmplan</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            Платформа нового поколения для B2B продвижения. Мгновенный запуск, строгая конфиденциальность и официальная работа с гарантиями.
          </p>
          <div className="pt-4 flex gap-4 text-muted-foreground/60">
             <CreditCard className="w-7 h-7" />
             <ShieldCheck className="w-7 h-7" />
          </div>
          <p className="text-[10px] text-muted-foreground/50 max-w-sm leading-relaxed mt-4">
            * Сервисы Instagram и Facebook принадлежат компании Meta, признанной экстремистской организацией и запрещенной на территории РФ.
          </p>
        </div>

        {/* Column 2: Legal Links */}
        <div className="md:col-span-3 space-y-6">
          <h4 className="text-muted-foreground font-semibold tracking-[0.1em] text-[11px] uppercase mb-6">Документы</h4>
          <ul className="space-y-4 text-sm font-medium">
            <li><Link href={ROUTES.LEGAL.TERMS} className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group">Публичная оферта <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity -ml-1 group-hover:ml-0" /></Link></li>
            <li><Link href={ROUTES.LEGAL.PRIVACY} className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group">Конфиденциальность <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity -ml-1 group-hover:ml-0" /></Link></li>
            <li><Link href={ROUTES.LEGAL.REFUND} className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group">Возврат средств <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity -ml-1 group-hover:ml-0" /></Link></li>
            <li><Link href={ROUTES.LEGAL.TERMS} className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group">Правила сервиса <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity -ml-1 group-hover:ml-0" /></Link></li>
          </ul>
        </div>

        {/* Column 3: Contact & Support */}
        <div className="md:col-span-4 space-y-6">
          <h4 className="text-muted-foreground font-semibold tracking-[0.1em] text-[11px] uppercase mb-6">Поддержка</h4>
          <p className="text-sm text-muted-foreground">Наша команда на связи 24/7. Среднее время ответа составляет 15 минут.</p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <a 
              href="/api/support/telegram"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all w-full sm:w-auto"
            >
              Поддержка в Telegram
            </a>
            <a 
              href="mailto:support@smmplan.pro"
              className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-content2 text-foreground font-bold text-sm border border-border/50 hover:bg-content3 hover:border-border transition-all w-full sm:w-auto gap-2"
            >
              <Mail className="w-4 h-4" /> Email
            </a>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-6 border-t border-border/40 pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs font-medium text-muted-foreground/60 relative z-10">
        <div className="flex flex-col gap-1.5">
          <p>© {new Date().getFullYear()} Smmplan Lite. Все права защищены.</p>
          <p className="text-[10px] opacity-70">
            Официальный сервис продвижения. ИНН: 000000000000 / ОГРНИП: 300000000000000
            {/* TODO(SEO): Впишите реальные реквизиты юр.лица для прохождения YMYL-фильтров Яндекса */}
          </p>
          <p className="text-[10px] opacity-70">Адрес: г. Москва (укажите реальный адрес офиса)</p>
        </div>
        <p className="flex items-center gap-1">Designed with <span className="text-rose-500/70">❤</span> for B2B Growth</p>
      </div>
    </footer>
  );
}
