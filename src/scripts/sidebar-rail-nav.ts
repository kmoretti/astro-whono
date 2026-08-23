import { onPageChange } from './page-controllers';

/**
 * 初始化 Admin rail 模式下的公开导航浮层。
 * 公开页面会通过 Admin body class 与 rail DOM 双重判断快速退出。
 */

// swup 导航后重初始化：.sidebar 随 .shell 容器替换，details/summary 引用
// 由 init 每次重查；document 级监听器只注册一次，经模块级引用操作当前浮层。
let details: HTMLDetailsElement | null = null;
let summary: HTMLElement | null = null;
let globalListenersBound = false;

const bindGlobalListeners = () => {
  if (globalListenersBound) return;
  globalListenersBound = true;

  document.addEventListener('click', (event) => {
    if (!details?.open) return;

    const target = event.target;
    if (!(target instanceof Node)) return;
    if (details.contains(target)) return;

    details.open = false;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !details?.open) return;

    event.preventDefault();
    details.open = false;
    summary?.focus();
  });
};

export function initPublicNavPopover() {
  if (!document.body.classList.contains('admin-page')) {
    // 离开 Admin 页时清空引用，避免已注册的 document 监听器操作游离元素。
    details = null;
    summary = null;
    return;
  }

  details = document.querySelector<HTMLDetailsElement>('.sidebar .public-nav-group');
  if (!details) return;

  summary = details.querySelector('summary');

  bindGlobalListeners();
}

onPageChange(() => {
  if (!document.querySelector('.sidebar')) return;
  initPublicNavPopover();
});
