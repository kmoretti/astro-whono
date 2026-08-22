export type GiscusMapping = 'pathname' | 'url' | 'title' | 'og:title' | 'specific' | 'number';
export type GiscusInputPosition = 'top' | 'bottom';
export type GiscusLang = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko' | 'es' | 'pt' | 'de' | 'fr';

export interface CommentsSettings {
  enabled: boolean;
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: GiscusMapping;
  inputPosition: GiscusInputPosition;
  lang: GiscusLang;
  reactionsEnabled: boolean;
  strict: boolean;
}

export const GISCUS_MAPPING_OPTIONS: readonly GiscusMapping[] = [
  'pathname',
  'url',
  'title',
  'og:title',
  'specific',
  'number'
];

export const GISCUS_INPUT_POSITION_OPTIONS: readonly GiscusInputPosition[] = ['top', 'bottom'];

export const GISCUS_LANG_OPTIONS: readonly GiscusLang[] = [
  'zh-CN',
  'zh-TW',
  'en',
  'ja',
  'ko',
  'es',
  'pt',
  'de',
  'fr'
];

export const GISCUS_MAPPING_SET: ReadonlySet<GiscusMapping> = new Set(GISCUS_MAPPING_OPTIONS);
export const GISCUS_INPUT_POSITION_SET: ReadonlySet<GiscusInputPosition> = new Set(GISCUS_INPUT_POSITION_OPTIONS);
export const GISCUS_LANG_SET: ReadonlySet<GiscusLang> = new Set(GISCUS_LANG_OPTIONS);

/* GitHub 仓库标识 owner/repo；repo-id / category-id 形如 R_kgDO… / DIC_…（giscus.app 生成）。 */
export const GISCUS_REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
export const GISCUS_ID_RE = /^[A-Za-z0-9_-]{6,128}$/;

export const DEFAULT_COMMENTS_SETTINGS: CommentsSettings = {
  enabled: true,
  repo: 'kmoretti/astro-whono',
  repoId: 'R_kgDOT8cj_Q',
  category: 'comments',
  categoryId: 'DIC_kwDOT8cj_c4DD8ZS',
  mapping: 'pathname',
  inputPosition: 'top',
  lang: 'zh-CN',
  reactionsEnabled: true,
  strict: true
};
