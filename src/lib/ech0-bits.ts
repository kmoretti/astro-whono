export const ECH0_QUERY_PATH = '/api/echo/query';
export const ECH0_DEFAULT_QUERY: Ech0QueryRequest = {
  page: 1,
  pageSize: 10,
  search: '',
  tagIds: [],
  sortBy: '',
  sortOrder: 'desc'
};

export type Ech0QueryRequest = {
  page: number;
  pageSize: number;
  search: string;
  tagIds: string[];
  sortBy: string;
  sortOrder: string;
  dateFrom?: number;
  dateTo?: number;
};

export type Ech0ApiResult<T> = {
  code: number;
  msg: string;
  data: T;
};

export type Ech0QueryPage = {
  items: Ech0RemoteEcho[];
  total: number;
};

export type Ech0QueryResponse = Ech0ApiResult<Ech0QueryPage>;

export type Ech0RemoteTag = {
  id?: string;
  name?: string;
  usage_count?: number;
  created_at?: Ech0TimeInput;
  [key: string]: unknown;
};

export type Ech0RemoteFile = {
  id?: string;
  echo_id?: string;
  file_id?: string;
  sort_order?: number;
  url?: string;
  name?: string;
  content_type?: string;
  category?: string;
  size?: number;
  width?: number;
  height?: number;
  file?: {
    id?: string;
    key?: string;
    url?: string;
    name?: string;
    content_type?: string;
    category?: string;
    size?: number;
    width?: number;
    height?: number;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
};

export type Ech0ExtensionType =
  | 'MUSIC'
  | 'VIDEO'
  | 'GITHUBPROJ'
  | 'WEBSITE'
  | 'LOCATION'
  | 'TWEET';

export type Ech0RemoteExtension = {
  type?: string;
  payload?: unknown;
  [key: string]: unknown;
} | null;

export type Ech0RemoteEcho = {
  id?: string;
  content?: string;
  username?: string;
  created_at?: Ech0TimeInput;
  tags?: Ech0RemoteTag[];
  echo_files?: Ech0RemoteFile[];
  extension?: Ech0RemoteExtension;
  layout?: string;
  private?: boolean;
  user_id?: string;
  fav_count?: number;
  [key: string]: unknown;
};

export type Ech0TimeInput = number | string | Date;

export type Ech0NormalizedTag = {
  id: string | null;
  name: string;
  key: string;
  createdAt: Date | null;
};

export type Ech0NormalizedFile = {
  id: string | null;
  url: string | null;
  name: string | null;
  contentType: string | null;
  category: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
  raw: Ech0RemoteFile;
};

export type Ech0KnownExtension = {
  type: Ech0ExtensionType;
  payload: Record<string, unknown>;
};

export type Ech0NormalizedExtension = Ech0KnownExtension | null;

export type Ech0NormalizedEcho = {
  source: 'ech0';
  remoteId: string | null;
  stableId: string;
  dedupeKey: string;
  content: string;
  createdAt: Date | null;
  createdAtIso: string | null;
  tags: Ech0NormalizedTag[];
  tagNames: string[];
  files: Ech0NormalizedFile[];
  extension: Ech0NormalizedExtension;
  rawExtension: Ech0RemoteExtension;
  layout: string | null;
  raw: Ech0RemoteEcho;
};

const KNOWN_EXTENSION_TYPES = new Set<Ech0ExtensionType>([
  'MUSIC',
  'VIDEO',
  'GITHUBPROJ',
  'WEBSITE',
  'LOCATION',
  'TWEET'
]);

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

const normalizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizeFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeEch0Time = (value: Ech0TimeInput | null | undefined): Date | null => {
  if (value instanceof Date) return Number.isNaN(value.valueOf()) ? null : new Date(value.valueOf());

  if (typeof value === 'number' || (typeof value === 'string' && /^[-+]?\d+(?:\.\d+)?$/.test(value.trim()))) {
    const numeric = typeof value === 'number' ? value : Number(value.trim());
    if (!Number.isFinite(numeric)) return null;
    const milliseconds = Math.abs(numeric) < 1e12 ? numeric * 1000 : numeric;
    const date = new Date(milliseconds);
    return Number.isNaN(date.valueOf()) ? null : date;
  }

  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value.trim());
  return Number.isNaN(date.valueOf()) ? null : date;
};

export const normalizeEch0Tags = (tags: readonly Ech0RemoteTag[] | null | undefined) => {
  const seen = new Set<string>();
  const normalized: Ech0NormalizedTag[] = [];

  for (const tag of tags ?? []) {
    const name = normalizeText(tag.name);
    const key = name.toLocaleLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      id: normalizeText(tag.id) || null,
      name,
      key,
      createdAt: normalizeEch0Time(tag.created_at)
    });
  }

  return normalized;
};

const normalizeExtension = (extension: Ech0RemoteExtension): Ech0NormalizedExtension => {
  const record = asRecord(extension);
  const type = normalizeText(record?.type) as Ech0ExtensionType;
  const payload = asRecord(record?.payload);
  if (!KNOWN_EXTENSION_TYPES.has(type) || !payload) return null;
  return { type, payload: { ...payload } };
};

