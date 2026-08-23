import { onPageChange } from './page-controllers';

type HeadingPosition = {
  id: string;
  top: number;
};

export const getActiveHeadingId = (headings: HeadingPosition[], offset: number) => {
  const visibleHeading = headings
    .filter((heading) => heading.top <= offset)
    .at(-1);
  return visibleHeading?.id ?? headings[0]?.id ?? null;
};

export const getScrollBehavior = (reducedMotion: boolean): ScrollBehavior =>
  reducedMotion ? 'auto' : 'smooth';

type ArticleTocController = {
  isOpen: () => boolean;
  containsTarget: (target: Node) => boolean;
  close: (restoreFocus: boolean) => void;
};

let controller: ArticleTocController | null = null;

const initArticleToc = () => {
  const toc = document.querySelector<HTMLDetailsElement>('.article-toc-float');
  if (!toc) {
    controller = null;
    return;
  }

  const panel = toc.querySelector<HTMLElement>('.article-toc-float__panel');
  const links = Array.from(toc.querySelectorAll<HTMLAnchorElement>('.article-toc__items a'));
  const headingElements = links
    .map((link) => document.getElementById(link.hash.slice(1)))
    .filter((heading): heading is HTMLElement => heading instanceof HTMLElement);
  let lastFocusedElement: HTMLElement | null = null;

  const focusFirstLink = () => links[0]?.focus();
  const close = (restoreFocus: boolean) => {
    if (!toc.open) return;
    toc.open = false;
    if (restoreFocus) {
      lastFocusedElement?.focus();
    }
  };

  toc.addEventListener('toggle', () => {
    if (toc.open) {
      lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      window.requestAnimationFrame(focusFirstLink);
    }
  });

  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.getElementById(link.hash.slice(1));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: getScrollBehavior(window.matchMedia('(prefers-reduced-motion: reduce)').matches), block: 'start' });
      history.replaceState(null, '', link.hash);
      close(false);
      link.focus({ preventScroll: true });
    });
  });

  if (panel) {
    panel.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab' || !toc.open || links.length === 0) return;
      const first = links[0];
      const last = links.at(-1) as HTMLAnchorElement;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    });
  }

  if ('IntersectionObserver' in window && headingElements.length) {
    const observer = new IntersectionObserver(
      () => {
        const positions = headingElements.map((heading) => ({ id: heading.id, top: heading.getBoundingClientRect().top }));
        const activeId = getActiveHeadingId(positions, 128);
        links.forEach((link) => {
          const active = link.hash === `#${activeId}`;
          link.classList.toggle('is-active', active);
          link.setAttribute('aria-current', active ? 'location' : 'false');
        });
      },
      { rootMargin: '-96px 0px -65% 0px', threshold: [0, 1] }
    );
    headingElements.forEach((heading) => observer.observe(heading));
  }

  controller = {
    isOpen: () => toc.open,
    containsTarget: (target: Node) => toc.contains(target),
    close
  };
};

if (typeof window !== 'undefined') {
  // document 级监听器模块顶层只绑一次,通过 controller 作用于当前页面的目录组件,
  // swup 导航后由 init 重新查询并替换 controller。
  document.addEventListener('click', (event) => {
    if (!controller?.isOpen()) return;
    if (event.target instanceof Node && !controller.containsTarget(event.target)) {
      controller.close(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && controller?.isOpen()) {
      event.preventDefault();
      controller.close(true);
    }
  });

  onPageChange(initArticleToc);
}
