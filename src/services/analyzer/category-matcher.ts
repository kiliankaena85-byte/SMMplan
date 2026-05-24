/**
 * Category Matcher — Canonical bridge between link-rules and DB category names.
 * 
 * link-rules использует короткие имена: 'Подписчики', 'Просмотры'
 * DB использует emoji-формат: '👨‍👩‍👧‍👦 Подписчики / Участники', '👁 Просмотры / Охват'
 * 
 * Этот модуль нормализует оба формата в каноническую форму и делает fuzzy match.
 */

// Каноническая таблица: короткое имя → все возможные DB-варианты (substring match)
const CANONICAL_MAP: Record<string, string[]> = {
  'Подписчики':      ['Подписчики', 'Участники', 'Subscriber', 'Follow', 'Members'],
  'Просмотры':       ['Просмотр', 'Охват', 'View', 'Watch', 'Автопросмотр'],
  'Лайки':           ['Лайк', 'Like', 'Нравится', 'Heart', 'Автолайк'],
  'Комментарии':     ['Коммент', 'Comment', 'Отзыв', 'Review'],
  'Реакции':         ['Реакци', 'Reaction', 'Emoji', 'Эмоции'],
  'Репосты':         ['Репост', 'Repost', 'Share', 'Поделиться'],
  'Бусты':           ['Буст', 'Boost', 'Level'],
  'Голосования':     ['Голос', 'Опрос', 'Poll', 'Vote'],
  'Сториз':          ['Стори', 'Story', 'Истори'],
  'Боты':            ['Бот', 'Bot', 'Робот'],
  'Стримы':          ['Стрим', 'Stream', 'Зрител', 'Эфир', 'Viewer', 'Live'],
  'Сохранения':      ['Сохранен', 'Save', 'Bookmark', 'Закладк'],
  'Трафик':          ['Трафик', 'Traffic', 'Посещен', 'Organic', 'Keyword'],
  'Жалобы':          ['Жалоб', 'Report', 'Complaint', 'Репорт'],
  'Автоактивности':  ['Подписк', 'Auto', 'Авто', 'Будущ'], // Legacy if needed
  'Premium':         ['Premium', 'Премиум'],
  'Прослушивания':   ['Прослуш', 'Play', 'Listen'],
  'Статистика':      ['Стат', 'Impression', 'Reach', 'Впечатлен'],
  'Вступление':      ['Вступление', 'Инвайт', 'Invite', 'Join'],
  'Другое':          ['Друго', 'Other', 'Разн', 'Сигнал', 'Апвоут'],
  'Звезды':          ['Звезд', 'Star'],
  // Подкатегории для авто-услуг
  'Автопросмотры':   ['Автопросмотр', 'Auto View', 'Future View', 'Массовые просмотры', 'Массовый просмотр', 'Просмотры массовых'],
  'Авторепосты':     ['Авторепост', 'Auto Share', 'Auto Repost'],
  'Автореакции':     ['Автореакци', 'Auto React'],
};

/**
 * Checks if a category name represents an automated subscription/recurring service.
 */
function isAutoService(name: string): boolean {
  const n = name.toLowerCase();
  
  // Russian prefixes/words
  if (
    n.includes('автопросмотр') ||
    n.includes('автолайк') ||
    n.includes('автореакци') ||
    n.includes('авторепост') ||
    n.includes('автокоммент') ||
    n.includes('автоактивно') ||
    n.includes('автопрослуш') ||
    n.includes('автоопрос') ||
    n.includes('автоголос')
  ) {
    return true;
  }
  
  // English combinations
  if (
    n.includes('auto view') ||
    n.includes('auto-view') ||
    n.includes('auto like') ||
    n.includes('auto-like') ||
    n.includes('auto react') ||
    n.includes('auto-react') ||
    n.includes('auto share') ||
    n.includes('auto-share') ||
    n.includes('auto repost') ||
    n.includes('auto-repost') ||
    n.includes('auto comment') ||
    n.includes('auto-comment') ||
    n.includes('future view') ||
    n.includes('future-view') ||
    n.includes('future like') ||
    n.includes('future-like') ||
    n.includes('future react') ||
    n.includes('future-react') ||
    n.includes('future share') ||
    n.includes('future-share') ||
    n.includes('future repost') ||
    n.includes('future-repost') ||
    n.includes('future comment') ||
    n.includes('future-comment')
  ) {
    return true;
  }

  // Russian future/subscription patterns
  if (
    (n.includes('будущие') || n.includes('подписка на') || n.includes('автоподписка')) &&
    (n.includes('просмотр') || n.includes('лайк') || n.includes('реакци') || n.includes('репост') || n.includes('коммент') || n.includes('охват'))
  ) {
    return true;
  }

  return false;
}

/**
 * Matches a database category string like '👨‍👩‍👧‍👦 Подписчики / Участники'
 * against an array of suggested short categories like ['Подписчики', 'Автоактивности']
 */
export function matchesSuggestedCategory(
  dbCategoryName: string, 
  suggestedCategories: string[]
): boolean {
  if (suggestedCategories.length === 0) return true; // no filter = show all
  
  const dbIsAuto = isAutoService(dbCategoryName);
  
  const dbNameNormalized = dbCategoryName.toLowerCase()
    .replace(/[^\p{L}\p{N}\s/]/gu, '') // Strip emoji
    .trim();
  
  for (const suggested of suggestedCategories) {
    const suggestedIsAuto = isAutoService(suggested);
    
    // Mismatch guard: prevent regular targets (like single posts) matching automated monitoring categories
    if (dbIsAuto !== suggestedIsAuto) {
      continue;
    }

    const suggestedNormalized = suggested.toLowerCase()
      .replace(/[^\p{L}\p{N}\s/]/gu, '')
      .trim();

    // 1. Exact match (unlikely but fast path)
    if (dbCategoryName === suggested) return true;
    
    // 2. Contains match (dbName includes suggested)
    if (dbNameNormalized.includes(suggestedNormalized)) return true;

    // 3. Contains match (suggested includes dbName - word bounded to prevent "автопросмотры" matching "просмотры")
    // Use regex to ensure dbNameNormalized is matched as a whole word/phrase within suggestedNormalized
    try {
      const regex = new RegExp(`(^|[\\s/,-])${dbNameNormalized}([\\s/,-]|$)`, 'i');
      if (regex.test(suggestedNormalized)) return true;
    } catch(e) {
      // Fallback if dbNameNormalized has regex characters
      if (suggestedNormalized === dbNameNormalized) return true;
    }
    
    // 4. Canonical map lookup
    // Since suggestedCategories might be "Подписчики / Участники", we need to check if any key in CANONICAL_MAP is in suggested.
    for (const [key, synonyms] of Object.entries(CANONICAL_MAP)) {
      try {
        const keyRegex = new RegExp(`(^|[\\s/,-])${key.toLowerCase()}([\\s/,-]|$)`, 'i');
        if (keyRegex.test(suggestedNormalized)) {
          for (const syn of synonyms) {
            if (dbNameNormalized.includes(syn.toLowerCase())) return true;
          }
        }
      } catch (e) {
        if (suggestedNormalized.includes(key.toLowerCase())) {
          for (const syn of synonyms) {
            if (dbNameNormalized.includes(syn.toLowerCase())) return true;
          }
        }
      }
    }
  }
  
  return false;
}
