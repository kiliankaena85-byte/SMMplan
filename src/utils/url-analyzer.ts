export function getServiceFlags(selectedService: { name?: string | null; customDataType?: string | null; customDataLabel?: string | null; features?: unknown; [key: string]: unknown } | null | undefined) {
  const sName = selectedService?.name?.toLowerCase() || "";
  const cType = selectedService?.customDataType;
  
  const isCustomComments = cType === 'TEXTAREA' || sName.includes('свои') || sName.includes('свой текст');
  const isKeywords = cType === 'TEXT' || sName.includes('ключево');
  const isPoll = cType === 'NUMBER' || (sName.includes('опрос') && !sName.includes('просмотр')) || sName.includes('голосование');
  const isLiveStream = sName.includes('зрител') || sName.includes('эфир') || sName.includes('трансляц');
  const isPrivateChannel = sName.includes('закрыт');

  const customFieldLabel = selectedService?.customDataLabel?.trim() || (
    isCustomComments ? 'Ваши комментарии (по одному в строке)' 
    : isKeywords ? 'Ключевые слова (через запятую)' 
    : isPoll ? 'Номер варианта ответа' 
    : null
  );

  return {
    isCustomComments,
    isPoll,
    isLiveStream,
    isPrivateChannel,
    customFieldLabel
  };
}

export function getUrlFlags(url: string, activeCategory?: { name: string }) {
  const urlLower = url.toLowerCase();
  
  const isPrivateTelegramPost = urlLower.includes('t.me/c/') || urlLower.includes('telegram.me/c/');
  const isVkPhotoOrVideo = urlLower.includes('vk.com/photo') || urlLower.includes('vk.com/video') || urlLower.includes('vk.ru/photo') || urlLower.includes('vk.ru/video') || urlLower.includes('vkvideo.ru/');

  const isPostUrl = urlLower.includes('/p/') || 
                    urlLower.includes('/reel/') || 
                    urlLower.includes('/tv/') ||
                    urlLower.includes('wall') || 
                    urlLower.includes('watch?v=') || 
                    urlLower.includes('youtu.be/') || 
                    urlLower.includes('/shorts/') || 
                    (urlLower.includes('t.me/') && !urlLower.includes('t.me/c/') && /\/t\.me\/[\w-]+\/\d+/i.test(urlLower));

  const isChannelUrl = urlLower.length > 5 && !isPostUrl && (
    urlLower.includes('t.me/') || 
    (urlLower.includes('vk.com/') && !urlLower.includes('vk.com/wall') && !urlLower.includes('vk.com/video') && !urlLower.includes('vk.com/clip') && !urlLower.includes('vk.com/photo')) || 
    (urlLower.includes('instagram.com/') && !urlLower.includes('/p/') && !urlLower.includes('/reel/')) || 
    (urlLower.includes('youtube.com/') && !urlLower.includes('watch?v=') && !urlLower.includes('/shorts/'))
  );

  const isChannelCategory = activeCategory?.name?.toLowerCase().match(/(подписчик|фолловер|участник|канал|групп|буст|профиль|друзья)/i);
  const isPostCategory = activeCategory?.name?.toLowerCase().match(/(лайк|просмотр|реакц|репост|коммент|зрител|эфир|видео|клип)/i);

  return {
    isPrivateTelegramPost,
    isVkPhotoOrVideo,
    isPostUrl,
    isChannelUrl,
    isChannelCategory: !!isChannelCategory,
    isPostCategory: !!isPostCategory
  };
}
