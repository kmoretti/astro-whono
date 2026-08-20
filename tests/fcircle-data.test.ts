import { describe, expect, it } from 'vitest';
import {
  getFriendCircleViewState,
  normalizeFriendCirclePayload,
  normalizeHttpUrl
} from '../src/lib/fcircle-data';

describe('friend circle data', () => {
  it('maps all.json article_data rows into display entries in source order', () => {
    expect(normalizeFriendCirclePayload({
      article_data: [
        {
          title: ' First post ',
          created: '2026-08-20T10:30:00.000Z',
          link: 'https://writer.example/posts/first',
          author: { name: ' Writer ', link: 'https://writer.example/', avatar: 'https://writer.example/avatar.png' },
          content: ' A short excerpt ',
          image: ['https://writer.example/cover.png', 'javascript:alert(1)']
        },
        { title: 'missing required link' }
      ]
    })).toEqual([{
      title: 'First post',
      createdAt: '2026-08-20T10:30:00.000Z',
      link: 'https://writer.example/posts/first',
      authorName: 'Writer',
      authorLink: 'https://writer.example/',
      authorAvatar: 'https://writer.example/avatar.png',
      content: 'A short excerpt',
      images: ['https://writer.example/cover.png']
    }]);
  });

  it('accepts only credential-free HTTP(S) external URLs', () => {
    expect(normalizeHttpUrl(' http://example.com/article ')).toBe('http://example.com/article');
    expect(normalizeHttpUrl('https://example.com')).toBe('https://example.com/');
    for (const value of [
      'javascript:alert(1)',
      'data:text/html,hello',
      '//example.com/path',
      '/relative/path',
      'https://user:pass@example.com',
      'ftp://example.com/file',
      'not a url'
    ]) {
      expect(normalizeHttpUrl(value)).toBeNull();
    }
  });

  it('returns loading, empty, and retryable failure view states', () => {
    expect(getFriendCircleViewState('loading', 0)).toEqual({
      status: '正在加载朋友圈…',
      empty: null,
      showRetry: false
    });
    expect(getFriendCircleViewState('ready', 0)).toEqual({
      status: '',
      empty: '暂无可显示的朋友圈动态。',
      showRetry: false
    });
    expect(getFriendCircleViewState('error', 0)).toEqual({
      status: '朋友圈加载失败，请检查网络后重试。',
      empty: '暂时无法获取朋友圈动态。',
      showRetry: true
    });
  });
});
