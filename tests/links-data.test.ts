import { describe, expect, it } from 'vitest';
import {
  LINKS_CACHE_KEY,
  LINKS_CACHE_TTL_MS,
  LINKS_CACHE_VERSION,
  createLatencyIndex,
  getLatencyIndexKey,
  collectLinkTags,
  filterLinkGroups,
  getLinksCacheState,
  normalizeHttpsUrl,
  normalizeLatencyData,
  parseTombstoneYaml,
  normalizeLinkGroups,
  parseLinksYaml,
  readLinksCache,
  writeLinksCache,
  type LinksCacheRecord,
  type StorageLike
} from '../src/lib/links-data';

const source = [
  '  - class_name: "邻居"',
  '    class_desc: " 小伙伴们 "',
  '    link_list:',
  '      - name: " 清羽飞扬 "',
  '        link: " https://blog.example.com/path "',
  '        avatar: https://blog.example.com/avatar.ico',
  '        descr: " 一段描述 "',
  '        feeds: https://blog.example.com/atom.xml',
  '        friendslink: https://blog.example.com/link',
  '        siteshot: https://blog.example.com/shot.jpg',
  '        tags: [Astro, " Web ", astro, " "]',
  '      - name: missing link',
  '      - name: unsafe',
  '        link: http://unsafe.example.com',
  '  - class_name: "空组"',
  '    link_list: []',
  '  - class_desc: no name',
  '    link_list: []'
].join('\n');

const makeStorage = (initial: string | null = null): StorageLike & { value: string | null } => {
  const storage = {
    value: initial,
    getItem: () => storage.value,
    setItem: (_key: string, value: string) => {
      storage.value = value;
    }
  };
  return storage;
};

describe('links data normalization', () => {
  it('normalizes complete and partial YAML while preserving source order', () => {
    const groups = parseLinksYaml(source);

    expect(groups).toEqual([
      {
        className: '邻居',
        classDesc: '小伙伴们',
        links: [
          {
            name: '清羽飞扬',
            link: 'https://blog.example.com/path',
            hostname: 'blog.example.com',
            avatar: 'https://blog.example.com/avatar.ico',
            descr: '一段描述',
            feeds: 'https://blog.example.com/atom.xml',
            friendslink: 'https://blog.example.com/link',
            siteshot: 'https://blog.example.com/shot.jpg',
            tags: ['Astro', 'Web']
          }
        ]
      },
      { className: '空组', classDesc: null, links: [] }
    ]);
  });

  it('keeps absent optional fields neutral and skips malformed groups/items', () => {
    const groups = normalizeLinkGroups([
      { class_name: ' Minimal ', link_list: [{ name: ' Site ', link: 'https://example.com' }] },
      { class_name: 'invalid', link_list: [{ name: 'bad', link: 'javascript:alert(1)' }] },
      { class_desc: 'missing required group name', link_list: [] },
      'not a group'
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ className: 'Minimal', classDesc: null });
    expect(groups.at(0)?.links.at(0)).toMatchObject({
      name: 'Site',
      link: 'https://example.com/',
      hostname: 'example.com',
      avatar: null,
      descr: null,
      feeds: null,
      friendslink: null,
      siteshot: null,
      tags: []
    });
    expect(groups.at(1)?.links).toEqual([]);
  });

  it('accepts only safe HTTPS URLs and rejects oversized or credentialed URLs', () => {
    expect(normalizeHttpsUrl(' https://example.com/a ')).toBe('https://example.com/a');
    expect(normalizeHttpsUrl('https://example.com')).toBe('https://example.com/');
    for (const value of [
      'http://example.com',
      'javascript:alert(1)',
      'data:text/plain,hello',
      '//example.com/path',
      'https://user:pass@example.com',
      'not a url',
      `https://example.com/${'x'.repeat(2048)}`
    ]) {
      expect(normalizeHttpsUrl(value)).toBeNull();
    }
  });

  it('trims and deduplicates tags case-insensitively', () => {
    const groups = normalizeLinkGroups([
      { class_name: 'tags', link_list: [{ name: 'x', link: 'https://x.test', tags: [' Astro ', 'astro', 'ASTRO', 'Web'] }] }
    ]);
    expect(groups.at(0)?.links.at(0)?.tags).toEqual(['Astro', 'Web']);
    expect(collectLinkTags(groups)).toEqual(['Astro', 'Web']);
  });

  it('throws for invalid YAML documents and non-array roots', () => {
    expect(() => parseLinksYaml('not: an array')).toThrow('top-level array');
    expect(() => parseLinksYaml('[')).toThrow('Unable to parse links YAML');
  });
});

