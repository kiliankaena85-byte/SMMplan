import Link from "next/link";
import { Zap, Clock } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        
        {/* Основная сетка */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-12">
          
          {/* Колонка 1: Бренд + Описание (Span 4) */}
          <div className="lg:col-span-4 pr-0 lg:pr-8">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">Smmplan</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              Инновационная платформа автоматизации SMM-продвижения. Надежная накрутка подписчиков, просмотров и лайков с гарантией результата.
            </p>
          </div>
          
          {/* Колонка 2: Документы (Span 3) */}
          <div className="lg:col-span-3">
            <h3 className="font-semibold text-white mb-5 text-sm tracking-wide uppercase opacity-90">Документы</h3>
            <ul className="space-y-3">
              <li><Link href="/legal/terms" className="text-sm text-slate-400 hover:text-white transition-colors">Правила сервиса</Link></li>
              <li><Link href="/legal/terms" className="text-sm text-slate-400 hover:text-white transition-colors">Договор оферты</Link></li>
              <li><Link href="/legal/terms" className="text-sm text-slate-400 hover:text-white transition-colors">Политика конфиденциальности</Link></li>
              <li><Link href="/legal/terms" className="text-sm text-slate-400 hover:text-white transition-colors">Политика файлов cookie</Link></li>
              <li><Link href="/legal/refund" className="text-sm text-slate-400 hover:text-white transition-colors">Возврат средств</Link></li>
            </ul>
          </div>

          {/* Колонка 3: Информация (Span 2) */}
          <div className="lg:col-span-2">
            <h3 className="font-semibold text-white mb-5 text-sm tracking-wide uppercase opacity-90">Информация</h3>
            <ul className="space-y-3">
              <li><Link href="/support" className="text-sm text-slate-400 hover:text-white transition-colors">Контакты</Link></li>
              <li><Link href="/#faq" className="text-sm text-slate-400 hover:text-white transition-colors">Помощь (FAQ)</Link></li>
            </ul>
          </div>

          {/* Колонка 4: Поддержка (Span 3) */}
          <div className="lg:col-span-3">
            <h3 className="font-semibold text-white mb-5 text-sm tracking-wide uppercase opacity-90">Поддержка</h3>
            <div className="space-y-4">
              <a href="https://t.me/smmplan_support" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-colors group">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-primary transition-colors">
                  <svg className="w-4 h-4 text-primary group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.98 1.25-5.58 3.68-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.36-.49 1-.76 3.92-1.71 6.54-2.84 7.86-3.39 3.74-1.56 4.51-1.83 5.01-1.84.11 0 .36.03.49.14.11.09.14.22.15.33-.02.05-.02.13-.03.22z"/></svg>
                </div>
                Задать вопрос в Telegram
              </a>
              <a href="mailto:support@smmplan.ru" className="flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-colors group">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                support@smmplan.ru
              </a>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <span className="block text-slate-300">Без выходных</span>
                  <span className="block text-xs mt-0.5">С 9:00 до 21:00 по МСК</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Разделитель и Реквизиты/Оплата */}
        <div className="pt-8 border-t border-slate-800/50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="text-xs text-slate-400 space-y-1.5">
            <p><span className="text-slate-300 font-medium">Реквизиты:</span> Индивидуальный предприниматель (Напишите ваше ФИО)</p>
            <p>ИНН: 000000000000 | ОГРНИП: 000000000000000</p>
          </div>
          
          <div className="flex flex-col items-start lg:items-end gap-2">
            <span className="text-xs text-slate-400">Принимаем к оплате:</span>
            <div className="flex items-center gap-2">
              {/* Иконки методов оплаты (заглушки для дизайна) */}
              <div className="h-8 px-3 bg-slate-800/80 rounded-md flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-700/50">Банковские карты</div>
              <div className="h-8 px-3 bg-slate-800/80 rounded-md flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-700/50">СБП</div>
              <div className="h-8 px-3 bg-slate-800/80 rounded-md flex items-center justify-center text-xs font-bold text-slate-300 border border-slate-700/50">CryptoBot</div>
            </div>
          </div>
        </div>

        {/* Экстремистская сноска и копирайт */}
        <div className="mt-8 pt-6 border-t border-slate-800/30">
          <p className="text-xs text-slate-400/90 leading-relaxed mb-4 max-w-4xl">
            * Компания Meta Platforms Inc., владеющая социальными сетями Instagram и Facebook, признана экстремистской организацией, ее деятельность запрещена на территории России.
          </p>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Smmplan. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
}
