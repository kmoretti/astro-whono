import { onPageChange } from './page-controllers';

/*
 * 絮语点赞投票：基于 star-vote 服务的 up/down 接口。
 * - ID 使用 data-bit-key（本地为 entry id，ech0 为 stableId）
 * - 本浏览器通过 localStorage 记住「已投方向」，防止同一客户端重复刷票；
 *   star-vote 服务端本身不做去重/撤销。
 */

const STORAGE_KEY = 'bits-vote:v1';
const DATA_WIDGET = 'data-bits-vote';
const DATA_UP = 'data-bits-vote-up';
const DATA_DOWN = 'data-bits-vote-down';
const DATA_COUNT_UP = 'data-bits-vote-count-up';
const DATA_COUNT_DOWN = 'data-bits-vote-count-down';

type VoteDirection = 'up' | 'down';
interface VoteInfo {
  up: number;
  down: number;
}

const readStored = (): Record<string, VoteDirection> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const record = parsed as Record<string, unknown>;
    const result: Record<string, VoteDirection> = {};
    Object.entries(record).forEach(([key, value]) => {
      if (value === 'up' || value === 'down') result[key] = value;
    });
    return result;
  } catch {
    return {};
  }
};

const writeStored = (map: Record<string, VoteDirection>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* 忽略写入失败（如无痕模式） */
  }
};

const normalizeApiBase = (value: string) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.toString().replace(/\/?$/, '/') : '';
  } catch {
    return '';
  }
};

const fetchVoteInfo = async (apiBase: string, id: string): Promise<VoteInfo | null> => {
  const url = `${apiBase}api/vote/info?id=${encodeURIComponent(id)}`;
  const response = await fetch(url, { credentials: 'omit' });
  if (!response.ok) return null;
  const data = (await response.json()) as { votes?: { up?: number; down?: number } };
  const votes = data?.votes;
  if (!votes || typeof votes !== 'object') return { up: 0, down: 0 };
  const up = typeof votes.up === 'number' && Number.isFinite(votes.up) ? Math.max(0, Math.floor(votes.up)) : 0;
  const down = typeof votes.down === 'number' && Number.isFinite(votes.down) ? Math.max(0, Math.floor(votes.down)) : 0;
  return { up, down };
};

const submitVote = async (apiBase: string, id: string, value: VoteDirection): Promise<VoteInfo | null> => {
  const url = `${apiBase}api/vote/update?id=${encodeURIComponent(id)}&value=${value}`;
  const response = await fetch(url, { credentials: 'omit' });
  if (!response.ok) return null;
  const data = (await response.json()) as { success?: boolean; votes?: { up?: number; down?: number } };
  if (data?.votes && typeof data.votes === 'object') {
    const up = typeof data.votes.up === 'number' ? Math.max(0, Math.floor(data.votes.up)) : 0;
    const down = typeof data.votes.down === 'number' ? Math.max(0, Math.floor(data.votes.down)) : 0;
    return { up, down };
  }
  return data?.success ? fetchVoteInfo(apiBase, id) : null;
};

const applyCounts = (widget: HTMLElement, info: VoteInfo | null, direction: VoteDirection | null) => {
  const upEl = widget.querySelector<HTMLElement>(`[${DATA_COUNT_UP}]`);
  const downEl = widget.querySelector<HTMLElement>(`[${DATA_COUNT_DOWN}]`);
  const upBtn = widget.querySelector<HTMLButtonElement>(`[${DATA_UP}]`);
  const downBtn = widget.querySelector<HTMLButtonElement>(`[${DATA_DOWN}]`);
  const up = info ? info.up : 0;
  const down = info ? info.down : 0;
  if (upEl) upEl.textContent = String(up);
  if (downEl) downEl.textContent = String(down);
  upBtn?.classList.toggle('is-active', direction === 'up');
  downBtn?.classList.toggle('is-active', direction === 'down');
  upBtn?.setAttribute('aria-pressed', direction === 'up' ? 'true' : 'false');
  downBtn?.setAttribute('aria-pressed', direction === 'down' ? 'true' : 'false');
  widget.dataset.bitsVoteState = info ? 'ready' : 'error';
};

const initBitsVote = () => {
  const configEl = document.querySelector<HTMLElement>('[data-bits-vote-config]');
  if (!configEl) return;
  const enabled = configEl.dataset.bitsVoteEnabled === 'true';
  const apiBase = normalizeApiBase(configEl.dataset.bitsVoteApiBase ?? '');
  if (!enabled || !apiBase) return;

  const stored = readStored();
  const widgets = Array.from(document.querySelectorAll<HTMLElement>(`[${DATA_WIDGET}]`));
  if (!widgets.length) return;

  widgets.forEach((widget) => {
    if (widget.dataset.bitsVoteBound === 'true') return;
    widget.dataset.bitsVoteBound = 'true';

    const card = widget.closest<HTMLElement>('[data-bit]');
    const key = (card?.dataset.bitKey ?? '').trim();
    if (!key) return;

    const upBtn = widget.querySelector<HTMLButtonElement>(`[${DATA_UP}]`);
    const downBtn = widget.querySelector<HTMLButtonElement>(`[${DATA_DOWN}]`);
    if (!upBtn || !downBtn) return;

    const currentDirection = stored[key] ?? null;
    applyCounts(widget, null, currentDirection);

    void (async () => {
      const info = await fetchVoteInfo(apiBase, key);
      applyCounts(widget, info, currentDirection);
    })();

    const handler = (direction: VoteDirection) => async () => {
      if (stored[key] === direction) return;
      upBtn.disabled = true;
      downBtn.disabled = true;
      try {
        const info = await submitVote(apiBase, key, direction);
        if (info) {
          stored[key] = direction;
          writeStored(stored);
          applyCounts(widget, info, direction);
        }
      } finally {
        upBtn.disabled = false;
        downBtn.disabled = false;
      }
    };
    upBtn.addEventListener('click', handler('up'));
    downBtn.addEventListener('click', handler('down'));
  });
};

if (typeof window !== 'undefined') {
  onPageChange(initBitsVote);
  // 远程 ech0 卡片在 fetch 完成后才插入 DOM，需要二次初始化。
  window.addEventListener('bits:remote-loaded', initBitsVote);
}
