import { describe, expect, it } from 'vitest';
import {
  collectNavTreeItems,
  createNextCustomNavId,
  createNextNavChildId,
  type NavTreeBranchDraft
} from '../src/scripts/admin-console/nav-tree-model';

const builtinBranch = (overrides: Partial<NavTreeBranchDraft> = {}): NavTreeBranchDraft => ({
  id: 'essay',
  label: '随笔',
  ornament: '·',
  visible: true,
  href: '',
  custom: false,
  children: [],
  ...overrides
});

describe('admin-console/nav-tree-model', () => {
  it('renumbers parent and child orders by display order', () => {
    const items = collectNavTreeItems([
      builtinBranch({
        id: 'memo',
        children: [
          { id: 'nav-child-4', label: '小记归档', href: '/memo/archive/', visible: true }
        ]
      }),
      builtinBranch({
        id: 'essay',
        children: [
          { id: 'nav-child-2', label: '标签', href: '/tags/', visible: false },
          { id: 'nav-child-1', label: '分类', href: '/categories/', visible: true }
        ]
      }),
      builtinBranch({ id: 'about' })
    ]);

    expect(items.map((item) => [item.id, item.order])).toEqual([
      ['memo', 1],
      ['essay', 2],
      ['about', 3]
    ]);
    expect(items[0]!.children).toEqual([
      { id: 'nav-child-4', label: '小记归档', href: '/memo/archive/', visible: true, order: 1 }
    ]);
    expect(items[1]!.children.map((child) => [child.id, child.order])).toEqual([
      ['nav-child-2', 1],
      ['nav-child-1', 2]
    ]);
    expect(items[2]!.children).toEqual([]);
  });

  it('keeps href only for custom branches and drops it for builtin ones', () => {
    const items = collectNavTreeItems([
      builtinBranch({ id: 'essay' }),
      builtinBranch({ id: 'friends', label: '友圈', custom: true, href: '/fcircle/' })
    ]);

    expect('href' in items[0]!).toBe(false);
    expect(items[1]!.href).toBe('/fcircle/');
  });

  it('assigns moved children to the branch that currently contains them', () => {
    // nav-child-1 原属 essay，跨父级移动后挂在 bits 分组下
    const items = collectNavTreeItems([
      builtinBranch({ id: 'essay', children: [{ id: 'nav-child-2', label: '分类', href: '/categories/', visible: true }] }),
      builtinBranch({ id: 'bits', children: [{ id: 'nav-child-1', label: '标签', href: '/tags/', visible: true }] })
    ]);

    const essay = items.find((item) => item.id === 'essay');
    const bits = items.find((item) => item.id === 'bits');
    expect(essay?.children.map((child) => child.id)).toEqual(['nav-child-2']);
    expect(bits?.children.map((child) => child.id)).toEqual(['nav-child-1']);
  });

  it('creates the next custom nav id skipping existing ids', () => {
    expect(createNextCustomNavId([])).toBe('custom-nav-1');
    expect(createNextCustomNavId(['essay', 'bits'])).toBe('custom-nav-1');
    expect(createNextCustomNavId(['custom-nav-1', 'custom-nav-2'])).toBe('custom-nav-3');
    expect(createNextCustomNavId(['custom-nav-2', 'custom-nav-1'])).toBe('custom-nav-3');
  });

  it('creates the next child nav id reusing freed slots', () => {
    expect(createNextNavChildId([])).toBe('nav-child-1');
    expect(createNextNavChildId(['nav-child-1', 'nav-child-3'])).toBe('nav-child-2');
    expect(createNextNavChildId(['nav-child-1', 'nav-child-2', 'nav-child-3'])).toBe('nav-child-4');
  });
});
