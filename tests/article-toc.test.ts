import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { getActiveHeadingId, getScrollBehavior } from '../src/scripts/article-toc';

const articleLayoutSource = await readFile(new URL('../src/layouts/ArticleLayout.astro', import.meta.url), 'utf8');
const articleTocSource = await readFile(new URL('../src/scripts/article-toc.ts', import.meta.url), 'utf8');

describe('article toc helpers', () => {
  it('selects the heading nearest the reading offset', () => {
    expect(getActiveHeadingId([
      { id: 'intro', top: -120 },
      { id: 'chapter', top: 84 },
      { id: 'detail', top: 260 }
    ], 120)).toBe('chapter');
  });

  it('uses instant scrolling when reduced motion is preferred', () => {
    expect(getScrollBehavior(true)).toBe('auto');
    expect(getScrollBehavior(false)).toBe('smooth');
  });

  it('renders the toc only when filtered article headings exist', () => {
    expect(articleLayoutSource).toMatch(/\{articleHeadings\.length \? \(/);
    expect(articleLayoutSource).toContain('<details class="article-toc-float">');
  });

  it('keeps the toc disclosure and panel aria contract', () => {
    expect(articleLayoutSource).toContain('aria-label="展开文章目录"');
    expect(articleLayoutSource).toContain('aria-controls="article-toc-panel"');
    expect(articleLayoutSource).toContain('<nav id="article-toc-panel"');
    expect(articleLayoutSource).toContain('aria-label="文章目录"');
  });

  it('renders toc links as heading anchors with a false initial current state', () => {
    expect(articleLayoutSource).toMatch(/<a href=\{`#\$\{heading\.slug\}`\} aria-current="false">\{heading\.text\}<\/a>/);
    expect(articleLayoutSource).toContain('heading.depth === 3 && \'article-toc__item--nested\'');
  });

  it('keeps one current-state attribute on every toc link', () => {
    expect(articleTocSource).toContain('link.setAttribute(\'aria-current\', active ? \'location\' : \'false\')');
    expect(articleTocSource).toContain('link.classList.toggle(\'is-active\', active)');
  });
});
