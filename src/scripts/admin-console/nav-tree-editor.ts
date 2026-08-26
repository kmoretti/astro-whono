import type { SidebarNavChild, SidebarNavItem } from '@/lib/theme-settings';
import {
  ADMIN_NAV_CUSTOM_ID_MAX_LENGTH,
  ADMIN_NAV_ORNAMENT_MAX_LENGTH,
  isAdminNavId
} from '@/lib/admin-console/theme-shared';
import {
  collectNavTreeItems,
  createNextCustomNavId,
  createNextNavChildId,
  NAV_TREE_CHANGE_EVENT,
  type NavTreeBranchDraft
} from './nav-tree-model';

/* 统一树形导航编辑器：一级导航分组展示，子导航嵌套在各自父级下；
   顺序完全由 DOM 显示顺序决定（collect 时重写为连续 order）。
   结构变化通过 onChange 回调与 admin-nav-tree:change 自定义事件对外广播，
   文本输入仍走原生 input/change 冒泡（供 Task 4 即时预览接入）。 */

type Query = <T extends Element>(parent: ParentNode, selector: string) => T | null;

export type NavTreeField = 'id' | 'label' | 'ornament' | 'href' | 'visible';
export type NavTreeChildField = 'id' | 'label' | 'href' | 'visible';
export type NavTreeGroupRef = string | number;

/* 事件常量定义于 nav-tree-model（DOM 无关），此处 re-export 保持既有导入路径可用。 */
export { NAV_TREE_CHANGE_EVENT };

type NavTreeEditorContext = {
  root: HTMLElement;
  addNavButton: HTMLButtonElement;
  query: Query;
  onChange?: () => void;
};

const normalize = (value: unknown): string => String(value ?? '').trim();

const createElement = <T extends keyof HTMLElementTagNameMap>(
  tagName: T,
  className?: string
): HTMLElementTagNameMap[T] => {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  return element;
};

const createInput = (
  type: 'text' | 'url',
  field: string,
  value: string,
  label: string
): HTMLInputElement => {
  const input = createElement('input', 'admin-field__control admin-field__control--soft');
  input.type = type;
  input.value = value;
  input.dataset.navField = field;
  input.setAttribute('aria-label', label);
  if (type === 'url') input.inputMode = 'url';
  return input;
};

const createChildInput = (field: string, value: string, label: string): HTMLInputElement => {
  const input = createElement('input', 'admin-field__control admin-field__control--soft');
  input.type = 'text';
  input.value = value;
  input.dataset.navChildField = field;
  input.setAttribute('aria-label', label);
  if (field === 'href') input.inputMode = 'url';
  return input;
};

const createActionButton = (
  action: string,
  text: string,
  label: string,
  scope: 'nav' | 'nav-child'
): HTMLButtonElement => {
  const button = createElement('button', 'admin-btn admin-btn--ghost admin-btn--compact');
  button.type = 'button';
  button.textContent = text;
  if (scope === 'nav') button.dataset.navAction = action;
  else button.dataset.navChildAction = action;
  button.setAttribute('aria-label', label);
  return button;
};

const createDragHandle = (level: 1 | 2, label: string): HTMLButtonElement => {
  const handle = createElement('button', 'admin-nav-tree__handle');
  handle.type = 'button';
  handle.textContent = '≡';
  handle.draggable = true;
  handle.dataset.navDragHandle = '';
  handle.dataset.navDragLevel = String(level);
  handle.setAttribute('aria-label', label);
  return handle;
};

const createFieldCell = (
  labelText: string,
  control: HTMLElement,
  extraClassName?: string
): HTMLLabelElement => {
  const cell = createElement('label', `admin-field admin-nav-tree__field${extraClassName ? ` ${extraClassName}` : ''}`);
  const text = createElement('span', 'admin-nav-cell-label');
  text.textContent = labelText;
  cell.append(text, control);
  return cell;
};

