import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { getEditableThemeSettingsPayload } from '../src/lib/theme-settings';

const swupInitSource = await readFile(new URL('../src/scripts/swup-init.ts', import.meta.url), 'utf8');
const pageControllersSource = await readFile(new URL('../src/scripts/page-controllers.ts', import.meta.url), 'utf8');
const baseLayoutSource = await readFile(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
const layoutCssSource = await readFile(new URL('../src/styles/components/layout.css', import.meta.url), 'utf8');
const themeSettingsSource = await readFile(new URL('../src/lib/theme-settings.ts', import.meta.url), 'utf8');
const uiSettingsSource = await readFile(new URL('../src/data/settings/ui.json', import.meta.url), 'utf8');
const linksPageSource = await readFile(new URL('../src/scripts/links-page.ts', import.meta.url), 'utf8');
const fcirclePageSource = await readFile(new URL('../src/scripts/fcircle-page.ts', import.meta.url), 'utf8');
const bitsRemoteSource = await readFile(new URL('../src/scripts/bits-remote.ts', import.meta.url), 'utf8');
const umamiStatsSource = await readFile(new URL('../src/scripts/umami-stats.ts', import.meta.url), 'utf8');
const giscusCommentsSource = await readFile(new URL('../src/scripts/giscus-comments.ts', import.meta.url), 'utf8');
const adminSidebarNavModeSource = await readFile(
  new URL('../src/scripts/admin-sidebar-nav-mode.ts', import.meta.url),
  'utf8'
);
const adminConsoleSource = await readFile(new URL('../src/scripts/admin-console/index.ts', import.meta.url), 'utf8');
const adminDataSource = await readFile(new URL('../src/scripts/admin-data/index.ts', import.meta.url), 'utf8');
const adminImagesSource = await readFile(new URL('../src/scripts/admin-images/index.ts', import.meta.url), 'utf8');
const adminUiPrefsSource = await readFile(new URL('../src/scripts/admin-ui-prefs.ts', import.meta.url), 'utf8');
const adminContentFilterMenusSource = await readFile(
  new URL('../src/scripts/admin-content/filter-menus.ts', import.meta.url),
  'utf8'
);

describe('swup 初始化与守卫（swup-init.ts）', () => {
  it('enables swup on admin pages and skips only when the swup switch is off', () => {
    // admin 页面不再禁用 swup:后台导航同样走无刷新切换,由 onPageChange 重初始化控制器
    expect(swupInitSource).not.toContain("classList.contains('admin-page')");
    expect(swupInitSource).toContain("dataset.swupEnabled !== 'false'");
  });

  it('replaces the shell and global action menu containers', () => {
    expect(swupInitSource).toContain("containers: ['.shell', '.global-action-menu']");
  });

  it('disables the animation selector under reduced motion preference', () => {
    expect(swupInitSource).toContain('animationSelector');
    expect(swupInitSource).toMatch(/animationSelector:\s*reducedMotion\s*\?\s*false\s*:/);
  });

  it('persists head assets and syncs body class via plugins', () => {
    expect(swupInitSource).toContain('persistAssets: true');
    expect(swupInitSource).toMatch(/@swup\/body-class-plugin/);
    expect(swupInitSource).toContain('SwupBodyClassPlugin');
  });

  it('dispatches the page-change event on content replace and tracks umami page views', () => {
    expect(swupInitSource).toMatch(/hooks\.on\(\s*'content:replace'/);
    expect(swupInitSource).toContain("'astro-whono:page-change'");
    expect(swupInitSource).toMatch(/hooks\.on\(\s*'page:view'/);
    expect(swupInitSource).toMatch(/umami\?\.track\?\.\(\)/);
  });

  it('strips noscript styles/links activated by the DOMParser-based swap', () => {
    // swup 经 DOMParser 解析新页面时 noscript 内的 style/link 会被激活,
    // 必须在 content:replace 后移除,否则 bits 页筛选控件被 noscript 兜底样式隐藏
    expect(swupInitSource).toMatch(/noscript style, noscript link/);
    expect(swupInitSource).toMatch(/stripActivatedNoscriptAssets\(\)/);
  });

  it('falls back to full page loads when swup initialization fails', () => {
    expect(swupInitSource).toMatch(/try\s*\{/);
    expect(swupInitSource).toMatch(/\}\s*catch\s*/);
    expect(swupInitSource).toMatch(/fallback/i);
  });
});

describe('页面控制器调度（page-controllers.ts + 各控制器）', () => {
  it('exposes onPageChange listening for the page-change event', () => {
    expect(pageControllersSource).toMatch(/export const onPageChange/);
    expect(pageControllersSource).toContain("'astro-whono:page-change'");
  });

  it('wires remote/data-heavy controllers through onPageChange', () => {
    expect(linksPageSource).toMatch(/onPageChange\(/);
    expect(fcirclePageSource).toMatch(/onPageChange\(/);
    expect(bitsRemoteSource).toMatch(/onPageChange\(/);
    expect(umamiStatsSource).toMatch(/onPageChange\(/);
    expect(giscusCommentsSource).toMatch(/onPageChange\(/);
  });

  it('remounts the dev sidebar nav switcher after swup navigation with lifecycle teardown', () => {
    // switcher 按钮位于 .shell 内,导航后是新 DOM;必须重挂载并先解绑旧监听
    expect(adminSidebarNavModeSource).toMatch(/onPageChange\(initAdminSidebarNavMode\)/);
    expect(adminSidebarNavModeSource).toMatch(/teardownLifecycle\?\.\(\)/);
  });

  it('wires admin console controllers through onPageChange with navigation guard teardown', () => {
    // admin 页面纳入 swup 后,控制台控制器必须随导航重初始化,
    // 且 document/window 级导航守卫要先解绑,避免跨页面监听累积
    expect(adminConsoleSource).toMatch(/onPageChange\(initAdminConsole\)/);
    expect(adminConsoleSource).toMatch(/teardownNavigationGuard\?\.\(\)/);
  });

  it('wires admin data/images/ui-prefs/content controllers through onPageChange', () => {
    expect(adminDataSource).toMatch(/onPageChange\(initAdminDataConsole\)/);
    expect(adminImagesSource).toMatch(/onPageChange\(initAdminImagesConsole\)/);
    expect(adminUiPrefsSource).toMatch(/onPageChange\(initAdminUiPrefs\)/);
    expect(adminUiPrefsSource).toMatch(/teardownPopoverGuard\?\.\(\)/);
    expect(adminContentFilterMenusSource).toMatch(/onPageChange\(initAdminContentFilterMenus\)/);
  });

  it('imports page scripts centrally in the BaseLayout bottom script block', () => {
    expect(baseLayoutSource).toContain("import '../scripts/links-page.ts'");
    expect(baseLayoutSource).toContain("import '../scripts/fcircle-page.ts'");
    expect(baseLayoutSource).toContain("import '../scripts/bits-remote.ts'");
    expect(baseLayoutSource).toContain("import '../scripts/umami-stats.ts'");
    expect(baseLayoutSource).toContain("import '../scripts/giscus-comments.ts'");
    expect(baseLayoutSource).toContain("import '../scripts/article-toc.ts'");
    expect(baseLayoutSource).toContain("import '../scripts/entry-search.ts'");
  });
});

describe('BaseLayout 容器与开关（BaseLayout.astro + layout.css）', () => {
  it('renders the swup switch on the body element', () => {
    expect(baseLayoutSource).toContain('data-swup-enabled=');
  });

  it('marks both swap containers with the transition-fade class', () => {
    expect(baseLayoutSource).toContain('class="shell transition-fade');
    expect(baseLayoutSource).toContain('class="global-action-menu transition-fade');
  });

  it('defines the fade transition and is-animating rule in layout.css', () => {
    expect(layoutCssSource).toMatch(/\.transition-fade\s*\{[\s\S]*?transition:\s*opacity/);
    expect(layoutCssSource).toMatch(/html\.is-animating \.transition-fade\s*\{/);
  });

  it('keeps the starry canvas outside the swapped shell container', () => {
    const canvasIndex = baseLayoutSource.indexOf('id="starry-bg"');
    const shellIndex = baseLayoutSource.indexOf('class="shell transition-fade');
    expect(canvasIndex).toBeGreaterThanOrEqual(0);
    expect(shellIndex).toBeGreaterThan(canvasIndex);
  });
});

describe('主题设置（theme-settings.ts + ui.json）', () => {
  it('declares transitions.swup with a default of true in theme-settings', () => {
    expect(themeSettingsSource).toContain('transitions');
    expect(themeSettingsSource).toContain('TransitionsSettings');
    expect(themeSettingsSource).toContain('swup: true');
  });

  it('enables swup transitions in the persisted ui settings', () => {
    expect(uiSettingsSource).toContain('"transitions"');
    expect(uiSettingsSource).toContain('"swup": true');
  });

  it('exposes swup transitions as enabled in the editable settings payload', () => {
    const payload = getEditableThemeSettingsPayload();
    expect(payload.settings.ui.transitions.swup).toBe(true);
  });
});
