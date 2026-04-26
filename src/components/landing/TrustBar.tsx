export function TrustBar() {
  const stats = [
    { value: '2M+',  label: 'Заказов выполнено' },
    { value: '4 сек', label: 'Среднее время старта' },
    { value: '99%',  label: 'Заказов в срок' },
    { value: '24/7', label: 'Поддержка' },
  ];

  return (
    <section aria-label="Статистика платформы" className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <div
            key={s.label}
            className="text-center bg-card border border-border rounded-2xl p-4 hover:border-primary/20 transition-all duration-200"
          >
            <div className="text-xl md:text-2xl font-black text-foreground tabular-nums">
              {s.value}
            </div>
            <div className="text-xs text-muted-foreground font-medium mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
