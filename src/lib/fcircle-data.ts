const MAX_TEXT_LENGTH = 500;
const MAX_URL_LENGTH = 2048;

export interface FriendCircleEntry {
  title: string;
  createdAt: string | null;
  link: string;
  authorName: string;
  authorLink: string | null;
  authorAvatar: string | null;
  content: string | null;
  images: string[];
}

export type FriendCircleLoadState = 'loading' | 'ready' | 'error';

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= MAX_TEXT_LENGTH ? text : null;
};

export const normalizeHttpUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.length > MAX_URL_LENGTH) return null;

  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
};

const normalizeEntry = (value: unknown): FriendCircleEntry | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const author = typeof row.author === 'object' && row.author !== null && !Array.isArray(row.author)
    ? row.author as Record<string, unknown>
    : {};
  const title = normalizeText(row.title);
  const link = normalizeHttpUrl(row.link);
  const authorName = normalizeText(author.name);

  if (!title || !link || !authorName) return null;

  return {
    title,
    createdAt: normalizeText(row.created),
    link,
    authorName,
    authorLink: normalizeHttpUrl(author.link),
    authorAvatar: normalizeHttpUrl(author.avatar),
    content: normalizeText(row.content),
    images: Array.isArray(row.image) ? row.image.map(normalizeHttpUrl).filter((url): url is string => url !== null) : []
  };
};

export const normalizeFriendCirclePayload = (value: unknown): FriendCircleEntry[] => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [];
  const articleData = (value as Record<string, unknown>).article_data;
  if (!Array.isArray(articleData)) return [];
  return articleData.map(normalizeEntry).filter((entry): entry is FriendCircleEntry => entry !== null);
};

export const getFriendCircleViewState = (state: FriendCircleLoadState, entryCount: number) => {
  if (state === 'loading') {
    return { status: '正在加载朋友圈…', empty: null, showRetry: false };
  }
  if (state === 'error') {
    return {
      status: '朋友圈加载失败，请检查网络后重试。',
      empty: '暂时无法获取朋友圈动态。',
      showRetry: true
    };
  }
  return {
    status: '',
    empty: entryCount === 0 ? '暂无可显示的朋友圈动态。' : null,
    showRetry: false
  };
};
