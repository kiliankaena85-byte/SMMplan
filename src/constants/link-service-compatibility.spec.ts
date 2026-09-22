import { describe, it, expect } from 'vitest';
import {
  TargetTypeEnum,
  TargetTypeEnum,
  normalizeLinkType,
  normalizeTargetTypeEnum,
  isTargetTypeCompatible,
  getCompatibilityError,
} from './link-service-compatibility';

describe('Link-Service Compatibility Truth Table (100% Cell Coverage)', () => {
  describe('Normalization Layer', () => {
    it('normalizes lowercase link types to canonical TargetTypeEnum enum', () => {
      expect(normalizeLinkType('channel')).toBe(TargetTypeEnum.CHANNEL);
      expect(normalizeLinkType('group')).toBe(TargetTypeEnum.CHANNEL);
      expect(normalizeLinkType('profile')).toBe(TargetTypeEnum.PROFILE);
      expect(normalizeLinkType('user')).toBe(TargetTypeEnum.PROFILE);
      expect(normalizeLinkType('post')).toBe(TargetTypeEnum.POST);
      expect(normalizeLinkType('video')).toBe(TargetTypeEnum.VIDEO);
      expect(normalizeLinkType('story')).toBe(TargetTypeEnum.STORY);
      expect(normalizeLinkType('poll')).toBe(TargetTypeEnum.POLL);
      expect(normalizeLinkType('bot')).toBe(TargetTypeEnum.BOT);
      expect(normalizeLinkType('unknown_xyz')).toBe(TargetTypeEnum.CUSTOM);
    });

    it('normalizes legacy and colloquial service target types to TargetTypeEnum enum', () => {
      expect(normalizeTargetTypeEnum('CHANNEL')).toBe(TargetTypeEnum.CHANNEL);
      expect(normalizeTargetTypeEnum('SUBSCRIBERS')).toBe(TargetTypeEnum.CHANNEL);
      expect(normalizeTargetTypeEnum('PROFILE')).toBe(TargetTypeEnum.PROFILE);
      expect(normalizeTargetTypeEnum('LIKES')).toBe(TargetTypeEnum.POST_INTERACTION);
      expect(normalizeTargetTypeEnum('POST')).toBe(TargetTypeEnum.POST_INTERACTION);
      expect(normalizeTargetTypeEnum('VIDEO')).toBe(TargetTypeEnum.VIDEO_INTERACTION);
      expect(normalizeTargetTypeEnum('AUTO_VIEWS')).toBe(TargetTypeEnum.CHANNEL_POSTS);
      expect(normalizeTargetTypeEnum('AUTO_POSTS')).toBe(TargetTypeEnum.CHANNEL_POSTS);
      expect(normalizeTargetTypeEnum('POLL_VOTES')).toBe(TargetTypeEnum.POLL_VOTES);
      expect(normalizeTargetTypeEnum('COMMENTS')).toBe(TargetTypeEnum.COMMENTS);
    });
  });

  describe('Strict Compatibility Matrix', () => {
    it('CHANNEL link compatibility', () => {
      // ✅ Permitted
      expect(isTargetTypeCompatible(TargetTypeEnum.CHANNEL, TargetTypeEnum.CHANNEL)).toBe(true);
      expect(isTargetTypeCompatible(TargetTypeEnum.CHANNEL, TargetTypeEnum.CHANNEL_POSTS)).toBe(true);
      expect(isTargetTypeCompatible(TargetTypeEnum.CHANNEL, TargetTypeEnum.PROFILE)).toBe(true);
      expect(isTargetTypeCompatible(TargetTypeEnum.CHANNEL, TargetTypeEnum.CUSTOM)).toBe(true);

      // ❌ Blocked
      expect(isTargetTypeCompatible(TargetTypeEnum.CHANNEL, TargetTypeEnum.POST_INTERACTION)).toBe(false);
      expect(isTargetTypeCompatible(TargetTypeEnum.CHANNEL, TargetTypeEnum.VIDEO_INTERACTION)).toBe(false);
      expect(isTargetTypeCompatible(TargetTypeEnum.CHANNEL, TargetTypeEnum.STORY_INTERACTION)).toBe(false);
      expect(isTargetTypeCompatible(TargetTypeEnum.CHANNEL, TargetTypeEnum.COMMENTS)).toBe(false);
    });

    it('PROFILE link compatibility (Critical Likes Bug Prevention)', () => {
      // ✅ Permitted
      expect(isTargetTypeCompatible(TargetTypeEnum.PROFILE, TargetTypeEnum.PROFILE)).toBe(true);
      expect(isTargetTypeCompatible(TargetTypeEnum.PROFILE, TargetTypeEnum.CHANNEL)).toBe(true);
      expect(isTargetTypeCompatible(TargetTypeEnum.PROFILE, TargetTypeEnum.CHANNEL_POSTS)).toBe(true);
      expect(isTargetTypeCompatible(TargetTypeEnum.PROFILE, TargetTypeEnum.CUSTOM)).toBe(true);

      // ❌ Blocked: Likes on profile link is strictly forbidden!
      expect(isTargetTypeCompatible(TargetTypeEnum.PROFILE, TargetTypeEnum.POST_INTERACTION)).toBe(false);
      expect(isTargetTypeCompatible(TargetTypeEnum.PROFILE, TargetTypeEnum.VIDEO_INTERACTION)).toBe(false);
      expect(isTargetTypeCompatible(TargetTypeEnum.PROFILE, TargetTypeEnum.STORY_INTERACTION)).toBe(false);
      expect(isTargetTypeCompatible(TargetTypeEnum.PROFILE, TargetTypeEnum.COMMENTS)).toBe(false);
    });

    it('POST link compatibility', () => {
      // ✅ Permitted
      expect(isTargetTypeCompatible(TargetTypeEnum.POST, TargetTypeEnum.POST_INTERACTION)).toBe(true);
      expect(isTargetTypeCompatible(TargetTypeEnum.POST, TargetTypeEnum.VIDEO_INTERACTION)).toBe(true);
      expect(isTargetTypeCompatible(TargetTypeEnum.POST, TargetTypeEnum.COMMENTS)).toBe(true);
      expect(isTargetTypeCompatible(TargetTypeEnum.POST, TargetTypeEnum.POLL_VOTES)).toBe(true);
      expect(isTargetTypeCompatible(TargetTypeEnum.POST, TargetTypeEnum.CUSTOM)).toBe(true);

      // ❌ Blocked: Subscribers or Auto-Views on single post link
      expect(isTargetTypeCompatible(TargetTypeEnum.POST, TargetTypeEnum.CHANNEL)).toBe(false);
      expect(isTargetTypeCompatible(TargetTypeEnum.POST, TargetTypeEnum.PROFILE)).toBe(false);
      expect(isTargetTypeCompatible(TargetTypeEnum.POST, TargetTypeEnum.CHANNEL_POSTS)).toBe(false);
      expect(isTargetTypeCompatible(TargetTypeEnum.POST, TargetTypeEnum.STORY_INTERACTION)).toBe(false);
      expect(isTargetTypeCompatible(TargetTypeEnum.POST, TargetTypeEnum.BOT_STARTS)).toBe(false);
    });

    it('VIDEO link compatibility', () => {
      expect(isTargetTypeCompatible(TargetTypeEnum.VIDEO, TargetTypeEnum.VIDEO_INTERACTION)).toBe(true);
      expect(isTargetTypeCompatible(TargetTypeEnum.VIDEO, TargetTypeEnum.POST_INTERACTION)).toBe(true);
      expect(isTargetTypeCompatible(TargetTypeEnum.VIDEO, TargetTypeEnum.COMMENTS)).toBe(true);
      expect(isTargetTypeCompatible(TargetTypeEnum.VIDEO, TargetTypeEnum.CHANNEL)).toBe(false);
      expect(isTargetTypeCompatible(TargetTypeEnum.VIDEO, TargetTypeEnum.PROFILE)).toBe(false);
    });

    it('STORY link compatibility', () => {
      expect(isTargetTypeCompatible(TargetTypeEnum.STORY, TargetTypeEnum.STORY_INTERACTION)).toBe(true);
      expect(isTargetTypeCompatible(TargetTypeEnum.STORY, TargetTypeEnum.POST_INTERACTION)).toBe(false);
      expect(isTargetTypeCompatible(TargetTypeEnum.STORY, TargetTypeEnum.CHANNEL)).toBe(false);
      expect(isTargetTypeCompatible(TargetTypeEnum.STORY, TargetTypeEnum.VIDEO_INTERACTION)).toBe(false);
    });

    it('POLL link compatibility', () => {
      expect(isTargetTypeCompatible(TargetTypeEnum.POLL, TargetTypeEnum.POLL_VOTES)).toBe(true);
      expect(isTargetTypeCompatible(TargetTypeEnum.POLL, TargetTypeEnum.POST_INTERACTION)).toBe(true);
      expect(isTargetTypeCompatible(TargetTypeEnum.POLL, TargetTypeEnum.CHANNEL)).toBe(false);
    });

    it('BOT link compatibility', () => {
      expect(isTargetTypeCompatible(TargetTypeEnum.BOT, TargetTypeEnum.BOT_STARTS)).toBe(true);
      expect(isTargetTypeCompatible(TargetTypeEnum.BOT, TargetTypeEnum.CHANNEL)).toBe(true);
      expect(isTargetTypeCompatible(TargetTypeEnum.BOT, TargetTypeEnum.POST_INTERACTION)).toBe(false);
    });
  });

  describe('Educational Error Messaging', () => {
    it('returns informative explanation when profile link is provided for likes', () => {
      const err = getCompatibilityError(TargetTypeEnum.PROFILE, TargetTypeEnum.POST_INTERACTION, 'Лайки на пост');
      expect(err).toContain('прямую ссылку на конкретный пост или фото, а не на страницу профиля');
    });

    it('returns informative explanation when channel link is provided for post likes', () => {
      const err = getCompatibilityError(TargetTypeEnum.CHANNEL, TargetTypeEnum.POST_INTERACTION, 'Лайки');
      expect(err).toContain('отдельный пост в канале');
    });

    it('returns informative explanation when post link is provided for subscribers', () => {
      const err = getCompatibilityError(TargetTypeEnum.POST, TargetTypeEnum.CHANNEL, 'Подписчики');
      expect(err).toContain('ссылку на сам канал');
    });

    it('returns informative explanation when post link is provided for channel auto-views', () => {
      const err = getCompatibilityError(TargetTypeEnum.POST, TargetTypeEnum.CHANNEL_POSTS, 'Автопросмотры');
      expect(err).toContain('требуется ссылка на канал целиком');
    });
  });
});
