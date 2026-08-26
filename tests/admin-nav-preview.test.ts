import { describe, expect, it } from 'vitest';
import type { SidebarNavItem } from '../src/lib/theme-settings';
import {
  buildNavPreviewItems,
  NAV_PREVIEW_INPUT_DEBOUNCE_MS
} from '../src/scripts/admin-console/nav-tree-preview';
import { createWithBase } from '../src/utils/format';

const navItem = (overrides: Partial<SidebarNavItem> = {}): SidebarNavItem => ({
  id: 'essay',
  label: '随笔',
  ornament: '·',
  visible: true,
  order: 1,
  children: [],
  ...overrides
});

const child = (overrides: Partial<SidebarNavItem['children'][number]> = {}) => ({
  id: 'nav-child-1',
  label: '子导航',
  href: '/child/',
  visible: true,
  order: 1,
  ...overrides
});

describe('admin-console/nav-tree-preview buildNavPreviewItems', () => {
  it('filters invisible items and children', () => {
    const items = buildNavPreviewItems(
      [
        navItem({ id: 'essay', visible: false }),
        navItem({
          id: 'memo',
          order: 2,
          children: [
            child({ id: 'nav-child-1', visible: true }),
            child({ id: 'nav-child-2', visible: false })
          ]
        })
      ],
      createWithBase('/')
    );

    expect(items).toHaveLength(1);
    expect(items[0]!.id).toBe('memo');
    expect(items[0]!.children.map((entry) => entry.id)).toEqual(['nav-child-1']);
  });

  it('resolves custom item href through base and keeps external https links untouched', () => {
    const withBase = createWithBase('/blog/');
    const items = buildNavPreviewItems(
      [
        navItem({ id: 'custom-nav-1', label: '友圈', href: '/fcircle/', order: 1 }),
        navItem({ id: 'custom-nav-2', label: '仓库', href: 'https://github.com/whono', order: 2 })
      ],
      withBase
    );

    expect(items.map((item) => item.href)).toEqual([
      '/blog/fcircle/',
      'https://github.com/whono'
    ]);
  });

  it('drops custom items without href but keeps builtin ones via id-derived href', () => {
    const items = buildNavPreviewItems(
      [
        navItem({ id: 'essay', order: 1 }),
        navItem({ id: 'about', order: 2 }),
        navItem({ id: 'custom-nav-1', href: '', order: 3 })
      ],
      createWithBase('/')
    );

    expect(items.map((item) => [item.id, item.href])).toEqual([
      ['essay', '/essay/'],
      ['about', '/about/']
    ]);
  });

  it('sorts parents and children by order regardless of draft order', () => {
    const items = buildNavPreviewItems(
      [
        navItem({
          id: 'about',
          order: 3,
          children: [
            child({ id: 'nav-child-3', label: '第三', order: 3 }),
            child({ id: 'nav-child-1', label: '第一', order: 1 }),
            child({ id: 'nav-child-2', label: '第二', order: 2 })
          ]
        }),
        navItem({ id: 'links', order: 1 }),
        navItem({ id: 'memo', order: 2 })
      ],
      createWithBase('/')
    );

    expect(items.map((item) => item.id)).toEqual(['links', 'memo', 'about']);
    expect(items[2]!.children.map((entry) => entry.label)).toEqual(['第一', '第二', '第三']);
  });

  it('keeps ornament and label on the preview model', () => {
    const items = buildNavPreviewItems(
      [navItem({ id: 'bits', label: '絮语', ornament: '✦' })],
      createWithBase('/')
    );

    expect(items[0]).toMatchObject({ id: 'bits', label: '絮语', ornament: '✦' });
  });

  it('uses a short debounce for input-driven preview refresh', () => {
    expect(NAV_PREVIEW_INPUT_DEBOUNCE_MS).toBe(150);
  });
});
