import { createWithBase } from '../utils/format';
import { onPageChange } from './page-controllers';

// 絮语页「碎碎念」草稿对话框：按需拉取片段并动态加载 bits-draft 控制器。
const initBitsDrafts = () => {
  // 根元素：絮语页碎碎念按钮；其他页面（或 Admin）直接跳过。
  const openBtn = document.querySelector<HTMLButtonElement>('[data-new-bit]');
  if (!openBtn) return;

  const root = document.getElementById('bits-draft-root');
  const loadStatus = document.getElementById('bits-draft-load-status');
  const labelEl = openBtn.querySelector<HTMLElement>('.new-label') ?? null;
  const base = import.meta.env.BASE_URL ?? '/';
  const withBase = createWithBase(base);
  const fragmentPath = openBtn.dataset.bitsDraftUrl ?? 'bits/draft-dialog/';
  const defaultLabel = labelEl?.textContent?.trim() || '碎碎念';

  // 片段/控制器缓存随本次 init 闭包存在：swup 导航后按钮与容器均为新元素，
  // 缓存自然重建，不会把旧页面的已注入状态带到新页面。
  let fragmentPromise: Promise<void> | null = null;
  let controllerPromise: Promise<{ open: (options?: { opener?: HTMLElement | null }) => void }> | null = null;

  const setLoadStatus = (text: string, tone: 'info' | 'error' = 'info') => {
    if (!loadStatus) return;
    loadStatus.textContent = text;
    if (!text) {
      loadStatus.removeAttribute('data-tone');
      return;
    }
    loadStatus.setAttribute('data-tone', tone);
  };

  const setLoading = (loading: boolean) => {
    openBtn.disabled = loading;
    openBtn.toggleAttribute('data-loading', loading);
    openBtn.setAttribute('aria-busy', String(loading));
    if (labelEl) {
      labelEl.textContent = loading ? '加载中…' : defaultLabel;
    }
  };

  const ensureDraftFragment = async () => {
    if (document.getElementById('bits-draft-dialog')) return;
    if (!root) throw new Error('bits draft root missing');
    if (!fragmentPromise) {
      fragmentPromise = fetch(withBase(fragmentPath))
        .then((response) => {
          if (!response.ok) throw new Error(`bits draft fragment ${response.status}`);
          return response.text();
        })
        .then((html) => {
          if (!html.trim()) throw new Error('bits draft fragment empty');
          if (document.getElementById('bits-draft-dialog')) return;
          const template = document.createElement('template');
          template.innerHTML = html.trim();
          root.replaceChildren(template.content.cloneNode(true));
        })
        .catch((error) => {
          fragmentPromise = null;
          throw error;
        });
    }
    return fragmentPromise;
  };

  const loadDraftController = async () => {
    if (!controllerPromise) {
      controllerPromise = Promise.all([ensureDraftFragment(), import('./bits-draft.ts')])
        .then(([, mod]) => {
          const controller = mod.initBitsDraft();
          if (!controller) throw new Error('bits draft controller init failed');
          return controller;
        })
        .catch((error) => {
          controllerPromise = null;
          throw error;
        });
    }
    return controllerPromise;
  };

  // 元素级守卫：同一按钮只绑定一次点击。
  if (openBtn.dataset.draftBound === 'true') return;
  openBtn.dataset.draftBound = 'true';
  openBtn.addEventListener('click', async (event) => {
    event.preventDefault();
    if (openBtn.disabled) return;
    setLoading(true);
    setLoadStatus('正在加载碎碎念工具…');
    try {
      const controller = await loadDraftController();
      setLoadStatus('');
      controller.open({ opener: openBtn });
    } catch {
      setLoadStatus('碎碎念工具加载失败，请重试。', 'error');
    } finally {
      setLoading(false);
    }
  });
};

if (typeof window !== 'undefined') onPageChange(initBitsDrafts);
