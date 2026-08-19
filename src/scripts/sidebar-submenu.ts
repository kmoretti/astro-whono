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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSidebarSubmenus, { once: true });
} else {
  initSidebarSubmenus();
}
