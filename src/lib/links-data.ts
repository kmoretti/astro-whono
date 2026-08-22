import YAML from 'yaml';
import { DEFAULT_LINKS_SETTINGS } from './links-settings';

export const LINKS_SOURCE_URL = DEFAULT_LINKS_SETTINGS.linksSourceUrl;
export const LATENCY_SOURCE_URL = DEFAULT_LINKS_SETTINGS.latencySourceUrl;
export const TOMBSTONE_SOURCE_URL = DEFAULT_LINKS_SETTINGS.tombstoneSourceUrl;
export const LINKS_CACHE_KEY = 'astro-whono:links-cache';
export const LINKS_CACHE_VERSION = 1;
export const LINKS_CACHE_TTL_MS = 60 * 60 * 1000;

const MAX_URL_LENGTH = 2048;
const MAX_GROUP_NAME_LENGTH = 200;
const MAX_GROUP_DESCRIPTION_LENGTH = 500;
const MAX_LINK_NAME_LENGTH = 200;
const MAX_LINK_DESCRIPTION_LENGTH = 1000;
const MAX_TAGS = 32;
const MAX_TAG_LENGTH = 64;

export interface RawLinkItem {
  name?: unknown;
  link?: unknown;
  avatar?: unknown;
  descr?: unknown;
  feeds?: unknown;
  friendslink?: unknown;
  siteshot?: unknown;
  tags?: unknown;
  [key: string]: unknown;
}

export interface RawLinkGroup {
  class_name?: unknown;
  class_desc?: unknown;
  link_list?: unknown;
  [key: string]: unknown;
}

export interface NormalizedLinkItem {
  name: string;
  link: string;
  hostname: string;
  avatar: string | null;
  descr: string | null;
  feeds: string | null;
  friendslink: string | null;
  siteshot: string | null;
  tags: string[];
}

export interface NormalizedLinkGroup {
  className: string;
  classDesc: string | null;
  links: NormalizedLinkItem[];
}

export interface LinksCacheRecord {
  version: typeof LINKS_CACHE_VERSION;
  timestamp: number;
  groups: NormalizedLinkGroup[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface RawLatencyItem {
  name?: unknown;
  link?: unknown;
  reachable?: unknown;
  latency?: unknown;
}

export interface LatencyItem {
  name: string;
  link: string;
  reachable: boolean;
  latencyMs: number | null;
  display: string;
}

export interface TombstoneEntry {
  name: string;
  avatar: string | null;
}

export type LinksCacheState = 'missing' | 'fresh' | 'stale' | 'invalid';

export interface LinksCacheReadResult {
  state: LinksCacheState;
  record: LinksCacheRecord | null;
}

export class LinksDataParseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'LinksDataParseError';
  }
}

export const normalizeLatencyData = (value: unknown): LatencyItem[] => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [];
  const rawItems = (value as { link_data?: unknown }).link_data;
  if (!Array.isArray(rawItems)) return [];

  return rawItems.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return [];
    const raw = entry as RawLatencyItem;
    const name = normalizeText(raw.name, MAX_LINK_NAME_LENGTH);
    const link = normalizeHttpsUrl(raw.link);
    if (!name || !link) return [];
    const reachable = raw.reachable === true;
    const latency = typeof raw.latency === 'number' && Number.isFinite(raw.latency) && raw.latency >= 0
      ? raw.latency
      : null;
    const latencyMs = reachable && latency !== null ? Math.max(0, Math.round(latency * 1000)) : null;
    return [{ name, link, reachable, latencyMs, display: reachable && latencyMs !== null ? `${latencyMs} ms` : '不可达' }];
  });
};

export const createLatencyIndex = (items: readonly LatencyItem[]): ReadonlyMap<string, LatencyItem> => {
  const index = new Map<string, LatencyItem>();
  items.forEach((item) => {
    const key = `${item.name}\u0000${item.link}`;
    if (!index.has(key)) index.set(key, item);
  });
  return index;
};

