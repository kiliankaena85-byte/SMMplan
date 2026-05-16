import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Договор публичной оферты',
  description: 'Договор публичной оферты на оказание услуг по продвижению в социальных сетях',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          На главную
        </Link>
        
        <article className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12 prose prose-slate max-w-none">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-8">
            Договор публичной оферты
          </h1>
          
          <div className="space-y-6 text-slate-600 leading-relaxed text-sm">
            <p className="font-semibold text-slate-800">
              Настоящий Договор является официальным предложением (публичной офертой) ИП (или ООО) [Название Компании] в соответствии со ст. 437 ГК РФ. 
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">1. Предмет договора</h3>
            <p>
              1.1. Исполнитель обязуется оказать Заказчику услуги по информационному и техническому продвижению аккаунтов в социальных сетях (накрутка подписчиков, лайков, просмотров и т.д.), а Заказчик обязуется оплатить эти услуги на условиях настоящей Оферты.
            </p>
            <p>
              1.2. Подробное описание услуг, их стоимость и сроки выполнения указаны на сайте https://smmplan.pro.
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">2. Права и обязанности сторон</h3>
            <p>
              2.1. Исполнитель обязуется качественно и в срок оказывать услуги.
            </p>
            <p>
              2.2. Заказчик обязуется предоставить корректные данные (ссылки) для выполнения заказа и оплатить услуги в полном объеме.
            </p>
            <p>
              2.3. Исполнитель не несет ответственности за блокировки аккаунтов Заказчика со стороны социальных сетей. Заказчик берет на себя все риски, связанные с искусственным продвижением.
            </p>
            <p>
              2.4. Заказчик уведомлен и согласен с тем, что социальные сети могут списывать (удалять) накрученных подписчиков/лайки. Подобные списания являются естественным процессом алгоритмов соцсетей и не считаются ненадлежащим оказанием услуг Исполнителем, за исключением случаев, когда для услуги явно указана гарантия восстановления (Refill/Warranty).
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">3. Порядок оплаты</h3>
            <p>
              3.1. Оплата услуг производится в виде 100% предоплаты через платежные агрегаторы, подключенные на сайте.
            </p>
            <p>
              3.2. Все платежи осуществляются в российских рублях (RUB). При оплате банковской картой обработка платежа происходит на защищенной странице процессингового центра.
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">4. Отказ от договора</h3>
            <p>
              4.1. Из-за специфики цифровых услуг Заказчик не вправе отказаться от оплаченного заказа после его передачи в работу (статус "In Progress"), так как автоматизированный процесс не может быть прерван.
            </p>
            <p>
              4.2. Возвраты средств регулируются отдельным документом — Политикой возврата (Refund Policy), доступным на сайте.
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">5. Реквизиты Исполнителя</h3>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 mt-4 text-xs font-mono">
              [Название Компании / ИП]<br />
              ИНН: [Номер ИНН]<br />
              ОГРНИП: [Номер ОГРНИП]<br />
              Email: support@smmplan.pro<br />
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
