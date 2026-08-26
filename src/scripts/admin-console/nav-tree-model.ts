import type { SidebarNavChild, SidebarNavItem } from '@/lib/theme-settings';

/* 统一树形导航编辑器的纯数据逻辑：与 DOM 解耦，方便单测。 */

export type NavTreeChildDraft = Pick<SidebarNavChild, 'id' | 'label' | 'href' | 'visible'>;

export type NavTreeBranchDraft = {
  id: string;
  label: string;
  ornament: string | null;
  visible: boolean;
  /* 自定义项必填 href；内置项忽略该值且不写入收集结果。 */
  href: string;
  custom: boolean;
  children: NavTreeChildDraft[];
};

export const NAV_CHILD_ID_PREFIX = 'nav-child-';
export const NAV_CUSTOM_ID_PREFIX = 'custom-nav-';

/* 树形导航结构变化广播事件名：编辑器 dispatch，预览等监听方共用。 */
export const NAV_TREE_CHANGE_EVENT = 'admin-nav-tree:change';

/* collect 时按分支（显示）顺序重写 order：一级 1..N，每个父级下的子级各自 1..N。 */
export const collectNavTreeItems = (branches: readonly NavTreeBranchDraft[]): SidebarNavItem[] =>
  branches.map((branch, index) => ({
    id: branch.id,
    label: branch.label,
    ornament: branch.ornament,
    visible: branch.visible,
    order: index + 1,
    ...(branch.custom ? { href: branch.href } : {}),
    children: branch.children.map(
      (child, childIndex): SidebarNavChild => ({
        id: child.id,
        label: child.label,
        href: child.href,
        visible: child.visible,
        order: childIndex + 1
      })
    )
  }));

const createNextPrefixedId = (prefix: string, existingIds: ReadonlySet<string>): string => {
  let index = 1;
  let id = `${prefix}${index}`;
  while (existingIds.has(id)) id = `${prefix}${++index}`;
  return id;
};

export const createNextNavChildId = (existingIds: Iterable<string>): string =>
  createNextPrefixedId(NAV_CHILD_ID_PREFIX, new Set(existingIds));

export const createNextCustomNavId = (existingIds: Iterable<string>): string =>
  createNextPrefixedId(NAV_CUSTOM_ID_PREFIX, new Set(existingIds));
