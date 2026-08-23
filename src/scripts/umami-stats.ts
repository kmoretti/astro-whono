import { onPageChange } from './page-controllers';
import { initAboutSiteInfoCopyButtons, initCodeCopyButtons } from './lightbox';

// about 页客户端初始化：复制按钮 + umami 统计。
// umami 分享链接方式：先用 /api/share/{id} 换取 websiteId + token，
// 再携带 x-umami-share-token / x-umami-share-context 请求头查询统计。
// 地址与分享 ID 来自 Theme Console 的 /about/ 页统计设置（data-* 注入）。
const UMAMI_STATS_RANGE_MS = 30 * 24 * 60 * 60 * 1000;
const UMAMI_STAT_KEYS = ['pageviews', 'visitors', 'visits', 'bounces', 'totaltime'] as const;

type UmamiShareInfo = { websiteId?: unknown; token?: unknown };

// 新版 umami 返回扁平数字；旧版嵌套在 value 里。两种都兼容。
const asStatNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'object' && value !== null && 'value' in value) {
    const nested = (value as { value?: unknown }).value;
    if (typeof nested === 'number' && Number.isFinite(nested)) return nested;
  }
  return null;
};

// totaltime 单位是秒；取最长的两段非零单位，例如 772 → “12 分 52 秒”、809968 → “9 天 8 小时”。
const formatDuration = (totalSeconds: number): string => {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const units: Array<[number, string]> = [
    [Math.floor(seconds / 86400), '天'],
    [Math.floor((seconds % 86400) / 3600), '小时'],
    [Math.floor((seconds % 3600) / 60), '分'],
    [seconds % 60, '秒']
  ];
  const parts = units.filter(([value]) => value > 0);
  if (parts.length === 0) return '0 秒';
  return parts.slice(0, 2).map(([value, label]) => `${value} ${label}`).join(' ');
};

const initUmamiStats = () => {
  // 根元素：/about/ 页统计卡片；其他页面直接跳过。
  const statsRoot = document.querySelector<HTMLElement>('[data-umami-stats]');
  if (!statsRoot) return;

  // about 页复制按钮在拉取统计前初始化，不依赖统计请求结果。
  initCodeCopyButtons();
  initAboutSiteInfoCopyButtons();

  const status = statsRoot.querySelector<HTMLElement>('[data-stats-status]');
  const values = statsRoot.querySelector<HTMLElement>('[data-stats-values]');
  const umamiBaseUrl = (statsRoot.dataset.umamiBaseUrl || '').replace(/\/+$/, '');
  const umamiShareId = statsRoot.dataset.umamiShareId || '';
  fetch(`${umamiBaseUrl}/api/share/${umamiShareId}`, { headers: { Accept: 'application/json' } })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('share unavailable')))
    .then((share: UmamiShareInfo) => {
      const websiteId = typeof share.websiteId === 'string' ? share.websiteId : '';
      const token = typeof share.token === 'string' ? share.token : '';
      if (!websiteId || !token) throw new Error('invalid share payload');
      const endAt = Date.now();
      const startAt = endAt - UMAMI_STATS_RANGE_MS;
      return fetch(
        `${umamiBaseUrl}/api/websites/${encodeURIComponent(websiteId)}/stats?startAt=${startAt}&endAt=${endAt}`,
        {
          headers: {
            Accept: 'application/json',
            'x-umami-share-token': token,
            'x-umami-share-context': '1'
          }
        }
      );
    })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('stats unavailable')))
    .then((data: Record<string, unknown>) => {
      const stats = Object.fromEntries(
        UMAMI_STAT_KEYS.map((key) => [key, asStatNumber(data[key])])
      ) as Record<string, number | null>;
      const hasValidStats = UMAMI_STAT_KEYS.every((key) => stats[key] !== null);
      if (!hasValidStats) throw new Error('invalid stats payload');
      UMAMI_STAT_KEYS.forEach((key) => {
        const target = statsRoot.querySelector<HTMLElement>(`[data-stat="${key}"]`);
        if (!target) return;
        const value = stats[key] as number;
        target.textContent = key === 'totaltime' ? formatDuration(value) : value.toLocaleString();
      });
      if (values) values.hidden = false;
      if (status) status.hidden = true;
    })
    .catch(() => { if (status) status.textContent = '统计数据暂不可用'; });
};

if (typeof window !== 'undefined') onPageChange(initUmamiStats);
