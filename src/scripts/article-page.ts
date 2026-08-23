import { onPageChange } from './page-controllers';
import { initArticleLightbox, initCodeCopyButtons } from './lightbox';

const initArticlePage = () => {
  // 根元素：文章页阅读布局容器；其他页面（或 Admin）没有该结构，直接跳过。
  if (!document.querySelector('.article-reading-layout')) return;

  initCodeCopyButtons();
  initArticleLightbox({
    dialogId: 'lightbox',
    containerSelector: '.prose',
    enableZoom: false,
    enablePan: false,
    enableSwipeDownClose: false
  });
};

if (typeof window !== 'undefined') onPageChange(initArticlePage);
