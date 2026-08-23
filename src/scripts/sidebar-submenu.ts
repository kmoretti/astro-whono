import { onPageChange } from './page-controllers';

const closeSubmenu = (button: HTMLButtonElement, submenu: HTMLElement) => {
  button.setAttribute('aria-expanded', 'false');
  submenu.hidden = true;
};

const toggleSubmenu = (button: HTMLButtonElement) => {
  const submenuId = button.getAttribute('aria-controls');
  const submenu = submenuId ? document.getElementById(submenuId) : null;
  if (!submenu) return;

  const isExpanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!isExpanded));
  submenu.hidden = isExpanded;
};

const initSidebarSubmenus = () => {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-sidebar-submenu-toggle]'));
  if (buttons.length === 0) return;

  buttons.forEach((button) => {
    button.addEventListener('click', () => toggleSubmenu(button));
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const submenuId = button.getAttribute('aria-controls');
      const submenu = submenuId ? document.getElementById(submenuId) : null;
      if (!submenu || button.getAttribute('aria-expanded') !== 'true') return;
      event.preventDefault();
      closeSubmenu(button, submenu);
      button.focus();
    });
  });
};

// swup 导航后重初始化：按钮随 .sidebar（.shell 容器内）替换，
// 旧监听随旧元素失效，这里对新按钮重做绑定。
onPageChange(() => {
  if (!document.querySelector('.sidebar')) return;
  initSidebarSubmenus();
});
