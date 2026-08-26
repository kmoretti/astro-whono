import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { site as legacySite } from '../../site.config.mjs';
import { DEFAULT_LINKS_SETTINGS, type LinksSettings } from './links-settings';
import { DEFAULT_ABOUT_UMAMI_SETTINGS, UMAMI_SHARE_ID_RE } from './about-umami-settings';
import {
  DEFAULT_COMMENTS_SETTINGS,
  GISCUS_INPUT_POSITION_SET,
  GISCUS_LANG_SET,
  GISCUS_MAPPING_SET,
  GISCUS_REPO_RE,
  type CommentsSettings,
  type GiscusInputPosition,
  type GiscusLang,
  type GiscusMapping
} from './comments-settings';
import { asThemeFontIdForRole, type ThemeFontId } from './fonts/registry';
import {
  getHeroImageLocalFilePath,
  getSiteFaviconLocalFilePath,
  getSiteFaviconSizesFromPath,
  normalizeBitsAvatarPath,
  normalizeHeroImageSrc,
  normalizeSiteFaviconPath,
  type SiteFaviconSlot
} from '../utils/format';
import {
  ADMIN_ARTICLE_META_DATE_LABEL_DEFAULT,
  ADMIN_ARTICLE_META_DATE_LABEL_MAX_LENGTH,
  ADMIN_HERO_IMAGE_ALT_DEFAULT,
  ADMIN_HERO_IMAGE_ALT_MAX_LENGTH,
  ADMIN_HOME_INTRO_LINK_DEFAULT,
  ADMIN_HOME_INTRO_LINK_KEY_SET,
  ADMIN_HOME_INTRO_LINK_LIMIT,
  ADMIN_LOCALE_RE,
  ADMIN_NAV_CUSTOM_HREF_MAX_LENGTH,
  ADMIN_NAV_CUSTOM_LABEL_MAX_LENGTH,
  ADMIN_NAV_IDS,
  ADMIN_NAV_ORDER_MAX,
  ADMIN_NAV_ORDER_MIN,
  ADMIN_NAV_ORNAMENT_DEFAULT,
  ADMIN_NAV_ORNAMENT_MAX_LENGTH,
  ADMIN_OVERVIEW_HIDDEN_MESSAGE_DEFAULT,
  ADMIN_OVERVIEW_HIDDEN_MESSAGE_MAX_LENGTH,
  ADMIN_HERO_PRESET_SET,
  ADMIN_SOCIAL_ORDER_MAX,
  ADMIN_SOCIAL_ORDER_MIN,
  ADMIN_SOCIAL_PRESET_IDS,
  SIDEBAR_NAV_BUILTIN_ID_SET,
  canonicalizeAdminThemeSettings,
  createAdminWritableThemeSettingsGroups,
  fillAdminThemeSettingsGroupCompatibilityDefaults,
  getAdminFooterStartYearMax,
  getAdminNavOrderIssues,
  getAdminThemeSettingsGroupFileName,
  getAdminThemeSettingsMismatchPaths,
  getAdminSocialOrderIssues,
  ADMIN_SIDEBAR_DIVIDER_DEFAULT,
  ADMIN_TYPOGRAPHY_DEFAULT,
  isAdminNavCustomHref,
  isAdminNavCustomId,
  isAdminNavOrderValue,
  isAdminSocialOrderValue,
  isAdminSidebarDividerVariant,
  normalizeAdminSocialIconKey,
} from './admin-console/theme-shared';

export type SettingSource = 'new' | 'legacy' | 'default';

export type SidebarNavId = 'essay' | 'bits' | 'memo' | 'archive' | 'about' | 'links';
export type PageId = 'essay' | 'archive' | 'bits' | 'memo' | 'about' | 'links';
export type HeroPresetId = 'default' | 'none';
export type SidebarDividerVariant = 'default' | 'subtle' | 'none';
// ThemeFontId 从字体注册表条目 id 派生：添加字体只需在 registry.ts 增加条目，无需改这里。
export type { ThemeFontId } from './fonts/registry';
export type TypographyRole = 'readable' | 'copy' | 'mono' | 'brand';
export type HomeIntroLinkKey = 'archive' | 'essay' | 'bits' | 'memo' | 'about' | 'tag';
export type SiteSocialPresetId = 'github' | 'qq' | 'email';
export type SiteSocialKind = 'preset' | 'custom';
export type SiteSocialIconKey =
  | 'github'
  | 'qq'
  | 'email'
  | 'weibo'
  | 'facebook'
  | 'instagram'
  | 'telegram'
  | 'mastodon'
  | 'bilibili'
  | 'youtube'
  | 'linkedin'
  | 'website';

/* 一级导航项：内置项 id 取 SidebarNavId 且 href 由 id 推导；自定义项 id 为 kebab-case 字符串，必须显式携带 href。 */
export interface SidebarNavItem {
  id: string;
  label: string;
  ornament: string | null;
  visible: boolean;
  order: number;
  href?: string;
  children: SidebarNavChild[];
}

export interface SidebarNavChild {
  id: string;
  label: string;
  href: string;
  visible: boolean;
  order: number;
}

export interface SiteFooterSettings {
  startYear: number;
  showCurrentYear: boolean;
  copyright: string;
}

export interface SiteSocialCustomItem {
  id: string;
  label: string;
  href: string;
  iconKey: SiteSocialIconKey;
  visible: boolean;
  order: number;
}

export interface SiteSocialPresetOrder {
  github: number;
  qq: number;
  email: number;
}

export interface ResolvedSocialItem {
  id: string;
  label: string;
  href: string;
  iconKey: SiteSocialIconKey;
  kind: SiteSocialKind;
  visible: boolean;
  order: number;
}

export interface SiteSocialLinks {
  github: string | null;
  qq: string | null;
  email: string | null;
  presetOrder: SiteSocialPresetOrder;
  custom: SiteSocialCustomItem[];
  resolvedSocialItems: ResolvedSocialItem[];
}

export interface SiteAdminOverviewSettings {
  publicVisible: boolean;
  hiddenMessage: string;
}

export type { SiteFaviconSlot } from '../utils/format';

export interface SiteFaviconSettings {
  ico: string | null;
  svg: string | null;
  png: string | null;
  appleTouchIcon: string | null;
}

export interface SiteFaviconLink {
  rel: 'icon' | 'apple-touch-icon';
  href: string;
  type?: string;
  sizes?: string;
}

export interface SiteSettings {
  title: string;
  description: string;
  defaultLocale: string;
  footer: SiteFooterSettings;
  adminOverview: SiteAdminOverviewSettings;
  favicon: SiteFaviconSettings;
  socialLinks: SiteSocialLinks;
}

export interface ShellSettings {
  brandTitle: string;
  quote: string;
  nav: SidebarNavItem[];
}

export interface HomeSettings {
  introLead: string;
  introMore: string;
  introMoreLinks: HomeIntroLinkKey[];
  showIntroLead: boolean;
  showIntroMore: boolean;
  heroPresetId: HeroPresetId;
  heroImageSrc: string | null;
  heroImageAlt: string;
}

export interface PageHeadingSettings {
  title: string | null;
  subtitle: string | null;
}

export interface MemoPageSettings extends PageHeadingSettings {}

export interface BitsDefaultAuthorSettings {
  name: string;
  avatar: string;
}

export interface BitsPageSettings extends PageHeadingSettings {
  defaultAuthor: BitsDefaultAuthorSettings;
}

export interface AboutProfileSettings {
  avatar: string;
  greeting: string;
  name: string;
  identity: string;
  birthYear: number;
  current: string;
  mottoLead: string;
  mottoTail: string;
  interestsTitle: string;
  interests: string;
  musicTitle: string;
  music: string;
  personality: string;
  personalityType: string;
  personalityUrl: string | null;
  specialties: string;
  specialtyHighlight: string;
}

export interface AboutUmamiSettings {
  baseUrl: string;
  shareId: string;
}

export interface PageSettings {
  essay: PageHeadingSettings;
  archive: PageHeadingSettings;
  bits: BitsPageSettings;
  memo: MemoPageSettings;
  about: PageHeadingSettings & { profile: AboutProfileSettings; umami: AboutUmamiSettings };
  links: PageHeadingSettings;
}

export interface ArticleMetaSettings {
  showDate: boolean;
  dateLabel: string;
  showTags: boolean;
  showWordCount: boolean;
  showReadingTime: boolean;
}

export type ArticleMetaDisplayContext = 'home' | 'list' | 'detail';

export interface SidebarActionsSettings {
  showRssLink: boolean;
  showThemeToggle: boolean;
  showAdminEntry: boolean;
}

export interface TypographySettings {
  readable: ThemeFontId;
  copy: ThemeFontId;
  mono: ThemeFontId;
  brand: ThemeFontId;
}

export interface BackgroundSettings {
  starry: boolean;
}

export interface TransitionsSettings {
  swup: boolean;
}

export interface UiSettings {
  codeBlock: {
    showLineNumbers: boolean;
  };
  readingMode: {
    showEntry: boolean;
  };
  sidebarActions: SidebarActionsSettings;
  articleMeta: ArticleMetaSettings;
  layout: {
    sidebarDivider: SidebarDividerVariant;
  };
  typography: TypographySettings;
  background: BackgroundSettings;
  transitions: TransitionsSettings;
}

export interface ThemeSettings {
  site: SiteSettings;
  shell: ShellSettings;
  home: HomeSettings;
  page: PageSettings;
  links: LinksSettings;
  comments: CommentsSettings;
  ui: UiSettings;
}

