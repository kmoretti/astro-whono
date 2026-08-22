export interface AboutUmamiSettings {
  baseUrl: string;
  shareId: string;
}

export const DEFAULT_ABOUT_UMAMI_SETTINGS: AboutUmamiSettings = {
  baseUrl: 'https://um.081531.xyz',
  shareId: 'x5gImy5VXsdslFK5'
};

/* 与 umami 源码 SHARE_ID_REGEX 一致：分享链接 /share/ 后的随机串。 */
export const UMAMI_SHARE_ID_RE = /^[a-zA-Z0-9]{8,50}$/;
