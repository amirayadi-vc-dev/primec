const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeProfile, profileUrl, parseSocialUrl } = require('../social-links');

test('profiles accept handles or full profile links and produce canonical links', () => {
  for (const [platform, raw, expected] of [
    ['instagram', '@prime.cars', 'prime.cars'],
    ['instagram', 'https://instagram.com/prime.cars/?igsh=test', 'prime.cars'],
    ['tiktok', '@prime.cars', 'prime.cars'],
    ['tiktok', 'https://www.tiktok.com/@prime.cars?lang=en', 'prime.cars'],
    ['facebook', 'https://m.facebook.com/primecars#about', 'https://www.facebook.com/primecars']
  ]) assert.equal(normalizeProfile(platform, raw), expected);
  assert.equal(profileUrl('tiktok', '@prime.cars'), 'https://www.tiktok.com/@prime.cars/');
  assert.equal(profileUrl('instagram', '@prime.cars'), 'https://www.instagram.com/prime.cars/');
  assert.equal(profileUrl('facebook', ''), '');
  assert.equal(normalizeProfile('tiktok', undefined), '');
});

test('profiles reject unsafe links, wrong platforms, and invalid or oversized handles', () => {
  for (const raw of [
    'https://www.tiktok.com.evil.example/@primecars',
    'https://www.tiktok.com@evil.example/@primecars',
    'https://user:password@www.tiktok.com/@primecars',
    'http://www.tiktok.com/@primecars',
    'https://www.tiktok.com:444/@primecars',
    'https://www.instagram.com/primecars/',
    'https://www.tiktok.com/@primecars/video/6718335390845095173',
    'javascript:alert(1)', 'has a space', 'x'.repeat(25)
  ]) assert.equal(normalizeProfile('tiktok', raw), null, raw);
  assert.equal(normalizeProfile('tiktok', 'x'.repeat(24)), 'x'.repeat(24));
  assert.equal(normalizeProfile('instagram', 'x'.repeat(31)), null);
  assert.equal(normalizeProfile('facebook', 'https://facebook.com/'), null);
});

test('TikTok posts use the official embed player and strip tracking parameters', () => {
  assert.deepEqual(parseSocialUrl('https://www.tiktok.com/@scout2015/video/6718335390845095173?is_from_webapp=1'), {
    platform: 'tiktok', type: 'video',
    url: 'https://www.tiktok.com/@scout2015/video/6718335390845095173',
    embed: 'https://www.tiktok.com/player/v1/6718335390845095173'
  });
});

test('Instagram posts and reels retain their existing canonical embeds', () => {
  assert.deepEqual(parseSocialUrl('https://www.instagram.com/p/Ddlr-iqmz4O/?igsh=test'), {
    platform: 'instagram', type: 'post',
    url: 'https://www.instagram.com/p/Ddlr-iqmz4O/',
    embed: 'https://www.instagram.com/p/Ddlr-iqmz4O/embed'
  });
  assert.equal(parseSocialUrl('https://www.instagram.com/primecars/reels/ABC123/').embed, 'https://www.instagram.com/reel/ABC123/embed');
});

test('Facebook page, video, and watch links retain their embed types', () => {
  const page = parseSocialUrl('https://www.facebook.com/facebook/');
  assert.equal(page.type, 'page');
  assert.equal(new URL(page.embed).searchParams.get('href'), page.url);
  const video = parseSocialUrl('https://www.facebook.com/primecars/videos/123456/?tracking=remove');
  assert.equal(video.type, 'reel');
  assert.equal(video.url, 'https://www.facebook.com/primecars/videos/123456/');
  assert.match(video.embed, /^https:\/\/www\.facebook\.com\/plugins\/video\.php/);
  assert.equal(parseSocialUrl('https://fb.watch/abc123/').type, 'reel');
});

test('unsupported and unsafe post links return no embeddable result', () => {
  for (const raw of [
    '', null, 'javascript:alert(1)', 'http://www.tiktok.com/@scout/video/123',
    'https://vm.tiktok.com/short/', 'https://www.tiktok.com/@scout',
    'https://www.tiktok.com/@scout/video/not-a-number',
    'https://www.tiktok.com/@scout/video/123/extra',
    'https://tiktok.com.evil.example/@scout/video/123',
    'https://user@www.tiktok.com/@scout/video/123',
    'https://www.instagram.com/primecars/'
  ]) assert.equal(parseSocialUrl(raw), null, String(raw));
});