export const getLatencyIndexKey = (name: string, link: string): string | null => {
  const normalizedName = normalizeText(name, MAX_LINK_NAME_LENGTH);
  const normalizedLink = normalizeHttpsUrl(link);
  return normalizedName && normalizedLink ? `${normalizedName}\u0000${normalizedLink}` : null;
};

export const parseTombstoneYaml = (text: string): TombstoneEntry[] => {
  if (typeof text !== 'string') return [];
  let document: unknown;
  try {
    document = YAML.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(document)) return [];

  return document.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return [];
    const record = entry as { entry?: unknown };
    if (typeof record.entry !== 'object' || record.entry === null || Array.isArray(record.entry)) return [];
    const source = record.entry as { name?: unknown; avatar?: unknown };
    const name = normalizeText(source.name, MAX_LINK_NAME_LENGTH);
    if (!name) return [];
    return [{ name, avatar: normalizeHttpsUrl(source.avatar) }];
  });
};

const normalizeText = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
};

export const normalizeHttpsUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (text.length === 0 || text.length > MAX_URL_LENGTH) return null;

  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
};

const normalizeTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const tags: string[] = [];
  const seen = new Set<string>();
  for (const entry of value.slice(0, MAX_TAGS)) {
    if (typeof entry !== 'string') continue;
    const tag = entry.trim();
    if (tag.length === 0 || tag.length > MAX_TAG_LENGTH) continue;
    const key = tag.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
};

const normalizeLinkItem = (value: unknown): NormalizedLinkItem | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const raw = value as RawLinkItem;
  const name = normalizeText(raw.name, MAX_LINK_NAME_LENGTH);
  const link = normalizeHttpsUrl(raw.link);
  if (!name || !link) return null;

  return {
    name,
    link,
    hostname: new URL(link).hostname,
    avatar: normalizeHttpsUrl(raw.avatar),
    descr: normalizeText(raw.descr, MAX_LINK_DESCRIPTION_LENGTH),
    feeds: normalizeHttpsUrl(raw.feeds),
    friendslink: normalizeHttpsUrl(raw.friendslink),
    siteshot: normalizeHttpsUrl(raw.siteshot),
    tags: normalizeTags(raw.tags)
  };
};

const normalizeGroup = (value: unknown): NormalizedLinkGroup | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const raw = value as RawLinkGroup;
  const className = normalizeText(raw.class_name, MAX_GROUP_NAME_LENGTH);
  if (!className) return null;

  const linkList = Array.isArray(raw.link_list) ? raw.link_list : [];
  return {
    className,
    classDesc: normalizeText(raw.class_desc, MAX_GROUP_DESCRIPTION_LENGTH),
    links: linkList.map(normalizeLinkItem).filter((item): item is NormalizedLinkItem => item !== null)
  };
};

export const normalizeLinkGroups = (value: unknown): NormalizedLinkGroup[] => {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeGroup).filter((group): group is NormalizedLinkGroup => group !== null);
};

export const parseLinksYaml = (text: string): NormalizedLinkGroup[] => {
  if (typeof text !== 'string') {
    throw new LinksDataParseError('Links YAML must be text');
  }

  let document: unknown;
  try {
    document = YAML.parse(text);
  } catch (error) {
    throw new LinksDataParseError('Unable to parse links YAML', { cause: error });
  }
  if (!Array.isArray(document)) {
    throw new LinksDataParseError('Links YAML must contain a top-level array');
  }
  return normalizeLinkGroups(document);
};

export const collectLinkTags = (groups: NormalizedLinkGroup[]): string[] => {
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const link of group.links) {
      for (const tag of link.tags) {
        const key = tag.toLocaleLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          tags.push(tag);
        }
      }
    }
  }
  return tags;
};

