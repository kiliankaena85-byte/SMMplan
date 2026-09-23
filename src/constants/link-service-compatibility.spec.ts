import { describe, it, expect } from 'vitest';
import {
  LinkType,
  ServiceTargetType,
  normalizeLinkType,
  normalizeServiceTargetType,
  isLinkServiceCompatible,
  getCompatibilityError,
} from './link-service-compatibility';

describe('Link-Service Compatibility Truth Table (100% Cell Coverage)', () => {
  describe('Normalization Layer', () => {
    it('normalizes lowercase link types to canonical LinkType enum', () => {
      expect(normalizeLinkType('channel')).toBe(LinkType.CHANNEL);
      expect(normalizeLinkType('group')).toBe(LinkType.CHANNEL);
      expect(normalizeLinkType('profile')).toBe(LinkType.PROFILE);
      expect(normalizeLinkType('user')).toBe(LinkType.PROFILE);
      expect(normalizeLinkType('post')).toBe(LinkType.POST);
      expect(normalizeLinkType('video')).toBe(LinkType.VIDEO);
      expect(normalizeLinkType('story')).toBe(LinkType.STORY);
      expect(normalizeLinkType('poll')).toBe(LinkType.POLL);
      expect(normalizeLinkType('bot')).toBe(LinkType.BOT);
      expect(normalizeLinkType('unknown_xyz')).toBe(LinkType.CUSTOM);
    });

    it('normalizes legacy and colloquial service target types to LinkType enum', () => {
      expect(normalizeLinkType('CHANNEL')).toBe(LinkType.CHANNEL);
      expect(normalizeLinkType('SUBSCRIBERS')).toBe(LinkType.CHANNEL);
      expect(normalizeLinkType('PROFILE')).toBe(LinkType.PROFILE);
      expect(normalizeLinkType('LIKES')).toBe(LinkType.POST_INTERACTION);
      expect(normalizeLinkType('POST')).toBe(LinkType.POST_INTERACTION);
      expect(normalizeLinkType('VIDEO')).toBe(LinkType.VIDEO_INTERACTION);
      expect(normalizeLinkType('AUTO_VIEWS')).toBe(LinkType.CHANNEL_POSTS);
      expect(normalizeLinkType('AUTO_POSTS')).toBe(LinkType.CHANNEL_POSTS);
      expect(normalizeLinkType('POLL_VOTES')).toBe(LinkType.POLL_VOTES);
      expect(normalizeLinkType('COMMENTS')).toBe(LinkType.COMMENTS);
    });
  });

  describe('Strict Compatibility Matrix', () => {
    it('CHANNEL link compatibility', () => {
      // ✅ Permitted
      expect(isLinkServiceCompatible(LinkType.CHANNEL, LinkType.CHANNEL)).toBe(true);
      expect(isLinkServiceCompatible(LinkType.CHANNEL, LinkType.CHANNEL_POSTS)).toBe(true);
      expect(isLinkServiceCompatible(LinkType.CHANNEL, LinkType.PROFILE)).toBe(true);
      expect(isLinkServiceCompatible(LinkType.CHANNEL, LinkType.CUSTOM)).toBe(true);

      // ❌ Blocked
      expect(isLinkServiceCompatible(LinkType.CHANNEL, LinkType.POST_INTERACTION)).toBe(false);
      expect(isLinkServiceCompatible(LinkType.CHANNEL, LinkType.VIDEO_INTERACTION)).toBe(false);
      expect(isLinkServiceCompatible(LinkType.CHANNEL, LinkType.STORY_INTERACTION)).toBe(false);
      expect(isLinkServiceCompatible(LinkType.CHANNEL, LinkType.COMMENTS)).toBe(false);
    });

    it('PROFILE link compatibility (Critical Likes Bug Prevention)', () => {
      // ✅ Permitted
      expect(isLinkServiceCompatible(LinkType.PROFILE, LinkType.PROFILE)).toBe(true);
      expect(isLinkServiceCompatible(LinkType.PROFILE, LinkType.CHANNEL)).toBe(true);
      expect(isLinkServiceCompatible(LinkType.PROFILE, LinkType.CHANNEL_POSTS)).toBe(true);
      expect(isLinkServiceCompatible(LinkType.PROFILE, LinkType.CUSTOM)).toBe(true);

      // ❌ Blocked: Likes on profile link is strictly forbidden!
      expect(isLinkServiceCompatible(LinkType.PROFILE, LinkType.POST_INTERACTION)).toBe(false);
      expect(isLinkServiceCompatible(LinkType.PROFILE, LinkType.VIDEO_INTERACTION)).toBe(false);
      expect(isLinkServiceCompatible(LinkType.PROFILE, LinkType.STORY_INTERACTION)).toBe(false);
      expect(isLinkServiceCompatible(LinkType.PROFILE, LinkType.COMMENTS)).toBe(false);
    });

    it('POST link compatibility', () => {
      // ✅ Permitted
      expect(isLinkServiceCompatible(LinkType.POST, LinkType.POST_INTERACTION)).toBe(true);
      expect(isLinkServiceCompatible(LinkType.POST, LinkType.VIDEO_INTERACTION)).toBe(true);
      expect(isLinkServiceCompatible(LinkType.POST, LinkType.COMMENTS)).toBe(true);
      expect(isLinkServiceCompatible(LinkType.POST, LinkType.POLL_VOTES)).toBe(true);
      expect(isLinkServiceCompatible(LinkType.POST, LinkType.CUSTOM)).toBe(true);

      // ❌ Blocked: Subscribers or Auto-Views on single post link
      expect(isLinkServiceCompatible(LinkType.POST, LinkType.CHANNEL)).toBe(false);
      expect(isLinkServiceCompatible(LinkType.POST, LinkType.PROFILE)).toBe(false);
      expect(isLinkServiceCompatible(LinkType.POST, LinkType.CHANNEL_POSTS)).toBe(false);
      expect(isLinkServiceCompatible(LinkType.POST, LinkType.STORY_INTERACTION)).toBe(false);
      expect(isLinkServiceCompatible(LinkType.POST, LinkType.BOT_STARTS)).toBe(false);
    });

    it('VIDEO link compatibility', () => {
      expect(isLinkServiceCompatible(LinkType.VIDEO, LinkType.VIDEO_INTERACTION)).toBe(true);
      expect(isLinkServiceCompatible(LinkType.VIDEO, LinkType.POST_INTERACTION)).toBe(true);
      expect(isLinkServiceCompatible(LinkType.VIDEO, LinkType.COMMENTS)).toBe(true);
      expect(isLinkServiceCompatible(LinkType.VIDEO, LinkType.CHANNEL)).toBe(false);
      expect(isLinkServiceCompatible(LinkType.VIDEO, LinkType.PROFILE)).toBe(false);
    });

    it('STORY link compatibility', () => {
      expect(isLinkServiceCompatible(LinkType.STORY, LinkType.STORY_INTERACTION)).toBe(true);
      expect(isLinkServiceCompatible(LinkType.STORY, LinkType.POST_INTERACTION)).toBe(false);
      expect(isLinkServiceCompatible(LinkType.STORY, LinkType.CHANNEL)).toBe(false);
      expect(isLinkServiceCompatible(LinkType.STORY, LinkType.VIDEO_INTERACTION)).toBe(false);
    });

    it('POLL link compatibility', () => {
      expect(isLinkServiceCompatible(LinkType.POLL, LinkType.POLL_VOTES)).toBe(true);
      expect(isLinkServiceCompatible(LinkType.POLL, LinkType.POST_INTERACTION)).toBe(true);
      expect(isLinkServiceCompatible(LinkType.POLL, LinkType.CHANNEL)).toBe(false);
    });

    it('BOT link compatibility', () => {
      expect(isLinkServiceCompatible(LinkType.BOT, LinkType.BOT_STARTS)).toBe(true);
      expect(isLinkServiceCompatible(LinkType.BOT, LinkType.CHANNEL)).toBe(true);
      expect(isLinkServiceCompatible(LinkType.BOT, LinkType.POST_INTERACTION)).toBe(false);
    });
  });

  describe('Educational Error Messaging', () => {
    it('returns informative explanation when profile link is provided for likes', () => {
      const err = getCompatibilityError(LinkType.PROFILE, LinkType.POST_INTERACTION, 'Лайки на пост');
      expect(err).toContain('прямую ссылку на конкретный пост или фото, а не на страницу профиля');
    });

    it('returns informative explanation when channel link is provided for post likes', () => {
      const err = getCompatibilityError(LinkType.CHANNEL, LinkType.POST_INTERACTION, 'Лайки');
      expect(err).toContain('отдельный пост в канале');
    });

    it('returns informative explanation when post link is provided for subscribers', () => {
      const err = getCompatibilityError(LinkType.POST, LinkType.CHANNEL, 'Подписчики');
      expect(err).toContain('ссылку на сам канал');
    });

    it('returns informative explanation when post link is provided for channel auto-views', () => {
      const err = getCompatibilityError(LinkType.POST, LinkType.CHANNEL_POSTS, 'Автопросмотры');
      expect(err).toContain('требуется ссылка на канал целиком');
    });
  });
});