export interface ThemeSettingsSources {
  site: {
    title: SettingSource;
    description: SettingSource;
    defaultLocale: SettingSource;
    footerStartYear: SettingSource;
    footerShowCurrentYear: SettingSource;
    footerCopyright: SettingSource;
    adminOverviewPublicVisible: SettingSource;
    adminOverviewHiddenMessage: SettingSource;
    faviconIco: SettingSource;
    faviconSvg: SettingSource;
    faviconPng: SettingSource;
    faviconAppleTouchIcon: SettingSource;
    socialLinksGithub: SettingSource;
    socialLinksQq: SettingSource;
    socialLinksEmail: SettingSource;
    socialLinksGithubOrder: SettingSource;
    socialLinksQqOrder: SettingSource;
    socialLinksEmailOrder: SettingSource;
    socialLinksCustom: SettingSource;
  };
  shell: {
    brandTitle: SettingSource;
    quote: SettingSource;
    nav: SettingSource;
  };
  home: {
    introLead: SettingSource;
    introMore: SettingSource;
    introMoreLinks: SettingSource;
    showIntroLead: SettingSource;
    showIntroMore: SettingSource;
    heroPresetId: SettingSource;
    heroImageSrc: SettingSource;
    heroImageAlt: SettingSource;
  };
  page: {
    essayTitle: SettingSource;
    essaySubtitle: SettingSource;
    archiveTitle: SettingSource;
    archiveSubtitle: SettingSource;
    bitsTitle: SettingSource;
    bitsSubtitle: SettingSource;
    bitsDefaultAuthorName: SettingSource;
    bitsDefaultAuthorAvatar: SettingSource;
    memoTitle: SettingSource;
    memoSubtitle: SettingSource;
    aboutTitle: SettingSource;
    aboutSubtitle: SettingSource;
    aboutProfile: SettingSource;
    aboutUmami: SettingSource;
    linksTitle: SettingSource;
    linksSubtitle: SettingSource;
  };
  links: {
    linksSourceUrl: SettingSource;
    latencySourceUrl: SettingSource;
    tombstoneSourceUrl: SettingSource;
    submissionUrl: SettingSource;
    fcircleSourceUrl: SettingSource;
    fcircleEnabled: SettingSource;
    fcircleShowError: SettingSource;
    ech0SourceUrl: SettingSource;
    ech0Enabled: SettingSource;
    ech0PageSize: SettingSource;
    ech0MaxPages: SettingSource;
    ech0ShowError: SettingSource;
    voteApiBase: SettingSource;
    voteEnabled: SettingSource;
  };
  comments: {
    enabled: SettingSource;
    repo: SettingSource;
    repoId: SettingSource;
    category: SettingSource;
    categoryId: SettingSource;
    mapping: SettingSource;
    inputPosition: SettingSource;
    lang: SettingSource;
    reactionsEnabled: SettingSource;
    strict: SettingSource;
  };
  ui: {
    codeBlockShowLineNumbers: SettingSource;
    readingModeShowEntry: SettingSource;
    sidebarActionsShowRssLink: SettingSource;
    sidebarActionsShowThemeToggle: SettingSource;
    sidebarActionsShowAdminEntry: SettingSource;
    articleMetaShowDate: SettingSource;
    articleMetaDateLabel: SettingSource;
    articleMetaShowTags: SettingSource;
    articleMetaShowWordCount: SettingSource;
    articleMetaShowReadingTime: SettingSource;
    layoutSidebarDivider: SettingSource;
    backgroundStarry: SettingSource;
    transitionsSwup: SettingSource;
    typographyReadable: SettingSource;
    typographyCopy: SettingSource;
    typographyMono: SettingSource;
    typographyBrand: SettingSource;
  };
}

const ARTICLE_META_TAG_LIMITS: Record<ArticleMetaDisplayContext, number> = {
  home: 1,
  list: 3,
  detail: 3
};

export interface ThemeSettingsResolved {
  settings: ThemeSettings;
  sources: ThemeSettingsSources;
}

export interface EditableSiteSocialLinks {
  github: string | null;
  qq: string | null;
  email: string | null;
  presetOrder: SiteSocialPresetOrder;
  custom: SiteSocialCustomItem[];
}

export interface EditableSiteSettings extends Omit<SiteSettings, 'socialLinks'> {
  socialLinks: EditableSiteSocialLinks;
}

export interface EditableThemeSettings extends Omit<ThemeSettings, 'site'> {
  site: EditableSiteSettings;
}

export interface ThemeSettingsEditablePayload {
  revision: string;
  settings: EditableThemeSettings;
  sources: ThemeSettingsSources;
}

type EditableThemeSettingsSnapshot = EditableThemeSettings;

export type ThemeSettingsFileGroup = 'site' | 'shell' | 'home' | 'page' | 'links' | 'comments' | 'ui';

export interface ThemeSettingsReadDiagnostic {
  group: ThemeSettingsFileGroup;
  path: string;
  code: 'invalid-json' | 'invalid-root' | 'read-failed' | 'schema-mismatch';
  message: string;
  detail?: string;
  line?: number;
  column?: number;
}

export interface ThemeSettingsEditableErrorState {
  ok: false;
  mode: 'invalid-settings';
  message: string;
  errors: string[];
  diagnostics: ThemeSettingsReadDiagnostic[];
}

export type ThemeSettingsEditableState =
  | {
      ok: true;
      payload: ThemeSettingsEditablePayload;
    }
  | ThemeSettingsEditableErrorState;

const DEFAULT_SETTINGS_DIR = join(process.cwd(), 'src', 'data', 'settings');
const INTERNAL_TEST_SETTINGS_DIR_ENV = 'ASTRO_WHONO_INTERNAL_TEST_SETTINGS_DIR';
const INTERNAL_TEST_SETTINGS_FLAG_ENV = 'ASTRO_WHONO_INTERNAL_TEST_SETTINGS';
const SETTINGS_FILE_GROUPS: readonly ThemeSettingsFileGroup[] = ['site', 'shell', 'home', 'page', 'links', 'comments', 'ui'];
const SETTINGS_RELATIVE_PATHS: Record<ThemeSettingsFileGroup, string> = {
  site: 'src/data/settings/site.json',
  shell: 'src/data/settings/shell.json',
  home: 'src/data/settings/home.json',
  page: 'src/data/settings/page.json',
  links: 'src/data/settings/links.json',
  comments: 'src/data/settings/comments.json',
  ui: 'src/data/settings/ui.json'
};

const isInternalThemeSettingsDirOverrideEnabled = (): boolean =>
  process.env[INTERNAL_TEST_SETTINGS_FLAG_ENV] === '1' || process.env.VITEST === 'true';

const resolveInternalThemeSettingsDirOverride = (): string | null => {
  if (!isInternalThemeSettingsDirOverrideEnabled()) return null;
  const rawValue = process.env[INTERNAL_TEST_SETTINGS_DIR_ENV]?.trim();
  return rawValue ? rawValue : null;
};

export const getThemeSettingsDir = (): string => resolveInternalThemeSettingsDirOverride() ?? DEFAULT_SETTINGS_DIR;

export const getThemeSettingsFilePath = (group: ThemeSettingsFileGroup): string =>
  join(getThemeSettingsDir(), getAdminThemeSettingsGroupFileName(group));

export const getThemeSettingsRelativePath = (group: ThemeSettingsFileGroup): string => SETTINGS_RELATIVE_PATHS[group];

const THEME_SETTINGS_INVALID_MESSAGE =
  '检测到 settings JSON 配置文件损坏，Theme Console 已停止读取并禁止保存，请先修复对应文件后再重试';

const LEGACY_INTRO_LEAD =
  '这是一个开源写作主题与示例内容库:包含 随笔/essay、小记/memo、归档/archive 与 絮语/bits，使用与配置请见 README 。';
const LEGACY_INTRO_MORE = '更多文章请访问';
const LEGACY_ESSAY_TITLE = '随笔';
const LEGACY_ARCHIVE_TITLE = '归档';
const LEGACY_ESSAY_SUBTITLE = '随笔与杂记';
const LEGACY_BITS_TITLE = '絮语';
const LEGACY_BITS_SUBTITLE = '生活不只是长篇';
const LEGACY_ABOUT_TITLE = '关于';
const LEGACY_QUOTE = 'A minimal Astro theme\nfor essays, notes, and docs.\nDesigned for reading,\nopen-source.';
const LEGACY_FOOTER_START_YEAR = 2025;
const LEGACY_FOOTER_SHOW_CURRENT_YEAR = true;
const LEGACY_FOOTER_COPYRIGHT = 'Whono · Theme Demo · by cxro';
const DEFAULT_PRESET_SOCIAL_ORDER: SiteSocialPresetOrder = {
  github: 1,
  qq: 2,
  email: 3
};
const LEGACY_SOCIAL_LINKS: SiteSocialLinks = {
  github: 'https://github.com/cxro/astro-whono',
  qq: 'https://qm.qq.com/q/igxLKlzUvC',
  email: 'Whono@linux.do',
  presetOrder: { ...DEFAULT_PRESET_SOCIAL_ORDER },
  custom: [],
  resolvedSocialItems: []
};
const LEGACY_NAV: SidebarNavItem[] = [
  { id: 'essay', label: '随笔', ornament: ADMIN_NAV_ORNAMENT_DEFAULT, visible: true, order: 1, children: [] },
  { id: 'bits', label: '絮语', ornament: ADMIN_NAV_ORNAMENT_DEFAULT, visible: true, order: 2, children: [] },
  { id: 'memo', label: '小记', ornament: ADMIN_NAV_ORNAMENT_DEFAULT, visible: true, order: 3, children: [] },
  { id: 'archive', label: '归档', ornament: ADMIN_NAV_ORNAMENT_DEFAULT, visible: true, order: 4, children: [] },
  { id: 'about', label: '关于', ornament: ADMIN_NAV_ORNAMENT_DEFAULT, visible: true, order: 5, children: [] },
  {
    id: 'links',
    label: '友链',
    ornament: ADMIN_NAV_ORNAMENT_DEFAULT,
    visible: true,
    order: 6,
    children: [
      { id: 'index', label: '友链列表', href: '/links/', visible: true, order: 1 },
      { id: 'exchange', label: '交换友链', href: '/links/exchange/', visible: true, order: 2 }
    ]
  }
];
const LEGACY_NAV_ORDER = new Map<string, number>(LEGACY_NAV.map((item) => [item.id, item.order]));

const cloneNavItems = (items: readonly SidebarNavItem[]): SidebarNavItem[] =>
  items.map((item) => ({ ...item, children: item.children.map((child) => ({ ...child })) }));

const cloneSocialCustomItems = (items: readonly SiteSocialCustomItem[]): SiteSocialCustomItem[] =>
  items.map((item) => ({ ...item }));

const clonePresetSocialOrder = (value: Readonly<SiteSocialPresetOrder>): SiteSocialPresetOrder => ({
  ...value
});

const cloneResolvedSocialItems = (items: readonly ResolvedSocialItem[]): ResolvedSocialItem[] =>
  items.map((item) => ({ ...item }));

const cloneHomeIntroLinks = (items: readonly HomeIntroLinkKey[]): HomeIntroLinkKey[] => [...items];

const cloneThemeSettingsSources = (sources: ThemeSettingsSources): ThemeSettingsSources => ({
  site: { ...sources.site },
  shell: { ...sources.shell },
  home: { ...sources.home },
  page: { ...sources.page },
  links: { ...sources.links },
  comments: { ...sources.comments },
  ui: { ...sources.ui }
});

const cloneThemeSettingsReadDiagnostics = (
  diagnostics: readonly ThemeSettingsReadDiagnostic[]
): ThemeSettingsReadDiagnostic[] => diagnostics.map((diagnostic) => ({ ...diagnostic }));

const DEFAULT_SITE: SiteSettings = {
  title: 'Whono',
  description: '一个 Astro 主题的展示站：轻量、可维护、可复用。',
  defaultLocale: 'zh-CN',
  footer: {
    startYear: LEGACY_FOOTER_START_YEAR,
    showCurrentYear: LEGACY_FOOTER_SHOW_CURRENT_YEAR,
    copyright: LEGACY_FOOTER_COPYRIGHT
  },
  adminOverview: {
    publicVisible: true,
    hiddenMessage: ADMIN_OVERVIEW_HIDDEN_MESSAGE_DEFAULT
  },
  favicon: {
    ico: null,
    svg: null,
    png: null,
    appleTouchIcon: null
  },
  socialLinks: {
    github: null,
    qq: null,
    email: null,
    presetOrder: clonePresetSocialOrder(DEFAULT_PRESET_SOCIAL_ORDER),
    custom: [],
    resolvedSocialItems: []
  }
};

