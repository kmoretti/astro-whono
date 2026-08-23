import { loadEch0EchoPage, type Ech0NormalizedEcho, type Ech0ExtensionType } from '../lib/ech0-bits';
import { unified } from 'unified';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { onPageChange } from './page-controllers';

const markdownSanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    src: ['http', 'https']
  }
};

// markdown 管道在模块级只构建一次,重初始化时复用。
const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeRaw)
  .use(rehypeSanitize, markdownSanitizeSchema)
  .use(rehypeStringify);

const escapeHtml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const unwrapMarkdownUrl = (value: string) => value.replace(/(!?\[[^\]]*\]\()(`+)(https?:\/\/[^\s`]+)\2(\))/g, '$1$3$4');
const markdown = async (value: string) => {
  const normalized = unwrapMarkdownUrl(value.replace(/\r\n?/g, '\n'));
  const tree = await markdownProcessor.run(markdownProcessor.parse(normalized));
  return String(markdownProcessor.stringify(tree));
};
const enhanceRemoteImages = (article: HTMLElement) => {
  article.querySelectorAll<HTMLImageElement>('.bit-body img').forEach((image) => {
    const originalUrl = image.getAttribute('src') ?? '';
    const sourceUrl = safeExternalUrl(originalUrl);
    const container = document.createElement('div');
    container.className = 'bit-remote-image';
    container.dataset.state = sourceUrl ? 'loading' : 'failed';

    const imageLink = document.createElement('a');
    imageLink.className = 'bit-remote-image__link';
    imageLink.target = '_blank';
    imageLink.rel = 'noopener noreferrer';
    if (sourceUrl) imageLink.href = sourceUrl;

    const fallback = document.createElement('div');
    fallback.className = 'bit-remote-image__fallback';
    const fallbackText = document.createElement('span');
    fallbackText.textContent = '图片不可用';
    fallback.append(fallbackText);
    if (sourceUrl) {
      const fallbackLink = document.createElement('a');
      fallbackLink.href = sourceUrl;
      fallbackLink.target = '_blank';
      fallbackLink.rel = 'noopener noreferrer';
      fallbackLink.textContent = '打开原图链接';
      fallback.append(fallbackLink);
    } else {
      const unavailable = document.createElement('span');
      unavailable.textContent = '原图链接不可用';
      fallback.append(unavailable);
    }

    image.parentNode?.replaceChild(container, image);
    imageLink.append(image);
    container.append(imageLink, fallback);

    if (!sourceUrl) return;
    const markLoaded = () => { container.dataset.state = 'loaded'; };
    const markFailed = () => { container.dataset.state = 'failed'; };
    image.addEventListener('load', markLoaded, { once: true });
    image.addEventListener('error', markFailed, { once: true });
    if (image.complete) {
      if (image.naturalWidth > 0) markLoaded();
      else markFailed();
    }
  });
};
const dateLabel = (date: Date | null) => date ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(date) : '';
const getPayloadText = (payload: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};
const getPayloadNumber = (payload: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = payload[key];
    const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
    if (Number.isFinite(number)) return number;
  }
  return null;
};
const safeExternalUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
};
const extension = (item: Ech0NormalizedEcho) => {
  if (!item.extension) return '';
  const { type, payload } = item.extension;
  const labels: Record<Ech0ExtensionType, string> = {
    MUSIC: '音乐', VIDEO: '视频', GITHUBPROJ: 'GitHub 项目', WEBSITE: '网页', LOCATION: '位置', TWEET: 'Tweet'
  };
  const address = getPayloadText(payload, ['placeholder', 'address', 'full_address', 'formatted_address', 'location', 'name', 'title', 'text']);
  const latitude = getPayloadNumber(payload, ['latitude', 'lat']);
  const longitude = getPayloadNumber(payload, ['longitude', 'lng', 'lon']);
  const site = getPayloadText(payload, ['site']);
  const directUrl = safeExternalUrl(type === 'WEBSITE' ? site : getPayloadText(payload, ['url', 'link', 'html_url', 'web_url', 'site']));
  const siteHostname = type === 'WEBSITE' && directUrl ? new URL(directUrl).hostname : '';
  const title = type === 'LOCATION'
    ? address
    : type === 'WEBSITE'
      ? getPayloadText(payload, ['title']) || labels[type]
      : getPayloadText(payload, ['title', 'name', 'text', 'full_name']) || labels[type];
  const mapUrl = latitude !== null && longitude !== null
    ? `https://www.openstreetmap.org/?mlat=${encodeURIComponent(latitude)}&mlon=${encodeURIComponent(longitude)}#map=16/${encodeURIComponent(latitude)}/${encodeURIComponent(longitude)}`
    : address
      ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`
      : '';
  const actionUrl = type === 'LOCATION' ? mapUrl : directUrl;
  const detail = type === 'LOCATION' && latitude !== null && longitude !== null
    ? `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
    : type === 'WEBSITE'
      ? siteHostname
      : getPayloadText(payload, ['artist', 'author', 'description', 'owner', 'username']);
  const content = `<div class="bit-remote-extension__heading"><strong>${escapeHtml(labels[type])}</strong><span class="bit-remote-extension__title">${escapeHtml(title)}</span></div>${detail ? `<small>${escapeHtml(detail)}</small>` : ''}${actionUrl ? `<span class="bit-remote-extension__action">${type === 'LOCATION' ? '查看地图' : '打开'}</span>` : ''}`;
  const card = `<div class="bit-remote-extension bit-remote-extension--${type.toLowerCase()}"${actionUrl ? ` data-extension-url="${escapeHtml(actionUrl)}"` : ''}>${content}</div>`;
  return actionUrl && (type === 'WEBSITE' || type === 'LOCATION')
    ? `<a class="bit-remote-extension__link" href="${escapeHtml(actionUrl)}" target="_blank" rel="noopener noreferrer">${card}</a>`
    : card;
};
const stripMarkdownImages = (value: string) => value.replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim();
const toIndexItem = (item: Ech0NormalizedEcho) => ({
  key: item.stableId,
  slug: item.stableId,
  title: '',
  description: stripMarkdownImages(item.content),
  tags: item.tagNames,
  text: stripMarkdownImages(item.content),
  excerpt: stripMarkdownImages(item.content).slice(0, 180),
  date: item.createdAtIso,
  dateLabel: dateLabel(item.createdAt),
  year: item.createdAt?.getFullYear() ?? null,
  page: 1,
  href: `#bit-${item.stableId}`,
  thumbnail: null
});

