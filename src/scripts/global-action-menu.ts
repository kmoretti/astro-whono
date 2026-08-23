import { onPageChange } from './page-controllers';

// swup 导航后重初始化：.global-action-menu 容器会被整体替换，
// 元素引用与元素级绑定随 init 重做；window/document 级监听器与
// MutationObserver 只建立一次，经模块级引用操作当前容器内的元素。
let menu: HTMLElement | null = null;
let trigger: HTMLButtonElement | null = null;
let items: HTMLElement | null = null;
let scrollTop: HTMLButtonElement | null = null;
let adminStickyBar: HTMLElement | null = null;

const setOpen = (open: boolean, restoreFocus = false) => {
  if (!menu || !trigger || !items) return;
  trigger.setAttribute('aria-expanded', String(open));
  items.hidden = !open;
  menu.dataset.open = String(open);
  if (open) items.querySelector<HTMLButtonElement>('.global-action-menu__action:not([data-visible="false"])')?.focus();
  if (!open && restoreFocus) trigger.focus();
};

const updateScrollTop = () => {
  if (!scrollTop) return;
  const visible = window.scrollY >= Math.max(600, window.innerHeight * 2);
  scrollTop.toggleAttribute('aria-hidden', !visible);
  scrollTop.tabIndex = visible ? 0 : -1;
  scrollTop.dataset.visible = String(visible);
};

// window/document 级监听器只注册一次，不随 init 重复注册。
let globalListenersBound = false;
const bindGlobalListeners = () => {
  if (globalListenersBound) return;
  globalListenersBound = true;

  document.addEventListener('click', (event) => {
    if (event.target instanceof Node && !menu?.contains(event.target)) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && trigger?.getAttribute('aria-expanded') === 'true') {
      event.preventDefault();
      setOpen(false, true);
    }
  });

  window.addEventListener('scroll', updateScrollTop, { passive: true });
};

// Admin 主题表单的粘性保存栏（z-index 更高）在窄屏会遮挡按钮；吸底时把菜单上移避让。
// Observer 为模块级单例，swup 导航后由 init 重新指向当前 .admin-actions 元素。
let adminStickyObserver: MutationObserver | null = null;
const syncAdminSticky = () => {
  if (!menu || !adminStickyBar) return;
  menu.dataset.adminSticky = adminStickyBar.dataset.sticky === 'true' ? 'true' : 'false';
};

const initGlobalActionMenu = () => {
  const menuEl = document.querySelector<HTMLElement>('[data-global-action-menu]');
  if (!menuEl) return;
  menu = menuEl;

  const triggerEl = menuEl.querySelector<HTMLButtonElement>('.global-action-menu__trigger');
  trigger = triggerEl;
  items = menuEl.querySelector<HTMLElement>('[data-menu-items]');
  scrollTop = menuEl.querySelector<HTMLButtonElement>('[data-action="scroll-top"]');
  const tocAction = menuEl.querySelector<HTMLButtonElement>('[data-action="toc"]');
  const commentsAction = menuEl.querySelector<HTMLButtonElement>('[data-action="comments"]');
  const toc = document.querySelector<HTMLDetailsElement>('.article-toc-float');
  const comments = document.querySelector<HTMLElement>('[data-giscus-comments]');

  bindGlobalListeners();

  triggerEl?.addEventListener('click', () => setOpen(triggerEl.getAttribute('aria-expanded') !== 'true'));

  tocAction?.addEventListener('click', (event) => {
    event.stopPropagation();
    setOpen(false);
    if (!toc) return;
    toc.open = true;
    toc.querySelector<HTMLElement>('.article-toc__items a')?.focus();
  });

  commentsAction?.addEventListener('click', () => {
    comments?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });

  scrollTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  updateScrollTop();

  adminStickyBar = document.querySelector<HTMLElement>('.admin-actions');
  if (adminStickyBar) {
    adminStickyObserver ??= new MutationObserver(syncAdminSticky);
    adminStickyObserver.disconnect();
    adminStickyObserver.observe(adminStickyBar, {
      attributes: true,
      attributeFilter: ['data-sticky']
    });
    syncAdminSticky();
  }
};

onPageChange(() => {
  if (!document.querySelector('[data-global-action-menu]')) return;
  initGlobalActionMenu();
});

export {};
