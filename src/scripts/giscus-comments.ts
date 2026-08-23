import { onPageChange } from './page-controllers';

// giscus 主题不能直接用 preferred_color_scheme：站点有自己的明暗切换（含跟随系统），
// 因此按 html[data-theme] 的当前值注入初始主题，并用 MutationObserver 监听切换，
// 通过 postMessage 通知 giscus iframe 实时换肤。
// swup 导航后评论容器随 .shell 重建，mountGiscus 需重新执行；
// MutationObserver 与 lastTheme 状态保持在模块顶层，只维护一份。
const GISCUS_ORIGIN = 'https://giscus.app';

const getSiteTheme = (): 'light' | 'dark' =>
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

const mountGiscus = (): void => {
  const frame = document.querySelector<HTMLElement>('[data-giscus-comments] .giscus-comments__frame');
  // 旧页面的 giscus client script 随 .shell 一同被替换；仅当文档中仍存在时防重复注入。
  if (!frame || document.querySelector('script[src*="giscus.app/client.js"]')) return;

  const root = frame.closest<HTMLElement>('[data-giscus-comments]');
  const script = document.createElement('script');
  script.src = `${GISCUS_ORIGIN}/client.js`;
  script.crossOrigin = 'anonymous';
  script.async = true;

  const config: Record<string, string> = {
    repo: root?.dataset.repo ?? '',
    'repo-id': root?.dataset.repoId ?? '',
    category: root?.dataset.category ?? '',
    'category-id': root?.dataset.categoryId ?? '',
    mapping: root?.dataset.mapping ?? 'pathname',
    strict: root?.dataset.strict ?? '1',
    'reactions-enabled': root?.dataset.reactionsEnabled ?? '1',
    'emit-metadata': '0',
    'input-position': root?.dataset.inputPosition ?? 'top',
    lang: root?.dataset.lang ?? 'zh-CN',
    loading: 'lazy',
    theme: getSiteTheme()
  };
  Object.entries(config).forEach(([key, value]) => {
    script.setAttribute(`data-${key}`, value);
  });

  frame.append(script);
};

let lastTheme: 'light' | 'dark' | null = null;

const syncGiscusTheme = (): void => {
  const theme = getSiteTheme();
  if (theme === lastTheme) return;
  lastTheme = theme;
  const iframe = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
  iframe?.contentWindow?.postMessage({ giscus: { setConfig: { theme } } }, GISCUS_ORIGIN);
};

if (typeof window !== 'undefined') {
  new MutationObserver(syncGiscusTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });

  onPageChange(mountGiscus);
}