const normalizeDedupeText = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
const getLocalDedupeKey = (card: HTMLElement) => {
  const content = normalizeDedupeText(card.dataset.bitContent ?? '');
  const date = card.dataset.bitDate ?? 'unknown';
  return content ? `${content}|${date}` : '';
};
const getDateValue = (card: HTMLElement) => {
  const value = Date.parse(card.dataset.bitDate ?? '');
  return Number.isNaN(value) ? null : value;
};

const initBitsRemote = async () => {
  // 根元素:远程絮语状态节点;其他页面没有远程絮语,直接跳过。
  const remoteList = document.querySelector<HTMLElement>('[data-bits-remote-list]');
  const localList = document.querySelector<HTMLElement>('[data-bits-local-list]');
  const state = document.querySelector<HTMLElement>('[data-bits-remote-state]');
  if (!remoteList || !state) return;
  // render 的全量重排会 detach 列表内的非卡片节点,重初始化前先清掉上一轮
  // 遗留在列表尾部的「加载更多」节点,避免重复堆积。
  remoteList.querySelector('[data-bits-remote-more]')?.remove();
  const config = state.dataset;
  const enabled = config.bitsRemoteEnabled === 'true';
  const showError = config.bitsRemoteShowError !== 'false';
  const sourceLabel = 'Ech0 远程';
  const pageSize = Number(config.bitsRemotePageSize || 10);
  const maxPages = Number(config.bitsRemoteMaxPages || 3);
  const sourceUrl = config.bitsRemoteSourceUrl || '';
  const authorName = config.bitsAuthorName || '远程絮语';
  const authorAvatar = config.bitsAuthorAvatar || '';

  const render = async (items: Ech0NormalizedEcho[], seenKeys: Set<string>) => {
    const localKeys = new Set(Array.from((localList ?? remoteList).querySelectorAll<HTMLElement>('[data-bit]:not([data-bit-remote])')).map(getLocalDedupeKey).filter(Boolean));
    const fragment = document.createDocumentFragment();
    for (const item of items) {
      const key = `${normalizeDedupeText(item.content)}|${item.createdAtIso ?? 'unknown'}`;
      if (localKeys.has(key) || seenKeys.has(item.stableId) || seenKeys.has(key)) continue;
      seenKeys.add(item.stableId);
      seenKeys.add(key);
      const article = document.createElement('article');
      article.className = 'bit-card bit-card--remote';
      article.id = `bit-${item.stableId}`;
      article.dataset.bit = '';
      article.dataset.bitKey = item.stableId;
      article.dataset.bitDate = item.createdAtIso ?? '';
      article.dataset.bitContent = item.content;
      article.dataset.bitRemote = 'true';
      article.dataset.bitRemoteTags = item.tagNames.join('|');
      article.dataset.bitRemoteYear = item.createdAt ? String(item.createdAt.getFullYear()) : '';
      const body = await markdown(item.content);
      article.innerHTML = `<div class="bit-author"><div class="avatar${authorAvatar ? ' avatar--image' : ' is-fallback'}" aria-hidden="true">${authorAvatar ? `<img src="${escapeHtml(authorAvatar)}" alt="" width="32" height="32" loading="lazy" decoding="async" onerror="this.parentElement?.classList.add('is-fallback'); this.remove();" />` : ''}<span class="avatar-fallback">${escapeHtml(Array.from(authorName)[0] || '远')}</span></div><div class="name">${escapeHtml(authorName)} <span class="bit-remote-source" data-source="ech0">${sourceLabel}</span></div></div><div class="bit-body">${body}</div>${extension(item)}<div class="bit-meta"><div class="bit-tags">${item.tagNames.map((tag) => `<span class="bit-tag bit-tag--normal">#${escapeHtml(tag)}</span>`).join('')}</div><time datetime="${escapeHtml(item.createdAtIso ?? '')}">${escapeHtml(dateLabel(item.createdAt))}</time></div>`;
      enhanceRemoteImages(article);
      fragment.append(article);
    }
    remoteList.append(fragment);
    const cards = Array.from(remoteList.querySelectorAll<HTMLElement>('[data-bit]'));
    cards.sort((left, right) => (getDateValue(right) ?? Number.NEGATIVE_INFINITY) - (getDateValue(left) ?? Number.NEGATIVE_INFINITY));
    remoteList.replaceChildren(...cards);
    // replaceChildren 会 detach 状态胶囊与「加载更多」节点,重新插回保持可见。
    if (state.parentElement !== remoteList) remoteList.prepend(state);
    if (moreWrap.parentElement !== remoteList) remoteList.append(moreWrap);
  };

  // 「加载更多」节点:置于远程列表内部尾部,随 tab 显隐与 swup 容器替换一起管理。
  const moreWrap = document.createElement('div');
  moreWrap.className = 'bits-remote-more';
  moreWrap.dataset.bitsRemoteMore = '';
  moreWrap.hidden = true;
  const moreButton = document.createElement('button');
  moreButton.type = 'button';
  moreButton.className = 'bits-remote-more__button';
  moreButton.textContent = '加载更多';
  const moreHint = document.createElement('span');
  moreHint.className = 'bits-remote-more__hint';
  moreWrap.append(moreButton, moreHint);
  remoteList.append(moreWrap);

  // 每次初始化(swup 导航后)都重新拉取远程 Ech0 数据并渲染。
  if (!enabled) {
    state.hidden = false;
    state.dataset.state = 'disabled';
    state.textContent = '远程絮语未启用，当前显示本地内容。';
    remoteList.prepend(state);
  } else if (!sourceUrl) {
    state.hidden = false;
    state.dataset.state = 'error';
    state.textContent = showError ? '远程絮语未配置来源，当前显示本地内容。' : '';
    if (!showError) state.hidden = true;
    remoteList.prepend(state);
  } else {
    state.hidden = false;
    state.dataset.state = 'loading';
    state.textContent = '加载中…';
    remoteList.prepend(state);

    // 渐进式分页:初始只拉第 1 页,「加载更多」按需追加,上限 maxPages 页。
    const seenKeys = new Set<string>();
    const loadedItems: Ech0NormalizedEcho[] = [];
    let nextPage = 1;
    let total = 0;
    let generation = 0;

    const syncMoreUi = () => {
      const loadedCount = remoteList.querySelectorAll('[data-bit-remote]').length;
      const reachedPageLimit = nextPage > maxPages;
      const hasMore = loadedCount < total && !reachedPageLimit;
      moreWrap.hidden = !hasMore;
      moreButton.disabled = false;
      moreButton.textContent = '加载更多';
      moreHint.textContent = `已显示 ${loadedCount} / 共 ${total} 条`;
      if (!hasMore && total > loadedCount && loadedCount > 0) {
        state.dataset.state = 'partial';
        state.textContent = `已加载 ${loadedCount} / ${total} 条远程絮语，更多内容请前往数据源查看`;
      }
    };

    const loadPage = async () => {
      const currentGeneration = ++generation;
      moreButton.disabled = true;
      moreButton.textContent = '加载中…';
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 12000);
      try {
        const result = await loadEch0EchoPage({ sourceUrl, page: nextPage, pageSize, signal: controller.signal });
        if (currentGeneration !== generation) return;
        nextPage += 1;
        total = result.total;
        loadedItems.push(...result.items);
        await render(result.items, seenKeys);
        window.dispatchEvent(new CustomEvent('bits:remote-loaded', { detail: { items: loadedItems.map(toIndexItem) } }));
        const loadedCount = remoteList.querySelectorAll('[data-bit-remote]').length;
        if (total === 0) {
          state.dataset.state = 'empty';
          state.textContent = '暂无远程絮语，当前显示本地内容。';
        } else {
          state.dataset.state = 'ready';
          state.textContent = loadedCount ? `已加载 ${loadedCount} 条远程絮语` : '暂无新的远程絮语，当前显示本地内容。';
        }
        syncMoreUi();
      } catch {
        if (currentGeneration !== generation) return;
        state.dataset.state = 'error';
        state.textContent = showError ? '远程絮语加载失败，已保留本地内容。' : '';
        if (!showError) state.hidden = true;
        moreWrap.hidden = true;
        return;
      } finally {
        window.clearTimeout(timeout);
      }
    };

    moreButton.addEventListener('click', () => { void loadPage(); });
    await loadPage();
  }

  /* Tab switching */
  const tabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-bits-tab]'));
  const paginationEl = document.querySelector<HTMLElement>('[data-bits-local-pagination]');
  const newBtn = document.querySelector<HTMLButtonElement>('[data-new-bit]');

  const applyTabVisibility = (tab: 'local' | 'remote') => {
    const isLocal = tab === 'local';
    localList?.toggleAttribute('hidden', !isLocal);
    remoteList?.toggleAttribute('hidden', isLocal);
    paginationEl?.toggleAttribute('hidden', !isLocal);
    newBtn?.toggleAttribute('hidden', !isLocal);
    tabButtons.forEach((btn) => {
      const isBtnActive = btn.dataset.bitsTab === tab;
      btn.classList.toggle('is-active', isBtnActive);
      btn.setAttribute('aria-selected', String(isBtnActive));
    });
    window.dispatchEvent(new CustomEvent('bits:tab-changed', { detail: { tab } }));
  };

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = (btn.dataset.bitsTab === 'remote' ? 'remote' : 'local') as 'local' | 'remote';
      applyTabVisibility(tab);
    });
  });
};

if (typeof window !== 'undefined') onPageChange(() => { void initBitsRemote(); });
