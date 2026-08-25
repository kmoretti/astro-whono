// swup 无刷新加载：公共页与 admin 控制台均启用；开关关闭时跳过（回退整页加载）
import Swup from 'swup';
import SwupScrollPlugin from '@swup/scroll-plugin';
import SwupPreloadPlugin from '@swup/preload-plugin';
import SwupHeadPlugin from '@swup/head-plugin';
import SwupBodyClassPlugin from '@swup/body-class-plugin';

const isEnabled = (): boolean => {
  return document.body.dataset.swupEnabled !== 'false';
};

// swup 用 DOMParser 解析新页面时脚本视为禁用,<noscript> 内的 <style>/<link>
// 会被解析为活动节点,插入 live DOM 后立即生效(如 bits 页 noscript 中的
// [data-bits-client-control]{display:none!important} 会隐藏年份筛选/搜索表单)。
// 能用 swup 的环境必然启用了 JS,noscript 对其无意义,直接移除激活的资源。
const stripActivatedNoscriptAssets = (): void => {
  document.querySelectorAll('noscript style, noscript link').forEach((node) => node.remove());
};

const initSwup = (): void => {
  if (!isEnabled()) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // admin 页面包含 module 脚本（管理控制台），module URL 去重导致 swup 替换容器后
  // 不会重跑初始化；为稳定起见 admin/* 路径直接走原生整页加载。
  const isAdminPath = (url: string): boolean => {
    try {
      return new URL(url, window.location.origin).pathname.startsWith('/admin/');
    } catch {
      return false;
    }
  };
  const swup = new Swup({
    // 替换容器：主内容壳与聚合菜单（后者按页 SSR 能力按钮需随导航更新）；
    // 星光 canvas 与持久脚本在容器外，动画不中断
    containers: ['.shell', '.global-action-menu'],
    animateHistoryBrowsing: true,
    // 减少动态偏好时禁用过渡动画，仅做内容替换
    animationSelector: reducedMotion ? false : '[class*="transition-"]',
    ignoreVisit: (url) => isAdminPath(url)
  });
  swup.use(new SwupScrollPlugin());
  swup.use(new SwupPreloadPlugin());
  // 同步按页差异化 CSS；已有样式/脚本保留不重复执行
  swup.use(new SwupHeadPlugin({ persistAssets: true }));
  // swup 4.x 核心不再同步 body class，用插件把目标页 bodyClass（如 essay-page）同步过来
  swup.use(new SwupBodyClassPlugin());
  // 容器替换完成后派发页面切换事件，驱动页面控制器重初始化与远程数据重拉取
  swup.hooks.on('content:replace', () => {
    // 在 head/容器同步之后清理 noscript 内被激活的 style/link（含 head 兜底样式）
    stripActivatedNoscriptAssets();
    window.dispatchEvent(new CustomEvent('astro-whono:page-change'));
  });
  // 无刷新导航补发 Umami PV
  swup.hooks.on('page:view', () => {
    const umami = (window as unknown as { umami?: { track?: () => void } }).umami;
    umami?.track?.();
  });
};

try {
  initSwup();
} catch (error) {
  // swup 初始化失败时静默回退常规导航
  console.error('[swup-init] failed, fallback to full page loads', error);
}
