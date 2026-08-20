import { describe, expect, it } from 'vitest';
import { normalizeFcircleData } from '../src/lib/fcircle';

describe('normalizeFcircleData', () => {
  it('maps statistics and article fields from a valid response', () => {
    const result = normalizeFcircleData({
      statistical_data: {
        friends_num: 7,
        active_num: 6,
        article_num: 30,
        last_updated_time: '2026-08-20 09:53:31'
      },
      article_data: [
        {
          author: '作者',
          title: '文章标题',
          link: 'https://example.com/posts/1',
          avatar: 'https://example.com/avatar.png',
          pub_time: '2026-08-19 12:00:00',
          site_name: '示例站点',
          site_link: 'https://example.com/'
        }
      ]
    });

    expect(result).toEqual({
      stats: {
        friends: 7,
        active: 6,
        articles: 30,
        updatedAt: '2026-08-20 09:53:31'
      },
      articles: [
        {
          author: '作者',
          title: '文章标题',
          link: 'https://example.com/posts/1',
          avatar: 'https://example.com/avatar.png',
          publishedAt: '2026-08-19 12:00:00',
          siteName: '示例站点',
          siteLink: 'https://example.com/'
        }
      ]
    });
  });

  it('drops articles without safe required links', () => {
    const result = normalizeFcircleData({
      statistical_data: {},
      article_data: [
        { author: 'A', title: 'A', link: 'javascript:alert(1)' },
        { author: 'B', title: 'B', link: 'http://example.com/post' },
        { author: 'C', title: 'C', link: 'https://example.com/post' }
      ]
    });

    expect(result.articles).toHaveLength(1);
    expect(result.articles[0]?.author).toBe('C');
  });

  it('rejects an invalid top-level response', () => {
    expect(() => normalizeFcircleData({ article_data: 'not-an-array' })).toThrow();
  });
});
