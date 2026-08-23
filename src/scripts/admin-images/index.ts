import { initAdminImagesConsole } from './controller';
import { onPageChange } from '../page-controllers';

if (typeof window !== 'undefined') {
  // swup 导航回到本页时重新初始化(控件均为元素级监听,随旧 DOM 移除)。
  onPageChange(initAdminImagesConsole);
}
