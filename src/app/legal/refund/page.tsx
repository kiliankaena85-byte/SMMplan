import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Политика возврата (Refund Policy)',
  description: 'Политика возврата денежных средств и гарантийные обязательства.',
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          На главную
        </Link>
        
        <article className="bg-card rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12 prose prose-slate max-w-none">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-destructive" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight m-0">
              Политика возврата
            </h1>
          </div>
          
          <div className="space-y-6 text-slate-600 leading-relaxed text-sm">
            <p className="font-semibold text-slate-800 text-base mb-6">
              Внимательно ознакомьтесь с политикой возврата денежных средств (Refund Policy) перед совершением оплаты на сайте Smmplan.
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">1. Общие положения</h3>
            <p>
              1.1. В связи с автоматизированным характером предоставления цифровых услуг по продвижению в социальных сетях, возможность полного возврата средств (Refund Chargeback) строго ограничена.
            </p>
            <p>
              1.2. Оплачивая услуги, вы подтверждаете, что услуга начинает оказываться немедленно или в кратчайшие сроки, установленные регламентом, в соответствии со статьей 1259 ГК РФ.
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">2. Случаи, когда возврат НЕ производится</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Заказ уже передан в работу (статус &quot;In Progress&quot;, &quot;Processing&quot;). Автоматизированный процесс накрутки остановить технически невозможно.</li>
              <li>Списание (drop) подписчиков, лайков или просмотров социальной сетью для услуг, отмеченных меткой &quot;Без гарантии&quot; (No Refill).</li>
              <li>Блокировка аккаунта Заказчика социальной сетью. Исполнитель поставляет заказанный объем, но не может влиять на алгоритмы и защитные механизмы социальных сетей.</li>
              <li>Произошла ошибка по вине Заказчика (указана неверная ссылка, закрытый профиль). В таком случае средства могут быть возвращены на внутренний баланс сайта, но не на банковскую карту.</li>
            </ul>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">3. Случаи, допускающие частичный или полный возврат средств</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Технический сбой на стороне Исполнителя, в результате которого заказ не был выполнен в течение 72 часов (при условии отсутствия статуса завершения).</li>
              <li>Частичное невыполнение заказа (Partsial). Возврат осуществляется пропорционально невыполненному объему исключительно на внутренний баланс.</li>
            </ul>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">4. Гарантия (Refill)</h3>
            <p>
              4.1. Для услуг с заявленной гарантией (Refill 30 days и т.д.), в случае списаний, Пользователь вправе запросить бесплатное восполнение отписавшегося объема через службу поддержки в течение гарантийного периода. Возврат денежных средств за списания по гарантийным услугам не производится.
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">5. Процедура инициации возврата</h3>
            <p>
              Для запроса возврата (в случаях, предусмотренных п.3), Заказчику необходимо обратиться в Службу Поддержки через систему тикетов в Личном Кабинете или по адресу <a href="mailto:support@smmplan.pro" className="text-sky-500 hover:underline">support@smmplan.pro</a>, указав ID заказа и причину запроса. Заявки рассматриваются в течение 3 рабочих дней.
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
