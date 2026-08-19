const rawSiteUrl = (process.env.SITE_URL ?? '').trim();
const siteUrl = rawSiteUrl ? rawSiteUrl.replace(/\/+$/, '') : '';
const hasSiteUrl = siteUrl.length > 0;
const fallbackSiteUrl = 'https://b.081531.xyz';
const siteUrlWarningFlag = 'ASTRO_WHONO_SITE_URL_WARNING_SHOWN';

if (
  !hasSiteUrl &&
  process.env.NODE_ENV === 'production' &&
  process.env[siteUrlWarningFlag] !== '1'
) {
  process.env[siteUrlWarningFlag] = '1';
  console.warn(
    '[astro-whono] SITE_URL is not set. RSS will use example.invalid; canonical/og will be omitted; sitemap will not be generated and robots will not include Sitemap.'
  );
}

export const site = {
  url: hasSiteUrl ? siteUrl : fallbackSiteUrl,
  title: '喵洛阁',
  brandTitle: '克喵的小站',
  author: '克喵Moretti',
  authorAvatar: 'author/avatar.png',
  description: '克喵的小站，记录着我的一些文字。'
};

export const PAGE_SIZE_ARCHIVE = 12;
export const PAGE_SIZE_ESSAY = 12;
export const PAGE_SIZE_BITS = 20;

export { hasSiteUrl, siteUrl };