const DEFAULT_SHELL: ShellSettings = {
  brandTitle: 'Whono',
  quote: LEGACY_QUOTE,
  nav: cloneNavItems(LEGACY_NAV)
};

const DEFAULT_HOME: HomeSettings = {
  introLead: LEGACY_INTRO_LEAD,
  introMore: LEGACY_INTRO_MORE,
  introMoreLinks: cloneHomeIntroLinks(ADMIN_HOME_INTRO_LINK_DEFAULT),
  showIntroLead: true,
  showIntroMore: true,
  heroPresetId: 'default',
  heroImageSrc: null,
  heroImageAlt: ADMIN_HERO_IMAGE_ALT_DEFAULT
};

const DEFAULT_PAGE: PageSettings = {
  essay: {
    title: LEGACY_ESSAY_TITLE,
    subtitle: LEGACY_ESSAY_SUBTITLE
  },
  archive: {
    title: LEGACY_ARCHIVE_TITLE,
    subtitle: '按年份分组的归档目录'
  },
  bits: {
    title: LEGACY_BITS_TITLE,
    subtitle: LEGACY_BITS_SUBTITLE,
    defaultAuthor: {
      name: 'Whono',
      avatar: 'author/avatar.webp'
    }
  },
  memo: {
    title: null,
    subtitle: null
  },
  about: {
    title: LEGACY_ABOUT_TITLE,
    subtitle: null,
    profile: {
      avatar: 'author/avatar.png',
      greeting: '您好，很高兴认识您！',
      name: '克喵Moretti',
      identity: '是一名学生、独立开发者、博主。',
      birthYear: 2010,
      current: '15 岁',
      mottoLead: '总有些事情',
      mottoTail: '比永恒更重要！',
      interestsTitle: '您的爱好',
      interests: '编程、写作、探索新事物',
      musicTitle: '伤感、民谣、轻音乐',
      music: '等我喜欢就听',
      personality: '调停者',
      personalityType: 'INFP-T',
      personalityUrl: 'https://www.16personalities.com/',
      specialties: '特长、特长',
      specialtyHighlight: '学习能力 MAX'
    },
    umami: { ...DEFAULT_ABOUT_UMAMI_SETTINGS }
  },
  links: {
    title: '友链',
    subtitle: null
  }
};

const DEFAULT_LINKS: LinksSettings = { ...DEFAULT_LINKS_SETTINGS };

const DEFAULT_COMMENTS: CommentsSettings = { ...DEFAULT_COMMENTS_SETTINGS };

const DEFAULT_UI: UiSettings = {
  codeBlock: {
    showLineNumbers: true
  },
  readingMode: {
    showEntry: true
  },
  sidebarActions: {
    showRssLink: true,
    showThemeToggle: true,
    showAdminEntry: false
  },
  articleMeta: {
    showDate: true,
    dateLabel: ADMIN_ARTICLE_META_DATE_LABEL_DEFAULT,
    showTags: true,
    showWordCount: true,
    showReadingTime: true
  },
  layout: {
    sidebarDivider: ADMIN_SIDEBAR_DIVIDER_DEFAULT
  },
  background: {
    starry: true
  },
  transitions: {
    swup: true
  },
  typography: {
    ...ADMIN_TYPOGRAPHY_DEFAULT
  }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GITHUB_HOSTS = ['github.com'];
const QQ_HOSTS = ['qm.qq.com'];
const SOCIAL_CUSTOM_LIMIT = 8;
const PRESET_SOCIAL_ITEMS: readonly {
  id: SiteSocialPresetId;
  label: string;
  iconKey: SiteSocialIconKey;
}[] = [
  { id: 'github', label: 'GitHub', iconKey: 'github' },
  { id: 'qq', label: 'QQ', iconKey: 'qq' },
  { id: 'email', label: 'Email', iconKey: 'email' }
];

let cachedSettings: ThemeSettingsResolved | null = null;
const shouldCacheThemeSettings = import.meta.env.PROD;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value.trim() : undefined;

const asNonEmptyString = (value: unknown): string | undefined => {
  const next = asString(value);
  return next ? next : undefined;
};

const asLocale = (value: unknown): string | undefined => {
  const next = asNonEmptyString(value);
  return next && ADMIN_LOCALE_RE.test(next) ? next : undefined;
};

const asSingleLineString = (value: unknown, maxLength?: number): string | undefined => {
  const next = asNonEmptyString(value);
  if (!next) return undefined;
  if (next.includes('\n') || next.includes('\r')) return undefined;
  if (typeof maxLength === 'number' && next.length > maxLength) return undefined;
  return next;
};

const asTrimmedSingleLineString = (value: unknown, maxLength?: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const next = value.trim();
  if (next.includes('\n') || next.includes('\r')) return undefined;
  if (typeof maxLength === 'number' && next.length > maxLength) return undefined;
  return next;
};

const asNullableSingleLineString = (value: unknown, maxLength?: number): string | null | undefined => {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes('\n') || trimmed.includes('\r')) return undefined;
  if (typeof maxLength === 'number' && trimmed.length > maxLength) return undefined;
  return trimmed;
};

const asInteger = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Number.isInteger(value) ? value : undefined;
};

const asFooterStartYear = (value: unknown): number | undefined => {
  const next = asInteger(value);
  if (next === undefined) return undefined;
  const currentYear = new Date().getFullYear();
  return next >= 1900 && next <= currentYear ? next : undefined;
};

const asPresetSocialOrderValue = (value: unknown): number | undefined => {
  const next = asInteger(value);
  return next !== undefined && isAdminSocialOrderValue(next) ? next : undefined;
};

const asNullableString = (value: unknown): string | null | undefined => {
  if (value === null) return null;

  const next = asString(value);
  if (next === undefined) return undefined;
  return next || null;
};