const createToggleCell = (
  field: 'nav-field' | 'nav-child-field',
  checked: boolean,
  label: string
): HTMLLabelElement => {
  const cell = createElement('label', 'admin-toggle admin-nav-tree__toggle');
  const text = createElement('span', 'admin-nav-cell-label');
  text.textContent = '展示';
  const input = createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  if (field === 'nav-field') input.dataset.navField = 'visible';
  else input.dataset.navChildField = 'visible';
  input.setAttribute('aria-label', label);
  cell.append(text, input);
  return cell;
};

type ParentRowOptions = {
  id: string;
  custom: boolean;
  editableId: boolean;
  label: string;
  ornament: string;
  visible: boolean;
  href: string;
};

const createParentRow = ({
  id,
  custom,
  editableId,
  label,
  ornament,
  visible,
  href
}: ParentRowOptions): HTMLElement => {
  const row = createElement('div', 'admin-nav-tree__row admin-nav-tree__row--level1');
  row.dataset.navRow = '';
  row.dataset.navLevel = '1';
  row.dataset.navId = id;
  row.dataset.navKind = custom ? 'custom' : 'builtin';

  const handle = createDragHandle(1, `拖拽调整一级导航「${label || id}」顺序（也可使用上移/下移按钮）`);

  let idCell: HTMLElement;
  if (editableId) {
    const idInput = createInput('text', 'id', id, '自定义导航 ID（kebab-case）');
    idInput.maxLength = ADMIN_NAV_CUSTOM_ID_MAX_LENGTH;
    idInput.placeholder = 'custom-nav';
    idInput.classList.add('admin-nav-tree__id-input');
    idCell = idInput;
  } else {
    const idText = createElement('span', 'admin-nav-tree__id-text');
    idText.textContent = id;
    idCell = idText;
  }

  const labelInput = createInput('text', 'label', label, `一级导航「${id}」名称`);
  const ornamentInput = createInput('text', 'ornament', ornament, `一级导航「${id}」后缀，留空表示不显示`);
  ornamentInput.maxLength = ADMIN_NAV_ORNAMENT_MAX_LENGTH;
  ornamentInput.setAttribute('aria-describedby', 'admin-nav-ornament-hint');

  const cells: HTMLElement[] = [handle, idCell, createFieldCell('名称', labelInput), createFieldCell('后缀', ornamentInput)];
  if (custom) {
    cells.push(createFieldCell('路径', createInput('url', 'href', href, `自定义导航「${id}」路径`), 'admin-nav-tree__field--href'));
  }
  cells.push(createToggleCell('nav-field', visible, `一级导航「${id}」是否展示`));

  const actions = createElement('div', 'admin-nav-tree__actions');
  actions.append(
    createActionButton('up', '上移', `上移一级导航「${id}」`, 'nav'),
    createActionButton('down', '下移', `下移一级导航「${id}」`, 'nav'),
    createActionButton('add-child', '添加子导航', `在「${id}」下添加子导航`, 'nav')
  );
  if (custom) {
    actions.append(createActionButton('remove', '删除', `删除一级导航「${id}」`, 'nav'));
  }
  cells.push(actions);

  row.append(...cells);
  return row;
};

const createChildRow = (child: SidebarNavChild): HTMLElement => {
  const row = createElement('div', 'admin-nav-tree__row admin-nav-tree__row--level2');
  row.dataset.navChildRow = '';
  row.dataset.navChildId = child.id;

  const handle = createDragHandle(2, `拖拽调整子导航「${child.label || child.id}」顺序，可跨分组（也可使用上移/下移按钮）`);
  const labelInput = createChildInput('label', child.label, '子导航名称');
  const hrefInput = createChildInput('href', child.href, '子导航站内路径');

  row.append(
    handle,
    createFieldCell('名称', labelInput),
    createFieldCell('路径', hrefInput, 'admin-nav-tree__field--href'),
    createToggleCell('nav-child-field', child.visible, `子导航「${child.label || child.id}」是否展示`),
    (() => {
      const actions = createElement('div', 'admin-nav-tree__actions');
      actions.append(
        createActionButton('up', '上移', `上移子导航「${child.label || child.id}」`, 'nav-child'),
        createActionButton('down', '下移', `下移子导航「${child.label || child.id}」`, 'nav-child'),
        createActionButton('remove', '删除', `删除子导航「${child.label || child.id}」`, 'nav-child')
      );
      return actions;
    })()
  );
  return row;
};

