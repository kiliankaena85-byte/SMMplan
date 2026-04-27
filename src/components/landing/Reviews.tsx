import { Star } from "lucide-react";

export function Reviews() {
  const reviews = [
    { name: "Александр В.", service: "TG Подписчики", text: "Заказывал подписчиков в канал. Выполнили даже быстрее заявленного, списаний за 2 недели не было. Рекомендую.", stars: 5 },
    { name: "Мария К.", service: "Instagram Лайки", text: "Очень удобный интерфейс, всё понятно без лишних кнопок. Заказала услугу с гарантией — всё отлично. Буду пользоваться.", stars: 5 },
    { name: "Денис П.", service: "VK Просмотры", text: "Топ за свои деньги. Пользовался другим сервисом, тут цены ниже, а качество выше. Радует что оплата без пополнений.", stars: 5 },
  ];

  return (
    <section className="py-20 bg-slate-50 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            Отзывы наших клиентов
          </h2>
          <p className="mt-4 text-slate-500 font-medium max-w-xl mx-auto">
            Более 100 000 выполненных заказов. Доверие профессионалов. Средняя оценка 4.9/5
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((r, i) => (
            <div key={i} className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`w-4 h-4 ${star <= r.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                ))}
              </div>
              <p className="text-slate-700 font-medium mb-6 leading-relaxed relative z-10">
                "{r.text}"
              </p>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{r.name}</h4>
                  <p className="text-xs text-sky-500 font-medium mt-0.5">{r.service}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
                  {r.name[0]}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
