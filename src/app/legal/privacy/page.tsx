import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности',
  description: 'Политика конфиденциальности и обработки персональных данных Smmplan',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          На главную
        </Link>
        
        <article className="bg-card rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12 prose prose-slate max-w-none">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-8">
            Политика конфиденциальности
          </h1>
          
          <div className="space-y-6 text-slate-600 leading-relaxed text-sm">
            <p className="font-semibold text-slate-800">
              Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей сайта Smmplan.ru.
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">1. Сбор информации</h3>
            <p>
              Мы собираем минимально необходимый объем информации для оказания услуг. К ней относится: адрес электронной почты (для регистрации и авторизации), ссылки на социальные сети (для выполнения заказов) и платежные данные (обрабатываются на стороне защищенных эквайрингов).
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">2. Использование данных</h3>
            <p>
              Собранные данные используются исключительно в целях:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Оказания запрошенных услуг продвижения;</li>
              <li>Связи с клиентом по вопросам заказов и технической поддержки;</li>
              <li>Предотвращения мошеннических операций.</li>
            </ul>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">3. Передача третьим лицам</h3>
            <p>
              Мы не передаем адреса электронной почты и иные персональные данные третьим лицам, за исключением случаев, предусмотренных законодательством РФ. Ссылки на продвигаемые профили передаются автоматизированным провайдерам строго для выполнения текущего заказа.
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">4. Безопасность</h3>
            <p>
              Сайт использует современное SSL-шифрование для защиты всех передаваемых данных. Пароли пользователей хранятся в защищенном (хэшированном) виде. Мы не храним данные банковских карт — все операции происходят на шлюзах официальных банков-партнеров.
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">5. Использование Cookies</h3>
            <p>
              Сайт применяет технологию Cookies для сохранения сессий авторизации и аналитики посещаемости (Яндекс.Метрика). Продолжая использование сайта, вы соглашаетесь с использованием файлов cookie.
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">6. Контакты</h3>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 mt-4 text-xs font-mono">
              По всем вопросам, касающимся обработки персональных данных, обращайтесь:<br />
              Email: privacy@smmplan.pro<br />
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
