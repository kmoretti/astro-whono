type RequiredElements<T extends Record<string, Element | null>> = { [K in keyof T]: NonNullable<T[K]> };

export const byId = <T extends Element>(id: string): T | null => document.getElementById(id) as T | null;

export const query = <T extends Element>(parent: ParentNode, selector: string): T | null =>
  parent.querySelector(selector) as T | null;

export const queryAll = <T extends Element>(parent: ParentNode, selector: string): T[] =>
  Array.from(parent.querySelectorAll(selector)) as T[];

const ensureElements = <T extends Record<string, Element | null>>(elements: T): RequiredElements<T> | null => {
  const missingKeys = Object.entries(elements)
    .filter(([, element]) => element === null)
    .map(([key]) => key);
  if (missingKeys.length > 0) {
    console.error(`[admin-console] Missing required controls: ${missingKeys.join(', ')}`);
    return null;
  }
  return elements as RequiredElements<T>;
};

export type AdminThemeControls = RequiredElements<{
  form: HTMLFormElement | null;
  adminActions: HTMLElement | null;
  adminActionsSentinel: HTMLElement | null;
  statusInlineEl: HTMLElement | null;
  dirtyBanner: HTMLElement | null;
  errorBanner: HTMLElement | null;
  errorTitleEl: HTMLElement | null;
  errorMessageEl: HTMLElement | null;
  errorListEl: HTMLElement | null;
  errorRetryBtn: HTMLButtonElement | null;
  validateBtn: HTMLButtonElement | null;
  resetBtn: HTMLButtonElement | null;
  saveBtn: HTMLButtonElement | null;
  bootstrapEl: HTMLElement | null;
  articleMetaPreviewValueEl: HTMLElement | null;
  footerPreviewValueEl: HTMLElement | null;
  socialCustomList: HTMLElement | null;
  socialCustomHead: HTMLElement | null;
  socialCustomCountEl: HTMLElement | null;
  socialCustomAddBtn: HTMLButtonElement | null;
  socialCustomTemplate: HTMLTemplateElement | null;
  inputSiteTitle: HTMLInputElement | null;
  inputSiteDescription: HTMLTextAreaElement | null;
  inputSiteDefaultLocale: HTMLInputElement | null;
  inputSiteFooterStartYear: HTMLInputElement | null;
  inputSiteFooterShowCurrentYear: HTMLInputElement | null;
  inputSiteFooterCopyright: HTMLInputElement | null;
  inputSiteAdminOverviewPublicVisible: HTMLInputElement | null;
  inputSiteAdminOverviewHiddenMessage: HTMLInputElement | null;
  /* svg 槽位暂无上传 UI，隐藏 input 只负责把手工配置的值随表单快照往返。 */
  inputSiteFaviconSvg: HTMLInputElement | null;
  inputSiteFaviconPng: HTMLInputElement | null;
  inputSiteFaviconAppleTouchIcon: HTMLInputElement | null;
  inputSiteSocialGithubOrder: HTMLInputElement | null;
  inputSiteSocialGithub: HTMLInputElement | null;
    inputSiteSocialQqOrder: HTMLInputElement | null;
    inputSiteSocialQq: HTMLInputElement | null;
  inputSiteSocialEmailOrder: HTMLInputElement | null;
  inputSiteSocialEmail: HTMLInputElement | null;
  inputShellBrandTitle: HTMLInputElement | null;
  inputShellQuote: HTMLTextAreaElement | null;
  inputHomeShowIntroLead: HTMLInputElement | null;
  inputHomeShowIntroMore: HTMLInputElement | null;
  inputHomeIntroLead: HTMLTextAreaElement | null;
  inputHomeIntroMore: HTMLTextAreaElement | null;
  homeIntroMorePreviewEl: HTMLElement | null;
  inputHomeIntroMoreLinkPrimary: HTMLSelectElement | null;
  inputHomeIntroMoreLinkSecondaryEnabled: HTMLInputElement | null;
  homeIntroMoreLinkSecondaryGroupEl: HTMLElement | null;
  inputHomeIntroMoreLinkSecondary: HTMLSelectElement | null;
  inputPageEssayTitle: HTMLInputElement | null;
  inputPageEssaySubtitle: HTMLInputElement | null;
  inputPageArchiveTitle: HTMLInputElement | null;
  inputPageArchiveSubtitle: HTMLInputElement | null;
  inputPageBitsTitle: HTMLInputElement | null;
  inputPageBitsSubtitle: HTMLInputElement | null;
  inputPageMemoTitle: HTMLInputElement | null;
  inputPageMemoSubtitle: HTMLInputElement | null;
  inputPageAboutTitle: HTMLInputElement | null;
  inputPageAboutSubtitle: HTMLInputElement | null;
  inputPageAboutProfileAvatar: HTMLInputElement | null;
  inputPageAboutProfileGreeting: HTMLInputElement | null;
  inputPageAboutProfileName: HTMLInputElement | null;
  inputPageAboutProfileIdentity: HTMLInputElement | null;
  inputPageAboutProfileBirthYear: HTMLInputElement | null;
  inputPageAboutProfileCurrent: HTMLInputElement | null;
  inputPageAboutProfileMottoLead: HTMLInputElement | null;
  inputPageAboutProfileMottoTail: HTMLInputElement | null;
  inputPageAboutProfileInterestsTitle: HTMLInputElement | null;
  inputPageAboutProfileInterests: HTMLInputElement | null;
  inputPageAboutProfileMusicTitle: HTMLInputElement | null;
  inputPageAboutProfileMusic: HTMLInputElement | null;
  inputPageAboutProfilePersonality: HTMLInputElement | null;
  inputPageAboutProfilePersonalityType: HTMLInputElement | null;
  inputPageAboutProfilePersonalityUrl: HTMLInputElement | null;
  inputPageAboutProfileSpecialties: HTMLInputElement | null;
  inputPageAboutProfileSpecialtyHighlight: HTMLInputElement | null;
  inputPageAboutUmamiBaseUrl: HTMLInputElement | null;
  inputPageAboutUmamiShareId: HTMLInputElement | null;
  inputCommentsEnabled: HTMLInputElement | null;
  inputCommentsRepo: HTMLInputElement | null;
  inputCommentsRepoId: HTMLInputElement | null;
  inputCommentsCategory: HTMLInputElement | null;
  inputCommentsCategoryId: HTMLInputElement | null;
  inputCommentsMapping: HTMLSelectElement | null;
  inputCommentsInputPosition: HTMLSelectElement | null;
  inputCommentsLang: HTMLSelectElement | null;
  inputCommentsReactionsEnabled: HTMLInputElement | null;
  inputCommentsStrict: HTMLInputElement | null;
  inputPageLinksTitle: HTMLInputElement | null;
  inputPageLinksSubtitle: HTMLInputElement | null;
  inputLinksSourceUrl: HTMLInputElement | null;
  inputLinksLatencySourceUrl: HTMLInputElement | null;
  inputLinksTombstoneSourceUrl: HTMLInputElement | null;
  inputLinksSubmissionUrl: HTMLInputElement | null;
  inputLinksFcircleSourceUrl: HTMLInputElement | null;
  inputLinksFcircleEnabled: HTMLInputElement | null;
  inputLinksFcircleShowError: HTMLInputElement | null;
  inputLinksEch0SourceUrl: HTMLInputElement | null;
  inputLinksEch0Enabled: HTMLInputElement | null;
  inputLinksEch0PageSize: HTMLInputElement | null;
  inputLinksEch0MaxPages: HTMLInputElement | null;
  inputLinksEch0ShowError: HTMLInputElement | null;
  inputArticleMetaShowDate: HTMLInputElement | null;
  inputArticleMetaDateLabel: HTMLInputElement | null;
  inputArticleMetaShowTags: HTMLInputElement | null;
  inputArticleMetaShowWordCount: HTMLInputElement | null;
  inputArticleMetaShowReadingTime: HTMLInputElement | null;
  inputPageBitsAuthorName: HTMLInputElement | null;
  inputPageBitsAuthorAvatar: HTMLInputElement | null;
  inputHomeShowHero: HTMLInputElement | null;
  inputHeroImageSrc: HTMLInputElement | null;
  inputHeroImageAlt: HTMLInputElement | null;
  inputCodeLineNumbers: HTMLInputElement | null;
  inputBackgroundStarry: HTMLInputElement | null;
  inputTransitionsSwup: HTMLInputElement | null;
  inputReadingEntry: HTMLInputElement | null;
  inputSidebarActionsShowRssLink: HTMLInputElement | null;
  inputSidebarActionsShowThemeToggle: HTMLInputElement | null;
  inputSidebarActionsShowAdminEntry: HTMLInputElement | null;
  sidebarAdminEntryRowEl: HTMLElement | null;
  inputSidebarDividerDefault: HTMLInputElement | null;
  inputSidebarDividerSubtle: HTMLInputElement | null;
  inputSidebarDividerNone: HTMLInputElement | null;
  /* 排版字体是 radio 卡片组：控件引用的是 radiogroup 容器（id 与旧 select 一致），值经 :checked 读写。 */
  inputTypographyReadable: HTMLElement | null;
  inputTypographyCopy: HTMLElement | null;
  inputTypographyMono: HTMLElement | null;
  inputTypographyBrand: HTMLElement | null;
}> & {
  statusEl: HTMLElement | null;
  statusLiveEl: HTMLElement | null;
};

