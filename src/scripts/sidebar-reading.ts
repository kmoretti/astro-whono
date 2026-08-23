import { onPageChange } from './page-controllers';

const body = document.body;

// swup 导航后重初始化：#reader-toggle 随 .global-action-menu 容器替换、
// #reader-exit 随 .shell 容器替换，两个引用由 initReader 每次重查。
let readerBtn: HTMLElement | null = null;
let readerExit: HTMLElement | null = null;

const setControlLabel = (element: HTMLElement, label: string) => {
  element.setAttribute('aria-label', label);
  if (element.hasAttribute('data-tooltip')) {
    element.setAttribute('data-tooltip', label);
    element.removeAttribute('title');
    return;
  }
  element.setAttribute('title', label);
};

const isReaderOn = () => body?.dataset.reading === 'immersive';

const notifyReadingModeChange = () => {
  window.dispatchEvent(new CustomEvent('astro-whono:reading-mode-change'));
};

const setReaderDisabled = (disabled: boolean) => {
  if (!readerBtn) return;
  readerBtn.setAttribute('aria-pressed', 'false');
  readerBtn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  if (disabled) {
    setControlLabel(readerBtn, '阅读模式（仅文章/小记页可用）');
    readerBtn.tabIndex = -1;
  } else {
    setControlLabel(readerBtn, '阅读模式');
    readerBtn.tabIndex = 0;
  }
};

const setVisible = (el: HTMLElement | null, visible: boolean) => {
  if (!el) return;
  if (visible) {
    el.dataset.visible = 'true';
    el.removeAttribute('aria-hidden');
    el.tabIndex = 0;
  } else {
    delete el.dataset.visible;
    el.setAttribute('aria-hidden', 'true');
    el.tabIndex = -1;
  }
};

const applyReader = (on: boolean) => {
  if (!body) return;
  if (on) {
    body.dataset.reading = 'immersive';
  } else {
    delete body.dataset.reading;
  }
  if (readerBtn) {
    readerBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  if (readerExit) {
    setControlLabel(readerExit, '退出阅读');
  }
  setVisible(readerExit, on);
  notifyReadingModeChange();
};

const initReader = () => {
  readerBtn = document.getElementById('reader-toggle');
  readerExit = document.getElementById('reader-exit');
  if (!readerBtn) return;

  // body class 由 swup 的 body-class-plugin 在导航时同步，须每次 init 重判。
  const isImmersivePage = body?.classList.contains('immersive-page');
  if (!isImmersivePage) {
    setReaderDisabled(true);
    return;
  }

  setReaderDisabled(false);
  applyReader(false);

  readerBtn.addEventListener('click', () => {
    applyReader(!isReaderOn());
  });

  readerExit?.addEventListener('click', () => {
    applyReader(false);
  });
};

onPageChange(() => {
  if (!document.querySelector('[data-global-action-menu]')) return;
  initReader();
});

export {};