const asHttpsUrl = (value: unknown, allowedHosts?: readonly string[]): string | null | undefined => {
  if (value === null) return null;

  const next = asString(value);
  if (next === undefined) return undefined;
  if (!next) return null;

  try {
    const parsed = new URL(next);
    if (parsed.protocol !== 'https:') return undefined;
    if (allowedHosts?.length) {
      const hostname = parsed.hostname.toLowerCase();
      const isAllowed = allowedHosts.some(
        (host) => hostname === host || hostname === `www.${host}` || hostname.endsWith(`.${host}`)
      );
      if (!isAllowed) return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
};

const asRequiredHttpsUrl = (value: unknown): string | undefined => {
  const normalized = asHttpsUrl(value);
  return typeof normalized === 'string' && normalized ? normalized : undefined;
};

const asUmamiShareId = (value: unknown): string | undefined => {
  const next = asString(value);
  return next && UMAMI_SHARE_ID_RE.test(next) ? next : undefined;
};

const asGiscusEnum = <T extends string>(allowed: ReadonlySet<T>) => (value: unknown): T | undefined => {
  const next = asString(value);
  return next && allowed.has(next as T) ? (next as T) : undefined;
};

const asGiscusRepo = (value: unknown): string | undefined => {
  const next = asString(value);
  return next && GISCUS_REPO_RE.test(next) ? next : undefined;
};

const asGiscusId = (value: unknown): string | undefined => {
  const next = asString(value);
  return next && next.length >= 6 && next.length <= 128 && /^[A-Za-z0-9_-]+$/.test(next) ? next : undefined;
};

/* 只校验协议、保留原字符串：避免 URL.toString() 给纯主机地址补尾斜杠，
   导致与 settings 文件里的原值产生 schema-mismatch。 */
const asUmamiBaseUrl = (value: unknown): string | undefined => {
  const next = asString(value);
  if (!next) return undefined;
  try {
    return new URL(next).protocol === 'https:' ? next : undefined;
  } catch {
    return undefined;
  }
};

const asEmailAddress = (value: unknown): string | null | undefined => {
  if (value === null) return null;

  const next = asString(value);
  if (next === undefined) return undefined;
  if (!next) return null;

  const normalized = next.replace(/^mailto:/i, '').trim();
  return EMAIL_RE.test(normalized) ? normalized : undefined;
};

const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const asNavId = (value: unknown): SidebarNavId | undefined => {
  if (typeof value !== 'string') return undefined;
  return SIDEBAR_NAV_BUILTIN_ID_SET.has(value) ? (value as SidebarNavId) : undefined;
};

const asHeroPresetId = (value: unknown): HeroPresetId | undefined => {
  if (typeof value !== 'string') return undefined;
  return ADMIN_HERO_PRESET_SET.has(value as HeroPresetId) ? (value as HeroPresetId) : undefined;
};

const asSidebarDividerVariant = (value: unknown): SidebarDividerVariant | undefined => {
  if (typeof value !== 'string') return undefined;
  return isAdminSidebarDividerVariant(value) ? value : undefined;
};

const asTypographyFontId = (role: TypographyRole, value: unknown): ThemeFontId | undefined =>
  asThemeFontIdForRole(role, value);

const asHeroImageSrc = (value: unknown): string | null | undefined => {
  const normalized = normalizeHeroImageSrc(value);
  if (normalized === undefined || normalized === null) return normalized;

  const localFilePath = getHeroImageLocalFilePath(normalized);
  if (!localFilePath) return normalized;

  return existsSync(join(process.cwd(), ...localFilePath.split('/'))) ? normalized : undefined;
};

// 只做格式校验；文件是否存在交给保存期校验（阻断新的坏引用）与渲染期回退——
// 手改 JSON / 切分支导致的文件缺失不应把后台锁进 invalid-settings。
const asSiteFaviconPath = (slot: SiteFaviconSlot, value: unknown): string | null | undefined =>
  normalizeSiteFaviconPath(slot, value);

const asBitsAvatarPath = (value: unknown): string | undefined => {
  return normalizeBitsAvatarPath(value);
};

const asHomeIntroLinkKey = (value: unknown): HomeIntroLinkKey | undefined => {
  if (typeof value !== 'string') return undefined;
  return ADMIN_HOME_INTRO_LINK_KEY_SET.has(value as HomeIntroLinkKey) ? (value as HomeIntroLinkKey) : undefined;
};

const asSocialIconKey = (value: unknown): SiteSocialIconKey | undefined => {
  return normalizeAdminSocialIconKey(value);
};

export const getVisibleArticleMetaTags = (
  tags: readonly string[] | null | undefined,
  context: ArticleMetaDisplayContext
): string[] => {
  if (!Array.isArray(tags)) return [];

  return tags
    .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
    .filter((tag): tag is string => Boolean(tag))
    .slice(0, ARTICLE_META_TAG_LIMITS[context]);
};

const resolveValue = <T>(
  nextValue: T | undefined,
  legacyValue: T | undefined,
  defaultValue: T
): { value: T; source: SettingSource } => {
  if (nextValue !== undefined) return { value: nextValue, source: 'new' };
  if (legacyValue !== undefined) return { value: legacyValue, source: 'legacy' };
  return { value: defaultValue, source: 'default' };
};

const toReadErrorDetail = (error: unknown): string =>
  error instanceof Error ? error.message.trim() : String(error).trim();

const extractDiagnosticLocation = (
  detail?: string
): { line?: number; column?: number } => {
  if (!detail) return {};

  const match = detail.match(/\(line\s+(\d+)\s+column\s+(\d+)\)\s*$/i);
  if (!match) return {};

  const line = Number.parseInt(match[1] ?? '', 10);
  const column = Number.parseInt(match[2] ?? '', 10);
  const location: { line?: number; column?: number } = {};
  if (Number.isFinite(line)) {
    location.line = line;
  }
  if (Number.isFinite(column)) {
    location.column = column;
  }
  return location;
};

const createThemeSettingsReadDiagnostic = (
  group: ThemeSettingsFileGroup,
  code: ThemeSettingsReadDiagnostic['code'],
  detail?: string
): ThemeSettingsReadDiagnostic => {
  const path = SETTINGS_RELATIVE_PATHS[group];
  const message =
    code === 'invalid-json'
      ? `${path} 不是合法 JSON`
      : code === 'invalid-root'
        ? `${path} 的根节点必须是 JSON 对象`
        : code === 'schema-mismatch'
          ? `${path} 存在无效或非规范配置值`
          : `${path} 读取失败`;
  const location = extractDiagnosticLocation(detail);

  return {
    group,
    path,
    code,
    message,
    ...(detail ? { detail } : {}),
    ...location
  };
};

const readSettingsObject = (
  name: ThemeSettingsFileGroup,
  diagnostics: ThemeSettingsReadDiagnostic[] = []
): Record<string, unknown> | undefined => {
  const filePath = getThemeSettingsFilePath(name);
  if (!existsSync(filePath)) return undefined;

  try {
    const raw = readFileSync(filePath, 'utf8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      const diagnostic = createThemeSettingsReadDiagnostic(name, 'invalid-json', toReadErrorDetail(error));
      console.warn(`[astro-whono] Failed to parse ${filePath}:`, error);
      diagnostics.push(diagnostic);
      return undefined;
    }

    if (!isRecord(parsed)) {
      const diagnostic = createThemeSettingsReadDiagnostic(name, 'invalid-root');
      console.warn(`[astro-whono] Invalid settings root for ${filePath}: expected JSON object`);
      diagnostics.push(diagnostic);
      return undefined;
    }

    return parsed;
  } catch (error) {
    const diagnostic = createThemeSettingsReadDiagnostic(name, 'read-failed', toReadErrorDetail(error));
    console.warn(`[astro-whono] Failed to read ${filePath}:`, error);
    diagnostics.push(diagnostic);
    return undefined;
  }
};

const readThemeSettingsObjects = (
  diagnostics: ThemeSettingsReadDiagnostic[] = []
): Partial<Record<ThemeSettingsFileGroup, Record<string, unknown>>> => {
  const settingsObjects: Partial<Record<ThemeSettingsFileGroup, Record<string, unknown>>> = {};
  for (const group of SETTINGS_FILE_GROUPS) {
    const settingsObject = readSettingsObject(group, diagnostics);
    if (settingsObject) {
      settingsObjects[group] = settingsObject;
    }
  }
  return settingsObjects;
};

const collectThemeSettingsSchemaDiagnostics = (
  rawSettings: Partial<Record<ThemeSettingsFileGroup, Record<string, unknown>>>,
  resolved: ThemeSettingsResolved
): ThemeSettingsReadDiagnostic[] => {
  const editableSnapshot = buildEditableThemeSettingsSnapshot(resolved);
  const canonicalGroups = createAdminWritableThemeSettingsGroups(editableSnapshot);
  const diagnostics: ThemeSettingsReadDiagnostic[] = [];

  for (const group of SETTINGS_FILE_GROUPS) {
    const rawGroup = rawSettings[group];
    if (!rawGroup) continue;

    const comparableRawGroup = fillAdminThemeSettingsGroupCompatibilityDefaults(group, rawGroup, canonicalGroups[group]);
    const mismatchPaths = getAdminThemeSettingsMismatchPaths(comparableRawGroup, canonicalGroups[group], 'exact');
    if (!mismatchPaths.length) continue;

    const summarizedPaths = mismatchPaths.slice(0, 6);
    const suffix = mismatchPaths.length > summarizedPaths.length ? ' 等' : '';
    diagnostics.push(
      createThemeSettingsReadDiagnostic(
        group,
        'schema-mismatch',
        `以下字段会在读取时被静默修补：${summarizedPaths.join(', ')}${suffix}`
      )
    );
  }

  return diagnostics;
};

export const getThemeSettingsReadDiagnostics = (
  resolved: ThemeSettingsResolved = getThemeSettings()
): ThemeSettingsReadDiagnostic[] => {
  const diagnostics: ThemeSettingsReadDiagnostic[] = [];
  const rawSettings = readThemeSettingsObjects(diagnostics);
  if (diagnostics.length === 0) {
    diagnostics.push(...collectThemeSettingsSchemaDiagnostics(rawSettings, resolved));
  }

  return cloneThemeSettingsReadDiagnostics(diagnostics);
};

export const getThemeSettingsRevision = (resolved: ThemeSettingsResolved = getThemeSettings()): string =>
  hashEditableThemeSettingsSnapshot(buildEditableThemeSettingsSnapshot(resolved));

const claimAvailableOrder = (
  usedOrders: Set<number>,
  preferredOrder: number,
  fallbackOrder: number,
  isValidOrder: (value: number) => boolean,
  minOrder: number,
  maxOrder: number
): number => {
  if (isValidOrder(preferredOrder) && !usedOrders.has(preferredOrder)) {
    usedOrders.add(preferredOrder);
    return preferredOrder;
  }

  if (isValidOrder(fallbackOrder) && !usedOrders.has(fallbackOrder)) {
    usedOrders.add(fallbackOrder);
    return fallbackOrder;
  }

  for (let order = minOrder; order <= maxOrder; order += 1) {
    if (usedOrders.has(order)) continue;
    usedOrders.add(order);
    return order;
  }

  usedOrders.add(fallbackOrder);
  return fallbackOrder;
};

const sortSidebarNavItems = (items: readonly SidebarNavItem[]): SidebarNavItem[] =>
  [...items].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return (ADMIN_NAV_IDS as readonly string[]).indexOf(a.id) - (ADMIN_NAV_IDS as readonly string[]).indexOf(b.id);
  });

const normalizeSidebarNavItems = (items: readonly SidebarNavItem[]): SidebarNavItem[] => {
  const normalized = cloneNavItems(items);
  const hasOrderIssues = getAdminNavOrderIssues(
    normalized.map((item) => ({
      key: item.id,
      order: item.order
    }))
  ).length > 0;

  if (!hasOrderIssues) {
    return sortSidebarNavItems(normalized);
  }

  const usedOrders = new Set<number>();
  const nextItems = normalized.map((item) => ({
    ...item,
    order: claimAvailableOrder(
      usedOrders,
      item.order,
      LEGACY_NAV_ORDER.get(item.id) ?? (ADMIN_NAV_IDS as readonly string[]).indexOf(item.id) + 1,
      isAdminNavOrderValue,
      ADMIN_NAV_ORDER_MIN,
      ADMIN_NAV_ORDER_MAX
    )
  }));

  return sortSidebarNavItems(nextItems);
};

const normalizeSocialOrderState = (
  presetOrder: Readonly<SiteSocialPresetOrder>,
  customItems: readonly SiteSocialCustomItem[]
): { presetOrder: SiteSocialPresetOrder; customItems: SiteSocialCustomItem[] } => {
  const nextPresetOrder = clonePresetSocialOrder(presetOrder);
  const nextCustomItems = cloneSocialCustomItems(customItems);
  const hasOrderIssues = getAdminSocialOrderIssues(
    nextPresetOrder,
    nextCustomItems.map((item, index) => ({
      key: String(index),
      order: item.order
    }))
  ).length > 0;

  if (!hasOrderIssues) {
    return {
      presetOrder: nextPresetOrder,
      customItems: nextCustomItems
    };
  }

  const usedOrders = new Set<number>();

  ADMIN_SOCIAL_PRESET_IDS.forEach((id) => {
    nextPresetOrder[id] = claimAvailableOrder(
      usedOrders,
      nextPresetOrder[id],
      DEFAULT_PRESET_SOCIAL_ORDER[id],
      isAdminSocialOrderValue,
      ADMIN_SOCIAL_ORDER_MIN,
      ADMIN_SOCIAL_ORDER_MAX
    );
  });

  nextCustomItems.forEach((item, index) => {
    item.order = claimAvailableOrder(
      usedOrders,
      item.order,
      PRESET_SOCIAL_ITEMS.length + index + 1,
      isAdminSocialOrderValue,
      ADMIN_SOCIAL_ORDER_MIN,
      ADMIN_SOCIAL_ORDER_MAX
    );
  });

  return {
    presetOrder: nextPresetOrder,
    customItems: nextCustomItems
  };
};

const parseSidebarNavChildren = (value: unknown): SidebarNavChild[] =>
  Array.isArray(value)
    ? value.flatMap((child, index) => {
        if (!isRecord(child)) return [];
        const childId = asSingleLineString(child.id, 64);
        const childLabel = asSingleLineString(child.label, 80);
        const href = asString(child.href);
        if (!childId || !childLabel || !href || !/^\/(?!\/)/.test(href)) return [];
        return [{
          id: childId,
          label: childLabel,
          href,
          visible: asBoolean(child.visible) ?? true,
          order: asInteger(child.order) ?? index + 1
        }];
      }).sort((a, b) => a.order - b.order)
    : [];

