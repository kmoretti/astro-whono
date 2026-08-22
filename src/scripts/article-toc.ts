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

const initArticleToc = () => {
  const toc = document.querySelector<HTMLDetailsElement>('.article-toc-float');
  if (!toc) return;

  const button = toc.querySelector<HTMLElement>('.article-toc-float__button');
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
      (lastFocusedElement ?? button)?.focus();
    }
  };

  toc.addEventListener('toggle', () => {
    if (toc.open) {
      lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : button;
      window.requestAnimationFrame(focusFirstLink);
    }
  });

  document.addEventListener('click', (event) => {
    if (toc.open && event.target instanceof Node && !toc.contains(event.target)) {
      close(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toc.open) {
      event.preventDefault();
      close(true);
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
      link.focus();
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
};

if (typeof window !== 'undefined') initArticleToc();
