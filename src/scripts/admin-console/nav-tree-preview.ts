import {
  ADMIN_NAV_ORNAMENT_DEFAULT,
  getSidebarNavItemHref,
  SIDEBAR_NAV_BUILTIN_ID_SET
} from '../../lib/admin-console/theme-shared';
import type { SidebarNavItem } from '../../lib/theme-settings';
import { createWithBase } from '../../utils/format';
import { NAV_TREE_CHANGE_EVENT } from './nav-tree-model';

/* Task 4：导航编辑即时预览 —— 编辑器内容变化（未保存）时，把导航草稿实时
   渲染到开发态侧边栏的公共导航面板（[data-admin-nav-panel="public"]）。
   DOM 结构与样式类跟随 src/components/sidebar/SidebarPublicNav.astro，
   转换规则与 src/components/Sidebar.astro 前置脚本保持一致。 */

export type NavPreviewChild = {
  id: string;
  label: string;
  href: string;
};

export type NavPreviewItem = {
  id: string;
  label: string;
  ornament: string | null;
  href: string;
  children: readonly NavPreviewChild[];
};

export const NAV_PREVIEW_INPUT_DEBOUNCE_MS = 150;

/* 编辑器草稿 → 侧栏公共导航渲染结构：visible 过滤、自定义项缺 href 整条
   不渲染（防御兜底，同 Sidebar.astro）、按 order 排序、href 经 base 解析
   （外链 https:// 原样保留）。 */
export const buildNavPreviewItems = (
  items: readonly SidebarNavItem[],
  withBase: (path: string) => string
): NavPreviewItem[] =>
  items
    .filter((item) => item.visible)
    .filter((item) => Boolean(item.href) || SIDEBAR_NAV_BUILTIN_ID_SET.has(item.id))
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      id: item.id,
      label: item.label,
      ornament: item.ornament,
      href: withBase(getSidebarNavItemHref(item)),
      children: item.children
        .filter((child) => child.visible)
        .sort((a, b) => a.order - b.order)
        .map((child) => ({
          id: child.id,
          label: child.label,
          href: withBase(child.href)
        }))
    }));

const createElement = <T extends keyof HTMLElementTagNameMap>(
  tagName: T,
  className?: string
): HTMLElementTagNameMap[T] => {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  return element;
};

const createOrnamentElement = (ornament: string | null): HTMLElement | null => {
  if (ornament === ADMIN_NAV_ORNAMENT_DEFAULT) {
    return createElement('span', 'dot');
  }
  if (ornament) {
    const element = createElement('span', 'nav-ornament');
    element.textContent = ornament;
    return element;
  }
  return null;
};

const appendLabelAndOrnament = (container: HTMLElement, item: NavPreviewItem): void => {
  const label = createElement('span');
  label.textContent = item.label;
  container.append(label);
  const ornament = createOrnamentElement(item.ornament);
  if (ornament) {
    ornament.setAttribute('aria-hidden', 'true');
    container.append(ornament);
  }
};

/* 与 admin-sidebar-nav-mode 的 setNavItemDelays 同步，保持切换面板时的逐项入场节奏。 */
const setNavItemDelay = (item: HTMLLIElement, index: number): void => {
  item.style.setProperty('--sidebar-nav-item-delay', `${45 + index * 18}ms`);
};

const createNavItemElement = (item: NavPreviewItem, index: number): HTMLLIElement => {
  const hasChildren = item.children.length > 0;
  const row = createElement(
    'li',
    `sidebar-public-nav__item${hasChildren ? ' sidebar-public-nav__item--parent' : ''}`
  );
  setNavItemDelay(row, index);

  if (!hasChildren) {
    const link = createElement('a');
    link.href = item.href;
    appendLabelAndOrnament(link, item);
    row.append(link);
    return row;
  }

  /* 草稿中允许出现重复 id（保存前由校验拦截），子菜单 id 用序号保证唯一。 */
  const submenuId = `sidebar-submenu-admin-${index}`;
  const toggle = createElement('button', 'sidebar-public-nav__toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', submenuId);
  toggle.dataset.sidebarSubmenuToggle = '';
  const disclosure = createElement('span', 'sidebar-public-nav__disclosure');
  disclosure.setAttribute('aria-hidden', 'true');
  toggle.append(disclosure);
  appendLabelAndOrnament(toggle, item);

  const submenu = createElement('ul', 'sidebar-public-nav__submenu');
  submenu.id = submenuId;
  submenu.dataset.sidebarSubmenu = '';
  submenu.hidden = true;
  item.children.forEach((child) => {
    const childRow = createElement('li');
    const childLink = createElement('a');
    childLink.href = child.href;
    childLink.textContent = child.label;
    childRow.append(childLink);
    submenu.append(childRow);
  });

  /* 重渲染后的按钮不经过 sidebar-submenu.ts 的初始化绑定，这里按同一交互契约接线。 */
  toggle.addEventListener('click', () => {
    const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isExpanded));
    submenu.hidden = isExpanded;
  });
  toggle.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || toggle.getAttribute('aria-expanded') !== 'true') return;
    event.preventDefault();
    toggle.setAttribute('aria-expanded', 'false');
    submenu.hidden = true;
    toggle.focus();
  });

  row.append(toggle, submenu);
  return row;
};

type NavTreePreviewContext = {
  editorRoot: HTMLElement;
  /* 开发态侧边栏公共导航面板：<ul data-admin-nav-panel="public"> */
  panel: HTMLElement;
  collect: () => SidebarNavItem[];
};

export const createNavTreePreview = ({
  editorRoot,
  panel,
  collect
}: NavTreePreviewContext) => {
  const withBase = createWithBase(import.meta.env.BASE_URL ?? '/');
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const cancelScheduledSync = (): void => {
    if (debounceTimer === null) return;
    clearTimeout(debounceTimer);
    debounceTimer = null;
  };

  /* 即时渲染：结构变化（拖拽/增删/移动）与初始载入/重置走这里。 */
  const sync = (): void => {
    cancelScheduledSync();
    const items = buildNavPreviewItems(collect(), withBase);
    panel.replaceChildren(...items.map((item, index) => createNavItemElement(item, index)));
  };

  /* 文本输入/勾选类变化防抖渲染。 */
  const scheduleSync = (): void => {
    cancelScheduledSync();
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      sync();
    }, NAV_PREVIEW_INPUT_DEBOUNCE_MS);
  };

  editorRoot.addEventListener(NAV_TREE_CHANGE_EVENT, sync);
  editorRoot.addEventListener('input', scheduleSync);
  editorRoot.addEventListener('change', scheduleSync);

  return { sync };
};