const normalizeFile = (file: Ech0RemoteFile, index: number): Ech0NormalizedFile => {
  const nested = asRecord(file.file);
  const url = normalizeText(nested?.url) || normalizeText(file.url) || null;
  const name = normalizeText(nested?.name) || normalizeText(file.name) || null;
  const contentType = normalizeText(nested?.content_type) || normalizeText(file.content_type) || null;
  const category = normalizeText(nested?.category) || normalizeText(file.category) || null;
  const width = normalizeFiniteNumber(nested?.width ?? file.width);
  const height = normalizeFiniteNumber(nested?.height ?? file.height);
  const sortOrder = normalizeFiniteNumber(file.sort_order) ?? index;

  return {
    id: normalizeText(nested?.id) || normalizeText(file.file_id) || normalizeText(file.id) || null,
    url,
    name,
    contentType,
    category,
    width: width && width > 0 ? width : null,
    height: height && height > 0 ? height : null,
    sortOrder: Math.max(0, Math.trunc(sortOrder)),
    raw: file
  };
};

const getContentDedupeKey = (content: string, createdAt: Date | null) =>
  `${content.trim().replace(/\s+/g, ' ').toLocaleLowerCase()}|${createdAt?.toISOString() ?? 'unknown'}`;

export const normalizeEch0Echo = (echo: Ech0RemoteEcho): Ech0NormalizedEcho => {
  const remoteId = normalizeText(echo.id) || null;
  const content = typeof echo.content === 'string' ? echo.content : '';
  const createdAt = normalizeEch0Time(echo.created_at);
  const dedupeKey = remoteId ? `id:${remoteId}` : `content:${getContentDedupeKey(content, createdAt)}`;
  const tags = normalizeEch0Tags(echo.tags);

  return {
    source: 'ech0',
    remoteId,
    stableId: `ech0:${dedupeKey}`,
    dedupeKey,
    content,
    createdAt,
    createdAtIso: createdAt?.toISOString() ?? null,
    tags,
    tagNames: tags.map((tag) => tag.name),
    files: (echo.echo_files ?? []).map(normalizeFile).sort((left, right) => left.sortOrder - right.sortOrder),
    extension: normalizeExtension(echo.extension ?? null),
    rawExtension: echo.extension ?? null,
    layout: normalizeText(echo.layout) || null,
    raw: echo
  };
};

export const normalizeEch0Echoes = (echoes: readonly Ech0RemoteEcho[]) => {
  const seen = new Set<string>();
  const normalized: Ech0NormalizedEcho[] = [];
  for (const echo of echoes) {
    const item = normalizeEch0Echo(echo);
    if (seen.has(item.dedupeKey)) continue;
    seen.add(item.dedupeKey);
    normalized.push(item);
  }
  return normalized;
};

export const normalizeEch0QueryPage = (value: unknown): Ech0QueryPage | null => {
  const root = asRecord(value);
  const code = normalizeFiniteNumber(root?.code);
  if (code !== null && code !== 1) return null;
  const data = asRecord(root?.data) ?? root;
  if (!data || !Array.isArray(data.items)) return null;
  const items = data.items.filter((item): item is Ech0RemoteEcho => asRecord(item) !== null);
  const total = normalizeFiniteNumber(data.total) ?? items.length;
  return { items, total: Math.max(0, Math.trunc(total)) };
};

export const isSuccessfulEch0Response = (value: unknown): value is Ech0QueryResponse => {
  const root = asRecord(value);
  return normalizeFiniteNumber(root?.code) === 1 && normalizeEch0QueryPage(value) !== null;
};

export const dedupeEch0Echoes = (echoes: readonly Ech0NormalizedEcho[]) => {
  const seen = new Set<string>();
  return echoes.filter((echo) => {
    if (seen.has(echo.dedupeKey)) return false;
    seen.add(echo.dedupeKey);
    return true;
  });
};

export const createEch0QueryBody = (page: number, pageSize: number): Ech0QueryRequest => ({
  ...ECH0_DEFAULT_QUERY,
  page,
  pageSize
});

export const getEch0QueryUrl = (sourceUrl: string): string => {
  const base = new URL(sourceUrl);
  base.pathname = `${base.pathname.replace(/\/+$/, '')}${ECH0_QUERY_PATH}`;
  base.search = '';
  base.hash = '';
  return base.toString();
};

export type Ech0LoadResult = {
  items: Ech0NormalizedEcho[];
  requestedPages: number;
  loadedPages: number;
  partial: boolean;
};

export const loadEch0Echoes = async ({
  sourceUrl,
  pageSize,
  maxPages,
  signal
}: {
  sourceUrl: string;
  pageSize: number;
  maxPages: number;
  signal?: AbortSignal;
}): Promise<Ech0LoadResult> => {
  const echoes: Ech0RemoteEcho[] = [];
  const safePageSize = Math.min(Math.max(Number.isFinite(pageSize) ? Math.trunc(pageSize) : 10, 1), 50);
  const safeMaxPages = Math.min(Math.max(Number.isFinite(maxPages) ? Math.trunc(maxPages) : 1, 1), 10);
  const url = getEch0QueryUrl(sourceUrl);

  let loadedPages = 0;
  let total = 0;

  for (let page = 1; page <= safeMaxPages; page += 1) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(createEch0QueryBody(page, safePageSize)),
      ...(signal ? { signal } : {})
    });
    if (!response.ok) throw new Error(`Ech0 request failed: ${response.status}`);
    const pageData = normalizeEch0QueryPage(await response.json());
    if (!pageData) throw new Error('Ech0 response is invalid');
    loadedPages = page;
    total = pageData.total;
    echoes.push(...pageData.items);
    if (!pageData.items.length || echoes.length >= pageData.total || page * safePageSize >= pageData.total) break;
  }

  return {
    items: dedupeEch0Echoes(normalizeEch0Echoes(echoes)),
    requestedPages: safeMaxPages,
    loadedPages,
    partial: total > echoes.length && loadedPages >= safeMaxPages
  };
};