const createGroup = (item: SidebarNavItem, options: { editableId: boolean }): HTMLElement => {
  const custom = !isAdminNavId(item.id);
  const group = createElement('div', 'admin-nav-tree__group');
  group.dataset.navGroup = '';
  group.dataset.navId = item.id;
  group.dataset.navKind = custom ? 'custom' : 'builtin';

  const children = createElement('div', 'admin-nav-tree__children');
  children.dataset.navChildren = '';
  children.append(...item.children.map((child) => createChildRow({ ...child })));

  group.append(
    createParentRow({
      id: item.id,
      custom,
      editableId: options.editableId,
      label: item.label,
      ornament: item.ornament ?? '',
      visible: item.visible,
      href: item.href ?? ''
    }),
    children
  );
  return group;
};

type DropPlacement =
  | { type: 'parent-row'; row: HTMLElement; position: 'before' | 'after' }
  | { type: 'child-row'; row: HTMLElement; position: 'before' | 'after' }
  | { type: 'children-append'; container: HTMLElement };

export const createNavTreeEditor = ({ root, addNavButton, query, onChange }: NavTreeEditorContext) => {
  let changeListener: (() => void) | undefined = onChange;
  let dragRow: HTMLElement | null = null;

  const getGroups = (): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>('[data-nav-group]'));

  const getChildRows = (group: HTMLElement): HTMLElement[] =>
    Array.from(group.querySelectorAll<HTMLElement>('[data-nav-child-row]'));

  const getRowLabel = (row: HTMLElement | null): string => {
    if (!row) return '';
    const input = query<HTMLInputElement>(row, '[data-nav-field="label"], [data-nav-child-field="label"]');
    return normalize(input?.value);
  };

  /* 一级 id 解析：新增自定义行读 id 输入框，其余读 data-nav-id。 */
  const resolveGroupId = (group: HTMLElement): string =>
    normalize(query<HTMLInputElement>(group, '[data-nav-field="id"]')?.value) || normalize(group.dataset.navId);

  const findGroup = (ref: NavTreeGroupRef): HTMLElement | null => {
    const groups = getGroups();
    if (typeof ref === 'number') return groups[ref] ?? null;
    return groups.find((group) => group.dataset.navId === ref || resolveGroupId(group) === ref) ?? null;
  };

  const notifyChange = (): void => {
    root.dispatchEvent(
      new CustomEvent(NAV_TREE_CHANGE_EVENT, { bubbles: true, detail: { nav: collect() } })
    );
    changeListener?.();
  };

  /* 首行禁用上移、末行禁用下移（一级按分组，子级按各自父级）。 */
  const syncMoveButtons = (): void => {
    const groups = getGroups();
    groups.forEach((group) => {
      const buttons = Array.from(
        group.querySelectorAll<HTMLButtonElement>('[data-nav-row] [data-nav-action]')
      );
      const up = buttons.find((button) => button.dataset.navAction === 'up');
      const down = buttons.find((button) => button.dataset.navAction === 'down');
      if (up) up.disabled = groups[0] === group;
      if (down) down.disabled = groups[groups.length - 1] === group;

      const childRows = getChildRows(group);
      childRows.forEach((row, index) => {
        const childUp = query<HTMLButtonElement>(row, '[data-nav-child-action="up"]');
        const childDown = query<HTMLButtonElement>(row, '[data-nav-child-action="down"]');
        if (childUp) childUp.disabled = index === 0;
        if (childDown) childDown.disabled = index === childRows.length - 1;
      });
    });
  };

  const render = (items: readonly SidebarNavItem[]): void => {
    root.replaceChildren(...items.map((item) => createGroup(item, { editableId: false })));
    syncMoveButtons();
  };

  const collect = (): SidebarNavItem[] => {
    const childIds = new Set<string>();
    getGroups().forEach((group) => {
      getChildRows(group).forEach((row) => {
        const id = normalize(row.dataset.navChildId);
        if (id) childIds.add(id);
      });
    });

    const branches: NavTreeBranchDraft[] = getGroups().map((group) => {
      const id = resolveGroupId(group);
      return {
        id,
        label: normalize(query<HTMLInputElement>(group, '[data-nav-field="label"]')?.value),
        ornament:
          normalize(query<HTMLInputElement>(group, '[data-nav-field="ornament"]')?.value) || null,
        visible: Boolean(query<HTMLInputElement>(group, '[data-nav-field="visible"]')?.checked),
        href: normalize(query<HTMLInputElement>(group, '[data-nav-field="href"]')?.value),
        custom: !isAdminNavId(id),
        children: getChildRows(group).map((row) => ({
          id: normalize(row.dataset.navChildId) || createNextNavChildId(childIds),
          label: normalize(query<HTMLInputElement>(row, '[data-nav-child-field="label"]')?.value),
          href: normalize(query<HTMLInputElement>(row, '[data-nav-child-field="href"]')?.value),
          visible: Boolean(query<HTMLInputElement>(row, '[data-nav-child-field="visible"]')?.checked)
        }))
      };
    });

    return collectNavTreeItems(branches);
  };

  const addChildRow = (group: HTMLElement): void => {
    const childIds = new Set<string>();
    getGroups().forEach((source) => {
      getChildRows(source).forEach((row) => {
        const id = normalize(row.dataset.navChildId);
        if (id) childIds.add(id);
      });
    });
    const child = createChildRow({
      id: createNextNavChildId(childIds),
      label: '',
      href: '/',
      visible: true,
      order: getChildRows(group).length + 1
    });
    const container = query<HTMLElement>(group, '[data-nav-children]');
    if (!container) return;
    container.append(child);
    syncMoveButtons();
    query<HTMLInputElement>(child, '[data-nav-child-field="label"]')?.focus();
    notifyChange();
  };

  const removeGroup = (group: HTMLElement): void => {
    const label = getRowLabel(query<HTMLElement>(group, '[data-nav-row]'));
    const childCount = getChildRows(group).length;
    const message = childCount > 0
      ? `确定删除一级导航「${label || group.dataset.navId}」吗？其 ${childCount} 个子导航会一并删除。`
      : `确定删除一级导航「${label || group.dataset.navId}」吗？`;
    if (!window.confirm(message)) return;
    group.remove();
    syncMoveButtons();
    notifyChange();
  };

  const removeChildRow = (row: HTMLElement): void => {
    if (!window.confirm('确定删除这个子导航吗？')) return;
    row.remove();
    syncMoveButtons();
    notifyChange();
  };

  const moveGroup = (group: HTMLElement, direction: -1 | 1): void => {
    const sibling = direction === -1
      ? group.previousElementSibling
      : group.nextElementSibling;
    if (!sibling) return;
    if (direction === -1) root.insertBefore(group, sibling);
    else root.insertBefore(sibling, group);
    syncMoveButtons();
    notifyChange();
  };

  const moveChildRow = (row: HTMLElement, direction: -1 | 1): void => {
    const container = row.parentElement;
    if (!container) return;
    const sibling = direction === -1 ? row.previousElementSibling : row.nextElementSibling;
    if (!sibling) return;
    if (direction === -1) container.insertBefore(row, sibling);
    else container.insertBefore(sibling, row);
    syncMoveButtons();
    notifyChange();
  };

  const clearDropIndicators = (): void => {
    root.querySelectorAll(
      '.admin-nav-tree__row--drop-above, .admin-nav-tree__row--drop-below, .admin-nav-tree__children--drop-append'
    ).forEach((element) => {
      element.classList.remove(
        'admin-nav-tree__row--drop-above',
        'admin-nav-tree__row--drop-below',
        'admin-nav-tree__children--drop-append'
      );
    });
  };

  const clearDragState = (): void => {
    dragRow?.classList.remove('admin-nav-tree__row--dragging');
    dragRow = null;
    clearDropIndicators();
  };

  const resolveDropPlacement = (event: DragEvent): DropPlacement | null => {
    if (!dragRow) return null;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return null;
    const isLevel1 = dragRow.dataset.navLevel === '1';

    if (isLevel1) {
      const parentRow = target.closest<HTMLElement>('[data-nav-row][data-nav-level="1"]');
      if (!parentRow) return null;
      const targetGroup = parentRow.closest<HTMLElement>('[data-nav-group]');
      const dragGroup = dragRow.closest<HTMLElement>('[data-nav-group]');
      if (!targetGroup || targetGroup === dragGroup) return null;
      const rect = parentRow.getBoundingClientRect();
      return {
        type: 'parent-row',
        row: parentRow,
        position: event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
      };
    }

    const childRow = target.closest<HTMLElement>('[data-nav-child-row]');
    if (childRow && childRow !== dragRow) {
      const rect = childRow.getBoundingClientRect();
      return {
        type: 'child-row',
        row: childRow,
        position: event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
      };
    }

    const childrenContainer = target.closest<HTMLElement>('[data-nav-children]');
    if (childrenContainer) {
      return { type: 'children-append', container: childrenContainer };
    }

    const parentRow = target.closest<HTMLElement>('[data-nav-row][data-nav-level="1"]');
    const parentGroup = parentRow?.closest<HTMLElement>('[data-nav-group]');
    const container = parentGroup ? query<HTMLElement>(parentGroup, '[data-nav-children]') : null;
    return container ? { type: 'children-append', container } : null;
  };

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const navButton = target.closest<HTMLButtonElement>('[data-nav-action]');
    if (navButton) {
      const group = navButton.closest<HTMLElement>('[data-nav-group]');
      if (!group) return;
      const action = navButton.dataset.navAction;
      if (action === 'up') moveGroup(group, -1);
      else if (action === 'down') moveGroup(group, 1);
      else if (action === 'add-child') addChildRow(group);
      else if (action === 'remove') removeGroup(group);
      return;
    }

    const childButton = target.closest<HTMLButtonElement>('[data-nav-child-action]');
    if (childButton) {
      const row = childButton.closest<HTMLElement>('[data-nav-child-row]');
      if (!row) return;
      const action = childButton.dataset.navChildAction;
      if (action === 'up') moveChildRow(row, -1);
      else if (action === 'down') moveChildRow(row, 1);
      else if (action === 'remove') removeChildRow(row);
    }
  });

  /* 新增自定义项的 id 输入回写 data-nav-id，保持 DOM 元数据与输入一致。 */
  root.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches('[data-nav-field="id"]')) return;
    const group = target.closest<HTMLElement>('[data-nav-group]');
    if (!group) return;
    const nextId = normalize(target.value);
    if (nextId) group.dataset.navId = nextId;
  });

  addNavButton.addEventListener('click', () => {
    const existingIds = new Set<string>();
    getGroups().forEach((group) => {
      existingIds.add(group.dataset.navId || '');
      const resolved = resolveGroupId(group);
      if (resolved) existingIds.add(resolved);
    });
    const item: SidebarNavItem = {
      id: createNextCustomNavId(existingIds),
      label: '自定义导航',
      ornament: null,
      visible: true,
      order: getGroups().length + 1,
      href: '/',
      children: []
    };
    const group = createGroup(item, { editableId: true });
    root.append(group);
    syncMoveButtons();
    query<HTMLInputElement>(group, '[data-nav-field="id"]')?.focus();
    notifyChange();
  });

  root.addEventListener('dragstart', (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.matches('[data-nav-drag-handle]')) return;
    const row = target.closest<HTMLElement>('[data-nav-row]');
    if (!row || !event.dataTransfer) return;
    dragRow = row;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', row.dataset.navId || row.dataset.navChildId || '');
    row.classList.add('admin-nav-tree__row--dragging');
  });

  root.addEventListener('dragover', (event) => {
    if (!dragRow) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const placement = resolveDropPlacement(event);
    clearDropIndicators();
    if (!placement) return;
    if (placement.type === 'children-append') {
      placement.container.classList.add('admin-nav-tree__children--drop-append');
      return;
    }
    placement.row.classList.add(
      placement.position === 'before'
        ? 'admin-nav-tree__row--drop-above'
        : 'admin-nav-tree__row--drop-below'
    );
  });

  root.addEventListener('dragleave', (event) => {
    if (!(event.relatedTarget instanceof Node) || root.contains(event.relatedTarget)) return;
    clearDropIndicators();
  });

  root.addEventListener('drop', (event) => {
    if (!dragRow) return;
    const placement = resolveDropPlacement(event);
    if (!placement) {
      clearDragState();
      return;
    }
    event.preventDefault();

    if (placement.type === 'parent-row') {
      const dragGroup = dragRow.closest<HTMLElement>('[data-nav-group]');
      const targetGroup = placement.row.closest<HTMLElement>('[data-nav-group]');
      if (dragGroup && targetGroup) {
        const reference = placement.position === 'before' ? targetGroup : targetGroup.nextElementSibling;
        if (reference !== dragGroup) root.insertBefore(dragGroup, reference);
      }
    } else if (placement.type === 'child-row') {
      const container = placement.row.parentElement;
      if (container) {
        const reference = placement.position === 'before' ? placement.row : placement.row.nextSibling;
        if (reference !== dragRow) container.insertBefore(dragRow, reference);
      }
    } else {
      placement.container.appendChild(dragRow);
    }

    clearDragState();
    syncMoveButtons();
    notifyChange();
  });

  root.addEventListener('dragend', clearDragState);

  /* 校验错误聚焦目标：ref 为导航 id 或分组序号；字段缺失时退到名称输入。 */
  const getNavFieldTarget = (
    ref: NavTreeGroupRef,
    field: NavTreeField
  ): (() => HTMLElement | null) => () => {
    const group = findGroup(ref);
    if (!group) return null;
    const labelInput = query<HTMLElement>(group, '[data-nav-field="label"]');
    if (field === 'id') {
      return query<HTMLElement>(group, '[data-nav-field="id"]') ?? labelInput;
    }
    if (field === 'label') return labelInput;
    if (field === 'ornament') {
      return query<HTMLElement>(group, '[data-nav-field="ornament"]') ?? labelInput;
    }
    if (field === 'href') {
      return query<HTMLElement>(group, '[data-nav-field="href"]') ?? labelInput;
    }
    return query<HTMLElement>(group, '[data-nav-field="visible"]') ?? labelInput;
  };

  const getNavChildFieldTarget = (
    ref: NavTreeGroupRef,
    childIndex: number,
    field: NavTreeChildField
  ): (() => HTMLElement | null) => () => {
    const group = findGroup(ref);
    if (!group) return null;
    const row = getChildRows(group)[childIndex];
    if (!row) return null;
    const labelInput = query<HTMLElement>(row, '[data-nav-child-field="label"]');
    if (field === 'label' || field === 'id') return labelInput;
    if (field === 'href') {
      return query<HTMLElement>(row, '[data-nav-child-field="href"]') ?? labelInput;
    }
    return query<HTMLElement>(row, '[data-nav-child-field="visible"]') ?? labelInput;
  };

  const getFirstNavLabelTarget = (): HTMLElement | null => {
    const group = getGroups()[0];
    return group ? query<HTMLElement>(group, '[data-nav-field="label"]') : null;
  };

  return {
    render,
    collect,
    getNavFieldTarget,
    getNavChildFieldTarget,
    getFirstNavLabelTarget,
    setOnChange: (listener: () => void): void => {
      changeListener = listener;
    }
  };
};
