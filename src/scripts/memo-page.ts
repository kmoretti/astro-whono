import { onPageChange } from './page-controllers';
import { initArticleLightbox, initCodeCopyButtons } from './lightbox';
import { applyMemoHeadingNumbers } from './memo-heading-numbers';

const initMemoPage = () => {
  // 根元素：生活小记正文容器；其他页面（或 Admin）直接跳过。
  const content = document.querySelector('.memo-content');
  if (!content) return;

  applyMemoHeadingNumbers(content);
  initCodeCopyButtons();
  initArticleLightbox({
    dialogId: 'lightbox',
    containerSelector: '.memo-page .content__inner',
    enableZoom: false,
    enablePan: false,
    enableSwipeDownClose: false
  });
};

if (typeof window !== 'undefined') onPageChange(initMemoPage);