const parseSidebarNav = (value: unknown): SidebarNavItem[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  const merged = new Map<string, SidebarNavItem>(
    LEGACY_NAV.map((item) => [item.id, { ...item }])
  );
  let hasOverride = false;

  for (const row of value) {
    if (!isRecord(row)) continue;
    const id = asNavId(row.id);
    if (id) {
      const current = merged.get(id);
      if (!current) continue;

      const label = asNonEmptyString(row.label) ?? current.label;
      const ornament = asNullableSingleLineString(row.ornament, ADMIN_NAV_ORNAMENT_MAX_LENGTH);
      const visible = asBoolean(row.visible) ?? current.visible;
      const rawOrder = asInteger(row.order);
      const order = rawOrder !== undefined && isAdminNavOrderValue(rawOrder) ? rawOrder : current.order;
      const children = Array.isArray(row.children) ? parseSidebarNavChildren(row.children) : current.children;

      merged.set(id, {
        id,
        label,
        ornament: ornament === undefined ? current.ornament : ornament,
        visible,
        order,
        children
      });
      hasOverride = true;
      continue;
    }

    /* 自定义一级导航：id/label/href 全部合法才保留（缺 href 等非法项按既有策略忽略），重复 id 后者覆盖前者。 */
    const customId = asString(row.id);
    const customLabel = asSingleLineString(row.label, ADMIN_NAV_CUSTOM_LABEL_MAX_LENGTH);
    const customHref = asString(row.href);
    if (
      !customId ||
      !customLabel ||
      !customHref ||
      !isAdminNavCustomId(customId) ||
      !isAdminNavCustomHref(customHref) ||
      customHref.length > ADMIN_NAV_CUSTOM_HREF_MAX_LENGTH
    ) continue;

    const ornament = asNullableSingleLineString(row.ornament, ADMIN_NAV_ORNAMENT_MAX_LENGTH);
    const rawOrder = asInteger(row.order);
    merged.set(customId, {
      id: customId,
      label: customLabel,
      ornament: ornament ?? ADMIN_NAV_ORNAMENT_DEFAULT,
      visible: asBoolean(row.visible) ?? true,
      order: rawOrder !== undefined && isAdminNavOrderValue(rawOrder) ? rawOrder : ADMIN_NAV_IDS.length + 1,
      href: customHref,
      children: parseSidebarNavChildren(row.children)
    });
    hasOverride = true;
  }

  if (!hasOverride) return undefined;
  return Array.from(merged.values()).sort((a, b) => a.order - b.order);
};

