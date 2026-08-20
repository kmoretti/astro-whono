export const FCIRCLE_SOURCE_URL = 'https://fc.081531.xyz/all.json';

const MAX_TEXT_LENGTH = 500;
const MAX_URL_LENGTH = 2048;

export interface FcircleStats {
  friends: number;
  active: number;
  articles: number;
  updatedAt: string | null;
}

export interface FcircleArticle {
  author: string;
  title: string;
  link: string;
  avatar: string | null;
  publishedAt: string | null;
  siteName: string;
  siteLink: string | null;
}

export interface NormalizedFcircleData {
  stats: FcircleStats;
  articles: FcircleArticle[];
}

export class FcircleDataParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FcircleDataParseError';
  }
}

const normalizeText = (value: unknown, maxLength = MAX_TEXT_LENGTH): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
};

export const normalizeHttpsUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.length > MAX_URL_LENGTH) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname) return null;
    return url.href;
  } catch {
    return null;
  }
};

const normalizeNumber = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
};

const firstText = (...values: unknown[]): string | null => {
  for (const value of values) {
    const text = normalizeText(value);
    if (text) return text;
  }
  return null;
};

const normalizeArticle = (value: unknown): FcircleArticle | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const author = firstText(raw.author, raw.author_name, raw.name);
  const title = firstText(raw.title, raw.article_title);
  const link = normalizeHttpsUrl(raw.link ?? raw.url ?? raw.article_url);
  if (!author || !title || !link) return null;

  return {
    author,
    title,
    link,
    avatar: normalizeHttpsUrl(raw.avatar ?? raw.author_avatar ?? raw.image),
    publishedAt: firstText(raw.pub_time, raw.published_at, raw.date, raw.time),
    siteName: firstText(raw.site_name, raw.blog_name, raw.site, raw.author) ?? author,
    siteLink: normalizeHttpsUrl(raw.site_link ?? raw.site_url ?? raw.blog_url) ?? new URL(link).origin + '/'
  };
};

export const normalizeFcircleData = (value: unknown): NormalizedFcircleData => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new FcircleDataParseError('朋友圈数据格式无效');
  }
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.article_data)) {
    throw new FcircleDataParseError('朋友圈文章数据格式无效');
  }

  const statistical = typeof raw.statistical_data === 'object' && raw.statistical_data !== null
    ? raw.statistical_data as Record<string, unknown>
    : {};

  return {
    stats: {
      friends: normalizeNumber(statistical.friends_num),
      active: normalizeNumber(statistical.active_num),
      articles: normalizeNumber(statistical.article_num),
      updatedAt: firstText(statistical.last_updated_time)
    },
    articles: raw.article_data.map(normalizeArticle).filter((article): article is FcircleArticle => article !== null)
  };
};
