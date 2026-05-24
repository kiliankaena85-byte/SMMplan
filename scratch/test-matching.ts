import { matchesSuggestedCategory } from '../src/services/analyzer/category-matcher';

const suggestedCategories = [
  'Подписчики / Участники',
  'Premium Подписчики',
  'Бусты (Telegram Levels)',
  'Вступление в группы / чаты',
  'Сториз / Истории',
  'Звезды (Telegram Stars)',
  'Автопросмотры',
  'Автореакции',
  'Авторепосты'
];

const dbCategories = [
  'Лайки',
  'Подписчики',
  'Просмотры',
  'Комментарии',
  'Бусты (Telegram Levels)',
  'Звезды (Telegram Stars)',
  'Автопросмотры'
];

console.log('Testing category matching:');
dbCategories.forEach(dbCat => {
  const matched = matchesSuggestedCategory(dbCat, suggestedCategories);
  console.log(`DB Category: "${dbCat}" -> matched: ${matched}`);
});
