const STAT_KEYS = ['pageviews', 'visitors', 'visits', 'bounces', 'totaltime'] as const;
const CACHE_CONTROL = 'public, max-age=300, s-maxage=300, stale-while-revalidate=600';
const REQUEST_TIMEOUT_MS = 5000;

type StatKey = (typeof STAT_KEYS)[number];
type StatsPayload = Partial<Record<StatKey, number>>;

type RuntimeEnv = {
  UMAMI_BASE_URL?: string;
  UMAMI_WEBSITE_ID?: string;
  UMAMI_API_TOKEN?: string;
};

type PagesFunctionContext = {
  env: RuntimeEnv;
};

const isSafeWebsiteId = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const parseBaseUrl = (value: string): URL | undefined => {
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== 'https:'
      || parsed.hostname !== 'um.081531.xyz'
      || parsed.username
      || parsed.password
      || parsed.search
      || parsed.hash
    ) return undefined;
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return parsed;
  } catch {
    return undefined;
  }
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'object' && value !== null && 'value' in value) {
    const nested = (value as { value?: unknown }).value;
    return typeof nested === 'number' && Number.isFinite(nested) ? nested : undefined;
  }
  return undefined;
};

const normalizeStats = (value: unknown): StatsPayload => {
  if (typeof value !== 'object' || value === null) return {};
  const record = value as Record<string, unknown>;
  const source = typeof record.data === 'object' && record.data !== null
    ? record.data as Record<string, unknown>
    : record;
  return Object.fromEntries(
    STAT_KEYS.flatMap((key) => {
      const stat = toNumber(source[key]);
      return stat === undefined ? [] : [[key, stat]];
    })
  ) as StatsPayload;
};

const response = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': CACHE_CONTROL
    }
  });

export const onRequestGet = async (context: PagesFunctionContext): Promise<Response> => {
  const { env } = context;
  const baseUrl = env.UMAMI_BASE_URL?.trim();
  const websiteId = env.UMAMI_WEBSITE_ID?.trim();
  const token = env.UMAMI_API_TOKEN?.trim();
  const parsedBaseUrl = baseUrl ? parseBaseUrl(baseUrl) : undefined;

  if (!parsedBaseUrl || !websiteId || !isSafeWebsiteId(websiteId) || !token) {
    return response({ error: 'stats_unavailable' }, 503);
  }

  const endpoint = new URL(parsedBaseUrl);
  endpoint.pathname = `${parsedBaseUrl.pathname.replace(/\/+$/, '')}/api/websites/${encodeURIComponent(websiteId)}/stats`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    });
    if (!upstream.ok) return response({ error: 'stats_unavailable' }, 502);

    return response(normalizeStats(await upstream.json()));
  } catch {
    return response({ error: 'stats_unavailable' }, 502);
  } finally {
    clearTimeout(timeout);
  }
};
