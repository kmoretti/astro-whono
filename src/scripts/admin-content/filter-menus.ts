import { initAdminDetailsMenus } from './details-menu';
import { onPageChange } from '../page-controllers';

const CLEANUP_KEY = '__astroWhonoAdminContentFilterMenusCleanup';
type WindowWithAdminContentFilterMenus = Window & {
  [CLEANUP_KEY]?: () => void;
};

const initAdminContentFilterMenus = () => {
  const windowWithCleanup = window as WindowWithAdminContentFilterMenus;
  windowWithCleanup[CLEANUP_KEY]?.();

  const cleanupCallbacks = [
    initAdminDetailsMenus({
      selector: '.admin-content-filter-menu'
    }),
    initAdminDetailsMenus({
      selector: '.admin-content-source-error'
    })
  ];

  windowWithCleanup[CLEANUP_KEY] = () => {
    cleanupCallbacks.forEach((cleanup) => cleanup());
  };
};

if (typeof window !== 'undefined') {
  // swup 导航回到本页时重初始化(自带 cleanup 机制防止监听累积)。
  onPageChange(initAdminContentFilterMenus);
}
