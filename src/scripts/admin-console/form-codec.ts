import type {
  HomeIntroLinkKey,
  SidebarDividerVariant,
  SidebarNavId,
  SiteSocialIconKey,
  SiteSocialPresetId,
  ThemeFontId,
  ThemeSettingsEditablePayload,
  TypographyRole,
  TypographySettings
} from '@/lib/theme-settings';
import { normalizeHeroImageSrc as normalizeHeroImageSrcValue, normalizeSiteFaviconPath, type SiteFaviconSlot } from '@/utils/format';
import {
  ADMIN_ARTICLE_META_DATE_LABEL_DEFAULT,
  ADMIN_HERO_IMAGE_ALT_DEFAULT,
  ADMIN_HOME_INTRO_LINK_DEFAULT,
  ADMIN_HOME_INTRO_LINK_LIMIT,
  ADMIN_HOME_INTRO_LINK_OPTIONS,
  ADMIN_NAV_IDS,
  ADMIN_NAV_ORNAMENT_DEFAULT,
  ADMIN_OVERVIEW_HIDDEN_MESSAGE_DEFAULT,
  ADMIN_SIDEBAR_DIVIDER_DEFAULT,
  ADMIN_SOCIAL_PRESET_ORDER_DEFAULT,
  ADMIN_TYPOGRAPHY_DEFAULT,
  canonicalizeAdminThemeSettings,
  isAdminHomeIntroLinkKey,
  isAdminNavId,
  isAdminTypographyFontId,
  normalizeAdminSocialIconKey
} from '@/lib/admin-console/theme-shared';

export type EditableSettings = ThemeSettingsEditablePayload['settings'];
export type EditableCustomSocialItem = EditableSettings['site']['socialLinks']['custom'][number];
export type EditableNavItem = EditableSettings['shell']['nav'][number];
export type EditableNavChild = EditableNavItem['children'][number];
export type SidebarNavChildDraft = { parentId: SidebarNavId; child: EditableNavChild };
export type SocialPresetOrder = Record<SiteSocialPresetId, number>;

type Query = <T extends Element>(parent: ParentNode, selector: string) => T | null;

type FormCodecContext = {
  footerStartYearMax: number;
  query: Query;
  getNavRows: () => HTMLElement[];
  getNavChildDrafts: () => SidebarNavChildDraft[];
  renderNavChildDrafts: (drafts: SidebarNavChildDraft[]) => void;
  getCustomRows: () => HTMLElement[];
  getCustomRowLabelInput: (row: Element | null) => HTMLInputElement | null;
  defaultCustomSocialIconKey: SiteSocialIconKey;
  normalizeCustomSocialLabel: (value: unknown, iconKey: SiteSocialIconKey) => string;
  replaceCustomRows: (items: EditableCustomSocialItem[]) => void;
  normalizeSocialOrders: () => void;
  getPresetSocialOrder: () => SocialPresetOrder;
  articleMetaPreviewValueEl: HTMLElement;
  footerPreviewValueEl: HTMLElement;
  homeIntroMorePreviewEl: HTMLElement;
  homeIntroMoreLinkSecondaryGroupEl: HTMLElement;
  inputSiteTitle: HTMLInputElement;
  inputSiteDescription: HTMLTextAreaElement;
  inputSiteDefaultLocale: HTMLInputElement;
  inputSiteFooterStartYear: HTMLInputElement;
  inputSiteFooterShowCurrentYear: HTMLInputElement;
  inputSiteFooterCopyright: HTMLInputElement;
  inputSiteAdminOverviewPublicVisible: HTMLInputElement;
  inputSiteAdminOverviewHiddenMessage: HTMLInputElement;
  inputSiteFaviconIco: HTMLInputElement;
  inputSiteFaviconSvg: HTMLInputElement;
  inputSiteFaviconPng: HTMLInputElement;
  inputSiteFaviconAppleTouchIcon: HTMLInputElement;
  inputSiteSocialGithubOrder: HTMLInputElement;
  inputSiteSocialGithub: HTMLInputElement;
  inputSiteSocialQqOrder: HTMLInputElement;
  inputSiteSocialQq: HTMLInputElement;
  inputSiteSocialEmailOrder: HTMLInputElement;
  inputSiteSocialEmail: HTMLInputElement;
  inputShellBrandTitle: HTMLInputElement;
  inputShellQuote: HTMLTextAreaElement;
  inputHomeShowIntroLead: HTMLInputElement;
  inputHomeShowIntroMore: HTMLInputElement;
  inputHomeIntroLead: HTMLTextAreaElement;
  inputHomeIntroMore: HTMLTextAreaElement;
  inputHomeIntroMoreLinkPrimary: HTMLSelectElement;
  inputHomeIntroMoreLinkSecondaryEnabled: HTMLInputElement;
  inputHomeIntroMoreLinkSecondary: HTMLSelectElement;
  inputPageEssayTitle: HTMLInputElement;
  inputPageEssaySubtitle: HTMLInputElement;
  inputPageArchiveTitle: HTMLInputElement;
  inputPageArchiveSubtitle: HTMLInputElement;
  inputPageBitsTitle: HTMLInputElement;
  inputPageBitsSubtitle: HTMLInputElement;
  inputPageMemoTitle: HTMLInputElement;
  inputPageMemoSubtitle: HTMLInputElement;
  inputPageAboutTitle: HTMLInputElement;
  inputPageAboutSubtitle: HTMLInputElement;
  inputPageAboutProfileAvatar: HTMLInputElement;
  inputPageAboutProfileGreeting: HTMLInputElement;
  inputPageAboutProfileName: HTMLInputElement;
  inputPageAboutProfileIdentity: HTMLInputElement;
  inputPageAboutProfileBirthYear: HTMLInputElement;
  inputPageAboutProfileCurrent: HTMLInputElement;
  inputPageAboutProfileMottoLead: HTMLInputElement;
  inputPageAboutProfileMottoTail: HTMLInputElement;
  inputPageAboutProfileInterestsTitle: HTMLInputElement;
  inputPageAboutProfileInterests: HTMLInputElement;
  inputPageAboutProfileMusicTitle: HTMLInputElement;
  inputPageAboutProfileMusic: HTMLInputElement;
  inputPageAboutProfilePersonality: HTMLInputElement;
  inputPageAboutProfilePersonalityType: HTMLInputElement;
  inputPageAboutProfilePersonalityUrl: HTMLInputElement;
  inputPageAboutProfileSpecialties: HTMLInputElement;
  inputPageAboutProfileSpecialtyHighlight: HTMLInputElement;
  inputPageAboutUmamiBaseUrl: HTMLInputElement;
  inputPageAboutUmamiShareId: HTMLInputElement;
  inputCommentsEnabled: HTMLInputElement;
  inputCommentsRepo: HTMLInputElement;
  inputCommentsRepoId: HTMLInputElement;
  inputCommentsCategory: HTMLInputElement;
  inputCommentsCategoryId: HTMLInputElement;
  inputCommentsMapping: HTMLSelectElement;
  inputCommentsInputPosition: HTMLSelectElement;
  inputCommentsLang: HTMLSelectElement;
  inputCommentsReactionsEnabled: HTMLInputElement;
  inputCommentsStrict: HTMLInputElement;
  inputPageLinksTitle: HTMLInputElement;
  inputPageLinksSubtitle: HTMLInputElement;
  inputLinksSourceUrl: HTMLInputElement;
  inputLinksLatencySourceUrl: HTMLInputElement;
  inputLinksTombstoneSourceUrl: HTMLInputElement;
  inputLinksSubmissionUrl: HTMLInputElement;
  inputLinksFcircleSourceUrl: HTMLInputElement;
  inputLinksFcircleEnabled: HTMLInputElement;
  inputLinksFcircleShowError: HTMLInputElement;
  inputLinksEch0SourceUrl: HTMLInputElement;
  inputLinksEch0Enabled: HTMLInputElement;
  inputLinksEch0PageSize: HTMLInputElement;
  inputLinksEch0MaxPages: HTMLInputElement;
  inputLinksEch0ShowError: HTMLInputElement;
  inputLinksVoteApiBase: HTMLInputElement;
  inputLinksVoteEnabled: HTMLInputElement;
  inputArticleMetaShowDate: HTMLInputElement;
  inputArticleMetaDateLabel: HTMLInputElement;
  inputArticleMetaShowTags: HTMLInputElement;
  inputArticleMetaShowWordCount: HTMLInputElement;
  inputArticleMetaShowReadingTime: HTMLInputElement;
  inputPageBitsAuthorName: HTMLInputElement;
  inputPageBitsAuthorAvatar: HTMLInputElement;
  inputHomeShowHero: HTMLInputElement;
  inputHeroImageSrc: HTMLInputElement;
  inputHeroImageAlt: HTMLInputElement;
  inputCodeLineNumbers: HTMLInputElement;
  inputBackgroundStarry: HTMLInputElement;
  inputTransitionsSwup: HTMLInputElement;
  inputReadingEntry: HTMLInputElement;
  inputSidebarActionsShowRssLink: HTMLInputElement;
  inputSidebarActionsShowThemeToggle: HTMLInputElement;
  inputSidebarActionsShowAdminEntry: HTMLInputElement;
  sidebarAdminEntryRowEl: HTMLElement;
  inputSidebarDividerDefault: HTMLInputElement;
  inputSidebarDividerSubtle: HTMLInputElement;
  inputSidebarDividerNone: HTMLInputElement;
  inputTypographyReadable: HTMLElement;
  inputTypographyCopy: HTMLElement;
  inputTypographyMono: HTMLElement;
  inputTypographyBrand: HTMLElement;
};

