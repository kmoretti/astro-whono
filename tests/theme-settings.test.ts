import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getEditableThemeSettingsPayload,
  getEditableThemeSettingsState,
  getSidebarHref,
  getSidebarNavItemHref,
  getSiteFaviconLinks,
  getThemeSettings,
  getThemeSettingsReadDiagnostics,
  getThemeSettingsRevision,
  resetThemeSettingsCache,
  toEditableThemeSettingsPayload
} from '../src/lib/theme-settings';

describe('theme-settings revision semantics', () => {
  const originalInternalTestFlag = process.env.ASTRO_WHONO_INTERNAL_TEST_SETTINGS;
  const originalInternalTestDir = process.env.ASTRO_WHONO_INTERNAL_TEST_SETTINGS_DIR;
  const tempDirs: string[] = [];

  const createTempSettingsFixture = async (): Promise<string> => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), 'astro-whono-theme-settings-test-'));
    const settingsDir = path.join(tempRoot, 'settings');
    await cp(path.resolve('src/data/settings'), settingsDir, { recursive: true });
    tempDirs.push(tempRoot);
    process.env.ASTRO_WHONO_INTERNAL_TEST_SETTINGS = '1';
    process.env.ASTRO_WHONO_INTERNAL_TEST_SETTINGS_DIR = settingsDir;
    return settingsDir;
  };

  beforeEach(() => {
    resetThemeSettingsCache();
  });

  afterEach(async () => {
    resetThemeSettingsCache();
    if (originalInternalTestFlag === undefined) {
      delete process.env.ASTRO_WHONO_INTERNAL_TEST_SETTINGS;
    } else {
      process.env.ASTRO_WHONO_INTERNAL_TEST_SETTINGS = originalInternalTestFlag;
    }

    if (originalInternalTestDir === undefined) {
      delete process.env.ASTRO_WHONO_INTERNAL_TEST_SETTINGS_DIR;
    } else {
      process.env.ASTRO_WHONO_INTERNAL_TEST_SETTINGS_DIR = originalInternalTestDir;
    }

    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it('normalizes legacy X settings into the QQ preset snapshot', async () => {
    const settingsDir = await createTempSettingsFixture();
    const sitePath = path.join(settingsDir, 'site.json');
    const siteJson = JSON.parse(await readFile(sitePath, 'utf8')) as Record<string, any>;
    siteJson.socialLinks.qq = undefined;
    delete siteJson.socialLinks.qq;
    siteJson.socialLinks.x = 'https://qm.qq.com/q/legacy';
    siteJson.socialLinks.presetOrder.qq = undefined;
    delete siteJson.socialLinks.presetOrder.qq;
    siteJson.socialLinks.presetOrder.x = 2;
    await writeFile(sitePath, `${JSON.stringify(siteJson, null, 2)}\n`, 'utf8');

    const resolved = getThemeSettings();
    const snapshot = getEditableThemeSettingsPayload(resolved).settings;

    expect(resolved.settings.site.socialLinks.qq).toBe('https://qm.qq.com/q/legacy');
    expect(resolved.settings.site.socialLinks.presetOrder.qq).toBe(2);
    expect(snapshot.site.socialLinks.qq).toBe('https://qm.qq.com/q/legacy');
    expect(snapshot.site.socialLinks).not.toHaveProperty('x');
    expect(snapshot.site.socialLinks.presetOrder).not.toHaveProperty('x');
  });

  it('resolves the fixed links navigation and page defaults', () => {
    const resolved = getThemeSettings();

    /* 只断言关键项存在：order 数值与项数跟随 shell.json 配置，不做强断言。 */
    expect(resolved.settings.shell.nav).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'links',
          label: '友链',
          visible: true,
          children: expect.arrayContaining([
            expect.objectContaining({ id: 'index', href: '/links/' }),
            expect.objectContaining({ id: 'exchange', href: '/links/exchange/' }),
            expect.objectContaining({ id: 'fcircle', href: '/fcircle/' })
          ])
        })
      ])
    );
    expect(getSidebarHref('links')).toBe('/links/');
    expect(resolved.settings.page.links).toEqual({ title: '友链', subtitle: null });
    expect(resolved.settings.page.about.umami.baseUrl).toMatch(/^https:\/\//);
    expect(resolved.settings.page.about.umami.shareId).toMatch(/^[a-zA-Z0-9]{8,50}$/);
    expect(resolved.settings.links.linksSourceUrl).toMatch(/^https:\/\//);
    expect(resolved.settings.links.latencySourceUrl).toMatch(/^https:\/\//);
    expect(resolved.settings.links.tombstoneSourceUrl).toMatch(/^https:\/\//);
    expect(resolved.settings.links.submissionUrl).toMatch(/^https:\/\//);
  });

  it('keeps configured nested navigation children in the editable payload', () => {
    const payload = getEditableThemeSettingsPayload().settings;
    const links = payload.shell.nav.find((item) => item.id === 'links');

    expect(links?.children).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'index', href: '/links/' }),
      expect.objectContaining({ id: 'exchange', href: '/links/exchange/' }),
      expect.objectContaining({ id: 'fcircle', href: '/fcircle/' })
    ]));
  });

  it('builds an editable payload whose revision matches the revision helper', () => {
    const resolved = getThemeSettings();
    const payload = getEditableThemeSettingsPayload(resolved);

    expect(payload.revision).toBe(getThemeSettingsRevision(resolved));
    expect('resolvedSocialItems' in payload.settings.site.socialLinks).toBe(false);
  });

  it('keeps revision stable when only sources change', () => {
    const resolved = getThemeSettings();
    const mutated = structuredClone(resolved);
    mutated.sources.site.title = mutated.sources.site.title === 'new' ? 'legacy' : 'new';

    expect(getThemeSettingsRevision(mutated)).toBe(getThemeSettingsRevision(resolved));
    expect(toEditableThemeSettingsPayload(mutated).revision).toBe(getThemeSettingsRevision(resolved));
  });

  it('changes revision when editable settings change', () => {
    const resolved = getThemeSettings();
    const mutated = structuredClone(resolved);
    mutated.settings.site.title = `${mutated.settings.site.title} fixture`;

    expect(getThemeSettingsRevision(mutated)).not.toBe(getThemeSettingsRevision(resolved));
    expect(toEditableThemeSettingsPayload(mutated).settings.site.title).toBe(mutated.settings.site.title);
  });

  it('keeps default children when a legacy links item has no children field', async () => {
    const settingsDir = await createTempSettingsFixture();
    const shellPath = path.join(settingsDir, 'shell.json');
    const shellJson = JSON.parse(await readFile(shellPath, 'utf8')) as Record<string, any>;
    const links = shellJson.nav.find((item: { id: string }) => item.id === 'links');
    delete links.children;
    await writeFile(shellPath, `${JSON.stringify(shellJson, null, 2)}\n`, 'utf8');

    const resolved = getThemeSettings();
    expect(resolved.settings.shell.nav.find((item) => item.id === 'links')?.children).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'exchange', href: '/links/exchange/' })])
    );
  });

  it('preserves valid custom primary nav items alongside built-in ones', async () => {
    const settingsDir = await createTempSettingsFixture();
    /* 基准从 fixture 实际内容推导：期望顺序与追加位不硬编码主题默认配置。 */
    const baseNav = getThemeSettings().settings.shell.nav;
    const baseIds = baseNav.map((item) => item.id);
    const nextOrder = Math.max(...baseNav.map((item) => item.order)) + 1;
    const shellPath = path.join(settingsDir, 'shell.json');
    const shellJson = JSON.parse(await readFile(shellPath, 'utf8')) as Record<string, any>;
    shellJson.nav.push(
      {
        id: 'friend-circle',
        label: '圈子',
        ornament: '·',
        order: nextOrder,
        visible: true,
        href: '/fcircle/',
        children: []
      },
      {
        id: 'mastodon',
        label: '长毛象',
        ornament: '·',
        order: nextOrder + 1,
        visible: false,
        href: 'https://mastodon.example/@whono',
        children: [
          { id: 'profile', label: '主页', href: '/profile/', visible: true, order: 1 }
        ]
      }
    );
    await writeFile(shellPath, `${JSON.stringify(shellJson, null, 2)}\n`, 'utf8');

    const resolved = getThemeSettings();
    const nav = resolved.settings.shell.nav;
    const custom = nav.find((item) => item.id === 'friend-circle');
    const external = nav.find((item) => item.id === 'mastodon');

    expect(custom).toMatchObject({
      id: 'friend-circle',
      label: '圈子',
      ornament: '·',
      visible: true,
      order: nextOrder,
      href: '/fcircle/',
      children: []
    });
    expect(external).toMatchObject({
      id: 'mastodon',
      label: '长毛象',
      visible: false,
      order: nextOrder + 1,
      href: 'https://mastodon.example/@whono'
    });
    expect(external?.children).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'profile', href: '/profile/' })])
    );
    expect(getSidebarNavItemHref(custom!)).toBe('/fcircle/');
    expect(getSidebarNavItemHref(external!)).toBe('https://mastodon.example/@whono');
    expect(getSidebarNavItemHref(nav.find((item) => item.id === 'essay')!)).toBe('/essay/');
    expect(nav.map((item) => item.id)).toEqual([...baseIds, 'friend-circle', 'mastodon']);
    expect(getEditableThemeSettingsPayload(resolved).settings.shell.nav).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'friend-circle', href: '/fcircle/' }),
        expect.objectContaining({ id: 'mastodon', href: 'https://mastodon.example/@whono' })
      ])
    );
    expect(getThemeSettingsReadDiagnostics(resolved)).toEqual([]);
  });

  it('ignores invalid custom primary nav items on the read path', async () => {
    const settingsDir = await createTempSettingsFixture();
    /* 期望的 id 集合从 fixture 实际内容推导：非法项被丢弃后应与基准完全一致。 */
    const baseNav = getThemeSettings().settings.shell.nav;
    const baseIds = baseNav.map((item) => item.id);
    const shellPath = path.join(settingsDir, 'shell.json');
    const shellJson = JSON.parse(await readFile(shellPath, 'utf8')) as Record<string, any>;
    const nextOrder = Math.max(...baseNav.map((item) => item.order)) + 1;
    shellJson.nav.push(
      { id: 'Bad_ID', label: '非法标识', href: '/nowhere/', order: nextOrder, visible: true, children: [] },
      { id: 'insecure-link', label: '非安全链接', href: 'http://example.com/', order: nextOrder + 1, visible: true, children: [] },
      { id: 'protocol-relative', label: '协议相对地址', href: '//example.com/', order: nextOrder + 2, visible: true, children: [] },
      { id: 'missing-href', label: '缺少地址', order: nextOrder + 3, visible: true, children: [] },
      { id: '', label: '空标识', href: '/nowhere/', order: nextOrder + 4, visible: true, children: [] }
    );
    /* 内置 id 携带显式 href：按内置项覆盖处理，href 被忽略且链接仍由注册表推导。 */
    shellJson.nav.push({
      id: 'essay',
      label: '随笔',
      ornament: '·',
      order: baseNav.find((item) => item.id === 'essay')!.order,
      visible: true,
      href: '/hijack/',
      children: []
    });
    await writeFile(shellPath, `${JSON.stringify(shellJson, null, 2)}\n`, 'utf8');

    const resolved = getThemeSettings();
    const nav = resolved.settings.shell.nav;

    expect(nav.map((item) => item.id)).toEqual(baseIds);
    expect(getSidebarNavItemHref(nav.find((item) => item.id === 'essay')!)).toBe('/essay/');
    /* 被忽略的非法项属于静默修复：读取诊断应锁定控制台而不是无感知丢弃。 */
    expect(getThemeSettingsReadDiagnostics(resolved)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ group: 'shell', code: 'schema-mismatch' })
      ])
    );
  });

  it('lets later duplicate custom primary nav ids override earlier ones', async () => {
    const settingsDir = await createTempSettingsFixture();
    /* 追加位从 fixture 实际内容推导，避免与既有 order 冲突触发修复干扰覆盖语义。 */
    const baseNav = getThemeSettings().settings.shell.nav;
    const nextOrder = Math.max(...baseNav.map((item) => item.order)) + 1;
    const shellPath = path.join(settingsDir, 'shell.json');
    const shellJson = JSON.parse(await readFile(shellPath, 'utf8')) as Record<string, any>;
    shellJson.nav.push(
      { id: 'dupe-link', label: '第一版', href: '/first/', order: nextOrder, visible: true, children: [] },
      { id: 'dupe-link', label: '第二版', href: 'https://example.com/second/', order: nextOrder + 1, visible: false, children: [] }
    );
    await writeFile(shellPath, `${JSON.stringify(shellJson, null, 2)}\n`, 'utf8');

    const resolved = getThemeSettings();
    const matches = resolved.settings.shell.nav.filter((item) => item.id === 'dupe-link');

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      label: '第二版',
      href: 'https://example.com/second/',
      visible: false,
      order: nextOrder + 1
    });
  });

  it('keeps custom primary nav orders unique by repairing conflicts', async () => {
    const settingsDir = await createTempSettingsFixture();
    /* essay 的基准 order 从 fixture 实际内容推导，冲突输入与期望均不硬编码默认值。 */
    const essayOrder = getThemeSettings().settings.shell.nav.find((item) => item.id === 'essay')!.order;
    const shellPath = path.join(settingsDir, 'shell.json');
    const shellJson = JSON.parse(await readFile(shellPath, 'utf8')) as Record<string, any>;
    /* 与 essay 的 order 冲突：读取路径会自动修复为可用位置并保持排序稳定。 */
    shellJson.nav.push({ id: 'conflict-link', label: '冲突', href: '/conflict/', order: essayOrder, visible: true, children: [] });
    await writeFile(shellPath, `${JSON.stringify(shellJson, null, 2)}\n`, 'utf8');

    const resolved = getThemeSettings();
    const nav = resolved.settings.shell.nav;
    const orders = nav.map((item) => item.order);

    expect(new Set(orders).size).toBe(orders.length);
    expect(nav.find((item) => item.id === 'essay')).toMatchObject({ order: essayOrder });
    /* 修复后的落位由实际占用决定，只断言冲突被解除且 essay 原位不动。 */
    expect(nav.find((item) => item.id === 'conflict-link')?.order).not.toBe(essayOrder);
  });

  it('keeps legacy shell and page settings without links compatible', async () => {
    const settingsDir = await createTempSettingsFixture();
    const shellPath = path.join(settingsDir, 'shell.json');
    const pagePath = path.join(settingsDir, 'page.json');
    const shellJson = JSON.parse(await readFile(shellPath, 'utf8')) as Record<string, any>;
    const pageJson = JSON.parse(await readFile(pagePath, 'utf8')) as Record<string, any>;
    shellJson.nav = shellJson.nav.filter((item: { id: string }) => item.id !== 'links');
    delete pageJson.links;
    await Promise.all([
      writeFile(shellPath, `${JSON.stringify(shellJson, null, 2)}\n`, 'utf8'),
      writeFile(pagePath, `${JSON.stringify(pageJson, null, 2)}\n`, 'utf8')
    ]);

    const resolved = getThemeSettings();
    const payload = getEditableThemeSettingsPayload(resolved);

    expect(resolved.settings.shell.nav).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'links', label: '友链', visible: true })])
    );
    expect(resolved.settings.page.links).toEqual({ title: '友链', subtitle: null });
    expect(payload.settings.shell.nav).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'links' })])
    );
    expect(payload.settings.page.links).toEqual({ title: '友链', subtitle: null });
    expect(getThemeSettingsReadDiagnostics(resolved)).toEqual([]);
  });

  it('allows missing settings files to keep falling back without locking the console', async () => {
    const settingsDir = await createTempSettingsFixture();
    await rm(path.join(settingsDir, 'page.json'), { force: true });

    const resolved = getThemeSettings();
    const state = getEditableThemeSettingsState(resolved);

    expect(state.ok).toBe(true);
    expect(getThemeSettingsReadDiagnostics(resolved)).toEqual([]);
  });

  it('locks the console when an existing settings file would be silently repaired', async () => {
    const settingsDir = await createTempSettingsFixture();
    const sitePath = path.join(settingsDir, 'site.json');
    const siteJson = JSON.parse(await readFile(sitePath, 'utf8')) as Record<string, unknown>;
    delete siteJson.footer;
    await writeFile(sitePath, `${JSON.stringify(siteJson, null, 2)}\n`, 'utf8');

    const resolved = getThemeSettings();
    const diagnostics = getThemeSettingsReadDiagnostics(resolved);
    const state = getEditableThemeSettingsState(resolved);

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          group: 'site',
          code: 'schema-mismatch'
        })
      ])
    );
    expect(state.ok).toBe(false);
    if (!state.ok) {
      expect(state.diagnostics).toEqual(diagnostics);
    }
  });

  it('keeps the console unlocked when ui.json lacks the typography block', async () => {
    const settingsDir = await createTempSettingsFixture();
    const uiPath = path.join(settingsDir, 'ui.json');
    const uiJson = JSON.parse(await readFile(uiPath, 'utf8')) as Record<string, unknown>;
    delete uiJson.typography;
    await writeFile(uiPath, `${JSON.stringify(uiJson, null, 2)}\n`, 'utf8');

    const resolved = getThemeSettings();
    const state = getEditableThemeSettingsState(resolved);

    expect(resolved.settings.ui.typography).toEqual({
      readable: 'noto-serif-sc',
      copy: 'lxgw-wenkai-lite',
      mono: 'system-mono',
      brand: 'serif-georgia'
    });
    expect(getThemeSettingsReadDiagnostics(resolved)).toEqual([]);
    expect(state.ok).toBe(true);
  });

  it('locks the console when ui.json carries an invalid typography font id', async () => {
    const settingsDir = await createTempSettingsFixture();
    const uiPath = path.join(settingsDir, 'ui.json');
    const uiJson = JSON.parse(await readFile(uiPath, 'utf8')) as Record<string, any>;
    uiJson.typography.readable = 'bogus-font';
    await writeFile(uiPath, `${JSON.stringify(uiJson, null, 2)}\n`, 'utf8');

    const resolved = getThemeSettings();
    const diagnostics = getThemeSettingsReadDiagnostics(resolved);
    const state = getEditableThemeSettingsState(resolved);

    expect(resolved.settings.ui.typography.readable).toBe('noto-serif-sc');
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          group: 'ui',
          code: 'schema-mismatch'
        })
      ])
    );
    expect(state.ok).toBe(false);
  });

  it('changes revision when typography settings change', () => {
    const resolved = getThemeSettings();
    const mutated = structuredClone(resolved);
    mutated.settings.ui.typography.readable = 'lxgw-wenkai-lite';

    expect(getThemeSettingsRevision(mutated)).not.toBe(getThemeSettingsRevision(resolved));
  });

  it('resolves configured favicon slots and emits their public links', () => {
    const resolved = getThemeSettings();

    expect(resolved.settings.site.favicon).toEqual({
      ico: '/favicon.ico',
      svg: null,
      png: '/images/site/favicon-256x256-0cda5eeb.png',
      appleTouchIcon: '/images/site/apple-touch-icon-256x256-0cda5eeb.png'
    });
    expect(resolved.sources.site.faviconPng).toBe('new');
    expect(getSiteFaviconLinks(resolved.settings.site.favicon)).toEqual([
      { rel: 'icon', type: 'image/x-icon', sizes: 'any', href: '/favicon.ico' },
      { rel: 'icon', type: 'image/png', sizes: '256x256', href: '/images/site/favicon-256x256-0cda5eeb.png' },
      { rel: 'apple-touch-icon', sizes: '256x256', href: '/images/site/apple-touch-icon-256x256-0cda5eeb.png' }
    ]);
  });

  it('keeps the console unlocked when site.json lacks the favicon block', async () => {
    const settingsDir = await createTempSettingsFixture();
    const sitePath = path.join(settingsDir, 'site.json');
    const siteJson = JSON.parse(await readFile(sitePath, 'utf8')) as Record<string, unknown>;
    delete siteJson.favicon;
    await writeFile(sitePath, `${JSON.stringify(siteJson, null, 2)}\n`, 'utf8');

    const resolved = getThemeSettings();

    expect(resolved.settings.site.favicon).toEqual({ ico: null, svg: null, png: null, appleTouchIcon: null });
    expect(resolved.sources.site.faviconPng).toBe('default');
    expect(getThemeSettingsReadDiagnostics(resolved)).toEqual([]);
    expect(getEditableThemeSettingsState(resolved).ok).toBe(true);
  });

  it('accepts an existing favicon slot path and suppresses default links for unset slots', async () => {
    const settingsDir = await createTempSettingsFixture();
    const sitePath = path.join(settingsDir, 'site.json');
    const siteJson = JSON.parse(await readFile(sitePath, 'utf8')) as Record<string, any>;
    siteJson.favicon = { svg: null, png: '/favicon-32x32.png', appleTouchIcon: null };
    await writeFile(sitePath, `${JSON.stringify(siteJson, null, 2)}\n`, 'utf8');

    const resolved = getThemeSettings();

    expect(resolved.settings.site.favicon.png).toBe('/favicon-32x32.png');
    expect(resolved.sources.site.faviconPng).toBe('new');
    expect(getThemeSettingsReadDiagnostics(resolved)).toEqual([]);
    // 分组抑制：png 自定义后标签页图标组不再回退默认 SVG；触摸图标独立回退，保持主题默认。
    expect(getSiteFaviconLinks(resolved.settings.site.favicon)).toEqual([
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: 'apple-touch-icon.png' }
    ]);
  });

  it('keeps default tab icons when only the touch icon is customized', async () => {
    const settingsDir = await createTempSettingsFixture();
    const sitePath = path.join(settingsDir, 'site.json');
    const siteJson = JSON.parse(await readFile(sitePath, 'utf8')) as Record<string, any>;
    siteJson.favicon = { svg: null, png: null, appleTouchIcon: '/apple-touch-icon.png' };
    await writeFile(sitePath, `${JSON.stringify(siteJson, null, 2)}\n`, 'utf8');

    const resolved = getThemeSettings();

    expect(getSiteFaviconLinks(resolved.settings.site.favicon)).toEqual([
      { rel: 'icon', type: 'image/svg+xml', sizes: 'any', href: 'favicon.svg' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: 'favicon-32x32.png' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
    ]);
  });

  it('falls back to theme defaults without locking the console when a favicon file is missing', async () => {
    const settingsDir = await createTempSettingsFixture();
    const sitePath = path.join(settingsDir, 'site.json');
    const siteJson = JSON.parse(await readFile(sitePath, 'utf8')) as Record<string, any>;
    siteJson.favicon = { svg: null, png: '/images/site/favicon-64x64-deadbeef.png', appleTouchIcon: null };
    await writeFile(sitePath, `${JSON.stringify(siteJson, null, 2)}\n`, 'utf8');

    const resolved = getThemeSettings();

    // 格式合法的路径原样保留（不触发 schema-mismatch），文件缺失只在渲染期回退主题默认。
    expect(resolved.settings.site.favicon.png).toBe('/images/site/favicon-64x64-deadbeef.png');
    expect(getThemeSettingsReadDiagnostics(resolved)).toEqual([]);
    expect(getEditableThemeSettingsState(resolved).ok).toBe(true);
    expect(getSiteFaviconLinks(resolved.settings.site.favicon)).toEqual([
      { rel: 'icon', type: 'image/svg+xml', sizes: 'any', href: 'favicon.svg' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: 'favicon-32x32.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: 'apple-touch-icon.png' }
    ]);
  });

  it('omits the sizes attribute when a favicon file name carries no dimensions', async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), 'astro-whono-favicon-links-'));
    tempDirs.push(tempRoot);
    const assetDir = path.join(tempRoot, 'public', 'images', 'site');
    await mkdir(assetDir, { recursive: true });
    await Promise.all([
      writeFile(path.join(assetDir, 'favicon-a1b2c3d4.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>'),
      writeFile(path.join(assetDir, 'favicon-notdims.png'), 'png'),
      writeFile(path.join(assetDir, 'apple-touch-icon-180x180-a1b2c3d4.png'), 'png')
    ]);

    process.env.ASTRO_WHONO_INTERNAL_TEST_PROJECT_ROOT = tempRoot;
    try {
      const links = getSiteFaviconLinks({
        ico: null,
        svg: '/images/site/favicon-a1b2c3d4.svg',
        png: '/images/site/favicon-notdims.png',
        appleTouchIcon: '/images/site/apple-touch-icon-180x180-a1b2c3d4.png'
      });

      expect(links).toEqual([
        { rel: 'icon', type: 'image/svg+xml', sizes: 'any', href: '/images/site/favicon-a1b2c3d4.svg' },
        { rel: 'icon', type: 'image/png', href: '/images/site/favicon-notdims.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/images/site/apple-touch-icon-180x180-a1b2c3d4.png' }
      ]);
    } finally {
      delete process.env.ASTRO_WHONO_INTERNAL_TEST_PROJECT_ROOT;
    }
  });
});
