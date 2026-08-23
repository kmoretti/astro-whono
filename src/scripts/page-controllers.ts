// 页面控制器切换调度：整页加载时执行一次，swup 无刷新导航后随
// astro-whono:page-change 事件重执行（由 swup-init.ts 在 content:replace 后派发）。
// 约定：init 必须幂等可重入 —— window/document 级监听器在模块顶层只绑一次，
// DOM 查询与元素绑定每次重做；根元素不存在时直接跳过。

export const onPageChange = (init: () => void): void => {
  init();
  window.addEventListener('astro-whono:page-change', init);
};