const normalizeMultiline = (value: string): string => value.replace(/\r\n/g, '\n');

const normalizeOptionalSingleLine = (value: string): string | null => {
  const normalized = normalizeMultiline(value).trim();
  return normalized || null;
};

const normalizeSingleLine = (value: unknown, fallback = ''): string => {
  if (typeof value !== 'string') return fallback;
  const normalized = normalizeMultiline(value).trim();
  return normalized.includes('\n') ? fallback : normalized;
};

export const normalizeEmail = (value: string): string => value.replace(/^mailto:/i, '').trim();

const parseOrder = (value: string | number | null | undefined, fallback: number): number => {
  const next = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(next) ? next : fallback;
};

const parseInteger = (value: string | number | null | undefined): number | null => {
  const next = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(next) ? next : null;
};

const normalizeTrimmed = (value: unknown): string => String(value ?? '').trim();

const normalizeHeroImageInput = (value: unknown): string | null => {
  const rawValue = normalizeTrimmed(value);
  if (!rawValue) return null;
  return normalizeHeroImageSrcValue(rawValue) ?? rawValue;
};

const normalizeHeroImageAlt = (value: unknown): string => {
  const rawValue = normalizeTrimmed(value);
  return rawValue || ADMIN_HERO_IMAGE_ALT_DEFAULT;
};

const normalizeSiteFaviconInput = (slot: SiteFaviconSlot, value: unknown): string | null => {
  const rawValue = normalizeTrimmed(value);
  if (!rawValue) return null;
  return normalizeSiteFaviconPath(slot, rawValue) ?? rawValue;
};