const parseSocialCustomItems = (value: unknown): SiteSocialCustomItem[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  const normalized: SiteSocialCustomItem[] = [];
  const seenIds = new Set<string>();

  for (const [index, row] of value.entries()) {
    if (!isRecord(row)) continue;

    const label = asNonEmptyString(row.label);
    const href = asHttpsUrl(row.href);
    if (!label || !href) continue;

    const baseId = asNonEmptyString(row.id) ?? `custom-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (seenIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    seenIds.add(id);
    const rawOrder = asInteger(row.order);

    normalized.push({
      id,
      label,
      href,
      iconKey: asSocialIconKey(row.iconKey) ?? 'website',
      visible: asBoolean(row.visible) ?? true,
      order: rawOrder !== undefined && isAdminSocialOrderValue(rawOrder) ? rawOrder : index + 1
    });

    if (normalized.length >= SOCIAL_CUSTOM_LIMIT) break;
  }

  return normalized;
};

const parseHomeIntroLinks = (value: unknown): HomeIntroLinkKey[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  const normalized: HomeIntroLinkKey[] = [];
  const seen = new Set<HomeIntroLinkKey>();

  for (const item of value) {
    const linkKey = asHomeIntroLinkKey(item);
    if (!linkKey || seen.has(linkKey)) continue;
    normalized.push(linkKey);
    seen.add(linkKey);

    if (normalized.length >= ADMIN_HOME_INTRO_LINK_LIMIT) break;
  }

  return normalized.length ? normalized : undefined;
};

const buildResolvedSocialItems = (
  socialLinks: Pick<SiteSocialLinks, 'github' | 'qq' | 'email' | 'presetOrder'>,
  customItems: readonly SiteSocialCustomItem[]
): ResolvedSocialItem[] => {
  const presetItems = PRESET_SOCIAL_ITEMS.flatMap((item, index) => {
    const href =
      item.id === 'email'
        ? socialLinks.email
          ? `mailto:${socialLinks.email}`
          : null
        : socialLinks[item.id];

    if (!href) return [];

    return [
      {
        id: item.id,
        label: item.label,
        href,
        iconKey: item.iconKey,
        kind: 'preset' as const,
        visible: true,
        order: socialLinks.presetOrder[item.id],
        sortIndex: index
      }
    ];
  });

  const customResolved = customItems.map((item, index) => ({
    ...item,
    kind: 'custom' as const,
    sortIndex: PRESET_SOCIAL_ITEMS.length + index
  }));

  return [...presetItems, ...customResolved]
    .sort((a, b) => a.order - b.order || a.sortIndex - b.sortIndex)
    .map(({ sortIndex: _sortIndex, ...item }) => item);
};

export const getThemeSettings = (): ThemeSettingsResolved => {
  if (shouldCacheThemeSettings && cachedSettings) return cachedSettings;

  const siteJson = readSettingsObject('site');
  const shellJson = readSettingsObject('shell');
  const homeJson = readSettingsObject('home');
  const pageJson = readSettingsObject('page');
  const linksJson = readSettingsObject('links');
  const commentsJson = readSettingsObject('comments');
  const uiJson = readSettingsObject('ui');

  const siteFooterJson = isRecord(siteJson?.footer) ? siteJson.footer : undefined;
  const siteAdminOverviewJson = isRecord(siteJson?.adminOverview) ? siteJson.adminOverview : undefined;
  const siteFaviconJson = isRecord(siteJson?.favicon) ? siteJson.favicon : undefined;
  const siteSocialLinksJson = isRecord(siteJson?.socialLinks) ? siteJson.socialLinks : undefined;
  const siteSocialPresetOrderJson = isRecord(siteSocialLinksJson?.presetOrder) ? siteSocialLinksJson.presetOrder : undefined;
  const pageEssayJson = isRecord(pageJson?.essay) ? pageJson.essay : undefined;
  const pageArchiveJson = isRecord(pageJson?.archive) ? pageJson.archive : undefined;
  const pageBitsJson = isRecord(pageJson?.bits) ? pageJson.bits : undefined;
  const pageBitsDefaultAuthorJson = isRecord(pageBitsJson?.defaultAuthor) ? pageBitsJson.defaultAuthor : undefined;
  const pageMemoJson = isRecord(pageJson?.memo) ? pageJson.memo : undefined;
  const pageAboutJson = isRecord(pageJson?.about) ? pageJson.about : undefined;
  const pageAboutProfileJson = isRecord(pageAboutJson?.profile) ? pageAboutJson.profile : undefined;
  const pageAboutUmamiJson = isRecord(pageAboutJson?.umami) ? pageAboutJson.umami : undefined;
  const pageLinksJson = isRecord(pageJson?.links) ? pageJson.links : undefined;

  const linksSourceUrl = resolveValue(
    asRequiredHttpsUrl(linksJson?.linksSourceUrl),
    undefined,
    DEFAULT_LINKS.linksSourceUrl
  );
  const latencySourceUrl = resolveValue(
    asRequiredHttpsUrl(linksJson?.latencySourceUrl),
    undefined,
    DEFAULT_LINKS.latencySourceUrl
  );
  const tombstoneSourceUrl = resolveValue(
    asRequiredHttpsUrl(linksJson?.tombstoneSourceUrl),
    undefined,
    DEFAULT_LINKS.tombstoneSourceUrl
  );
  const submissionUrl = resolveValue(
    asRequiredHttpsUrl(linksJson?.submissionUrl),
    undefined,
    DEFAULT_LINKS.submissionUrl
  );

  const asGiscusMapping = asGiscusEnum<GiscusMapping>(GISCUS_MAPPING_SET);
  const asGiscusInputPosition = asGiscusEnum<GiscusInputPosition>(GISCUS_INPUT_POSITION_SET);
  const asGiscusLang = asGiscusEnum<GiscusLang>(GISCUS_LANG_SET);
  const commentsEnabled = resolveValue(
    asBoolean(commentsJson?.enabled),
    undefined,
    DEFAULT_COMMENTS.enabled
  );
  const commentsRepo = resolveValue(
    asGiscusRepo(commentsJson?.repo),
    undefined,
    DEFAULT_COMMENTS.repo
  );
  const commentsRepoId = resolveValue(
    asGiscusId(commentsJson?.repoId),
    undefined,
    DEFAULT_COMMENTS.repoId
  );
  const commentsCategory = resolveValue(
    asNonEmptyString(commentsJson?.category),
    undefined,
    DEFAULT_COMMENTS.category
  );
  const commentsCategoryId = resolveValue(
    asGiscusId(commentsJson?.categoryId),
    undefined,
    DEFAULT_COMMENTS.categoryId
  );
  const commentsMapping = resolveValue(
    asGiscusMapping(commentsJson?.mapping),
    undefined,
    DEFAULT_COMMENTS.mapping
  );
  const commentsInputPosition = resolveValue(
    asGiscusInputPosition(commentsJson?.inputPosition),
    undefined,
    DEFAULT_COMMENTS.inputPosition
  );
  const commentsLang = resolveValue(
    asGiscusLang(commentsJson?.lang),
    undefined,
    DEFAULT_COMMENTS.lang
  );
  const commentsReactionsEnabled = resolveValue(
    asBoolean(commentsJson?.reactionsEnabled),
    undefined,
    DEFAULT_COMMENTS.reactionsEnabled
  );
  const commentsStrict = resolveValue(
    asBoolean(commentsJson?.strict),
    undefined,
    DEFAULT_COMMENTS.strict
  );

  const fcircleSourceUrl = resolveValue(
    asRequiredHttpsUrl(linksJson?.fcircleSourceUrl),
    undefined,
    DEFAULT_LINKS.fcircleSourceUrl
  );
  const fcircleEnabled = resolveValue(
    typeof linksJson?.fcircleEnabled === 'boolean' ? linksJson.fcircleEnabled : undefined,
    undefined,
    DEFAULT_LINKS.fcircleEnabled
  );
  const fcircleShowError = resolveValue(
    typeof linksJson?.fcircleShowError === 'boolean' ? linksJson.fcircleShowError : undefined,
    undefined,
    DEFAULT_LINKS.fcircleShowError
  );
  const ech0SourceUrl = resolveValue(asRequiredHttpsUrl(linksJson?.ech0SourceUrl), undefined, DEFAULT_LINKS.ech0SourceUrl);
  const ech0Enabled = resolveValue(typeof linksJson?.ech0Enabled === 'boolean' ? linksJson.ech0Enabled : undefined, undefined, DEFAULT_LINKS.ech0Enabled);
  const ech0PageSize = resolveValue(typeof linksJson?.ech0PageSize === 'number' && Number.isInteger(linksJson.ech0PageSize) ? linksJson.ech0PageSize : undefined, undefined, DEFAULT_LINKS.ech0PageSize);
  const ech0MaxPages = resolveValue(typeof linksJson?.ech0MaxPages === 'number' && Number.isInteger(linksJson.ech0MaxPages) ? linksJson.ech0MaxPages : undefined, undefined, DEFAULT_LINKS.ech0MaxPages);
  const ech0ShowError = resolveValue(typeof linksJson?.ech0ShowError === 'boolean' ? linksJson.ech0ShowError : undefined, undefined, DEFAULT_LINKS.ech0ShowError);
  const voteApiBase = resolveValue(asRequiredHttpsUrl(linksJson?.voteApiBase), undefined, DEFAULT_LINKS.voteApiBase);
  const voteEnabled = resolveValue(typeof linksJson?.voteEnabled === 'boolean' ? linksJson.voteEnabled : undefined, undefined, DEFAULT_LINKS.voteEnabled);

  const title = resolveValue(
    asNonEmptyString(siteJson?.title),
    asNonEmptyString(legacySite.title),
    DEFAULT_SITE.title
  );
  const description = resolveValue(
    asNonEmptyString(siteJson?.description),
    asNonEmptyString(legacySite.description),
    DEFAULT_SITE.description
  );
  const defaultLocale = resolveValue(
    asLocale(siteJson?.defaultLocale),
    undefined,
    DEFAULT_SITE.defaultLocale
  );
  const footerCopyright = resolveValue(
    asNonEmptyString(siteFooterJson?.copyright),
    LEGACY_FOOTER_COPYRIGHT,
    DEFAULT_SITE.footer.copyright
  );
  const footerStartYear = resolveValue(
    asFooterStartYear(siteFooterJson?.startYear),
    LEGACY_FOOTER_START_YEAR,
    DEFAULT_SITE.footer.startYear
  );
  const footerShowCurrentYear = resolveValue(
    asBoolean(siteFooterJson?.showCurrentYear),
    LEGACY_FOOTER_SHOW_CURRENT_YEAR,
    DEFAULT_SITE.footer.showCurrentYear
  );
  const adminOverviewPublicVisible = resolveValue(
    asBoolean(siteAdminOverviewJson?.publicVisible),
    undefined,
    DEFAULT_SITE.adminOverview.publicVisible
  );
  const adminOverviewHiddenMessage = resolveValue(
    asSingleLineString(siteAdminOverviewJson?.hiddenMessage, ADMIN_OVERVIEW_HIDDEN_MESSAGE_MAX_LENGTH),
    undefined,
    DEFAULT_SITE.adminOverview.hiddenMessage
  );
  const faviconIco = resolveValue<string | null>(
    asSiteFaviconPath('ico', siteFaviconJson?.ico),
    undefined,
    DEFAULT_SITE.favicon.ico
  );
  const faviconSvg = resolveValue<string | null>(
    asSiteFaviconPath('svg', siteFaviconJson?.svg),
    undefined,
    DEFAULT_SITE.favicon.svg
  );
  const faviconPng = resolveValue<string | null>(
    asSiteFaviconPath('png', siteFaviconJson?.png),
    undefined,
    DEFAULT_SITE.favicon.png
  );
  const faviconAppleTouchIcon = resolveValue<string | null>(
    asSiteFaviconPath('appleTouchIcon', siteFaviconJson?.appleTouchIcon),
    undefined,
    DEFAULT_SITE.favicon.appleTouchIcon
  );
  const socialLinksGithub = resolveValue(
    asHttpsUrl(siteSocialLinksJson?.github, GITHUB_HOSTS),
    LEGACY_SOCIAL_LINKS.github,
    DEFAULT_SITE.socialLinks.github
  );
  const rawSocialLinksQq = siteSocialLinksJson?.qq ?? siteSocialLinksJson?.x;
  const socialLinksQq = resolveValue(
    asHttpsUrl(rawSocialLinksQq, QQ_HOSTS),
    LEGACY_SOCIAL_LINKS.qq,
    DEFAULT_SITE.socialLinks.qq
  );
  const socialLinksEmail = resolveValue(
    asEmailAddress(siteSocialLinksJson?.email),
    LEGACY_SOCIAL_LINKS.email,
    DEFAULT_SITE.socialLinks.email
  );
  const socialLinksGithubOrder = resolveValue(
    asPresetSocialOrderValue(siteSocialPresetOrderJson?.github),
    LEGACY_SOCIAL_LINKS.presetOrder.github,
    DEFAULT_SITE.socialLinks.presetOrder.github
  );
  const rawSocialLinksQqOrder = siteSocialPresetOrderJson?.qq ?? siteSocialPresetOrderJson?.x;
  const socialLinksQqOrder = resolveValue(
    asPresetSocialOrderValue(rawSocialLinksQqOrder),
    LEGACY_SOCIAL_LINKS.presetOrder.qq,
    DEFAULT_SITE.socialLinks.presetOrder.qq
  );
  const socialLinksEmailOrder = resolveValue(
    asPresetSocialOrderValue(siteSocialPresetOrderJson?.email),
    LEGACY_SOCIAL_LINKS.presetOrder.email,
    DEFAULT_SITE.socialLinks.presetOrder.email
  );
  const socialLinksCustom = resolveValue(
    parseSocialCustomItems(siteSocialLinksJson?.custom),
    undefined,
    DEFAULT_SITE.socialLinks.custom
  );

  const brandTitle = resolveValue(
    asNonEmptyString(shellJson?.brandTitle),
    asNonEmptyString(legacySite.brandTitle),
    DEFAULT_SHELL.brandTitle
  );
  const quote = resolveValue(
    asNonEmptyString(shellJson?.quote),
    LEGACY_QUOTE,
    DEFAULT_SHELL.quote
  );
  const nav = resolveValue(
    parseSidebarNav(shellJson?.nav),
    cloneNavItems(LEGACY_NAV),
    cloneNavItems(DEFAULT_SHELL.nav)
  );

  const introLead = resolveValue(
    asNonEmptyString(homeJson?.introLead),
    LEGACY_INTRO_LEAD,
    DEFAULT_HOME.introLead
  );
  const introMore = resolveValue(
    asNonEmptyString(homeJson?.introMore),
    LEGACY_INTRO_MORE,
    DEFAULT_HOME.introMore
  );
  const introMoreLinks = resolveValue(
    parseHomeIntroLinks(homeJson?.introMoreLinks),
    undefined,
    cloneHomeIntroLinks(DEFAULT_HOME.introMoreLinks)
  );
  const showIntroLead = resolveValue(
    asBoolean(homeJson?.showIntroLead),
    undefined,
    DEFAULT_HOME.showIntroLead
  );
  const showIntroMore = resolveValue(
    asBoolean(homeJson?.showIntroMore),
    undefined,
    DEFAULT_HOME.showIntroMore
  );
  const heroPresetId = resolveValue(
    asHeroPresetId(homeJson?.heroPresetId),
    DEFAULT_HOME.heroPresetId,
    DEFAULT_HOME.heroPresetId
  );
  const heroImageSrc = resolveValue<string | null>(
    asHeroImageSrc(homeJson?.heroImageSrc),
    undefined,
    DEFAULT_HOME.heroImageSrc
  );
  const heroImageAlt = resolveValue(
    asSingleLineString(homeJson?.heroImageAlt, ADMIN_HERO_IMAGE_ALT_MAX_LENGTH),
    undefined,
    DEFAULT_HOME.heroImageAlt
  );

  const essayTitle = resolveValue(
    asNullableString(pageEssayJson?.title),
    undefined,
    DEFAULT_PAGE.essay.title
  );
  const essaySubtitle = resolveValue(
    asNullableString(pageEssayJson?.subtitle),
    LEGACY_ESSAY_SUBTITLE,
    DEFAULT_PAGE.essay.subtitle
  );
  const archiveTitle = resolveValue(
    asNullableString(pageArchiveJson?.title),
    undefined,
    DEFAULT_PAGE.archive.title
  );
  const archiveSubtitle = resolveValue(
    asNullableString(pageArchiveJson?.subtitle),
    undefined,
    DEFAULT_PAGE.archive.subtitle
  );
  const bitsTitle = resolveValue(
    asNullableString(pageBitsJson?.title),
    undefined,
    DEFAULT_PAGE.bits.title
  );
  const bitsSubtitle = resolveValue(
    asNullableString(pageBitsJson?.subtitle),
    LEGACY_BITS_SUBTITLE,
    DEFAULT_PAGE.bits.subtitle
  );
  const bitsDefaultAuthorName = resolveValue(
    asNonEmptyString(pageBitsDefaultAuthorJson?.name),
    asNonEmptyString(legacySite.author),
    DEFAULT_PAGE.bits.defaultAuthor.name
  );
  const bitsDefaultAuthorAvatar = resolveValue(
    asBitsAvatarPath(pageBitsDefaultAuthorJson?.avatar),
    asBitsAvatarPath(legacySite.authorAvatar),
    DEFAULT_PAGE.bits.defaultAuthor.avatar
  );
  const memoSubtitle = resolveValue<string | null>(
    asNullableString(pageMemoJson?.subtitle),
    undefined,
    DEFAULT_PAGE.memo.subtitle
  );
  const memoTitle = resolveValue<string | null>(
    asNullableString(pageMemoJson?.title),
    undefined,
    DEFAULT_PAGE.memo.title
  );
  const aboutTitle = resolveValue(
    asNullableString(pageAboutJson?.title),
    undefined,
    DEFAULT_PAGE.about.title
  );
  const aboutSubtitle = resolveValue<string | null>(
    asNullableString(pageAboutJson?.subtitle),
    undefined,
    DEFAULT_PAGE.about.subtitle
  );
  const aboutProfile = {
    avatar: resolveValue(asTrimmedSingleLineString(pageAboutProfileJson?.avatar, 500), undefined, DEFAULT_PAGE.about.profile.avatar).value,
    greeting: resolveValue(asTrimmedSingleLineString(pageAboutProfileJson?.greeting, 120), undefined, DEFAULT_PAGE.about.profile.greeting).value,
    name: resolveValue(asTrimmedSingleLineString(pageAboutProfileJson?.name, 80), asNonEmptyString(legacySite.author), DEFAULT_PAGE.about.profile.name).value,
    identity: resolveValue(asTrimmedSingleLineString(pageAboutProfileJson?.identity, 160), undefined, DEFAULT_PAGE.about.profile.identity).value,
    birthYear: resolveValue(asInteger(pageAboutProfileJson?.birthYear), undefined, DEFAULT_PAGE.about.profile.birthYear).value,
    current: resolveValue(asTrimmedSingleLineString(pageAboutProfileJson?.current, 40), undefined, DEFAULT_PAGE.about.profile.current).value,
    mottoLead: resolveValue(asTrimmedSingleLineString(pageAboutProfileJson?.mottoLead, 80), undefined, DEFAULT_PAGE.about.profile.mottoLead).value,
    mottoTail: resolveValue(asTrimmedSingleLineString(pageAboutProfileJson?.mottoTail, 80), undefined, DEFAULT_PAGE.about.profile.mottoTail).value,
    interestsTitle: resolveValue(asTrimmedSingleLineString(pageAboutProfileJson?.interestsTitle, 80), undefined, DEFAULT_PAGE.about.profile.interestsTitle).value,
    interests: resolveValue(asTrimmedSingleLineString(pageAboutProfileJson?.interests, 160), undefined, DEFAULT_PAGE.about.profile.interests).value,
    musicTitle: resolveValue(asTrimmedSingleLineString(pageAboutProfileJson?.musicTitle, 100), undefined, DEFAULT_PAGE.about.profile.musicTitle).value,
    music: resolveValue(asTrimmedSingleLineString(pageAboutProfileJson?.music, 160), undefined, DEFAULT_PAGE.about.profile.music).value,
    personality: resolveValue(asTrimmedSingleLineString(pageAboutProfileJson?.personality, 80), undefined, DEFAULT_PAGE.about.profile.personality).value,
    personalityType: resolveValue(asTrimmedSingleLineString(pageAboutProfileJson?.personalityType, 30), undefined, DEFAULT_PAGE.about.profile.personalityType).value,
    personalityUrl: resolveValue(asHttpsUrl(pageAboutProfileJson?.personalityUrl), undefined, DEFAULT_PAGE.about.profile.personalityUrl).value,
    specialties: resolveValue(asTrimmedSingleLineString(pageAboutProfileJson?.specialties, 160), undefined, DEFAULT_PAGE.about.profile.specialties).value,
    specialtyHighlight: resolveValue(asTrimmedSingleLineString(pageAboutProfileJson?.specialtyHighlight, 80), undefined, DEFAULT_PAGE.about.profile.specialtyHighlight).value
  };
  const aboutUmami = {
    baseUrl: resolveValue(asUmamiBaseUrl(pageAboutUmamiJson?.baseUrl), undefined, DEFAULT_PAGE.about.umami.baseUrl).value,
    shareId: resolveValue(asUmamiShareId(pageAboutUmamiJson?.shareId), undefined, DEFAULT_PAGE.about.umami.shareId).value
  };
  const linksTitle = resolveValue(
    asNullableString(pageLinksJson?.title),
    undefined,
    DEFAULT_PAGE.links.title
  );
  const linksSubtitle = resolveValue<string | null>(
    asNullableString(pageLinksJson?.subtitle),
    undefined,
    DEFAULT_PAGE.links.subtitle
  );

  const uiCodeBlock = isRecord(uiJson?.codeBlock) ? uiJson.codeBlock : undefined;
  const uiReadingMode = isRecord(uiJson?.readingMode) ? uiJson.readingMode : undefined;
  const uiSidebarActions = isRecord(uiJson?.sidebarActions) ? uiJson.sidebarActions : undefined;
  const uiArticleMeta = isRecord(uiJson?.articleMeta) ? uiJson.articleMeta : undefined;
  const uiLayout = isRecord(uiJson?.layout) ? uiJson.layout : undefined;
  const uiTypography = isRecord(uiJson?.typography) ? uiJson.typography : undefined;
  const uiBackground = isRecord(uiJson?.background) ? uiJson.background : undefined;
  const uiTransitions = isRecord(uiJson?.transitions) ? uiJson.transitions : undefined;

  const showLineNumbers = resolveValue(
    asBoolean(uiCodeBlock?.showLineNumbers),
    DEFAULT_UI.codeBlock.showLineNumbers,
    DEFAULT_UI.codeBlock.showLineNumbers
  );
  const showReadingEntry = resolveValue(
    asBoolean(uiReadingMode?.showEntry),
    DEFAULT_UI.readingMode.showEntry,
    DEFAULT_UI.readingMode.showEntry
  );
  const showRssLink = resolveValue(
    asBoolean(uiSidebarActions?.showRssLink),
    undefined,
    DEFAULT_UI.sidebarActions.showRssLink
  );
  const showThemeToggle = resolveValue(
    asBoolean(uiSidebarActions?.showThemeToggle),
    undefined,
    DEFAULT_UI.sidebarActions.showThemeToggle
  );
  const showAdminEntry = resolveValue(
    asBoolean(uiSidebarActions?.showAdminEntry),
    undefined,
    DEFAULT_UI.sidebarActions.showAdminEntry
  );
  const showArticleDate = resolveValue(
    asBoolean(uiArticleMeta?.showDate),
    undefined,
    DEFAULT_UI.articleMeta.showDate
  );
  const articleDateLabel = resolveValue(
    asTrimmedSingleLineString(uiArticleMeta?.dateLabel, ADMIN_ARTICLE_META_DATE_LABEL_MAX_LENGTH),
    undefined,
    DEFAULT_UI.articleMeta.dateLabel
  );
  const showArticleTags = resolveValue(
    asBoolean(uiArticleMeta?.showTags),
    undefined,
    DEFAULT_UI.articleMeta.showTags
  );
  const showArticleWordCount = resolveValue(
    asBoolean(uiArticleMeta?.showWordCount),
    undefined,
    DEFAULT_UI.articleMeta.showWordCount
  );
  const showArticleReadingTime = resolveValue(
    asBoolean(uiArticleMeta?.showReadingTime),
    undefined,
    DEFAULT_UI.articleMeta.showReadingTime
  );
  const sidebarDivider = resolveValue(
    asSidebarDividerVariant(uiLayout?.sidebarDivider),
    undefined,
    DEFAULT_UI.layout.sidebarDivider
  );
  const backgroundStarry = resolveValue(
    asBoolean(uiBackground?.starry),
    undefined,
    DEFAULT_UI.background.starry
  );
  const transitionsSwup = resolveValue(
    asBoolean(uiTransitions?.swup),
    undefined,
    DEFAULT_UI.transitions.swup
  );
  const typographyReadable = resolveValue(
    asTypographyFontId('readable', uiTypography?.readable),
    undefined,
    DEFAULT_UI.typography.readable
  );
  const typographyCopy = resolveValue(
    asTypographyFontId('copy', uiTypography?.copy),
    undefined,
    DEFAULT_UI.typography.copy
  );
  const typographyMono = resolveValue(
    asTypographyFontId('mono', uiTypography?.mono),
    undefined,
    DEFAULT_UI.typography.mono
  );
  const typographyBrand = resolveValue(
    asTypographyFontId('brand', uiTypography?.brand),
    undefined,
    DEFAULT_UI.typography.brand
  );

  const normalizedNav = normalizeSidebarNavItems(nav.value);
  const normalizedSocialOrderState = normalizeSocialOrderState(
    {
      github: socialLinksGithubOrder.value,
      qq: socialLinksQqOrder.value,
      email: socialLinksEmailOrder.value
    },
    socialLinksCustom.value
  );
  const customSocialItems = cloneSocialCustomItems(normalizedSocialOrderState.customItems);
  const presetSocialOrder = clonePresetSocialOrder(normalizedSocialOrderState.presetOrder);
  const resolvedSocialItems = buildResolvedSocialItems(
    {
      github: socialLinksGithub.value,
      qq: socialLinksQq.value,
      email: socialLinksEmail.value,
      presetOrder: presetSocialOrder
    },
    customSocialItems
  );

  const resolved: ThemeSettingsResolved = {
    settings: {
      site: {
        title: title.value,
        description: description.value,
        defaultLocale: defaultLocale.value,
        footer: {
          startYear: footerStartYear.value,
          showCurrentYear: footerShowCurrentYear.value,
          copyright: footerCopyright.value
        },
        adminOverview: {
          publicVisible: adminOverviewPublicVisible.value,
          hiddenMessage: adminOverviewHiddenMessage.value
        },
        favicon: {
          ico: faviconIco.value,
          svg: faviconSvg.value,
          png: faviconPng.value,
          appleTouchIcon: faviconAppleTouchIcon.value
        },
        socialLinks: {
          github: socialLinksGithub.value,
          qq: socialLinksQq.value,
          email: socialLinksEmail.value,
          presetOrder: clonePresetSocialOrder(presetSocialOrder),
          custom: cloneSocialCustomItems(customSocialItems),
          resolvedSocialItems: cloneResolvedSocialItems(resolvedSocialItems)
        }
      },
      shell: {
        brandTitle: brandTitle.value,
        quote: quote.value,
        nav: cloneNavItems(normalizedNav)
      },
      home: {
        introLead: introLead.value,
        introMore: introMore.value,
        introMoreLinks: cloneHomeIntroLinks(introMoreLinks.value),
        showIntroLead: showIntroLead.value,
        showIntroMore: showIntroMore.value,
        heroPresetId: heroPresetId.value,
        heroImageSrc: heroImageSrc.value,
        heroImageAlt: heroImageAlt.value
      },
      page: {
        essay: {
          title: essayTitle.value,
          subtitle: essaySubtitle.value
        },
        archive: {
          title: archiveTitle.value,
          subtitle: archiveSubtitle.value
        },
        bits: {
          title: bitsTitle.value,
          subtitle: bitsSubtitle.value,
          defaultAuthor: {
            name: bitsDefaultAuthorName.value,
            avatar: bitsDefaultAuthorAvatar.value
          }
        },
        memo: {
          title: memoTitle.value,
          subtitle: memoSubtitle.value
        },
        about: {
          title: aboutTitle.value,
          subtitle: aboutSubtitle.value,
          profile: aboutProfile,
          umami: aboutUmami
        },
        links: {
          title: linksTitle.value,
          subtitle: linksSubtitle.value
        }
      },
      links: {
        linksSourceUrl: linksSourceUrl.value,
        latencySourceUrl: latencySourceUrl.value,
        tombstoneSourceUrl: tombstoneSourceUrl.value,
        submissionUrl: submissionUrl.value,
        fcircleSourceUrl: fcircleSourceUrl.value,
        fcircleEnabled: fcircleEnabled.value,
        fcircleShowError: fcircleShowError.value,
        ech0SourceUrl: ech0SourceUrl.value,
        ech0Enabled: ech0Enabled.value,
        ech0PageSize: ech0PageSize.value,
        ech0MaxPages: ech0MaxPages.value,
        ech0ShowError: ech0ShowError.value,
        voteApiBase: voteApiBase.value,
        voteEnabled: voteEnabled.value
      },
      comments: {
        enabled: commentsEnabled.value,
        repo: commentsRepo.value,
        repoId: commentsRepoId.value,
        category: commentsCategory.value,
        categoryId: commentsCategoryId.value,
        mapping: commentsMapping.value,
        inputPosition: commentsInputPosition.value,
        lang: commentsLang.value,
        reactionsEnabled: commentsReactionsEnabled.value,
        strict: commentsStrict.value
      },
      ui: {
        codeBlock: {
          showLineNumbers: showLineNumbers.value
        },
        readingMode: {
          showEntry: showReadingEntry.value
        },
        sidebarActions: {
          showRssLink: showRssLink.value,
          showThemeToggle: showThemeToggle.value,
          showAdminEntry: showAdminEntry.value
        },
        articleMeta: {
          showDate: showArticleDate.value,
          dateLabel: articleDateLabel.value,
          showTags: showArticleTags.value,
          showWordCount: showArticleWordCount.value,
          showReadingTime: showArticleReadingTime.value
        },
        layout: {
          sidebarDivider: sidebarDivider.value
        },
        background: {
          starry: backgroundStarry.value
        },
        transitions: {
          swup: transitionsSwup.value
        },
        typography: {
          readable: typographyReadable.value,
          copy: typographyCopy.value,
          mono: typographyMono.value,
          brand: typographyBrand.value
        }
      }
    },
    sources: {
      site: {
        title: title.source,
        description: description.source,
        defaultLocale: defaultLocale.source,
        footerStartYear: footerStartYear.source,
        footerShowCurrentYear: footerShowCurrentYear.source,
        footerCopyright: footerCopyright.source,
        adminOverviewPublicVisible: adminOverviewPublicVisible.source,
        adminOverviewHiddenMessage: adminOverviewHiddenMessage.source,
        faviconIco: faviconIco.source,
        faviconSvg: faviconSvg.source,
        faviconPng: faviconPng.source,
        faviconAppleTouchIcon: faviconAppleTouchIcon.source,
        socialLinksGithub: socialLinksGithub.source,
        socialLinksQq: socialLinksQq.source,
        socialLinksEmail: socialLinksEmail.source,
        socialLinksGithubOrder: socialLinksGithubOrder.source,
        socialLinksQqOrder: socialLinksQqOrder.source,
        socialLinksEmailOrder: socialLinksEmailOrder.source,
        socialLinksCustom: socialLinksCustom.source
      },
      shell: {
        brandTitle: brandTitle.source,
        quote: quote.source,
        nav: nav.source
      },
      home: {
        introLead: introLead.source,
        introMore: introMore.source,
        introMoreLinks: introMoreLinks.source,
        showIntroLead: showIntroLead.source,
        showIntroMore: showIntroMore.source,
        heroPresetId: heroPresetId.source,
        heroImageSrc: heroImageSrc.source,
        heroImageAlt: heroImageAlt.source
      },
      page: {
        essayTitle: essayTitle.source,
        essaySubtitle: essaySubtitle.source,
        archiveTitle: archiveTitle.source,
        archiveSubtitle: archiveSubtitle.source,
        bitsTitle: bitsTitle.source,
        bitsSubtitle: bitsSubtitle.source,
        bitsDefaultAuthorName: bitsDefaultAuthorName.source,
        bitsDefaultAuthorAvatar: bitsDefaultAuthorAvatar.source,
        memoTitle: memoTitle.source,
        memoSubtitle: memoSubtitle.source,
        aboutTitle: aboutTitle.source,
        aboutSubtitle: aboutSubtitle.source,
        aboutProfile: pageAboutProfileJson ? 'new' : 'default',
        aboutUmami: pageAboutUmamiJson ? 'new' : 'default',
        linksTitle: linksTitle.source,
        linksSubtitle: linksSubtitle.source
      },
      links: {
        linksSourceUrl: linksSourceUrl.source,
        latencySourceUrl: latencySourceUrl.source,
        tombstoneSourceUrl: tombstoneSourceUrl.source,
        submissionUrl: submissionUrl.source,
        fcircleSourceUrl: fcircleSourceUrl.source,
        fcircleEnabled: fcircleEnabled.source,
        fcircleShowError: fcircleShowError.source,
        ech0SourceUrl: ech0SourceUrl.source,
        ech0Enabled: ech0Enabled.source,
        ech0PageSize: ech0PageSize.source,
        ech0MaxPages: ech0MaxPages.source,
        ech0ShowError: ech0ShowError.source,
        voteApiBase: voteApiBase.source,
        voteEnabled: voteEnabled.source
      },
      comments: {
        enabled: commentsEnabled.source,
        repo: commentsRepo.source,
        repoId: commentsRepoId.source,
        category: commentsCategory.source,
        categoryId: commentsCategoryId.source,
        mapping: commentsMapping.source,
        inputPosition: commentsInputPosition.source,
        lang: commentsLang.source,
        reactionsEnabled: commentsReactionsEnabled.source,
        strict: commentsStrict.source
      },
      ui: {
        codeBlockShowLineNumbers: showLineNumbers.source,
        readingModeShowEntry: showReadingEntry.source,
        sidebarActionsShowRssLink: showRssLink.source,
        sidebarActionsShowThemeToggle: showThemeToggle.source,
        sidebarActionsShowAdminEntry: showAdminEntry.source,
        articleMetaShowDate: showArticleDate.source,
        articleMetaDateLabel: articleDateLabel.source,
        articleMetaShowTags: showArticleTags.source,
        articleMetaShowWordCount: showArticleWordCount.source,
        articleMetaShowReadingTime: showArticleReadingTime.source,
        layoutSidebarDivider: sidebarDivider.source,
        backgroundStarry: backgroundStarry.source,
        transitionsSwup: transitionsSwup.source,
        typographyReadable: typographyReadable.source,
        typographyCopy: typographyCopy.source,
        typographyMono: typographyMono.source,
        typographyBrand: typographyBrand.source
      }
    }
  };

  // DEV 下关闭模块级缓存，避免手改 settings JSON 或切分支后继续读到旧值。
  if (shouldCacheThemeSettings) {
    cachedSettings = resolved;
  }
  return resolved;
};

export const toEditableThemeSettingsPayload = (
  resolved: ThemeSettingsResolved
): ThemeSettingsEditablePayload => {
  const snapshot = buildEditableThemeSettingsSnapshot(resolved);

  return {
    revision: hashEditableThemeSettingsSnapshot(snapshot),
    settings: snapshot,
    sources: cloneThemeSettingsSources(resolved.sources)
  };
};

const canonicalizeEditableThemeSettingsSnapshot = (
  snapshot: EditableThemeSettingsSnapshot
): EditableThemeSettingsSnapshot =>
  canonicalizeAdminThemeSettings(snapshot, {
    footerStartYearMax: getAdminFooterStartYearMax()
  });

const buildEditableThemeSettingsSnapshot = (
  resolved: ThemeSettingsResolved
): EditableThemeSettingsSnapshot =>
  canonicalizeEditableThemeSettingsSnapshot({
    site: {
      title: resolved.settings.site.title,
      description: resolved.settings.site.description,
      defaultLocale: resolved.settings.site.defaultLocale,
      footer: {
        ...resolved.settings.site.footer
      },
      adminOverview: {
        ...resolved.settings.site.adminOverview
      },
      favicon: {
        ...resolved.settings.site.favicon
      },
      socialLinks: {
        github: resolved.settings.site.socialLinks.github,
        qq: resolved.settings.site.socialLinks.qq,
        email: resolved.settings.site.socialLinks.email,
        presetOrder: clonePresetSocialOrder(resolved.settings.site.socialLinks.presetOrder),
        custom: cloneSocialCustomItems(resolved.settings.site.socialLinks.custom)
      }
    },
    shell: {
      brandTitle: resolved.settings.shell.brandTitle,
      quote: resolved.settings.shell.quote,
      nav: cloneNavItems(resolved.settings.shell.nav)
    },
    home: {
      ...resolved.settings.home,
      introMoreLinks: cloneHomeIntroLinks(resolved.settings.home.introMoreLinks)
    },
    page: {
      essay: { ...resolved.settings.page.essay },
      archive: { ...resolved.settings.page.archive },
      bits: {
        title: resolved.settings.page.bits.title,
        subtitle: resolved.settings.page.bits.subtitle,
        defaultAuthor: {
          ...resolved.settings.page.bits.defaultAuthor
        }
      },
      memo: { ...resolved.settings.page.memo },
      about: {
        ...resolved.settings.page.about,
        umami: { ...resolved.settings.page.about.umami }
      },
      links: { ...resolved.settings.page.links }
    },
    links: { ...resolved.settings.links },
    comments: { ...resolved.settings.comments },
    ui: {
      codeBlock: { ...resolved.settings.ui.codeBlock },
      readingMode: { ...resolved.settings.ui.readingMode },
      sidebarActions: { ...resolved.settings.ui.sidebarActions },
      articleMeta: { ...resolved.settings.ui.articleMeta },
      layout: { ...resolved.settings.ui.layout },
      background: { ...resolved.settings.ui.background },
      transitions: { ...resolved.settings.ui.transitions },
      typography: { ...resolved.settings.ui.typography }
    }
  });

const hashEditableThemeSettingsSnapshot = (snapshot: EditableThemeSettingsSnapshot): string => {
  const value = JSON.stringify(snapshot);
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const getEditableThemeSettingsPayload = (
  resolved: ThemeSettingsResolved = getThemeSettings()
): ThemeSettingsEditablePayload => toEditableThemeSettingsPayload(resolved);

export const getEditableThemeSettingsState = (
  resolved?: ThemeSettingsResolved
): ThemeSettingsEditableState => {
  const currentResolved = resolved ?? getThemeSettings();
  const diagnostics = getThemeSettingsReadDiagnostics(currentResolved);
  if (diagnostics.length > 0) {
    return {
      ok: false,
      mode: 'invalid-settings',
      message: THEME_SETTINGS_INVALID_MESSAGE,
      errors: diagnostics.map((diagnostic) => diagnostic.message),
      diagnostics
    };
  }

  return {
    ok: true,
    payload: getEditableThemeSettingsPayload(currentResolved)
  };
};

export const resetThemeSettingsCache = (): void => {
  cachedSettings = null;
};

// 文件缺失的槽位按主题默认回退（渲染兜底，不阻断构建、不锁后台）。抑制只发生在标签页图标组
// （svg/png）内部：自定义后继续输出默认 SVG 会让桌面浏览器优先选中默认图标；触摸图标与其不竞争，独立回退。
const resolveRenderableFaviconPath = (value: string | null): string | null => {
  if (!value) return null;
  const projectRoot = process.env.ASTRO_WHONO_INTERNAL_TEST_PROJECT_ROOT?.trim() || process.cwd();
  return existsSync(join(projectRoot, ...getSiteFaviconLocalFilePath(value).split('/'))) ? value : null;
};

export const getSiteFaviconLinks = (favicon: SiteFaviconSettings): SiteFaviconLink[] => {
  const ico = resolveRenderableFaviconPath(favicon.ico);
  const svg = resolveRenderableFaviconPath(favicon.svg);
  const png = resolveRenderableFaviconPath(favicon.png);
  const appleTouchIcon = resolveRenderableFaviconPath(favicon.appleTouchIcon);

  const links: SiteFaviconLink[] = [];
  if (ico) {
    links.push({ rel: 'icon', type: 'image/x-icon', sizes: 'any', href: ico });
  }
  if (!ico && !svg && !png) {
    links.push(
      { rel: 'icon', type: 'image/svg+xml', sizes: 'any', href: 'favicon.svg' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: 'favicon-32x32.png' }
    );
  } else {
    if (svg) {
      links.push({ rel: 'icon', type: 'image/svg+xml', sizes: 'any', href: svg });
    }
    if (png) {
      const sizes = getSiteFaviconSizesFromPath(png);
      links.push({ rel: 'icon', type: 'image/png', ...(sizes ? { sizes } : {}), href: png });
    }
  }

  if (appleTouchIcon) {
    const sizes = getSiteFaviconSizesFromPath(appleTouchIcon);
    links.push({ rel: 'apple-touch-icon', ...(sizes ? { sizes } : {}), href: appleTouchIcon });
  } else {
    links.push({ rel: 'apple-touch-icon', sizes: '180x180', href: 'apple-touch-icon.png' });
  }
  return links;
};

/* 导航 href 辅助函数迁移至客户端安全的 theme-shared（浏览器脚本也会用到），此处转发导出保持既有引用不变。 */
export { getSidebarHref, getSidebarNavItemHref, SIDEBAR_NAV_BUILTIN_ID_SET } from './admin-console/theme-shared';
