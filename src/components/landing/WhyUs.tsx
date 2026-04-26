export function WhyUs() {
  const features = [
    {
      icon: '🌊',
      title: 'Плавный рост',
      desc: 'Drip-Feed подача — подписчики приходят постепенно, неотличимо от органического роста.',
    },
    {
      icon: '🛡️',
      title: 'Гарантия от отписок',
      desc: 'Бесплатная замена при отписках в течение гарантийного периода.',
    },
    {
      icon: '🧠',
      title: 'AI-подбор услуг',
      desc: 'Вставьте ссылку — система определит платформу и подберёт оптимальный пакет.',
    },
    {
      icon: '💎',
      title: 'Программа лояльности',
      desc: 'Чем больше заказов — тем ниже цены. До 15% скидки для постоянных клиентов.',
    },
  ];

  return (
    <section aria-labelledby="why-us-heading" className="mx-auto max-w-5xl px-4 py-12">
      <h2
        id="why-us-heading"
        className="text-2xl font-bold text-center text-foreground mb-3"
      >
        Почему выбирают нас
      </h2>
      <p className="text-center text-muted-foreground text-sm mb-8 max-w-md mx-auto">
        Более 10 000 клиентов доверяют Smmplan своё продвижение
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map(f => (
          <div
            key={f.title}
            className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
          >
            <div className="text-2xl mb-3">{f.icon}</div>
            <h3 className="font-bold text-sm text-foreground mb-1.5">{f.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
