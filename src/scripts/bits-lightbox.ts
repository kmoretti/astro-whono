import { initBitsLightbox } from './lightbox';
import { onPageChange } from './page-controllers';

const initBitsPageLightbox = () => {
  // 根元素:絮语页搜索表单;其他页面(或 Admin)没有 bits 卡片,直接跳过。
  if (!document.querySelector('[data-bits-search-form]')) return;

  initBitsLightbox({
    dialogId: 'lightbox',
    enableZoom: true,
    enablePan: true,
    enableSwipeDownClose: true,
    enableSwipeNav: true
  });
};

if (typeof window !== 'undefined') onPageChange(initBitsPageLightbox);
