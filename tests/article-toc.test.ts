import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { getActiveHeadingId, getScrollBehavior } from '../src/scripts/article-toc';

const articleLayoutSource = await readFile(new URL('../src/layouts/ArticleLayout.astro', import.meta.url), 'utf8');
const articleTocSource = await readFile(new URL('../src/scripts/article-toc.ts', import.meta.url), 'utf8');
const articleCssSource = await readFile(new URL('../src/styles/article.css', import.meta.url), 'utf8');
const baseLayoutSource = await readFile(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
const giscusCommentsSource = await readFile(new URL('../src/components/GiscusComments.astro', import.meta.url), 'utf8');
const memoPageSource = await readFile(new URL('../src/pages/memo/index.astro', import.meta.url), 'utf8');
const sidebarActionsSource = await readFile(new URL('../src/components/sidebar/SidebarActions.astro', import.meta.url), 'utf8');
const layoutCssSource = await readFile(new URL('../src/styles/components/layout.css', import.meta.url), 'utf8');
const globalActionMenuSource = await readFile(new URL('../src/scripts/global-action-menu.ts', import.meta.url), 'utf8');
const starryBgSource = await readFile(new URL('../src/scripts/starry-bg.ts', import.meta.url), 'utf8');
const adminUiSectionSource = await readFile(new URL('../src/components/admin/AdminUiSection.astro', import.meta.url), 'utf8');

describe('global aggregate action menu contract', () => {
  it('renders the global menu entry and capability actions in BaseLayout', () => {
    expect(baseLayoutSource).toContain('data-global-action-menu');
    expect(baseLayoutSource).toContain('aria-expanded="false"');
    expect(baseLayoutSource).toContain('data-action="theme"');
    expect(baseLayoutSource).toContain('data-action="reading"');
    expect(baseLayoutSource).toContain('data-action="toc"');
    expect(baseLayoutSource).toContain('data-action="comments"');
    expect(baseLayoutSource).toContain('data-action="scroll-top"');
  });

  it('moves theme and reading controls out of SidebarActions', () => {
    expect(sidebarActionsSource).not.toContain('id="theme-toggle"');
    expect(sidebarActionsSource).not.toContain('id="reader-toggle"');
  });

  it('only exposes comments capability when the rendered page has Giscus comments', () => {
    expect(baseLayoutSource).toContain('const showGlobalComments = actionCapabilities.comments ?? false;');
    expect(articleLayoutSource).toContain('comments: settings.comments.enabled');
    expect(memoPageSource).toContain('comments: settings.comments.enabled');
    expect(giscusCommentsSource).toContain('if (!comments.enabled) return null;');
  });

  it('defines responsive safe-area and reduced-motion menu behavior', () => {
    expect(layoutCssSource).toContain('data-global-action-menu');
    expect(layoutCssSource).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(layoutCssSource).toMatch(/safe-area-inset/);
  });

  it('focuses the first visible action when opening and restores trigger focus when closing', () => {
    expect(globalActionMenuSource).toContain("if (open) items.querySelector<HTMLButtonElement>('.global-action-menu__action:not([data-visible=\"false\"])')?.focus();");
    expect(globalActionMenuSource).toContain('if (!open && restoreFocus) trigger.focus();');
  });

  it('constrains the mobile action list and accounts for the bottom safe area', () => {
    expect(layoutCssSource).toMatch(/\.global-action-menu__items\s*\{[\s\S]*?max-height:/);
    expect(layoutCssSource).toMatch(/\.global-action-menu__items\s*\{[\s\S]*?overflow-y:\s*auto/);
    expect(layoutCssSource).toMatch(/\.global-action-menu__items\s*\{[\s\S]*?padding-bottom:\s*calc\([^)]+env\(safe-area-inset-bottom\)/);
  });
});

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

  it('uses an explicitly hidden summary without an anonymous details button', () => {
    expect(articleLayoutSource).not.toContain('article-toc-float__button');
    expect(articleLayoutSource).toMatch(/<summary class="article-toc-float__summary" aria-hidden="true" tabindex="-1">\s*<\/summary>/);
    expect(articleLayoutSource).toContain('<details class="article-toc-float">');
    expect(articleLayoutSource).toContain('<nav id="article-toc-panel"');
    expect(articleLayoutSource).toContain('aria-label="文章目录"');
    expect(articleCssSource).toMatch(/\.article-toc-float__summary\s*\{[\s\S]*?display:\s*none;/);
    expect(articleTocSource).not.toContain('article-toc-float__button');
  });

  it('stops toc clicks from reopening the aggregate menu', () => {
    expect(globalActionMenuSource).toContain("tocAction?.addEventListener('click', (event) => {");
    expect(globalActionMenuSource).toContain('event.stopPropagation();');
    expect(globalActionMenuSource).toContain('setOpen(false);');
    expect(globalActionMenuSource).toContain('toc.open = true;');
  });

  it('keeps the mobile toc panel flush with the viewport edge in both reading modes', () => {
    expect(articleCssSource).toMatch(/@media \(max-width: 640px\)[\s\S]*?\.article-toc-float__panel\s*\{[\s\S]*?right:\s*0;/);
    expect(articleCssSource).toMatch(/body\.immersive-page\[data-reading="immersive"\] \.article-toc-float__panel\s*\{[\s\S]*?right:\s*0;/);
  });

  it('renders toc links as heading anchors with a false initial current state', () => {
    expect(articleLayoutSource).toMatch(/<a href=\{`#\$\{heading\.slug\}`\} aria-current="false">\{heading\.text\}<\/a>/);
    expect(articleLayoutSource).toContain('heading.depth === 3 && \'article-toc__item--nested\'');
  });

  it('keeps one current-state attribute on every toc link', () => {
    expect(articleTocSource).toContain('link.setAttribute(\'aria-current\', active ? \'location\' : \'false\')');
    expect(articleTocSource).toContain('link.classList.toggle(\'is-active\', active)');
  });

  it('restores toc link focus without changing the target heading scroll position', () => {
    expect(articleTocSource).toContain('link.focus({ preventScroll: true });');
  });
});

describe('starry / meteor background', () => {
  it('mounts a fixed canvas in BaseLayout and reads the starry toggle', () => {
    expect(baseLayoutSource).toContain('data-starry-bg');
    expect(baseLayoutSource).toContain('data-starry-enabled');
    expect(baseLayoutSource).toContain("settings.ui.background.starry");
    expect(baseLayoutSource).toMatch(/import\s+'\.\.\/scripts\/starry-bg\.ts'/);
  });

  it('exposes a starry background toggle in the admin theme UI section', () => {
    expect(adminUiSectionSource).toContain('ui-background-starry');
    expect(adminUiSectionSource).toContain('启用星光 / 流星背景');
  });

  it('hides the starry canvas when the body opts out, in reading mode, or under reduced motion', () => {
    expect(layoutCssSource).toContain('body[data-starry-enabled="false"] .starry-bg-canvas');
    expect(layoutCssSource).toContain('body[data-reading="immersive"] .starry-bg-canvas');
    expect(layoutCssSource).toContain('prefers-reduced-motion: reduce');
  });

  it('makes the body background transparent when the starry canvas is enabled', () => {
    // canvas 为 z-index:-1，绘制在 body 背景之下；body 必须透明化，星光才可见。
    expect(layoutCssSource).toMatch(/body\[data-starry-enabled="true"\]\s*\{\s*background:\s*transparent/);
  });

  it('reacts to reading mode events and to the body data-starry-enabled attribute', () => {
    expect(starryBgSource).toContain("astro-whono:reading-mode-change");
    expect(starryBgSource).toContain("attributeFilter: ['data-starry-enabled']");
    expect(starryBgSource).toContain('isEnabledOnBody()');
  });

  it('keeps the toggle watcher at module level so re-enabling works after destroy', () => {
    expect(starryBgSource).toContain('const syncFromBody = () => {');
    expect(starryBgSource).toContain('manager.destroy()');
  });

  it('mirrors the illusion.azxt.org night effects: spectral stars, rays, fireflies, meteor groups', () => {
    expect(starryBgSource).toContain('STAR_SPECTRAL_TYPES');
    expect(starryBgSource).toContain('hasRays');
    expect(starryBgSource).toContain('createFirefly');
    expect(starryBgSource).toContain('SHOOTING_GROUP_THRESHOLD');
    expect(starryBgSource).toContain('2 + Math.floor(Math.random() * 3)');
  });

  it('mirrors the illusion.azxt.org day candy rain and normalizes motion to a 60fps baseline', () => {
    expect(starryBgSource).toContain("'ribbon'");
    expect(starryBgSource).toContain("'candy'");
    expect(starryBgSource).toContain("'heart'");
    expect(starryBgSource).toContain("'dayStar'");
    expect(starryBgSource).toContain('REFERENCE_FRAME_MS = 1000 / 60');
  });
});

describe('global action menu on admin pages', () => {
  it('renders the action menu unconditionally instead of excluding admin pages', () => {
    expect(baseLayoutSource).not.toMatch(/\{!isAdminPage\s*\?\s*\(\s*<div class="global-action-menu"/);
  });

  it('lifts the menu above the admin sticky save bar when it docks', () => {
    expect(globalActionMenuSource).toContain("attributeFilter: ['data-sticky']");
    expect(layoutCssSource).toMatch(/\.global-action-menu\[data-admin-sticky='true'\]/);
  });
});
