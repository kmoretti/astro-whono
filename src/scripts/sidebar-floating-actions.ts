import { onPageChange } from './page-controllers';

const body = document.body;
const mobileMq = window.matchMedia('(max-width: 900px)');

// swup 导航后重初始化：#reader-exit 与 .reader-exit-anchor 随 .shell 容器替换，
// 引用由 init 每次重查；window/MediaQueryList 级监听器与滚动状态为模块级单例，
// 只建立一次，经 active 标记按当前页面启停。
let readerExit: HTMLElement | null = null;
let readerExitAnchor: HTMLElement | null = null;
let active = false;
let scrollTopBtn: HTMLButtonElement | null = null;
let threshold = Math.max(600, window.innerHeight * 2);
let ticking = false;

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isLongPage = () =>
  /^(?:\/(?:archive|essay|memo)(?:\/|$))/.test(window.location.pathname);

const isReaderOn = () => body?.dataset.reading === 'immersive';

const setVisible = (el: HTMLElement | null, visible: boolean) => {
  if (!el) return;
  if (visible) {
    el.dataset.visible = 'true';
    el.removeAttribute('aria-hidden');
    el.tabIndex = 0;
  } else {
    delete el.dataset.visible;
    el.setAttribute('aria-hidden', 'true');
    el.tabIndex = -1;
  }
};

const createScrollTopButton = () => {
  const template = document.getElementById('scroll-top-template');
  if (!(template instanceof HTMLTemplateElement)) return null;

  const button = template.content.firstElementChild?.cloneNode(true);
  if (!(button instanceof HTMLButtonElement)) return null;

  button.addEventListener('click', () => {
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
    window.scrollTo({ top: 0, behavior });
  });
  return button;
};

const setReaderExitInline = (inlineVisible: boolean) => {
  if (!readerExitAnchor) return;
  if (readerExitAnchor.hasAttribute('data-reader-exit-inline') === inlineVisible) return;
  readerExitAnchor.toggleAttribute('data-reader-exit-inline', inlineVisible);
};

const ensureScrollTop = () => {
  if (scrollTopBtn || !body) return;
  const nextButton = createScrollTopButton();
  if (!nextButton) return;
  scrollTopBtn = nextButton;
  body.appendChild(scrollTopBtn);
};

const updateThreshold = () => {
  threshold = Math.max(600, window.innerHeight * 2);
};

const update = () => {
  // 非长页（swup 导航离开 archive/essay/memo）时不产生任何浮动行为，
  // 等价于整页加载时未绑定监听的状态。
  if (!active) return;

  const y = window.scrollY || document.documentElement.scrollTop || 0;
  const scrolledPast = y >= threshold;
  const isReading = isReaderOn();
  const floatExit = isReading && mobileMq.matches && scrolledPast;

  if (mobileMq.matches) {
    ensureScrollTop();
    if (scrollTopBtn) {
      scrollTopBtn.dataset.stack = floatExit ? 'true' : 'false';
    }
    setVisible(scrollTopBtn, scrolledPast);
  } else {
    setVisible(scrollTopBtn, false);
  }

  if (readerExit) {
    if (floatExit) {
      readerExit.classList.add('float-action');
    } else {
      readerExit.classList.remove('float-action');
    }
  }
  setReaderExitInline(isReading && !floatExit);
};

const onScroll = () => {
  if (ticking) return;
  ticking = true;
  window.requestAnimationFrame(() => {
    update();
    ticking = false;
  });
};

const onResize = () => {
  updateThreshold();
  update();
};

// window/MediaQueryList 级监听器只注册一次，不随 init 重复注册。
let globalListenersBound = false;
const bindGlobalListeners = () => {
  if (globalListenersBound) return;
  globalListenersBound = true;

  window.addEventListener('astro-whono:reading-mode-change', update);
  mobileMq.addEventListener('change', update);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
};

const initFloatingActions = () => {
  readerExit = document.getElementById('reader-exit');
  readerExitAnchor = readerExit?.closest('.reader-exit-anchor') as HTMLElement | null;
  active = isLongPage();

  bindGlobalListeners();

  if (!active) {
    // 回到顶部按钮挂在 body 上（容器外），swup 导航后会残留，离开长页时收起。
    setVisible(scrollTopBtn, false);
    return;
  }

  update();
};

onPageChange(() => {
  if (!document.querySelector('.shell')) return;
  initFloatingActions();
});

export {};
