import { ADMIN_SETTINGS_API_PATH } from '@/lib/admin-console/admin-api-paths';
import { getAdminFooterStartYearMax } from '@/lib/admin-console/theme-shared';
import { onPageChange } from '../page-controllers';
import { createAdminImagePicker } from '../admin-shared/image-picker';
import {
  bindAdminThemeActionEvents,
  bindAdminThemeFieldEvents,
  bindAdminThemeNavigationGuard,
  bindAdminThemeSocialEvents
} from './bindings';
import {
  query,
  queryAdminThemeControls,
  queryAll
} from './controls';
import { createAdminThemeController } from './controller';
import { createAdminFaviconUploads } from './favicon-uploads';
import { createFormCodec } from './form-codec';
import { createAdminThemeImageFields } from './image-fields';
import { createNavTreeEditor } from './nav-tree-editor';
import { createNavTreePreview } from './nav-tree-preview';
import { createSocialLinks } from './social-links';
import { createAdminConsoleUiState } from './ui-state';
import { createValidation } from './validation';

// swup 重初始化前清理上一轮的 document/window 级监听(导航守卫)。
let teardownNavigationGuard: (() => void) | null = null;

const initAdminConsole = () => {
  teardownNavigationGuard?.();
  teardownNavigationGuard = null;

  const root = document.querySelector<HTMLElement>('[data-admin-root]');

if (!root) {
  // Current page does not use admin console.
} else {
  const controls = queryAdminThemeControls();

  if (!controls) {
    // Required controls are missing.
  } else {
    const endpoint = root.getAttribute('data-settings-endpoint') || ADMIN_SETTINGS_API_PATH;
    const footerStartYearMax = getAdminFooterStartYearMax();
    const navEditorRoot = query<HTMLElement>(root, '#shell-nav-editor')!;
    const navTreeEditor = createNavTreeEditor({
      root: navEditorRoot,
      addNavButton: query<HTMLButtonElement>(root, '#shell-nav-add')!,
      query
    });

    /* Task 4：未保存的导航草稿实时预览到开发态侧边栏的公共导航面板
       （面板仅在 dev 且非页面级侧栏时渲染，缺席时静默跳过）。 */
    const navPreviewPanel = document.querySelector<HTMLElement>('[data-admin-nav-panel="public"]');
    const navTreePreview = navPreviewPanel
      ? createNavTreePreview({
          editorRoot: navEditorRoot,
          panel: navPreviewPanel,
          collect: navTreeEditor.collect
        })
      : null;

    const socialLinks = createSocialLinks({
      query,
      queryAll,
      socialCustomList: controls.socialCustomList,
      socialCustomHead: controls.socialCustomHead,
      socialCustomCountEl: controls.socialCustomCountEl,
      socialCustomAddBtn: controls.socialCustomAddBtn,
      socialCustomTemplate: controls.socialCustomTemplate,
      inputSiteSocialGithubOrder: controls.inputSiteSocialGithubOrder,
      inputSiteSocialQqOrder: controls.inputSiteSocialQqOrder,
      inputSiteSocialEmailOrder: controls.inputSiteSocialEmailOrder
    });

    const formCodec = createFormCodec({
      footerStartYearMax,
      query,
      getNavItems: navTreeEditor.collect,
      /* 编辑器重渲染（初始载入/重置/保存后回灌）后同步侧栏预览。 */
      renderNavItems: (items) => {
        navTreeEditor.render(items);
        navTreePreview?.sync();
      },
      getCustomRows: socialLinks.getCustomRows,
      getCustomRowLabelInput: socialLinks.getCustomRowLabelInput,
      defaultCustomSocialIconKey: socialLinks.defaultCustomSocialIconKey,
      normalizeCustomSocialLabel: socialLinks.normalizeCustomSocialLabel,
      replaceCustomRows: socialLinks.replaceCustomRows,
      normalizeSocialOrders: socialLinks.normalizeSocialOrders,
      getPresetSocialOrder: socialLinks.getPresetSocialOrder,
      articleMetaPreviewValueEl: controls.articleMetaPreviewValueEl,
      footerPreviewValueEl: controls.footerPreviewValueEl,
      homeIntroMorePreviewEl: controls.homeIntroMorePreviewEl,
      homeIntroMoreLinkSecondaryGroupEl: controls.homeIntroMoreLinkSecondaryGroupEl,
      inputSiteTitle: controls.inputSiteTitle,
      inputSiteDescription: controls.inputSiteDescription,
      inputSiteDefaultLocale: controls.inputSiteDefaultLocale,
      inputSiteFooterStartYear: controls.inputSiteFooterStartYear,
      inputSiteFooterShowCurrentYear: controls.inputSiteFooterShowCurrentYear,
      inputSiteFooterCopyright: controls.inputSiteFooterCopyright,
      inputSiteAdminOverviewPublicVisible: controls.inputSiteAdminOverviewPublicVisible,
      inputSiteAdminOverviewHiddenMessage: controls.inputSiteAdminOverviewHiddenMessage,
      inputSiteFaviconIco: controls.inputSiteFaviconIco,
      inputSiteFaviconSvg: controls.inputSiteFaviconSvg,
      inputSiteFaviconPng: controls.inputSiteFaviconPng,
      inputSiteFaviconAppleTouchIcon: controls.inputSiteFaviconAppleTouchIcon,
      inputSiteSocialGithubOrder: controls.inputSiteSocialGithubOrder,
      inputSiteSocialGithub: controls.inputSiteSocialGithub,
      inputSiteSocialQqOrder: controls.inputSiteSocialQqOrder,
      inputSiteSocialQq: controls.inputSiteSocialQq,
      inputSiteSocialEmailOrder: controls.inputSiteSocialEmailOrder,
      inputSiteSocialEmail: controls.inputSiteSocialEmail,
      inputShellBrandTitle: controls.inputShellBrandTitle,
      inputShellQuote: controls.inputShellQuote,
      inputHomeShowIntroLead: controls.inputHomeShowIntroLead,
      inputHomeShowIntroMore: controls.inputHomeShowIntroMore,
      inputHomeIntroLead: controls.inputHomeIntroLead,
      inputHomeIntroMore: controls.inputHomeIntroMore,
      inputHomeIntroMoreLinkPrimary: controls.inputHomeIntroMoreLinkPrimary,
      inputHomeIntroMoreLinkSecondaryEnabled: controls.inputHomeIntroMoreLinkSecondaryEnabled,
      inputHomeIntroMoreLinkSecondary: controls.inputHomeIntroMoreLinkSecondary,
      inputPageEssayTitle: controls.inputPageEssayTitle,
      inputPageEssaySubtitle: controls.inputPageEssaySubtitle,
      inputPageArchiveTitle: controls.inputPageArchiveTitle,
      inputPageArchiveSubtitle: controls.inputPageArchiveSubtitle,
      inputPageBitsTitle: controls.inputPageBitsTitle,
      inputPageBitsSubtitle: controls.inputPageBitsSubtitle,
      inputPageMemoTitle: controls.inputPageMemoTitle,
      inputPageMemoSubtitle: controls.inputPageMemoSubtitle,
      inputPageAboutTitle: controls.inputPageAboutTitle,
      inputPageAboutSubtitle: controls.inputPageAboutSubtitle,
      inputPageAboutProfileAvatar: controls.inputPageAboutProfileAvatar,
      inputPageAboutProfileGreeting: controls.inputPageAboutProfileGreeting,
      inputPageAboutProfileName: controls.inputPageAboutProfileName,
      inputPageAboutProfileIdentity: controls.inputPageAboutProfileIdentity,
      inputPageAboutProfileBirthYear: controls.inputPageAboutProfileBirthYear,
      inputPageAboutProfileCurrent: controls.inputPageAboutProfileCurrent,
      inputPageAboutProfileMottoLead: controls.inputPageAboutProfileMottoLead,
      inputPageAboutProfileMottoTail: controls.inputPageAboutProfileMottoTail,
      inputPageAboutProfileInterestsTitle: controls.inputPageAboutProfileInterestsTitle,
      inputPageAboutProfileInterests: controls.inputPageAboutProfileInterests,
      inputPageAboutProfileMusicTitle: controls.inputPageAboutProfileMusicTitle,
      inputPageAboutProfileMusic: controls.inputPageAboutProfileMusic,
      inputPageAboutProfilePersonality: controls.inputPageAboutProfilePersonality,
      inputPageAboutProfilePersonalityType: controls.inputPageAboutProfilePersonalityType,
      inputPageAboutProfilePersonalityUrl: controls.inputPageAboutProfilePersonalityUrl,
      inputPageAboutProfileSpecialties: controls.inputPageAboutProfileSpecialties,
      inputPageAboutProfileSpecialtyHighlight: controls.inputPageAboutProfileSpecialtyHighlight,
      inputPageAboutUmamiBaseUrl: controls.inputPageAboutUmamiBaseUrl,
      inputPageAboutUmamiShareId: controls.inputPageAboutUmamiShareId,
      inputCommentsEnabled: controls.inputCommentsEnabled,
      inputCommentsRepo: controls.inputCommentsRepo,
      inputCommentsRepoId: controls.inputCommentsRepoId,
      inputCommentsCategory: controls.inputCommentsCategory,
      inputCommentsCategoryId: controls.inputCommentsCategoryId,
      inputCommentsMapping: controls.inputCommentsMapping,
      inputCommentsInputPosition: controls.inputCommentsInputPosition,
      inputCommentsLang: controls.inputCommentsLang,
      inputCommentsReactionsEnabled: controls.inputCommentsReactionsEnabled,
      inputCommentsStrict: controls.inputCommentsStrict,
      inputPageLinksTitle: controls.inputPageLinksTitle,
      inputPageLinksSubtitle: controls.inputPageLinksSubtitle,
      inputLinksSourceUrl: controls.inputLinksSourceUrl,
      inputLinksLatencySourceUrl: controls.inputLinksLatencySourceUrl,
      inputLinksTombstoneSourceUrl: controls.inputLinksTombstoneSourceUrl,
      inputLinksSubmissionUrl: controls.inputLinksSubmissionUrl,
      inputLinksFcircleSourceUrl: controls.inputLinksFcircleSourceUrl,
      inputLinksFcircleEnabled: controls.inputLinksFcircleEnabled,
      inputLinksFcircleShowError: controls.inputLinksFcircleShowError,
      inputLinksEch0SourceUrl: controls.inputLinksEch0SourceUrl,
      inputLinksEch0Enabled: controls.inputLinksEch0Enabled,
      inputLinksEch0PageSize: controls.inputLinksEch0PageSize,
      inputLinksEch0MaxPages: controls.inputLinksEch0MaxPages,
      inputLinksEch0ShowError: controls.inputLinksEch0ShowError,
      inputLinksVoteApiBase: controls.inputLinksVoteApiBase,
      inputLinksVoteEnabled: controls.inputLinksVoteEnabled,
      inputArticleMetaShowDate: controls.inputArticleMetaShowDate,
      inputArticleMetaDateLabel: controls.inputArticleMetaDateLabel,
      inputArticleMetaShowTags: controls.inputArticleMetaShowTags,
      inputArticleMetaShowWordCount: controls.inputArticleMetaShowWordCount,
      inputArticleMetaShowReadingTime: controls.inputArticleMetaShowReadingTime,
      inputPageBitsAuthorName: controls.inputPageBitsAuthorName,
      inputPageBitsAuthorAvatar: controls.inputPageBitsAuthorAvatar,
      inputHomeShowHero: controls.inputHomeShowHero,
      inputHeroImageSrc: controls.inputHeroImageSrc,
      inputHeroImageAlt: controls.inputHeroImageAlt,
      inputCodeLineNumbers: controls.inputCodeLineNumbers,
      inputBackgroundStarry: controls.inputBackgroundStarry,
      inputTransitionsSwup: controls.inputTransitionsSwup,
      inputReadingEntry: controls.inputReadingEntry,
      inputSidebarActionsShowRssLink: controls.inputSidebarActionsShowRssLink,
      inputSidebarActionsShowThemeToggle: controls.inputSidebarActionsShowThemeToggle,
      inputSidebarActionsShowAdminEntry: controls.inputSidebarActionsShowAdminEntry,
      sidebarAdminEntryRowEl: controls.sidebarAdminEntryRowEl,
      inputSidebarDividerDefault: controls.inputSidebarDividerDefault,
      inputSidebarDividerSubtle: controls.inputSidebarDividerSubtle,
      inputSidebarDividerNone: controls.inputSidebarDividerNone,
      inputTypographyReadable: controls.inputTypographyReadable,
      inputTypographyCopy: controls.inputTypographyCopy,
      inputTypographyMono: controls.inputTypographyMono,
      inputTypographyBrand: controls.inputTypographyBrand
    });

    const validation = createValidation({
      form: controls.form,
      queryAll,
      footerStartYearMax,
      socialCustomAddBtn: controls.socialCustomAddBtn,
      inputSiteTitle: controls.inputSiteTitle,
      inputSiteDescription: controls.inputSiteDescription,
      inputSiteDefaultLocale: controls.inputSiteDefaultLocale,
      inputSiteFooterStartYear: controls.inputSiteFooterStartYear,
      inputSiteFooterShowCurrentYear: controls.inputSiteFooterShowCurrentYear,
      inputSiteFooterCopyright: controls.inputSiteFooterCopyright,
      inputSiteAdminOverviewPublicVisible: controls.inputSiteAdminOverviewPublicVisible,
      inputSiteAdminOverviewHiddenMessage: controls.inputSiteAdminOverviewHiddenMessage,
      inputSiteFaviconIco: controls.inputSiteFaviconIco,
      inputSiteSocialGithub: controls.inputSiteSocialGithub,
      inputSiteSocialQq: controls.inputSiteSocialQq,
      inputSiteSocialEmail: controls.inputSiteSocialEmail,
      inputShellBrandTitle: controls.inputShellBrandTitle,
      inputShellQuote: controls.inputShellQuote,
      inputHomeIntroLead: controls.inputHomeIntroLead,
      inputHomeShowIntroLead: controls.inputHomeShowIntroLead,
      inputHomeIntroMore: controls.inputHomeIntroMore,
      inputHomeShowIntroMore: controls.inputHomeShowIntroMore,
      inputHomeIntroMoreLinkPrimary: controls.inputHomeIntroMoreLinkPrimary,
      inputHomeShowHero: controls.inputHomeShowHero,
      inputHeroImageSrc: controls.inputHeroImageSrc,
      inputHeroImageAlt: controls.inputHeroImageAlt,
      inputPageEssayTitle: controls.inputPageEssayTitle,
      inputPageArchiveTitle: controls.inputPageArchiveTitle,
      inputPageBitsTitle: controls.inputPageBitsTitle,
      inputPageMemoTitle: controls.inputPageMemoTitle,
      inputPageAboutTitle: controls.inputPageAboutTitle,
      inputPageLinksTitle: controls.inputPageLinksTitle,
      inputPageEssaySubtitle: controls.inputPageEssaySubtitle,
      inputPageArchiveSubtitle: controls.inputPageArchiveSubtitle,
      inputPageBitsSubtitle: controls.inputPageBitsSubtitle,
      inputPageMemoSubtitle: controls.inputPageMemoSubtitle,
      inputPageAboutSubtitle: controls.inputPageAboutSubtitle,
      inputPageAboutUmamiBaseUrl: controls.inputPageAboutUmamiBaseUrl,
      inputPageAboutUmamiShareId: controls.inputPageAboutUmamiShareId,
      inputPageLinksSubtitle: controls.inputPageLinksSubtitle,
      inputLinksSourceUrl: controls.inputLinksSourceUrl,
      inputLinksLatencySourceUrl: controls.inputLinksLatencySourceUrl,
      inputLinksTombstoneSourceUrl: controls.inputLinksTombstoneSourceUrl,
      inputLinksSubmissionUrl: controls.inputLinksSubmissionUrl,
      inputLinksFcircleSourceUrl: controls.inputLinksFcircleSourceUrl,
      inputLinksFcircleEnabled: controls.inputLinksFcircleEnabled,
      inputLinksFcircleShowError: controls.inputLinksFcircleShowError,
      inputLinksEch0SourceUrl: controls.inputLinksEch0SourceUrl,
      inputLinksEch0Enabled: controls.inputLinksEch0Enabled,
      inputLinksEch0PageSize: controls.inputLinksEch0PageSize,
      inputLinksEch0MaxPages: controls.inputLinksEch0MaxPages,
      inputLinksEch0ShowError: controls.inputLinksEch0ShowError,
      inputLinksVoteApiBase: controls.inputLinksVoteApiBase,
      inputLinksVoteEnabled: controls.inputLinksVoteEnabled,
      inputArticleMetaShowDate: controls.inputArticleMetaShowDate,
      inputArticleMetaDateLabel: controls.inputArticleMetaDateLabel,
      inputArticleMetaShowTags: controls.inputArticleMetaShowTags,
      inputArticleMetaShowWordCount: controls.inputArticleMetaShowWordCount,
      inputArticleMetaShowReadingTime: controls.inputArticleMetaShowReadingTime,
      inputSidebarActionsShowRssLink: controls.inputSidebarActionsShowRssLink,
      inputSidebarActionsShowThemeToggle: controls.inputSidebarActionsShowThemeToggle,
      inputSidebarActionsShowAdminEntry: controls.inputSidebarActionsShowAdminEntry,
      inputPageBitsAuthorName: controls.inputPageBitsAuthorName,
      inputPageBitsAuthorAvatar: controls.inputPageBitsAuthorAvatar,
      inputSidebarDividerDefault: controls.inputSidebarDividerDefault,
      inputTypographyReadable: controls.inputTypographyReadable,
      inputTypographyCopy: controls.inputTypographyCopy,
      inputTypographyMono: controls.inputTypographyMono,
      inputTypographyBrand: controls.inputTypographyBrand,
      getPresetFieldTarget: socialLinks.getPresetFieldTarget,
      getCustomFieldTarget: socialLinks.getCustomFieldTarget,
      getCustomVisibilityTarget: socialLinks.getCustomVisibilityTarget,
      getNavFieldTarget: navTreeEditor.getNavFieldTarget,
      getNavChildFieldTarget: navTreeEditor.getNavChildFieldTarget,
      getFirstNavLabelTarget: navTreeEditor.getFirstNavLabelTarget
    });

    const statusTargets = [controls.statusEl, controls.statusInlineEl]
      .filter((target): target is HTMLElement => target !== null);
    const uiState = createAdminConsoleUiState({
      root,
      adminActions: controls.adminActions,
      dirtyBanner: controls.dirtyBanner,
      errorBanner: controls.errorBanner,
      errorTitleEl: controls.errorTitleEl,
      errorMessageEl: controls.errorMessageEl,
      errorListEl: controls.errorListEl,
      errorRetryBtn: controls.errorRetryBtn,
      validateBtn: controls.validateBtn,
      saveBtn: controls.saveBtn,
      statusTargets,
      statusLiveEl: controls.statusLiveEl,
      queryAll
    });

    const imagePicker = createAdminImagePicker();
    const faviconUploads = createAdminFaviconUploads({
      root,
      inputs: {
        png: controls.inputSiteFaviconPng,
        appleTouchIcon: controls.inputSiteFaviconAppleTouchIcon
      },
      setStatus: uiState.setStatus
    });
    const themeImageFields = createAdminThemeImageFields({
      root,
      picker: imagePicker,
      setStatus: uiState.setStatus,
      getFieldState: (field) => {
        if (field !== 'home.heroImageSrc') return { enabled: true };
        return {
          enabled: controls.inputHomeShowHero.checked,
          inactivePreviewText: '首页 Hero 图未启用'
        };
      }
    });

    const finalizeAppliedSettings = (): void => {
      socialLinks.getPresetRows().forEach((row) => {
        delete row.dataset.stashedHref;
        delete row.dataset.stashedOrder;
        socialLinks.syncPresetRow(row);
      });
      themeImageFields?.refreshAll();
      faviconUploads.refreshAll();
    };

    const syncEditableDerivedControls = (): void => {
      if (uiState.isConsoleLocked() || uiState.isSaving() || uiState.isValidating()) return;
      formCodec.syncAdminOverviewControls();
      formCodec.syncSidebarActionControls();
      formCodec.syncHomeIntroLinkControls();
      formCodec.syncHeroControls();
      formCodec.syncFooterYearControls();
      themeImageFields?.refresh('home.heroImageSrc');
    };

    const controller = createAdminThemeController({
      controls,
      endpoint,
      formCodec,
      uiState,
      validation,
      finalizeAppliedSettings,
      syncEditableDerivedControls
    });

    // 树形导航编辑器结构变化（增删/移动/跨父级拖拽）不冒泡原生 input/change，
    // 经 onChange 钩子触发脏状态刷新；文本输入仍走表单级 input/change 冒泡。
    navTreeEditor.setOnChange(controller.refreshDirty);

    bindAdminThemeFieldEvents({
      controls,
      formCodec,
      themeImageFields,
      uiState,
      refreshDirty: controller.refreshDirty
    });
    bindAdminThemeSocialEvents({
      controls,
      query,
      socialLinks,
      uiState,
      refreshDirty: controller.refreshDirty
    });
    bindAdminThemeActionEvents({
      controls,
      controller,
      uiState
    });
    teardownNavigationGuard = bindAdminThemeNavigationGuard({ uiState });
    controller.start();
  }
  }
};

if (typeof window !== 'undefined') {
  // module 脚本插入 .shell 后首次执行;swup 导航离开/回到本页时由
  // page-change 事件重新初始化(模块 URL 去重不会重执行)。
  // 注:swup-init 已对 /admin/ 路径禁用接管,走原生整页加载。
  onPageChange(initAdminConsole);
}