describe('links latency data', () => {
  it('normalizes matching latency records and formats seconds as milliseconds', () => {
    const entries = normalizeLatencyData({
      statistical_data: { link_total_num: 3 },
      link_data: [
        { name: '清羽飞扬', link: 'https://blog.liushen.fun/', reachable: true, latency: 0.3 },
        { name: '纸鹿摸鱼处', link: 'https://blog.zhilu.site/', reachable: true, latency: 0.004 },
        { name: '离线站点', link: 'https://offline.example/', reachable: false, latency: null },
        { name: '无延迟站点', link: 'https://unknown.example/', reachable: true, latency: 'unknown' },
        { name: '', link: 'https://empty.example/', reachable: true, latency: 0.2 },
        'invalid'
      ]
    });

    expect(entries).toEqual([
      { name: '清羽飞扬', link: 'https://blog.liushen.fun/', reachable: true, latencyMs: 300, display: '300 ms' },
      { name: '纸鹿摸鱼处', link: 'https://blog.zhilu.site/', reachable: true, latencyMs: 4, display: '4 ms' },
      { name: '离线站点', link: 'https://offline.example/', reachable: false, latencyMs: null, display: '不可达' },
      { name: '无延迟站点', link: 'https://unknown.example/', reachable: true, latencyMs: null, display: '不可达' }
    ]);
  });

  it('indexes latency by the exact normalized name and website link', () => {
    const index = createLatencyIndex(normalizeLatencyData({
      link_data: [
        { name: '清羽飞扬', link: 'https://blog.liushen.fun/', reachable: true, latency: 0.3 },
        { name: '清羽飞扬', link: 'https://mirror.example/', reachable: true, latency: 0.5 }
      ]
    }));

    expect(index.get(getLatencyIndexKey('清羽飞扬', 'https://blog.liushen.fun') ?? '')).toMatchObject({ display: '300 ms' });
    expect(index.get(getLatencyIndexKey('清羽飞扬', 'https://mirror.example/') ?? '')).toMatchObject({ display: '500 ms' });
    expect(getLatencyIndexKey('清羽飞扬', 'https://other.example/')).not.toBeNull();
    expect(index.get(getLatencyIndexKey('清羽飞扬', 'https://other.example/') ?? '')).toBeUndefined();
  });

  it('rejects malformed latency payloads', () => {
    expect(normalizeLatencyData(null)).toEqual([]);
    expect(normalizeLatencyData({ link_data: 'not-an-array' })).toEqual([]);
  });
});

describe('tombstone data', () => {
  it('parses entry names and HTTPS avatars in source order', () => {
    expect(parseTombstoneYaml(`
- entry:
    name: First
    avatar: https://example.com/first.png
  originalGroup: 网上邻居
- entry:
    name: Second
    avatar: http://example.com/second.png
- entry:
    name: Missing avatar
- originalIndex: 3
`)).toEqual([
      { name: 'First', avatar: 'https://example.com/first.png' },
      { name: 'Second', avatar: null },
      { name: 'Missing avatar', avatar: null }
    ]);
  });

  it('returns an empty list for malformed or empty tombstone YAML', () => {
    expect(parseTombstoneYaml('not: a list')).toEqual([]);
    expect(parseTombstoneYaml('[')).toEqual([]);
    expect(parseTombstoneYaml('- originalGroup: empty')).toEqual([]);
  });
});

describe('links filtering', () => {
  const groups = normalizeLinkGroups([
    {
      class_name: 'First',
      link_list: [
        { name: 'one', link: 'https://one.test', tags: ['Astro'] },
        { name: 'two', link: 'https://two.test', tags: ['Web'] }
      ]
    },
    { class_name: 'Second', link_list: [{ name: 'three', link: 'https://three.test', tags: ['astro'] }] }
  ]);

  it('collects tags in first-seen source order and filters empty groups', () => {
    expect(collectLinkTags(groups)).toEqual(['Astro', 'Web']);
    expect(filterLinkGroups(groups, ' astro ')).toEqual([
      { ...groups[0]!, links: [groups[0]!.links[0]!] },
      { ...groups[1]!, links: [groups[1]!.links[0]!] }
    ]);
    expect(filterLinkGroups(groups, 'missing')).toEqual([]);
    expect(filterLinkGroups(groups, '全部')).toBe(groups);
  });
});

describe('links cache', () => {
  const record: LinksCacheRecord = {
    version: LINKS_CACHE_VERSION,
    timestamp: 1_000,
    groups: normalizeLinkGroups([{ class_name: 'Cached', link_list: [{ name: 'x', link: 'https://x.test' }] }])
  };

  it('reads fresh and stale valid records', () => {
    const storage = makeStorage(JSON.stringify(record));
    expect(readLinksCache(storage, record.timestamp + LINKS_CACHE_TTL_MS)).toMatchObject({ state: 'fresh', record });
    expect(readLinksCache(storage, record.timestamp + LINKS_CACHE_TTL_MS + 1)).toMatchObject({ state: 'stale', record });
    expect(getLinksCacheState(record, record.timestamp)).toBe('fresh');
  });

  it('rejects invalid records and malformed JSON without throwing', () => {
    expect(readLinksCache(makeStorage('{bad json'), 2_000)).toEqual({ state: 'invalid', record: null });
    expect(readLinksCache(makeStorage(JSON.stringify({ ...record, version: 999 })), 2_000)).toEqual({ state: 'invalid', record: null });
    expect(readLinksCache(makeStorage(JSON.stringify({ ...record, groups: [{ nope: true }] })), 2_000)).toEqual({ state: 'invalid', record: null });
    expect(readLinksCache(makeStorage(null), 2_000)).toEqual({ state: 'missing', record: null });
  });

  it('writes valid records and tolerates storage failures', () => {
    const storage = makeStorage();
    const freshRecord = { ...record, timestamp: Date.now() };
    expect(writeLinksCache(storage, freshRecord)).toBe(true);
    expect(storage.value).toContain(LINKS_CACHE_KEY === 'astro-whono:links-cache' ? 'Cached' : '');

    const failingStorage: StorageLike = {
      getItem: () => null,
      setItem: () => { throw new Error('quota'); }
    };
    expect(writeLinksCache(failingStorage, freshRecord)).toBe(false);
    expect(readLinksCache(failingStorage)).toEqual({ state: 'missing', record: null });

    const unreadableStorage: StorageLike = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => undefined
    };
    expect(readLinksCache(unreadableStorage)).toEqual({ state: 'invalid', record: null });
  });
});
