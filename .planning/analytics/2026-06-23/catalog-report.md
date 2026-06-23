# 🏷️ Catalog Health Report
**Date:** 2026-06-23T10:39:09.461Z
**Services Analyzed:** 921

## Scoreboard
| Pass | Issues Found |
|--------|-----------------|
| Duplicates | 9 |
| Garbage | 8 |
| Classification | 173 |
| Dead/Zombie | 0 |
| Language | 10 |
| Legal Risks | 1 |

## Catalog Health Score
Score: **78.2 / 100**
Rating: B

## Detailed Findings (Sample)
- **[Duplicates]** Found 5 identical services: YouTube — Реакции на прямой эфир (Реакция: ❤️) / 🤖 Боты (Network: YOUTUBE)
- **[Duplicates]** Found 2 identical services: Twitter (X) | Сохранения (Закладки) (Network: TWITTER)
- **[Duplicates]** Found 2 identical services: Twitter (X) | Голоса в опросе (Network: TWITTER)
- **[Duplicates]** Found 2 identical services: OK.RU Лайки [HQ | 0-6/Ч | 500/Д | Возможны Списания | Без Гарантии] (Network: OK)
- **[Duplicates]** Found 2 identical services: MAX | Репосты (Network: MAX)
- **[Duplicates]** Found 2 identical services: Steam лайки (Network: STEAM)
- **[Duplicates]** Found 2 identical services: Whatsapp Реакции [ 👍 | Канал | Пост | 0-1/Ч | 2К/Д | Списания Возможны | Без Гарантии] (Network: WHATSAPP)
- **[Duplicates]** Found 2 identical services: Steam просмотры (Network: STEAM)
- **[Duplicates]** Found 2 identical services: ɪɢ Сохранения (Network: OTHER)
- **[Garbage]** [35] Useless range: 1-1
- **[Garbage]** [269] Useless range: 1-1
- **[Garbage]** [347] Useless range: 1-1
- **[Garbage]** [487] Useless range: 1-1
- **[Garbage]** [773] Useless range: 1-1
- **[Garbage]** [761] Useless range: 1-1
- **[Garbage]** [877] Useless range: 1-1
- **[Garbage]** [878] Useless range: 1-1
- **[TargetType]** [9] "ᴛɢ 🎁 Подарок на аккаунт/канал за 25 звёзд" has targetType=CHANNEL, expected CUSTOM
- **[TargetType]** [7] "ᴛɢ 🎁 Подарок на аккаунт/канал за 15 звёзд" has targetType=CHANNEL, expected CUSTOM
- **[TargetType]** [67] "Telegram — Региональные просмотры для 1 истории (🇺🇸 США)" has targetType=POST, expected STORY
- **[TargetType]** [68] "Telegram — Живые просмотры для 1 истории" has targetType=POST, expected STORY
- **[TargetType]** [69] "Telegram — Реакции на 1 историю канала (❤️)" has targetType=POST, expected STORY
- **[TargetType]** [71] "TG Просмотры [Истории | Микс | HQ | 0-1/Ч | 50К/Д | Списания Возможны | Без Гарантии]" has targetType=POST, expected STORY
- **[TargetType]** [72] "564. TG Реакции на Истории" has targetType=POST, expected STORY
- **[TargetType]** [73] "TG Просмотры + Лайки [Истории | Микс | HQ | 0-1/Ч | 50К/Д | Списания Возможны | Без Гарантии]" has targetType=POST, expected STORY
- **[TargetType]** [74] "Telegram Просмотры Историй" has targetType=POST, expected STORY
- **[TargetType]** [75] "🌟Telegram - Просмотры историй l Premium Аккаунты l Для поисковой оптимизации" has targetType=POST, expected STORY
- **[TargetType]** [79] "666. TG Подписка на просмотры РФ (Автопросмотры) 10 будущих постов🖼️" has targetType=POST, expected CHANNEL
- **[TargetType]** [66] "Telegram — Моментальные просмотры для 1 истории" has targetType=POST, expected STORY
- **[Classification]** [82] "TG Подписчики [Авто Просмотры Постов | Канал | 0-1/Ч | 100К/Д | Без Списаний | Гарантия 60Д]" is a Follower service but in category "🔄 Автопросмотры"
- **[TargetType]** [82] "TG Подписчики [Авто Просмотры Постов | Канал | 0-1/Ч | 100К/Д | Без Списаний | Гарантия 60Д]" has targetType=POST, expected CHANNEL
- **[TargetType]** [83] "Telegram Авто - Просмотры - 5 Будущих постов [Для закрытых каналов]" has targetType=POST, expected CHANNEL
- **[Classification]** [85] "🔥Telegram Подписчики + Авто Просмотры от подписчиков [Россия] [30 дней]" is a Follower service but in category "🔄 Автопросмотры"
- **[TargetType]** [85] "🔥Telegram Подписчики + Авто Просмотры от подписчиков [Россия] [30 дней]" has targetType=POST, expected CHANNEL
- **[Classification]** [81] "TG Подписчики [Авто Просмотры Постов | Канал | 0-1/Ч | 100К/Д | Без Списаний | Гарантия 30Д]" is a Follower service but in category "🔄 Автопросмотры"
- **[TargetType]** [81] "TG Подписчики [Авто Просмотры Постов | Канал | 0-1/Ч | 100К/Д | Без Списаний | Гарантия 30Д]" has targetType=POST, expected CHANNEL
- **[Classification]** [122] "VK Лайки [MQ | Любые Ссылки |  0-1/Ч | 5К/Д | Списания Возможны | Гарантия 30Д]" is a VK service but in network "VK"
- **[Classification]** [123] "VK Лайки [LQ | 0-1/Ч | 200/Д | Списания Возможны | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [124] "VK Лайки [0-1/Ч | 200/Д | Списания Возможны | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [125] "VK Лайки [СНГ | MQ | 1-24/Ч | 1К/Д | Возможны Списания | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [126] "VK.com | Лайки" is a VK service but in network "VK"
- **[Classification]** [127] "VK Лайки на посты [СНГ] [Быстрые]" is a VK service but in network "VK"
- **[Classification]** [128] "VK Лайки [Живые | 0-6/Ч| 1К/Д | Возможны Списания | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [129] "VK Лайки на посты [Медленные]" is a VK service but in network "VK"
- **[Classification]** [130] "ВКонтакте — Лайки (+ VKVideo) / 🔀 Микс качество" is a VK service but in network "VK"
- **[TargetType]** [110] "Telegram (TG) | Реакции [Признательный буст: 👍 🙏]" has targetType=POST, expected CHANNEL
- **[TargetType]** [111] "ᴛɢ Премиум просмотры на 5 постов" has targetType=POST, expected CHANNEL
- **[Classification]** [132] "VK.com | Реакции [Микс 👍❤️🔥😂😍😮] [👤 Живые]" is a VK service but in network "VK"
- **[Classification]** [133] "VK.com | Просмотры постов" is a VK service but in network "VK"
- **[Classification]** [134] "ВКонтакте | Рекламные просмотры постов [Киносайты] [👤 Живые]" is a VK service but in network "VK"
- **[Classification]** [135] "VK Просмотры [Пост | Глазик | 0-3/Ч | 1К/Д | Списания Возможны | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [136] "VK Просмотры [Видео | 0-48/Ч | 5-15К/Д | Списания Возможны | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [137] "VK Просмотры [Пост | Россия | 0-1/Ч | 5К/Д | Списания Возможны | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [138] "VK Просмотры [Товар | Глазик | 0-1/Ч | 500К/Д | Списания Возможны | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [139] "ВКонтакте | Просмотры видео [👤 Живые]" is a VK service but in network "VK"
- **[Classification]** [140] "ВКонтакте | Просмотры клипов [👤 Живые]" is a VK service but in network "VK"
- **[Classification]** [141] "ВКонтакте | Рекламные просмотры видео [Киносайты] [👤 Живые]" is a VK service but in network "VK"
- **[Classification]** [142] "VK Просмотры [Видео | Дешёвые | HQ | 0-1/Ч | 500/Д | Списания Возможны | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [144] "VK Подписчики в группу [СНГ] [Гарантия 12 дней]" is a Follower service but in category "👥 Вступление в группы / чаты"
- **[Classification]** [144] "VK Подписчики в группу [СНГ] [Гарантия 12 дней]" is a VK service but in network "VK"
- **[Classification]** [145] "VK Подписчики Премиум Живые [в группу] [Гарантия 90 дней♻️]" is a Follower service but in category "👥 Вступление в группы / чаты"
- **[Classification]** [145] "VK Подписчики Премиум Живые [в группу] [Гарантия 90 дней♻️]" is a VK service but in network "VK"
- **[Classification]** [146] "VK Подписчики [Дешевые | Микс | 0-6/Ч | 2-4К/Д | Списания Возможны | Без Гарантии]" is a Follower service but in category "👥 Вступление в группы / чаты"
- **[Classification]** [146] "VK Подписчики [Дешевые | Микс | 0-6/Ч | 2-4К/Д | Списания Возможны | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [147] "VK Подписчики [Группа/Страница | MQ | 0-15/М | 10К/Д | Списания до 100% | Без Гарантии]" is a Follower service but in category "👥 Вступление в группы / чаты"
- **[Classification]** [147] "VK Подписчики [Группа/Страница | MQ | 0-15/М | 10К/Д | Списания до 100% | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [148] "VK Подписчики [Группа | Живые | С аватарками | РФ | 0-10/Ч | 5К/Д | Списания до 100% | Без Гарантии]" is a Follower service but in category "👥 Вступление в группы / чаты"
- **[Classification]** [148] "VK Подписчики [Группа | Живые | С аватарками | РФ | 0-10/Ч | 5К/Д | Списания до 100% | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [149] "VK Подписчики [Группа | HQ | 0-1/Ч | 500/Д | Списания до 100% | Без Гарантии]" is a Follower service but in category "👥 Вступление в группы / чаты"
- **[Classification]** [149] "VK Подписчики [Группа | HQ | 0-1/Ч | 500/Д | Списания до 100% | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [150] "VK Подписчики [Группа/Профиль | HQ | Россия | 0-1/Ч | 250-1К/Д | Списания 0-20% | Без Гарантии]" is a Follower service but in category "👥 Вступление в группы / чаты"
- **[Classification]** [150] "VK Подписчики [Группа/Профиль | HQ | Россия | 0-1/Ч | 250-1К/Д | Списания 0-20% | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [152] "VK Посещение Группы/Страницы 👀⚡️" is a VK service but in network "VK"
- **[Classification]** [153] "VK Подписчики [Страница | Боты | 0-1/Ч | 5-10К/Д | Списания 0-100% | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [154] "VK Подписчики [Страница | РФ | Офферы | 0-1/Ч | 1К/Д | Списания 0-100% | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [143] "VK Просмотры [Пост | Группа | 0-15/М | 10К/Д | Списания Возможны | Без Гарантии]" is a VK service but in network "VK"
- **[TargetType]** [143] "VK Просмотры [Пост | Группа | 0-15/М | 10К/Д | Списания Возможны | Без Гарантии]" has targetType=POST, expected CHANNEL
- **[Classification]** [169] "VK Репосты [HQ | СНГ | 0-1/Ч | 1К/Д | Списания Возможны | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [170] "Репосты сайта в VK" is a VK service but in network "VK"
- **[Classification]** [171] "VK.com | Репосты (Shares) [👤 Живые]" is a VK service but in network "VK"
- **[Classification]** [172] "Youla.ru | Репосты объявления [Упор на VK] [👤 Живые]" is a VK service but in network "VK"
- **[Classification]** [156] "VK Подписчики [Страница | Живые | 0-6/Ч | 5К/Д | Списания 0-100% | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [157] "ВКонтакте | Подписчики" is a VK service but in network "VK"
- **[Classification]** [158] "VK Подписчики [Низкое качество] [Гарантия 30 дней♻️]" is a VK service but in network "VK"
- **[Classification]** [159] "ВКонтакте | Подписчики [👤 Живые]" is a VK service but in network "VK"
- **[Classification]** [160] "VK Подписчики [СНГ] [Маленький процент собачек]" is a VK service but in network "VK"
- **[Classification]** [162] "VK VIDEO LIVE Подписчики [MQ | Онлайн | 0-15/М | 1K/Д | Списания Возможны | Гарантия 90Д]" is a VK service but in network "VK"
- **[Classification]** [164] "VK Автопросмотры на 50 будущих постов" is a VK service but in network "VK"
- **[Classification]** [165] "VK Просмотры [Пост | Безлимитные Автопросмотры | 7 суток | 0-1/Ч | 50К/Д | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [166] "VK Просмотры [Пост | Автопросмотры | 10шт | Без Гарантии]" is a VK service but in network "VK"
- **[Classification]** [167] "VK Репосты [Медленные]" is a VK service but in network "VK"
- **[Classification]** [168] "VK Репосты СНГ + Микс [Быстрые]" is a VK service but in network "VK"
- **[Classification]** [173] "ВКонтакте | Лайк + Репост) + Подписка [Пакет] [👤 Живые]" is a VK service but in network "VK"
- **[TargetType]** [173] "ВКонтакте | Лайк + Репост) + Подписка [Пакет] [👤 Живые]" has targetType=POST, expected CHANNEL
- **[Classification]** [174] "VK Подписчики [Авто-Просмотры] [Авто-Восстановление 45♻️]" is a Follower service but in category "👁 Просмотры / Охват"
- **[Classification]** [174] "VK Подписчики [Авто-Просмотры] [Авто-Восстановление 45♻️]" is a VK service but in network "VK"
- **[Classification]** [176] "VK VIDEO LIVE [1 Час | 10-3000 Зрителей | Неавторизованные | Расхождение 0-50%]" is a VK service but in network "VK"
- **[Classification]** [177] "VK VIDEO LIVE [2 Часа | 10-3000 Зрителей | Неавторизованные | Расхождение 0-50%]" is a VK service but in network "VK"
- **[Classification]** [178] "VK VIDEO LIVE [3 Часа | 10-3000 Зрителей | Неавторизованные | Расхождение 0-50%]" is a VK service but in network "VK"
- **[Classification]** [179] "Зрители (неавторизованные) для прямого эфира в VK Video Live (3 часа)" is a VK service but in network "VK"

...and 101 more.