import { SmartAnalyzerLogic } from './src/services/providers/smart-analyzer.logic';

const cases = [
  "VK Play Зрители на 1 час",
  "VK Автопросмотры на пост - 7 дней",
  "TG Жалобы [Группа | Живые]",
  "Telegram — Репорты о нарушениях / нарушающем контенте (Другое | Без отчёта)",
  "Telegram — Репорты о нарушениях / нарушающем контенте (18+ контент | Без отчёта)",
  "Itunes Скачивания [Все Эпизоды]",
  "Wildberries | Лайки на отзывы (Полезно) [👤 Живые]",
  "Medium Просмотры [HQ | Пост]"
];

for (const c of cases) {
  const res = SmartAnalyzerLogic.detectSync(c);
  console.log(`"${c}"`);
  console.log(`  -> Platform: ${res.platform}`);
  console.log(`  -> Category: ${res.category}`);
  console.log('');
}
