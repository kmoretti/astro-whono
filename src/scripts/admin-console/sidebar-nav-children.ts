import type { SidebarNavChild, SidebarNavId } from '@/lib/theme-settings';
import { ADMIN_NAV_IDS, isAdminNavId } from '@/lib/admin-console/theme-shared';

type Query = <T extends Element>(parent: ParentNode, selector: string) => T | null;

type SidebarNavChildrenContext = {
  list: HTMLElement;
  addButton: HTMLButtonElement;
  query: Query;
};

const normalize = (value: unknown): string => String(value ?? '').trim();

const createElement = <T extends keyof HTMLElementTagNameMap>(tagName: T, className?: string): HTMLElementTagNameMap[T] => {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  return element;
};

const createInput = (
  type: 'text' | 'number' | 'url',
  field: string,
  value: string,
  label: string
): HTMLInputElement => {
  const input = createElement('input', 'admin-field__control admin-field__control--soft');
  input.type = type;
  input.value = value;
  input.dataset.navChildField = field;
  input.setAttribute('aria-label', label);
  if (type === 'number') {
    input.min = '1';
    input.step = '1';
    input.inputMode = 'numeric';
  }
  if (type === 'url') input.inputMode = 'url';
  return input;
};

const createRow = (child: SidebarNavChild, parentId: SidebarNavId): HTMLElement => {
  const row = createElement('div', 'admin-nav-child-row');
  row.dataset.navChildRow = '';
  row.dataset.navChildId = child.id;

  const parentLabel = createElement('label', 'admin-field admin-nav-child-field');
  const parentText = createElement('span', 'admin-nav-child-cell-label');
  parentText.textContent = '所属';
  const parent = createElement('select', 'admin-field__control admin-field__control--soft');
  parent.dataset.navChildField = 'parentId';
  parent.setAttribute('aria-label', '子导航所属一级导航');
  const labels: Record<SidebarNavId, string> = {
    essay: '随笔',
    bits: '絮语',
    memo: '小记',
    archive: '归档',
    about: '关于',
    links: '友链'
  };
  ADMIN_NAV_IDS.forEach((id) => {
    const option = createElement('option');
    option.value = id;
    option.textContent = labels[id];
    option.selected = id === parentId;
    parent.append(option);
  });
  parentLabel.append(parentText, parent);

  const label = createElement('label', 'admin-field admin-nav-child-field');
  const labelText = createElement('span', 'admin-nav-child-cell-label');
  labelText.textContent = '名称';
  label.append(labelText, createInput('text', 'label', child.label, '子导航名称'));

  const href = createElement('label', 'admin-field admin-nav-child-field');
  const hrefText = createElement('span', 'admin-nav-child-cell-label');
  hrefText.textContent = '路径';
  href.append(hrefText, createInput('url', 'href', child.href, '子导航站内路径'));

  const order = createElement('label', 'admin-field admin-nav-child-field admin-nav-child-field--order');
  const orderText = createElement('span', 'admin-nav-child-cell-label');
  orderText.textContent = '排序';
  order.append(orderText, createInput('number', 'order', String(child.order), '子导航排序'));

  const visible = createElement('label', 'admin-toggle admin-nav-child-visible');
  const visibleText = createElement('span', 'admin-nav-child-cell-label');
  visibleText.textContent = '展示';
  const visibleInput = createElement('input');
  visibleInput.type = 'checkbox';
  visibleInput.checked = child.visible;
  visibleInput.dataset.navChildField = 'visible';
  visibleInput.setAttribute('aria-label', '子导航是否展示');
  visible.append(visibleText, visibleInput);

  const actions = createElement('div', 'admin-nav-child-actions');
  const remove = createElement('button', 'admin-btn admin-btn--ghost admin-btn--compact');
  remove.type = 'button';
  remove.textContent = '删除';
  remove.dataset.navChildAction = 'remove';
  remove.setAttribute('aria-label', `删除子导航 ${child.label}`);
  actions.append(remove);

  row.append(parentLabel, label, href, order, visible, actions);
  return row;
};

export const createSidebarNavChildren = ({ list, addButton, query }: SidebarNavChildrenContext) => {
  const getRows = (): HTMLElement[] => Array.from(list.querySelectorAll<HTMLElement>('[data-nav-child-row]'));

  const getNextId = (): string => {
    const ids = new Set(getRows().map((row) => row.dataset.navChildId || ''));
    let index = 1;
    let id = `nav-child-${index}`;
    while (ids.has(id)) id = `nav-child-${++index}`;
    return id;
  };

  const render = (items: ReadonlyArray<{ parentId: SidebarNavId; child: SidebarNavChild }>): void => {
    const header = list.querySelector<HTMLElement>('.admin-nav-child-header');
    list.replaceChildren(
      ...(header ? [header] : []),
      ...items.map(({ parentId, child }) => createRow(child, parentId))
    );
  };

  const collect = (): Array<{ parentId: SidebarNavId; child: SidebarNavChild }> => getRows().flatMap((row, index) => {
    const parentIdRaw = query<HTMLSelectElement>(row, '[data-nav-child-field="parentId"]')?.value ?? '';
    const parentId = isAdminNavId(parentIdRaw) ? parentIdRaw : ADMIN_NAV_IDS[0];
    const id = normalize(row.dataset.navChildId) || getNextId();
    const label = normalize(query<HTMLInputElement>(row, '[data-nav-child-field="label"]')?.value);
    const href = normalize(query<HTMLInputElement>(row, '[data-nav-child-field="href"]')?.value);
    const orderRaw = Number.parseInt(query<HTMLInputElement>(row, '[data-nav-child-field="order"]')?.value || '', 10);
    const visible = Boolean(query<HTMLInputElement>(row, '[data-nav-child-field="visible"]')?.checked);
    return [{ parentId, child: { id, label, href, order: Number.isFinite(orderRaw) ? orderRaw : index + 1, visible } }];
  });

  addButton.addEventListener('click', () => {
    const firstParent = ADMIN_NAV_IDS[0];
    const child = { id: getNextId(), label: '', href: '/', order: getRows().length + 1, visible: true } satisfies SidebarNavChild;
    const row = createRow(child, firstParent);
    list.append(row);
    query<HTMLInputElement>(row, '[data-nav-child-field="label"]')?.focus();
  });

  list.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.matches('[data-nav-child-action="remove"]')) return;
    const row = target.closest<HTMLElement>('[data-nav-child-row]');
    if (!row || !window.confirm('确定删除这个子导航吗？')) return;
    row.remove();
  });

  return { getRows, render, collect };
};