export const createFormCodec = ({
  footerStartYearMax,
  query,
  getNavRows,
  getNavChildDrafts,
  renderNavChildDrafts,
  getCustomRows,
  getCustomRowLabelInput,
  defaultCustomSocialIconKey,
  normalizeCustomSocialLabel,
  replaceCustomRows,
  normalizeSocialOrders,
  getPresetSocialOrder,
  articleMetaPreviewValueEl,
  footerPreviewValueEl,
  homeIntroMorePreviewEl,
  homeIntroMoreLinkSecondaryGroupEl,
  inputSiteTitle,
  inputSiteDescription,
  inputSiteDefaultLocale,
  inputSiteFooterStartYear,
  inputSiteFooterShowCurrentYear,
  inputSiteFooterCopyright,
  inputSiteAdminOverviewPublicVisible,
  inputSiteAdminOverviewHiddenMessage,
  inputSiteFaviconIco,
  inputSiteFaviconSvg,
  inputSiteFaviconPng,
  inputSiteFaviconAppleTouchIcon,
  inputSiteSocialGithubOrder,
  inputSiteSocialGithub,
  inputSiteSocialQqOrder,
  inputSiteSocialQq,
  inputSiteSocialEmailOrder,
  inputSiteSocialEmail,
  inputShellBrandTitle,
  inputShellQuote,
  inputHomeShowIntroLead,
  inputHomeShowIntroMore,
  inputHomeIntroLead,
  inputHomeIntroMore,
  inputHomeIntroMoreLinkPrimary,
  inputHomeIntroMoreLinkSecondaryEnabled,
  inputHomeIntroMoreLinkSecondary,
  inputPageEssayTitle,
  inputPageEssaySubtitle,
  inputPageArchiveTitle,
  inputPageArchiveSubtitle,
  inputPageBitsTitle,
  inputPageBitsSubtitle,
  inputPageMemoTitle,
  inputPageMemoSubtitle,
  inputPageAboutTitle,
  inputPageAboutSubtitle,
  inputPageAboutProfileAvatar,
  inputPageAboutProfileGreeting,
  inputPageAboutProfileName,
  inputPageAboutProfileIdentity,
  inputPageAboutProfileBirthYear,
  inputPageAboutProfileCurrent,
  inputPageAboutProfileMottoLead,
  inputPageAboutProfileMottoTail,
  inputPageAboutProfileInterestsTitle,
  inputPageAboutProfileInterests,
  inputPageAboutProfileMusicTitle,
  inputPageAboutProfileMusic,
  inputPageAboutProfilePersonality,
  inputPageAboutProfilePersonalityType,
  inputPageAboutProfilePersonalityUrl,
  inputPageAboutProfileSpecialties,
  inputPageAboutProfileSpecialtyHighlight,
  inputPageAboutUmamiBaseUrl,
  inputPageAboutUmamiShareId,
  inputCommentsEnabled,
  inputCommentsRepo,
  inputCommentsRepoId,
  inputCommentsCategory,
  inputCommentsCategoryId,
  inputCommentsMapping,
  inputCommentsInputPosition,
  inputCommentsLang,
  inputCommentsReactionsEnabled,
  inputCommentsStrict,
  inputPageLinksTitle,
  inputPageLinksSubtitle,
  inputLinksSourceUrl,
  inputLinksLatencySourceUrl,
  inputLinksTombstoneSourceUrl,
  inputLinksSubmissionUrl,
  inputLinksFcircleSourceUrl,
  inputLinksFcircleEnabled,
  inputLinksFcircleShowError,
  inputLinksEch0SourceUrl,
  inputLinksEch0Enabled,
  inputLinksEch0PageSize,
  inputLinksEch0MaxPages,
  inputLinksEch0ShowError,
  inputLinksVoteApiBase,
  inputLinksVoteEnabled,
  inputArticleMetaShowDate,
  inputArticleMetaDateLabel,
  inputArticleMetaShowTags,
  inputArticleMetaShowWordCount,
  inputArticleMetaShowReadingTime,
  inputPageBitsAuthorName,
  inputPageBitsAuthorAvatar,
  inputHomeShowHero,
  inputHeroImageSrc,
  inputHeroImageAlt,
  inputCodeLineNumbers,
  inputBackgroundStarry,
  inputTransitionsSwup,
  inputReadingEntry,
  inputSidebarActionsShowRssLink,
  inputSidebarActionsShowThemeToggle,
  inputSidebarActionsShowAdminEntry,
  sidebarAdminEntryRowEl,
  inputSidebarDividerDefault,
  inputSidebarDividerSubtle,
  inputSidebarDividerNone,
  inputTypographyReadable,
  inputTypographyCopy,
  inputTypographyMono,
  inputTypographyBrand
}: FormCodecContext) => {
  const defaultHomeIntroLinks = [...ADMIN_HOME_INTRO_LINK_DEFAULT] as HomeIntroLinkKey[];
  const defaultPrimaryHomeIntroLink: HomeIntroLinkKey = ADMIN_HOME_INTRO_LINK_DEFAULT[0];
  const defaultSecondaryHomeIntroLink: HomeIntroLinkKey = ADMIN_HOME_INTRO_LINK_DEFAULT[1];

  const getFallbackSecondaryIntroLink = (primary: HomeIntroLinkKey): HomeIntroLinkKey =>
    defaultHomeIntroLinks.find((link) => link !== primary)
    || ADMIN_HOME_INTRO_LINK_OPTIONS.find((option) => option.id !== primary)?.id
    || defaultSecondaryHomeIntroLink
    || primary;

  const normalizeHomeIntroLinks = (value: unknown): HomeIntroLinkKey[] => {
    if (!Array.isArray(value)) return [...defaultHomeIntroLinks];

    const normalized: HomeIntroLinkKey[] = [];
    const seen = new Set<HomeIntroLinkKey>();

    value.forEach((item) => {
      const rawValue = normalizeTrimmed(item);
      if (!rawValue || !isAdminHomeIntroLinkKey(rawValue)) return;
      const linkKey = rawValue as HomeIntroLinkKey;
      if (seen.has(linkKey) || normalized.length >= ADMIN_HOME_INTRO_LINK_LIMIT) return;
      normalized.push(linkKey);
      seen.add(linkKey);
    });

    return normalized.length ? normalized : [...defaultHomeIntroLinks];
  };

  const getSelectedHomeIntroLink = (
    selectEl: HTMLSelectElement,
    fallback: HomeIntroLinkKey
  ): HomeIntroLinkKey => {
    const rawValue = selectEl.value.trim();
    return isAdminHomeIntroLinkKey(rawValue) ? rawValue : fallback;
  };

  const HOME_INTRO_PREVIEW_EMPTY = '无首页补充导语';
  const getHomeIntroLinkLabel = (linkKey: HomeIntroLinkKey): string =>
    ADMIN_HOME_INTRO_LINK_OPTIONS.find((option) => option.id === linkKey)?.label || '链接';

  const syncAdminOverviewControls = (): void => {
    inputSiteAdminOverviewHiddenMessage.disabled = inputSiteAdminOverviewPublicVisible.checked;
  };

  const syncSidebarActionControls = (): void => {
    const adminOverviewPublicVisible = Boolean(inputSiteAdminOverviewPublicVisible.checked);
    inputSidebarActionsShowAdminEntry.disabled = !adminOverviewPublicVisible;
    sidebarAdminEntryRowEl.setAttribute('aria-disabled', String(!adminOverviewPublicVisible));
  };

  const collectHomeIntroLinks = (): HomeIntroLinkKey[] => {
    const primary = getSelectedHomeIntroLink(inputHomeIntroMoreLinkPrimary, defaultPrimaryHomeIntroLink);
    if (!inputHomeIntroMoreLinkSecondaryEnabled.checked) {
      return [primary];
    }

    const secondary = getSelectedHomeIntroLink(
      inputHomeIntroMoreLinkSecondary,
      getFallbackSecondaryIntroLink(primary)
    );

    return secondary !== primary ? [primary, secondary] : [primary];
  };

  const getHomeIntroPreviewText = (): string => {
    if (!inputHomeShowIntroMore.checked) {
      return HOME_INTRO_PREVIEW_EMPTY;
    }
    const introText = normalizeMultiline(inputHomeIntroMore.value).trim() || '……';
    const [primary, secondary] = collectHomeIntroLinks();
    const primaryLabel = getHomeIntroLinkLabel(primary || defaultPrimaryHomeIntroLink);
    if (!secondary) {
      return `${introText} ${primaryLabel}。`;
    }
    const secondaryLabel = getHomeIntroLinkLabel(secondary);
    return `${introText} ${primaryLabel} 或 ${secondaryLabel}。`;
  };

  const refreshHomeIntroPreview = (): void => {
    homeIntroMorePreviewEl.textContent = getHomeIntroPreviewText();
  };

  const ARTICLE_META_PREVIEW_DATE = '2026-03-18';
  const ARTICLE_META_PREVIEW_TAGS = ['#Astro', '#写作'] as const;
  const ARTICLE_META_PREVIEW_WORD_COUNT = '共 2,416 字';
  const ARTICLE_META_PREVIEW_READING_TIME = '约 6 分钟';
  const ARTICLE_META_PREVIEW_EMPTY = '当前不显示文章元信息';

  const getArticleMetaPreviewText = (): string => {
    const segments: string[] = [];

    if (inputArticleMetaShowDate.checked) {
      const dateLabel = normalizeSingleLine(inputArticleMetaDateLabel.value);
      segments.push(`${dateLabel}${ARTICLE_META_PREVIEW_DATE}`);
    }

    if (inputArticleMetaShowTags.checked) {
      segments.push(ARTICLE_META_PREVIEW_TAGS.join('\u00A0\u00A0'));
    }

    if (inputArticleMetaShowWordCount.checked) {
      segments.push(ARTICLE_META_PREVIEW_WORD_COUNT);
    }

    if (inputArticleMetaShowReadingTime.checked) {
      segments.push(ARTICLE_META_PREVIEW_READING_TIME);
    }

    return segments.length ? segments.join(' · ') : ARTICLE_META_PREVIEW_EMPTY;
  };

  const refreshArticleMetaPreview = (): void => {
    articleMetaPreviewValueEl.textContent = getArticleMetaPreviewText();
  };

  const syncHomeIntroLinkControls = (): void => {
    const primary = getSelectedHomeIntroLink(inputHomeIntroMoreLinkPrimary, defaultPrimaryHomeIntroLink);
    const hasSecondary = Boolean(inputHomeIntroMoreLinkSecondaryEnabled.checked);
    inputHomeIntroMoreLinkSecondary.disabled = !hasSecondary;
    homeIntroMoreLinkSecondaryGroupEl.setAttribute('aria-disabled', String(!hasSecondary));

    if (hasSecondary) {
      const secondary = getSelectedHomeIntroLink(
        inputHomeIntroMoreLinkSecondary,
        getFallbackSecondaryIntroLink(primary)
      );

      if (secondary === primary) {
        inputHomeIntroMoreLinkSecondary.value = getFallbackSecondaryIntroLink(primary);
      }
    }

    refreshHomeIntroPreview();
  };

  const syncHeroControls = (): void => {
    const isHidden = !inputHomeShowHero.checked;
    inputHeroImageSrc.disabled = isHidden;
    inputHeroImageAlt.disabled = isHidden;
  };

  const getSelectedSidebarDividerVariant = (): SidebarDividerVariant => {
    if (inputSidebarDividerSubtle.checked) return 'subtle';
    if (inputSidebarDividerNone.checked) return 'none';
    return ADMIN_SIDEBAR_DIVIDER_DEFAULT;
  };

  const applySidebarDividerVariant = (value: SidebarDividerVariant): void => {
    inputSidebarDividerDefault.checked = value === 'default';
    inputSidebarDividerSubtle.checked = value === 'subtle';
    inputSidebarDividerNone.checked = value === 'none';
  };

  const typographyGroups: Record<TypographyRole, HTMLElement> = {
    readable: inputTypographyReadable,
    copy: inputTypographyCopy,
    mono: inputTypographyMono,
    brand: inputTypographyBrand
  };

  const getCheckedTypographyRadio = (role: TypographyRole): HTMLInputElement | null =>
    query<HTMLInputElement>(typographyGroups[role], 'input[type="radio"]:checked');

  const getSelectedTypographyFontId = (role: TypographyRole): ThemeFontId => {
    const rawValue = getCheckedTypographyRadio(role)?.value.trim() ?? '';
    return isAdminTypographyFontId(role, rawValue) ? rawValue : ADMIN_TYPOGRAPHY_DEFAULT[role];
  };

  const applyTypographySettings = (typography: TypographySettings | undefined): void => {
    (Object.keys(typographyGroups) as TypographyRole[]).forEach((role) => {
      const rawValue = typography?.[role] ?? '';
      const nextValue = isAdminTypographyFontId(role, rawValue) ? rawValue : ADMIN_TYPOGRAPHY_DEFAULT[role];
      const radio = query<HTMLInputElement>(typographyGroups[role], `input[type="radio"][value="${nextValue}"]`);
      if (radio) radio.checked = true;
    });
  };

  const getFooterPreviewText = (): string => {
    const startYear = parseInteger(inputSiteFooterStartYear.value);
    const showCurrentYear = Boolean(inputSiteFooterShowCurrentYear.checked);
    const yearRange = showCurrentYear && startYear && startYear < footerStartYearMax
      ? `${startYear}-${footerStartYearMax}`
      : String(startYear || footerStartYearMax);
    const copyright = inputSiteFooterCopyright.value.trim() || 'Whono · Theme Demo · by cxro';
    return `页脚预览：© ${yearRange} ${copyright}`;
  };

  const refreshFooterPreview = (): void => {
    footerPreviewValueEl.textContent = getFooterPreviewText().replace(/^页脚预览：/, '').trim();
  };

  const syncFooterYearControls = (): void => {
    const footerYearRangeEl = inputSiteFooterShowCurrentYear.closest<HTMLElement>('.admin-year-range');
    if (!footerYearRangeEl) return;
    footerYearRangeEl.dataset.currentYearEnabled = String(Boolean(inputSiteFooterShowCurrentYear.checked));
  };

  const canonicalize = (settings: unknown): EditableSettings =>
    canonicalizeAdminThemeSettings(settings, {
      footerStartYearMax,
      defaultCustomSocialIconKey,
      normalizeCustomSocialLabel
    });

  const collectSettings = (): EditableSettings => {
    const navChildren = new Map<SidebarNavId, EditableNavItem['children']>();
    getNavChildDrafts().forEach(({ parentId, child }) => {
      const children = navChildren.get(parentId) ?? [];
      children.push({ ...child });
      navChildren.set(parentId, children);
    });
    const nav = getNavRows().map((row, index): EditableNavItem => {
      const idRaw = row.getAttribute('data-nav-id')?.trim() ?? '';
      const id = isAdminNavId(idRaw) ? idRaw : ADMIN_NAV_IDS[index] ?? 'essay';
      const labelInput = query<HTMLInputElement>(row, '[data-nav-field="label"]');
      const ornamentInput = query<HTMLInputElement>(row, '[data-nav-field="ornament"]');
      const orderInput = query<HTMLInputElement>(row, '[data-nav-field="order"]');
      const visibleInput = query<HTMLInputElement>(row, '[data-nav-field="visible"]');
      const fallbackOrder = index + 1;
      return {
        id,
        label: labelInput?.value.trim() || '',
        ornament: ornamentInput ? normalizeOptionalSingleLine(ornamentInput.value) : ADMIN_NAV_ORNAMENT_DEFAULT,
        order: parseOrder(orderInput?.value || '', fallbackOrder),
        visible: Boolean(visibleInput?.checked),
        children: (navChildren.get(id) ?? []).map((child) => ({ ...child }))
      };
    });

    const custom = getCustomRows().map((row, index): EditableCustomSocialItem => {
      const idInput = query<HTMLInputElement>(row, '[data-social-custom-field="id"]');
      const labelInput = getCustomRowLabelInput(row);
      const hrefInput = query<HTMLInputElement>(row, '[data-social-custom-field="href"]');
      const iconInput = query<HTMLSelectElement>(row, '[data-social-custom-field="iconKey"]');
      const orderInput = query<HTMLInputElement>(row, '[data-social-custom-field="order"]');
      const visibleInput = query<HTMLInputElement>(row, '[data-social-custom-field="visible"]');
      const iconKey = normalizeAdminSocialIconKey(iconInput?.value) ?? defaultCustomSocialIconKey;
      return {
        id: idInput?.value.trim() || '',
        label: normalizeCustomSocialLabel(labelInput?.value, iconKey),
        href: hrefInput?.value.trim() || '',
        iconKey,
        order: parseOrder(orderInput?.value || '', index + 1),
        visible: Boolean(visibleInput?.checked)
      };
    });

    const showHero = Boolean(inputHomeShowHero.checked);

    return {
      site: {
        title: inputSiteTitle.value.trim(),
        description: normalizeMultiline(inputSiteDescription.value).trim(),
        defaultLocale: inputSiteDefaultLocale.value.trim(),
        footer: {
          startYear: parseInteger(inputSiteFooterStartYear.value) ?? footerStartYearMax,
          showCurrentYear: Boolean(inputSiteFooterShowCurrentYear.checked),
          copyright: inputSiteFooterCopyright.value.trim()
        },
        adminOverview: {
          publicVisible: Boolean(inputSiteAdminOverviewPublicVisible.checked),
          hiddenMessage: normalizeSingleLine(
            inputSiteAdminOverviewHiddenMessage.value,
            ADMIN_OVERVIEW_HIDDEN_MESSAGE_DEFAULT
          )
        },
        favicon: {
          ico: normalizeSiteFaviconInput('ico', inputSiteFaviconIco.value),
          svg: normalizeSiteFaviconInput('svg', inputSiteFaviconSvg.value),
          png: normalizeSiteFaviconInput('png', inputSiteFaviconPng.value),
          appleTouchIcon: normalizeSiteFaviconInput('appleTouchIcon', inputSiteFaviconAppleTouchIcon.value)
        },
        socialLinks: {
          github: inputSiteSocialGithub.value.trim() || null,
          qq: inputSiteSocialQq.value.trim() || null,
          email: normalizeEmail(inputSiteSocialEmail.value.trim()) || null,
          presetOrder: getPresetSocialOrder(),
          custom
        }
      },
      shell: {
        brandTitle: inputShellBrandTitle.value.trim(),
        quote: normalizeMultiline(inputShellQuote.value).trim(),
        nav
      },
      home: {
        introLead: normalizeMultiline(inputHomeIntroLead.value).trim(),
        introMore: normalizeMultiline(inputHomeIntroMore.value).trim(),
        introMoreLinks: collectHomeIntroLinks(),
        showIntroLead: Boolean(inputHomeShowIntroLead.checked),
        showIntroMore: Boolean(inputHomeShowIntroMore.checked),
        heroPresetId: showHero ? 'default' : 'none',
        heroImageSrc: showHero ? normalizeHeroImageInput(inputHeroImageSrc.value) : null,
        heroImageAlt: showHero ? normalizeHeroImageAlt(inputHeroImageAlt.value) : ADMIN_HERO_IMAGE_ALT_DEFAULT
      },
      page: {
        essay: {
          title: normalizeOptionalSingleLine(inputPageEssayTitle.value),
          subtitle: normalizeOptionalSingleLine(inputPageEssaySubtitle.value)
        },
        archive: {
          title: normalizeOptionalSingleLine(inputPageArchiveTitle.value),
          subtitle: normalizeOptionalSingleLine(inputPageArchiveSubtitle.value)
        },
        bits: {
          title: normalizeOptionalSingleLine(inputPageBitsTitle.value),
          subtitle: normalizeOptionalSingleLine(inputPageBitsSubtitle.value),
          defaultAuthor: {
            name: inputPageBitsAuthorName.value.trim(),
            avatar: inputPageBitsAuthorAvatar.value.trim()
          }
        },
        memo: {
          title: normalizeOptionalSingleLine(inputPageMemoTitle.value),
          subtitle: normalizeOptionalSingleLine(inputPageMemoSubtitle.value)
        },
        about: {
          title: normalizeOptionalSingleLine(inputPageAboutTitle.value),
          subtitle: normalizeOptionalSingleLine(inputPageAboutSubtitle.value),
          profile: {
            avatar: inputPageAboutProfileAvatar.value.trim(),
            greeting: inputPageAboutProfileGreeting.value.trim(),
            name: inputPageAboutProfileName.value.trim(),
            identity: inputPageAboutProfileIdentity.value.trim(),
            birthYear: parseInteger(inputPageAboutProfileBirthYear.value) ?? 2010,
            current: inputPageAboutProfileCurrent.value.trim(),
            mottoLead: inputPageAboutProfileMottoLead.value.trim(),
            mottoTail: inputPageAboutProfileMottoTail.value.trim(),
            interestsTitle: inputPageAboutProfileInterestsTitle.value.trim(),
            interests: inputPageAboutProfileInterests.value.trim(),
            musicTitle: inputPageAboutProfileMusicTitle.value.trim(),
            music: inputPageAboutProfileMusic.value.trim(),
            personality: inputPageAboutProfilePersonality.value.trim(),
            personalityType: inputPageAboutProfilePersonalityType.value.trim(),
            personalityUrl: inputPageAboutProfilePersonalityUrl.value.trim() || null,
            specialties: inputPageAboutProfileSpecialties.value.trim(),
            specialtyHighlight: inputPageAboutProfileSpecialtyHighlight.value.trim()
          },
          umami: {
            baseUrl: inputPageAboutUmamiBaseUrl.value.trim(),
            shareId: inputPageAboutUmamiShareId.value.trim()
          }
        },
        links: {
          title: normalizeOptionalSingleLine(inputPageLinksTitle.value),
          subtitle: normalizeOptionalSingleLine(inputPageLinksSubtitle.value)
        }
      },
      links: {
        linksSourceUrl: inputLinksSourceUrl.value.trim(),
        latencySourceUrl: inputLinksLatencySourceUrl.value.trim(),
        tombstoneSourceUrl: inputLinksTombstoneSourceUrl.value.trim(),
        submissionUrl: inputLinksSubmissionUrl.value.trim(),
        fcircleSourceUrl: inputLinksFcircleSourceUrl.value.trim(),
        fcircleEnabled: Boolean(inputLinksFcircleEnabled.checked),
        fcircleShowError: Boolean(inputLinksFcircleShowError.checked),
        ech0SourceUrl: inputLinksEch0SourceUrl.value.trim(),
        ech0Enabled: Boolean(inputLinksEch0Enabled.checked),
        ech0PageSize: Number.parseInt(inputLinksEch0PageSize.value, 10),
        ech0MaxPages: Number.parseInt(inputLinksEch0MaxPages.value, 10),
        ech0ShowError: Boolean(inputLinksEch0ShowError.checked),
        voteApiBase: inputLinksVoteApiBase.value.trim(),
        voteEnabled: Boolean(inputLinksVoteEnabled.checked)
      },
      comments: {
        enabled: Boolean(inputCommentsEnabled.checked),
        repo: inputCommentsRepo.value.trim(),
        repoId: inputCommentsRepoId.value.trim(),
        category: inputCommentsCategory.value.trim(),
        categoryId: inputCommentsCategoryId.value.trim(),
        mapping: inputCommentsMapping.value as EditableSettings['comments']['mapping'],
        inputPosition: inputCommentsInputPosition.value as EditableSettings['comments']['inputPosition'],
        lang: inputCommentsLang.value as EditableSettings['comments']['lang'],
        reactionsEnabled: Boolean(inputCommentsReactionsEnabled.checked),
        strict: Boolean(inputCommentsStrict.checked)
      },
      ui: {
        codeBlock: {
          showLineNumbers: Boolean(inputCodeLineNumbers.checked)
        },
        background: {
          starry: Boolean(inputBackgroundStarry.checked)
        },
        transitions: {
          swup: Boolean(inputTransitionsSwup.checked)
        },
        readingMode: {
          showEntry: Boolean(inputReadingEntry.checked)
        },
        sidebarActions: {
          showRssLink: Boolean(inputSidebarActionsShowRssLink.checked),
          showThemeToggle: Boolean(inputSidebarActionsShowThemeToggle.checked),
          showAdminEntry: Boolean(inputSidebarActionsShowAdminEntry.checked)
        },
        articleMeta: {
          showDate: Boolean(inputArticleMetaShowDate.checked),
          dateLabel: normalizeSingleLine(inputArticleMetaDateLabel.value),
          showTags: Boolean(inputArticleMetaShowTags.checked),
          showWordCount: Boolean(inputArticleMetaShowWordCount.checked),
          showReadingTime: Boolean(inputArticleMetaShowReadingTime.checked)
        },
        layout: {
          sidebarDivider: getSelectedSidebarDividerVariant()
        },
        typography: {
          readable: getSelectedTypographyFontId('readable'),
          copy: getSelectedTypographyFontId('copy'),
          mono: getSelectedTypographyFontId('mono'),
          brand: getSelectedTypographyFontId('brand')
        }
      }
    };
  };

  const applySettings = (settings: EditableSettings): void => {
    inputSiteTitle.value = settings.site.title || '';
    inputSiteDescription.value = settings.site.description || '';
    inputSiteDefaultLocale.value = settings.site.defaultLocale || '';
    inputSiteFooterStartYear.value = String(settings.site.footer?.startYear ?? '');
    inputSiteFooterShowCurrentYear.checked = Boolean(settings.site.footer?.showCurrentYear);
    inputSiteFooterCopyright.value = settings.site.footer?.copyright || '';
    inputSiteAdminOverviewPublicVisible.checked = settings.site.adminOverview?.publicVisible !== false;
    inputSiteAdminOverviewHiddenMessage.value =
      settings.site.adminOverview?.hiddenMessage || ADMIN_OVERVIEW_HIDDEN_MESSAGE_DEFAULT;
    syncAdminOverviewControls();
    inputSiteFaviconIco.value = settings.site.favicon?.ico || '';
    inputSiteFaviconSvg.value = settings.site.favicon?.svg || '';
    inputSiteFaviconPng.value = settings.site.favicon?.png || '';
    inputSiteFaviconAppleTouchIcon.value = settings.site.favicon?.appleTouchIcon || '';
    inputSiteSocialGithubOrder.value = String(
      settings.site.socialLinks?.presetOrder?.github ?? ADMIN_SOCIAL_PRESET_ORDER_DEFAULT.github
    );
    inputSiteSocialGithub.value = settings.site.socialLinks?.github || '';
    inputSiteSocialQqOrder.value = String(
      settings.site.socialLinks?.presetOrder?.qq ?? ADMIN_SOCIAL_PRESET_ORDER_DEFAULT.qq
    );
    inputSiteSocialQq.value = settings.site.socialLinks?.qq || '';
    inputSiteSocialEmailOrder.value = String(
      settings.site.socialLinks?.presetOrder?.email ?? ADMIN_SOCIAL_PRESET_ORDER_DEFAULT.email
    );
    inputSiteSocialEmail.value = settings.site.socialLinks?.email || '';
    replaceCustomRows(settings.site.socialLinks?.custom || []);
    normalizeSocialOrders();
    inputShellBrandTitle.value = settings.shell.brandTitle || '';
    inputShellQuote.value = settings.shell.quote || '';
    inputHomeShowIntroLead.checked = settings.home.showIntroLead !== false;
    inputHomeShowIntroMore.checked = settings.home.showIntroMore !== false;
    inputHomeIntroLead.value = settings.home.introLead || '';
    inputHomeIntroMore.value = settings.home.introMore || '';
    const introMoreLinks = normalizeHomeIntroLinks(settings.home.introMoreLinks);
    const primaryIntroLink = introMoreLinks[0] || defaultPrimaryHomeIntroLink;
    inputHomeIntroMoreLinkPrimary.value = primaryIntroLink;
    inputHomeIntroMoreLinkSecondaryEnabled.checked = introMoreLinks.length > 1;
    inputHomeIntroMoreLinkSecondary.value =
      introMoreLinks[1] || getFallbackSecondaryIntroLink(primaryIntroLink);
    syncHomeIntroLinkControls();
    refreshHomeIntroPreview();
    inputPageEssayTitle.value = settings.page.essay?.title || '';
    inputPageEssaySubtitle.value = settings.page.essay?.subtitle || '';
    inputPageArchiveTitle.value = settings.page.archive?.title || '';
    inputPageArchiveSubtitle.value = settings.page.archive?.subtitle || '';
    inputPageBitsTitle.value = settings.page.bits?.title || '';
    inputPageBitsSubtitle.value = settings.page.bits?.subtitle || '';
    inputPageMemoTitle.value = settings.page.memo?.title || '';
    inputPageMemoSubtitle.value = settings.page.memo?.subtitle || '';
    inputPageAboutTitle.value = settings.page.about?.title || '';
    inputPageAboutSubtitle.value = settings.page.about?.subtitle || '';
    inputPageAboutProfileAvatar.value = settings.page.about?.profile?.avatar || '';
    inputPageAboutProfileGreeting.value = settings.page.about?.profile?.greeting || '';
    inputPageAboutProfileName.value = settings.page.about?.profile?.name || '';
    inputPageAboutProfileIdentity.value = settings.page.about?.profile?.identity || '';
    inputPageAboutProfileBirthYear.value = String(settings.page.about?.profile?.birthYear ?? '');
    inputPageAboutProfileCurrent.value = settings.page.about?.profile?.current || '';
    inputPageAboutProfileMottoLead.value = settings.page.about?.profile?.mottoLead || '';
    inputPageAboutProfileMottoTail.value = settings.page.about?.profile?.mottoTail || '';
    inputPageAboutProfileInterestsTitle.value = settings.page.about?.profile?.interestsTitle || '';
    inputPageAboutProfileInterests.value = settings.page.about?.profile?.interests || '';
    inputPageAboutProfileMusicTitle.value = settings.page.about?.profile?.musicTitle || '';
    inputPageAboutProfileMusic.value = settings.page.about?.profile?.music || '';
    inputPageAboutProfilePersonality.value = settings.page.about?.profile?.personality || '';
    inputPageAboutProfilePersonalityType.value = settings.page.about?.profile?.personalityType || '';
    inputPageAboutProfilePersonalityUrl.value = settings.page.about?.profile?.personalityUrl || '';
    inputPageAboutProfileSpecialties.value = settings.page.about?.profile?.specialties || '';
    inputPageAboutProfileSpecialtyHighlight.value = settings.page.about?.profile?.specialtyHighlight || '';
    inputPageAboutUmamiBaseUrl.value = settings.page.about?.umami?.baseUrl || '';
    inputPageAboutUmamiShareId.value = settings.page.about?.umami?.shareId || '';
    inputPageLinksTitle.value = settings.page.links?.title || '';
    inputPageLinksSubtitle.value = settings.page.links?.subtitle || '';
    inputLinksSourceUrl.value = settings.links?.linksSourceUrl || '';
    inputLinksLatencySourceUrl.value = settings.links?.latencySourceUrl || '';
    inputLinksTombstoneSourceUrl.value = settings.links?.tombstoneSourceUrl || '';
    inputLinksSubmissionUrl.value = settings.links?.submissionUrl || '';
    inputLinksFcircleSourceUrl.value = settings.links?.fcircleSourceUrl || '';
    inputLinksFcircleEnabled.checked = settings.links?.fcircleEnabled !== false;
    inputLinksFcircleShowError.checked = settings.links?.fcircleShowError !== false;
    inputLinksEch0SourceUrl.value = settings.links?.ech0SourceUrl || '';
    inputLinksEch0Enabled.checked = settings.links?.ech0Enabled !== false;
    inputLinksEch0PageSize.value = String(settings.links?.ech0PageSize ?? 10);
    inputLinksEch0MaxPages.value = String(settings.links?.ech0MaxPages ?? 3);
    inputLinksEch0ShowError.checked = settings.links?.ech0ShowError !== false;
    inputLinksVoteApiBase.value = settings.links?.voteApiBase || '';
    inputLinksVoteEnabled.checked = settings.links?.voteEnabled !== false;
    inputCommentsEnabled.checked = settings.comments?.enabled !== false;
    inputCommentsRepo.value = settings.comments?.repo || '';
    inputCommentsRepoId.value = settings.comments?.repoId || '';
    inputCommentsCategory.value = settings.comments?.category || '';
    inputCommentsCategoryId.value = settings.comments?.categoryId || '';
    inputCommentsMapping.value = settings.comments?.mapping || 'pathname';
    inputCommentsInputPosition.value = settings.comments?.inputPosition || 'top';
    inputCommentsLang.value = settings.comments?.lang || 'zh-CN';
    inputCommentsReactionsEnabled.checked = settings.comments?.reactionsEnabled !== false;
    inputCommentsStrict.checked = settings.comments?.strict !== false;
    inputPageBitsAuthorName.value = settings.page.bits?.defaultAuthor?.name || '';
    inputPageBitsAuthorAvatar.value = settings.page.bits?.defaultAuthor?.avatar || '';
    inputHomeShowHero.checked = (settings.home.heroPresetId || 'default') !== 'none';
    inputHeroImageSrc.value = settings.home.heroImageSrc || '';
    inputHeroImageAlt.value = settings.home.heroImageAlt || ADMIN_HERO_IMAGE_ALT_DEFAULT;
    syncHeroControls();
    syncFooterYearControls();
    inputCodeLineNumbers.checked = Boolean(settings.ui?.codeBlock?.showLineNumbers);
    inputBackgroundStarry.checked = settings.ui?.background?.starry !== false;
    inputTransitionsSwup.checked = settings.ui?.transitions?.swup !== false;
    inputReadingEntry.checked = Boolean(settings.ui?.readingMode?.showEntry);
    inputSidebarActionsShowRssLink.checked = settings.ui?.sidebarActions?.showRssLink !== false;
    inputSidebarActionsShowThemeToggle.checked = settings.ui?.sidebarActions?.showThemeToggle !== false;
    inputSidebarActionsShowAdminEntry.checked = Boolean(settings.ui?.sidebarActions?.showAdminEntry);
    syncSidebarActionControls();
    inputArticleMetaShowDate.checked = settings.ui?.articleMeta?.showDate !== false;
    inputArticleMetaDateLabel.value = settings.ui?.articleMeta?.dateLabel ?? ADMIN_ARTICLE_META_DATE_LABEL_DEFAULT;
    inputArticleMetaShowTags.checked = settings.ui?.articleMeta?.showTags !== false;
    inputArticleMetaShowWordCount.checked = settings.ui?.articleMeta?.showWordCount !== false;
    inputArticleMetaShowReadingTime.checked = settings.ui?.articleMeta?.showReadingTime !== false;
    applySidebarDividerVariant(settings.ui?.layout?.sidebarDivider || ADMIN_SIDEBAR_DIVIDER_DEFAULT);
    applyTypographySettings(settings.ui?.typography);
    refreshFooterPreview();
    refreshArticleMetaPreview();

    const navMap = new Map<SidebarNavId, EditableNavItem>(settings.shell.nav.map((item) => [item.id, item]));
    renderNavChildDrafts(
      settings.shell.nav.flatMap((item) =>
        item.children.map((child) => ({ parentId: item.id, child: { ...child } }))
      )
    );
    getNavRows().forEach((row, index) => {
      const rawId = row.getAttribute('data-nav-id')?.trim() ?? '';
      const id = isAdminNavId(rawId) ? rawId : ADMIN_NAV_IDS[index] ?? 'essay';
      const current = navMap.get(id);
      const labelInput = query<HTMLInputElement>(row, '[data-nav-field="label"]');
      const ornamentInput = query<HTMLInputElement>(row, '[data-nav-field="ornament"]');
      const orderInput = query<HTMLInputElement>(row, '[data-nav-field="order"]');
      const visibleInput = query<HTMLInputElement>(row, '[data-nav-field="visible"]');
      if (labelInput) labelInput.value = current?.label?.trim() || '';
      if (ornamentInput) ornamentInput.value = current?.ornament ?? '';
      if (orderInput) orderInput.value = String(current?.order ?? (index + 1));
      if (visibleInput) visibleInput.checked = Boolean(current?.visible);
    });
  };

  return {
    canonicalize,
    collectSettings,
    applySettings,
    collectHomeIntroLinks,
    refreshArticleMetaPreview,
    refreshHomeIntroPreview,
    syncAdminOverviewControls,
    syncSidebarActionControls,
    syncHomeIntroLinkControls,
    syncHeroControls,
    refreshFooterPreview,
    syncFooterYearControls
  };
};
