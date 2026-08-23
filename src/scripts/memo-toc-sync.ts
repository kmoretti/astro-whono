import { onPageChange } from './page-controllers';

// 生活小记目录：移动端（≤640px）默认折叠、桌面端默认展开。
// 媒体查询监听器模块顶层只绑一次；sync 每次整页加载 / swup 导航后
// 对当前页面的 .memo-toc details 重新应用展开状态。
const createSyncMemoTocOpenState = (mq: MediaQueryList) => () => {
  const toc = document.querySelector('.memo-toc');
  if (!toc) return;
  if (mq.matches) {
    toc.querySelectorAll('details[open]').forEach((el) => {
      el.removeAttribute('open');
    });
  } else {
    toc.querySelectorAll('details:not([open])').forEach((el) => {
      el.setAttribute('open', '');
    });
  }
};

if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(max-width: 640px)');
  const syncMemoTocOpenState = createSyncMemoTocOpenState(mq);
  mq.addEventListener('change', syncMemoTocOpenState);
  onPageChange(syncMemoTocOpenState);
}