export const filterLinkGroups = (
  groups: NormalizedLinkGroup[],
  tag: string | null | undefined
): NormalizedLinkGroup[] => {
  const selected = typeof tag === 'string' ? tag.trim().toLocaleLowerCase() : '';
  if (!selected || selected === '全部' || selected === 'all') return groups;

  return groups
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => link.tags.some((entry) => entry.toLocaleLowerCase() === selected))
    }))
    .filter((group) => group.links.length > 0);
};

const isNormalizedLink = (value: unknown): value is NormalizedLinkItem => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const link = value as Partial<NormalizedLinkItem>;
  return (
    typeof link.name === 'string' && normalizeText(link.name, MAX_LINK_NAME_LENGTH) === link.name &&
    typeof link.link === 'string' && normalizeHttpsUrl(link.link) === link.link &&
    typeof link.hostname === 'string' && link.hostname === new URL(link.link).hostname &&
    (link.avatar === null || (typeof link.avatar === 'string' && normalizeHttpsUrl(link.avatar) === link.avatar)) &&
    (link.descr === null || (typeof link.descr === 'string' && normalizeText(link.descr, MAX_LINK_DESCRIPTION_LENGTH) === link.descr)) &&
    (link.feeds === null || (typeof link.feeds === 'string' && normalizeHttpsUrl(link.feeds) === link.feeds)) &&
    (link.friendslink === null || (typeof link.friendslink === 'string' && normalizeHttpsUrl(link.friendslink) === link.friendslink)) &&
    (link.siteshot === null || (typeof link.siteshot === 'string' && normalizeHttpsUrl(link.siteshot) === link.siteshot)) &&
    Array.isArray(link.tags) && link.tags.every((tag) => typeof tag === 'string' && normalizeText(tag, MAX_TAG_LENGTH) === tag)
  );
};

const isNormalizedGroups = (value: unknown): value is NormalizedLinkGroup[] => {
  if (!Array.isArray(value)) return false;
  return value.every((group) => {
    if (typeof group !== 'object' || group === null || Array.isArray(group)) return false;
    const candidate = group as Partial<NormalizedLinkGroup>;
    return (
      typeof candidate.className === 'string' && normalizeText(candidate.className, MAX_GROUP_NAME_LENGTH) === candidate.className &&
      (candidate.classDesc === null || (typeof candidate.classDesc === 'string' && normalizeText(candidate.classDesc, MAX_GROUP_DESCRIPTION_LENGTH) === candidate.classDesc)) &&
      Array.isArray(candidate.links) && candidate.links.every(isNormalizedLink)
    );
  });
};

export const getLinksCacheState = (value: unknown, now = Date.now()): LinksCacheState => {
  if (value === null || value === undefined) return 'missing';
  if (typeof value !== 'object' || value === null) return 'invalid';
  const record = value as Partial<LinksCacheRecord>;
  if (record.version !== LINKS_CACHE_VERSION || !Number.isFinite(record.timestamp) || (record.timestamp as number) < 0 || !isNormalizedGroups(record.groups)) {
    return 'invalid';
  }
  return now - (record.timestamp as number) <= LINKS_CACHE_TTL_MS ? 'fresh' : 'stale';
};

export const readLinksCache = (storage: StorageLike, now = Date.now()): LinksCacheReadResult => {
  let raw: string | null;
  try {
    raw = storage.getItem(LINKS_CACHE_KEY);
  } catch {
    return { state: 'invalid', record: null };
  }
  if (raw === null) return { state: 'missing', record: null };

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { state: 'invalid', record: null };
  }
  const state = getLinksCacheState(value, now);
  return state === 'fresh' || state === 'stale'
    ? { state, record: value as LinksCacheRecord }
    : { state, record: null };
};

export const writeLinksCache = (storage: StorageLike, record: LinksCacheRecord): boolean => {
  if (getLinksCacheState(record, record.timestamp) === 'invalid') return false;
  try {
    storage.setItem(LINKS_CACHE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
};
