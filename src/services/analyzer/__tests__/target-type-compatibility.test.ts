import { describe, it, expect } from 'vitest';
import { normalizeTargetType, isTargetTypeCompatible } from '@/utils/target-type-mapper';
import { matchesSuggestedCategory } from '../category-matcher';

describe('TargetTypeMapper & Normalization Layer', () => {
  it('correctly normalizes lowercase link types to uppercase ServiceTargetType', () => {
    expect(normalizeTargetType('channel')).toBe('CHANNEL');
    expect(normalizeTargetType('post')).toBe('POST');
    expect(normalizeTargetType('private_post')).toBe('POST');
    expect(normalizeTargetType('video')).toBe('VIDEO');
    expect(normalizeTargetType('profile')).toBe('PROFILE');
    expect(normalizeTargetType('story')).toBe('STORY');
    expect(normalizeTargetType('poll')).toBe('POLL');
    expect(normalizeTargetType('channel_posts')).toBe('CHANNEL_POSTS');
    expect(normalizeTargetType('unknown_foo')).toBe('CUSTOM');
  });

  it('correctly checks compatibility between URL types and Service types', () => {
    // Channel URL can accept channel and channel_posts
    expect(isTargetTypeCompatible('channel', 'CHANNEL')).toBe(true);
    expect(isTargetTypeCompatible('channel', 'CHANNEL_POSTS')).toBe(true);
    expect(isTargetTypeCompatible('channel', 'POST')).toBe(false);

    // Post URL can ONLY accept POST / VIDEO / COMMENTS, never CHANNEL or CHANNEL_POSTS
    expect(isTargetTypeCompatible('post', 'POST')).toBe(true);
    expect(isTargetTypeCompatible('post', 'CHANNEL')).toBe(false);
    expect(isTargetTypeCompatible('post', 'CHANNEL_POSTS')).toBe(false);

    // Profile URL accepts PROFILE and CHANNEL, but not POST
    expect(isTargetTypeCompatible('profile', 'PROFILE')).toBe(true);
    expect(isTargetTypeCompatible('profile', 'CHANNEL')).toBe(true);
    expect(isTargetTypeCompatible('profile', 'POST')).toBe(false);

    // Fallbacks
    expect(isTargetTypeCompatible(null, 'POST')).toBe(true);
    expect(isTargetTypeCompatible('post', null)).toBe(true);
    expect(isTargetTypeCompatible('custom', 'POST')).toBe(true);
  });

  it('matchesSuggestedCategory rejects incompatible categories even without analyzerTags', () => {
    // A single POST link should NOT match "Подписчики" category
    expect(matchesSuggestedCategory('👨‍👩‍👧‍👦 Подписчики / Участники', ['Подписчики'], null, 'post')).toBe(false);

    // A single POST link SHOULD match "Просмотры / Охват" category
    expect(matchesSuggestedCategory('👁 Просмотры / Охват', ['Просмотры / Охват'], null, 'post')).toBe(true);

    // A CHANNEL link SHOULD match "Подписчики" category
    expect(matchesSuggestedCategory('👨‍👩‍👧‍👦 Подписчики / Участники', ['Подписчики'], null, 'channel')).toBe(true);

    // A CHANNEL link SHOULD match "Автопросмотры" (CHANNEL_POSTS)
    expect(matchesSuggestedCategory('🤖 Автопросмотры', ['Автопросмотры'], null, 'channel')).toBe(true);
  });
});