export const queryAdminThemeControls = (): AdminThemeControls | null => {
  const controls = ensureElements({
    form: byId<HTMLFormElement>('admin-form'),
    adminActions: byId<HTMLElement>('admin-actions'),
    adminActionsSentinel: byId<HTMLElement>('admin-actions-sentinel'),
    statusInlineEl: byId<HTMLElement>('admin-status-inline'),
    dirtyBanner: byId<HTMLElement>('admin-dirty-banner'),
    errorBanner: byId<HTMLElement>('admin-error-banner'),
    errorTitleEl: byId<HTMLElement>('admin-error-title'),
    errorMessageEl: byId<HTMLElement>('admin-error-message'),
    errorListEl: byId<HTMLElement>('admin-error-list'),
    errorRetryBtn: byId<HTMLButtonElement>('admin-error-retry'),
    validateBtn: byId<HTMLButtonElement>('admin-validate'),
    resetBtn: byId<HTMLButtonElement>('admin-reset'),
    saveBtn: byId<HTMLButtonElement>('admin-save'),
    bootstrapEl: byId<HTMLElement>('admin-bootstrap'),
    articleMetaPreviewValueEl: byId<HTMLElement>('article-meta-preview-value'),
    footerPreviewValueEl: byId<HTMLElement>('site-footer-preview-value'),
    socialCustomList: byId<HTMLElement>('site-social-custom-list'),
    socialCustomHead: byId<HTMLElement>('site-social-custom-head'),
    socialCustomCountEl: byId<HTMLElement>('site-social-custom-count'),
    socialCustomAddBtn: byId<HTMLButtonElement>('site-social-custom-add'),
    socialCustomTemplate: byId<HTMLTemplateElement>('site-social-custom-row-template'),
    inputSiteTitle: byId<HTMLInputElement>('site-title'),
    inputSiteDescription: byId<HTMLTextAreaElement>('site-description'),
    inputSiteDefaultLocale: byId<HTMLInputElement>('site-default-locale'),
    inputSiteFooterStartYear: byId<HTMLInputElement>('site-footer-start-year'),
    inputSiteFooterShowCurrentYear: byId<HTMLInputElement>('site-footer-show-current-year'),
    inputSiteFooterCopyright: byId<HTMLInputElement>('site-footer-copyright'),
    inputSiteAdminOverviewPublicVisible: byId<HTMLInputElement>('site-admin-overview-public-visible'),
    inputSiteAdminOverviewHiddenMessage: byId<HTMLInputElement>('site-admin-overview-hidden-message'),
    inputSiteFaviconSvg: byId<HTMLInputElement>('site-favicon-svg'),
    inputSiteFaviconPng: byId<HTMLInputElement>('site-favicon-png'),
    inputSiteFaviconAppleTouchIcon: byId<HTMLInputElement>('site-favicon-apple-touch-icon'),
    inputSiteSocialGithubOrder: byId<HTMLInputElement>('site-social-github-order'),
    inputSiteSocialGithub: byId<HTMLInputElement>('site-social-github'),
    inputSiteSocialQqOrder: byId<HTMLInputElement>('site-social-qq-order'),
    inputSiteSocialQq: byId<HTMLInputElement>('site-social-qq'),
    inputSiteSocialEmailOrder: byId<HTMLInputElement>('site-social-email-order'),
    inputSiteSocialEmail: byId<HTMLInputElement>('site-social-email'),
    inputShellBrandTitle: byId<HTMLInputElement>('shell-brand-title'),
    inputShellQuote: byId<HTMLTextAreaElement>('shell-quote'),
    inputHomeShowIntroLead: byId<HTMLInputElement>('home-show-intro-lead'),
    inputHomeShowIntroMore: byId<HTMLInputElement>('home-show-intro-more'),
    inputHomeIntroLead: byId<HTMLTextAreaElement>('home-intro-lead'),
    inputHomeIntroMore: byId<HTMLTextAreaElement>('home-intro-more'),
    homeIntroMorePreviewEl: byId<HTMLElement>('home-intro-more-preview'),
    inputHomeIntroMoreLinkPrimary: byId<HTMLSelectElement>('home-intro-more-link-primary'),
    inputHomeIntroMoreLinkSecondaryEnabled: byId<HTMLInputElement>('home-intro-more-link-secondary-enabled'),
    homeIntroMoreLinkSecondaryGroupEl: byId<HTMLElement>('home-intro-more-link-secondary-group'),
    inputHomeIntroMoreLinkSecondary: byId<HTMLSelectElement>('home-intro-more-link-secondary'),
    inputPageEssayTitle: byId<HTMLInputElement>('page-essay-title'),
    inputPageEssaySubtitle: byId<HTMLInputElement>('page-essay-subtitle'),
    inputPageArchiveTitle: byId<HTMLInputElement>('page-archive-title'),
    inputPageArchiveSubtitle: byId<HTMLInputElement>('page-archive-subtitle'),
    inputPageBitsTitle: byId<HTMLInputElement>('page-bits-title'),
    inputPageBitsSubtitle: byId<HTMLInputElement>('page-bits-subtitle'),
    inputPageMemoTitle: byId<HTMLInputElement>('page-memo-title'),
    inputPageMemoSubtitle: byId<HTMLInputElement>('page-memo-subtitle'),
    inputPageAboutTitle: byId<HTMLInputElement>('page-about-title'),
    inputPageAboutSubtitle: byId<HTMLInputElement>('page-about-subtitle'),
    inputPageAboutProfileAvatar: byId<HTMLInputElement>('page-about-profile-avatar'),
    inputPageAboutProfileGreeting: byId<HTMLInputElement>('page-about-profile-greeting'),
    inputPageAboutProfileName: byId<HTMLInputElement>('page-about-profile-name'),
    inputPageAboutProfileIdentity: byId<HTMLInputElement>('page-about-profile-identity'),
    inputPageAboutProfileBirthYear: byId<HTMLInputElement>('page-about-profile-birth-year'),
    inputPageAboutProfileCurrent: byId<HTMLInputElement>('page-about-profile-current'),
    inputPageAboutProfileMottoLead: byId<HTMLInputElement>('page-about-profile-motto-lead'),
    inputPageAboutProfileMottoTail: byId<HTMLInputElement>('page-about-profile-motto-tail'),
    inputPageAboutProfileInterestsTitle: byId<HTMLInputElement>('page-about-profile-interests-title'),
    inputPageAboutProfileInterests: byId<HTMLInputElement>('page-about-profile-interests'),
    inputPageAboutProfileMusicTitle: byId<HTMLInputElement>('page-about-profile-music-title'),
    inputPageAboutProfileMusic: byId<HTMLInputElement>('page-about-profile-music'),
    inputPageAboutProfilePersonality: byId<HTMLInputElement>('page-about-profile-personality'),
    inputPageAboutProfilePersonalityType: byId<HTMLInputElement>('page-about-profile-personality-type'),
    inputPageAboutProfilePersonalityUrl: byId<HTMLInputElement>('page-about-profile-personality-url'),
    inputPageAboutProfileSpecialties: byId<HTMLInputElement>('page-about-profile-specialties'),
    inputPageAboutProfileSpecialtyHighlight: byId<HTMLInputElement>('page-about-profile-specialty-highlight'),
    inputPageAboutUmamiBaseUrl: byId<HTMLInputElement>('page-about-umami-base-url'),
    inputPageAboutUmamiShareId: byId<HTMLInputElement>('page-about-umami-share-id'),
    inputCommentsEnabled: byId<HTMLInputElement>('comments-enabled'),
    inputCommentsRepo: byId<HTMLInputElement>('comments-repo'),
    inputCommentsRepoId: byId<HTMLInputElement>('comments-repo-id'),
    inputCommentsCategory: byId<HTMLInputElement>('comments-category'),
    inputCommentsCategoryId: byId<HTMLInputElement>('comments-category-id'),
    inputCommentsMapping: byId<HTMLSelectElement>('comments-mapping'),
    inputCommentsInputPosition: byId<HTMLSelectElement>('comments-input-position'),
    inputCommentsLang: byId<HTMLSelectElement>('comments-lang'),
    inputCommentsReactionsEnabled: byId<HTMLInputElement>('comments-reactions-enabled'),
    inputCommentsStrict: byId<HTMLInputElement>('comments-strict'),
    inputPageLinksTitle: byId<HTMLInputElement>('page-links-title'),

    inputPageLinksSubtitle: byId<HTMLInputElement>('page-links-subtitle'),
    inputLinksSourceUrl: byId<HTMLInputElement>('links-source-url'),
    inputLinksLatencySourceUrl: byId<HTMLInputElement>('links-latency-source-url'),
    inputLinksTombstoneSourceUrl: byId<HTMLInputElement>('links-tombstone-source-url'),
    inputLinksSubmissionUrl: byId<HTMLInputElement>('links-submission-url'),
    inputLinksFcircleSourceUrl: byId<HTMLInputElement>('links-fcircle-source-url'),
    inputLinksFcircleEnabled: byId<HTMLInputElement>('links-fcircle-enabled'),
    inputLinksFcircleShowError: byId<HTMLInputElement>('links-fcircle-show-error'),
    inputLinksEch0SourceUrl: byId<HTMLInputElement>('links-ech0-source-url'),
    inputLinksEch0Enabled: byId<HTMLInputElement>('links-ech0-enabled'),
    inputLinksEch0PageSize: byId<HTMLInputElement>('links-ech0-page-size'),
    inputLinksEch0MaxPages: byId<HTMLInputElement>('links-ech0-max-pages'),
    inputLinksEch0ShowError: byId<HTMLInputElement>('links-ech0-show-error'),
    inputArticleMetaShowDate: byId<HTMLInputElement>('ui-article-meta-show-date'),
    inputArticleMetaDateLabel: byId<HTMLInputElement>('ui-article-meta-date-label'),
    inputArticleMetaShowTags: byId<HTMLInputElement>('ui-article-meta-show-tags'),
    inputArticleMetaShowWordCount: byId<HTMLInputElement>('ui-article-meta-show-word-count'),
    inputArticleMetaShowReadingTime: byId<HTMLInputElement>('ui-article-meta-show-reading-time'),
    inputPageBitsAuthorName: byId<HTMLInputElement>('page-bits-author-name'),
    inputPageBitsAuthorAvatar: byId<HTMLInputElement>('page-bits-author-avatar'),
    inputHomeShowHero: byId<HTMLInputElement>('home-show-hero'),
    inputHeroImageSrc: byId<HTMLInputElement>('home-hero-image-src'),
    inputHeroImageAlt: byId<HTMLInputElement>('home-hero-image-alt'),
    inputCodeLineNumbers: byId<HTMLInputElement>('ui-code-line-numbers'),
    inputBackgroundStarry: byId<HTMLInputElement>('ui-background-starry'),
    inputTransitionsSwup: byId<HTMLInputElement>('ui-transitions-swup'),
    inputReadingEntry: byId<HTMLInputElement>('ui-reading-entry'),
    inputSidebarActionsShowRssLink: byId<HTMLInputElement>('ui-sidebar-actions-show-rss-link'),
    inputSidebarActionsShowThemeToggle: byId<HTMLInputElement>('ui-sidebar-actions-show-theme-toggle'),
    inputSidebarActionsShowAdminEntry: byId<HTMLInputElement>('ui-sidebar-actions-show-admin-entry'),
    sidebarAdminEntryRowEl: byId<HTMLElement>('ui-sidebar-actions-show-admin-entry-row'),
    inputSidebarDividerDefault: byId<HTMLInputElement>('ui-layout-sidebar-divider-default'),
    inputSidebarDividerSubtle: byId<HTMLInputElement>('ui-layout-sidebar-divider-subtle'),
    inputSidebarDividerNone: byId<HTMLInputElement>('ui-layout-sidebar-divider-none'),
    inputTypographyReadable: byId<HTMLElement>('ui-typography-readable'),
    inputTypographyCopy: byId<HTMLElement>('ui-typography-copy'),
    inputTypographyMono: byId<HTMLElement>('ui-typography-mono'),
    inputTypographyBrand: byId<HTMLElement>('ui-typography-brand')
  });

  if (!controls) return null;

  return {
    ...controls,
    statusEl: byId<HTMLElement>('admin-status'),
    statusLiveEl: byId<HTMLElement>('admin-status-live')
  };
};
