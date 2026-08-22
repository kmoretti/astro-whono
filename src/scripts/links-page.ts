import {
  LATENCY_SOURCE_URL,
  LINKS_CACHE_VERSION,
  LINKS_SOURCE_URL,
  TOMBSTONE_SOURCE_URL,
  createLatencyIndex,
  getLatencyIndexKey,
  filterLinkGroups,
  normalizeLatencyData,
  parseLinksYaml,
  parseTombstoneYaml,
  readLinksCache,
  writeLinksCache,
  collectLinkTags,
  type LinksCacheRecord,
  type LinksCacheReadResult,
  type StorageLike,
  type NormalizedLinkGroup,
  type NormalizedLinkItem
} from '../lib/links-data';

const root = document.querySelector<HTMLElement>('[data-links-root]');
if (!root) {
  // The module is loaded only by the links route, but keep it harmless if bundled elsewhere.
} else {
  const statusEl = root.querySelector<HTMLElement>('[data-links-status]');
  const summaryEl = root.querySelector<HTMLElement>('[data-links-summary]');
  const filtersEl = root.querySelector<HTMLElement>('[data-links-filters]');
  const groupsEl = root.querySelector<HTMLElement>('[data-links-groups]');
  const emptyEl = root.querySelector<HTMLElement>('[data-links-empty]');
  const retryButton = root.querySelector<HTMLButtonElement>('[data-links-retry]');
  const tombstonesEl = root.querySelector<HTMLElement>('[data-links-tombstones]');
  const tombstonesListEl = root.querySelector<HTMLElement>('[data-links-tombstones-list]');
  const lightboxDialog = document.getElementById('links-lightbox') as HTMLDialogElement | null;
  const lightboxImage = lightboxDialog?.querySelector<HTMLImageElement>('[data-lightbox-image]') ?? null;
  const lightboxCaption = lightboxDialog?.querySelector<HTMLElement>('[data-lightbox-caption]') ?? null;
  const lightboxClose = lightboxDialog?.querySelector<HTMLButtonElement>('[data-lightbox-close]') ?? null;
  const lightboxMetaRow = lightboxDialog?.querySelector<HTMLElement>('.lightbox-meta-row') ?? null;
  const lightboxNavigation = lightboxDialog?.querySelector<HTMLElement>('.lightbox-navs') ?? null;
  const REQUEST_TIMEOUT_MS = 12000;
  const linksSourceUrl = root.dataset.linksSourceUrl || LINKS_SOURCE_URL;
  const latencySourceUrl = root.dataset.latencySourceUrl || LATENCY_SOURCE_URL;
  const tombstoneSourceUrl = root.dataset.tombstoneSourceUrl || TOMBSTONE_SOURCE_URL;

  let groups: NormalizedLinkGroup[] = [];
  let activeTag = '';
  let requestController: AbortController | null = null;
  let latencyController: AbortController | null = null;
  let tombstoneController: AbortController | null = null;
  let requestId = 0;
  let latencyRequestId = 0;
  let tombstoneRequestId = 0;
  let latencyRequested = false;
  let tombstoneRequested = false;
  let latencyPayload: unknown = null;

  const escapeHtml = (value: string): string => value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const icon = (name: 'rss' | 'link' | 'eye'): string => {
    if (name === 'rss') {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19h.01"/><path d="M5 12a7 7 0 0 1 7 7"/><path d="M5 5a14 14 0 0 1 14 14"/></svg>';
    }
    if (name === 'eye') {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 1 7 0l1 1a5 5 0 0 1-7 7l-1-1"/><path d="M14 11a5 5 0 0 1-7 0L6 10a5 5 0 0 1 7-7l1 1"/></svg>';
  };

  const setStatus = (text: string, state: 'idle' | 'stale' | 'error' = 'idle') => {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.dataset.state = state;
  };

  const initialFor = (name: string): string => name.trim().slice(0, 1).toUpperCase() || '?';

  const renderFilters = () => {
    if (!filtersEl) return;
    const tags = collectLinkTags(groups);
    if (tags.length === 0) {
      filtersEl.hidden = true;
      filtersEl.innerHTML = '';
      return;
    }
    filtersEl.hidden = false;
    const choices = ['', ...tags];
    filtersEl.innerHTML = choices.map((tag) => {
      const selected = activeTag.toLocaleLowerCase() === tag.toLocaleLowerCase();
      return `<button class="links-page__filter" type="button" data-links-tag="${escapeHtml(tag)}" aria-pressed="${selected ? 'true' : 'false'}">${escapeHtml(tag || '全部')}</button>`;
    }).join('');
  };

  const renderCard = (item: NormalizedLinkItem): string => {
    const shot = item.siteshot
      ? '<div class="links-page__card-shot" data-links-shot></div>'
      : '';
    const avatar = item.avatar
      ? `<span class="links-page__avatar"><img src="${escapeHtml(item.avatar)}" alt="" loading="lazy" decoding="async" data-links-avatar /></span>`
      : `<span class="links-page__avatar" aria-hidden="true">${escapeHtml(initialFor(item.name))}</span>`;
    const tags = item.tags.length
      ? `<div class="links-page__tags">${item.tags.map((tag) => `<button class="links-page__tag" type="button" data-links-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`).join('')}</div>`
      : '';
    const actions = [
      item.feeds ? `<a class="links-page__action" href="${escapeHtml(item.feeds)}" target="_blank" rel="noopener noreferrer" aria-label="订阅 ${escapeHtml(item.name)} 的 RSS" title="RSS">${icon('rss')}</a>` : '',
      item.friendslink ? `<a class="links-page__action" href="${escapeHtml(item.friendslink)}" target="_blank" rel="noopener noreferrer" aria-label="查看 ${escapeHtml(item.name)} 的友链页" title="友链页">${icon('link')}</a>` : '',
      item.siteshot ? `<button class="links-page__action links-page__action--mobile-preview" type="button" data-links-preview aria-label="预览 ${escapeHtml(item.name)} 的网站截图" title="网站截图">${icon('eye')}</button>` : ''
    ].filter(Boolean).join('');
    const screenshotProbe = item.siteshot
      ? `<img src="${escapeHtml(item.siteshot)}" alt="" hidden data-links-shot-image />`
      : '';

    return `<article class="links-page__card" data-links-card data-links-name="${escapeHtml(item.name)}" data-links-link="${escapeHtml(item.link)}"${item.siteshot ? ` data-has-shot="true" data-links-shot-src="${escapeHtml(item.siteshot)}"` : ''}>
      ${shot}
      <div class="links-page__card-body">
        ${avatar}
        <div class="links-page__content">
          <a class="links-page__name" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.name)}</a>
          <div class="links-page__meta-row"><span class="links-page__hostname">${escapeHtml(item.hostname)}</span></div>
          <p class="links-page__description">${escapeHtml(item.descr || '暂无简介')}</p>
          ${tags}
        </div>
      </div>
      <div class="links-page__actions">${actions}</div>
      ${screenshotProbe}
    </article>`;
  };

  const renderGroups = () => {
    if (!groupsEl || !emptyEl) return;
    const visibleGroups = filterLinkGroups(groups, activeTag || null).filter((group) => group.links.length > 0);
    if (summaryEl) {
      summaryEl.textContent = `${visibleGroups.reduce((total, group) => total + group.links.length, 0)} 条友链`;
      summaryEl.hidden = false;
    }
    if (visibleGroups.length === 0) {
      groupsEl.innerHTML = '';
      emptyEl.hidden = false;
      emptyEl.textContent = activeTag ? '没有匹配这个标签的友链。' : '暂无可显示的友链。';
      return;
    }
    emptyEl.hidden = true;
    groupsEl.innerHTML = visibleGroups.map((group) => `<section class="links-page__group" data-links-group>
      <header class="links-page__group-header"><div><h2 class="links-page__group-title">${escapeHtml(group.className)}</h2>${group.classDesc ? `<p class="links-page__group-description">${escapeHtml(group.classDesc)}</p>` : ''}</div><p class="links-page__group-count">${group.links.length} 个</p></header>
      <div class="links-page__grid">${group.links.map(renderCard).join('')}</div>
    </section>`).join('');
    initializeInteractions();
  };

  const initCardFallbacks = () => {
    root.querySelectorAll<HTMLElement>('[data-links-card][data-links-shot-src]').forEach((card) => {
      const source = card.dataset.linksShotSrc;
      const shot = card.querySelector<HTMLElement>('[data-links-shot]');
      if (source && shot) shot.style.backgroundImage = `url(${JSON.stringify(source)})`;
    });
    root.querySelectorAll<HTMLImageElement>('[data-links-avatar]').forEach((image) => {
      image.addEventListener('error', () => {
        const fallback = document.createElement('span');
        fallback.className = 'links-page__avatar';
        fallback.setAttribute('aria-hidden', 'true');
        fallback.textContent = initialFor(image.closest<HTMLElement>('[data-links-card]')?.dataset.linksName || '');
        image.closest('.links-page__avatar')?.replaceWith(fallback);
      }, { once: true });
    });
    root.querySelectorAll<HTMLImageElement>('[data-links-shot-image]').forEach((image) => {
      image.addEventListener('error', () => {
        const card = image.closest<HTMLElement>('[data-links-card]');
        card?.querySelector('[data-links-shot]')?.remove();
        card?.querySelector('[data-links-preview]')?.remove();
        image.remove();
        card?.removeAttribute('data-has-shot');
      }, { once: true });
    });
  };

  const closeLightbox = () => {
    if (!lightboxDialog?.open) return;
    lightboxDialog.close();
    lightboxDialog.hidden = true;
    lightboxDialog.setAttribute('aria-hidden', 'true');
  };

  const openLightbox = (card: HTMLElement, opener: HTMLElement) => {
    const source = card.dataset.linksShotSrc;
    if (!source || !lightboxDialog || !lightboxImage) return;
    lightboxImage.src = source;
    lightboxImage.alt = `${card.dataset.linksName || '友链'} 网站截图`;
    if (lightboxCaption) {
      lightboxCaption.textContent = lightboxImage.alt;
      lightboxCaption.hidden = false;
    }
    if (lightboxNavigation) lightboxNavigation.hidden = true;
    if (lightboxMetaRow) lightboxMetaRow.hidden = true;
    lightboxDialog.hidden = false;
    lightboxDialog.setAttribute('aria-hidden', 'false');
    lightboxDialog.showModal();
    lightboxClose?.focus();
    lightboxDialog.addEventListener('close', () => opener.focus(), { once: true });
  };

  lightboxClose?.addEventListener('click', closeLightbox);
  lightboxDialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeLightbox();
  });
  lightboxDialog?.addEventListener('click', (event) => {
    if (event.target === lightboxDialog) closeLightbox();
  });

  const initializeInteractions = () => {
    initCardFallbacks();
    root.querySelectorAll<HTMLButtonElement>('[data-links-preview]').forEach((button) => {
      button.addEventListener('click', () => {
        const card = button.closest<HTMLElement>('[data-links-card]');
        if (card) openLightbox(card, button);
      });
    });
  };

  const renderTombstones = (yaml: string) => {
    if (!tombstonesEl || !tombstonesListEl) return;
    const entries = parseTombstoneYaml(yaml);
    if (entries.length === 0) {
      tombstonesListEl.innerHTML = '';
      tombstonesEl.hidden = true;
      return;
    }
    tombstonesListEl.innerHTML = entries.map((entry) => {
      const avatar = entry.avatar
        ? `<img src="${escapeHtml(entry.avatar)}" alt="" loading="lazy" decoding="async" data-links-tombstone-avatar />`
        : escapeHtml(initialFor(entry.name));
      return `<span class="links-page__tombstone-item" data-links-tombstone-item data-links-tombstone-name="${escapeHtml(entry.name)}"><span class="links-page__tombstone-avatar">${avatar}</span><span class="links-page__tombstone-name">${escapeHtml(entry.name)}</span></span>`;
    }).join('');
    tombstonesEl.hidden = false;
    tombstonesListEl.querySelectorAll<HTMLImageElement>('[data-links-tombstone-avatar]').forEach((image) => {
      image.addEventListener('error', () => {
        const fallback = document.createElement('span');
        fallback.className = 'links-page__tombstone-avatar';
        fallback.setAttribute('aria-hidden', 'true');
        fallback.textContent = initialFor(image.closest<HTMLElement>('[data-links-tombstone-item]')?.dataset.linksTombstoneName || '');
        image.closest('.links-page__tombstone-avatar')?.replaceWith(fallback);
      }, { once: true });
    });
  };

  const fetchTombstones = async () => {
    if (tombstoneRequested) return;
    tombstoneRequested = true;
    tombstoneController?.abort();
    const controller = new AbortController();
    tombstoneController = controller;
    const currentRequest = ++tombstoneRequestId;
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(tombstoneSourceUrl, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { Accept: 'text/yaml, text/plain' }
      });
      if (!response.ok) return;
      const yaml = await response.text();
      if (currentRequest === tombstoneRequestId) renderTombstones(yaml);
    } catch {
      // Tombstones are optional and stay hidden when their source is unavailable.
    } finally {
      window.clearTimeout(timeout);
      if (tombstoneController === controller) tombstoneController = null;
    }
  };

  const applyLatency = (payload: unknown) => {
    const index = createLatencyIndex(normalizeLatencyData(payload));
    root.querySelectorAll<HTMLElement>('[data-links-card]').forEach((card) => {
      const name = card.dataset.linksName ?? '';
      const link = card.dataset.linksLink ?? '';
      const latencyKey = getLatencyIndexKey(name, link);
      const latency = latencyKey ? index.get(latencyKey) : undefined;
      const existing = card.querySelector<HTMLElement>('[data-links-latency]');
      if (!latency) {
        existing?.remove();
        return;
      }
      const target = card.querySelector<HTMLElement>('.links-page__meta-row');
      if (!target) return;
      const element = existing ?? document.createElement('span');
      element.className = 'links-page__latency';
      element.dataset.linksLatency = '';
      element.dataset.state = latency.reachable && latency.latencyMs !== null ? 'reachable' : 'unreachable';
      if (latency.latencyMs === null || !latency.reachable) {
        element.dataset.tier = 'unreachable';
      } else if (latency.latencyMs <= 500) {
        element.dataset.tier = 'fast';
      } else if (latency.latencyMs <= 1000) {
        element.dataset.tier = 'medium';
      } else {
        element.dataset.tier = 'slow';
      }
      element.textContent = latency.display;
      if (!existing) target.append(element);
    });
  };

  const fetchLatency = async () => {
    if (latencyRequested) return;
    latencyRequested = true;
    latencyController?.abort();
    const controller = new AbortController();
    latencyController = controller;
    const currentRequest = ++latencyRequestId;
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(latencySourceUrl, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) return;
      const payload: unknown = await response.json();
      if (currentRequest === latencyRequestId) {
        latencyPayload = payload;
        applyLatency(payload);
      }
    } catch {
      // Latency is optional and must not affect friend-link rendering.
    } finally {
      window.clearTimeout(timeout);
      if (latencyController === controller) latencyController = null;
    }
  };

  const render = (nextGroups: NormalizedLinkGroup[]) => {
    groups = nextGroups;
    const available = collectLinkTags(groups);
    if (activeTag && !available.some((tag) => tag.toLocaleLowerCase() === activeTag.toLocaleLowerCase())) activeTag = '';
    renderFilters();
    renderGroups();
    if (latencyPayload !== null) applyLatency(latencyPayload);
  };

  const fetchData = async () => {
    requestController?.abort();
    const controller = new AbortController();
    requestController = controller;
    const currentRequest = ++requestId;
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(linksSourceUrl, { signal: controller.signal, cache: 'no-store', headers: { Accept: 'text/yaml, text/plain' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const nextGroups = parseLinksYaml(await response.text());
      if (currentRequest !== requestId) return;
      const record: LinksCacheRecord = { version: LINKS_CACHE_VERSION, timestamp: Date.now(), groups: nextGroups };
      const storage = getStorage();
      if (storage) writeLinksCache(storage, record);
      render(nextGroups);
      void fetchLatency();
      setStatus('');
      if (retryButton) retryButton.hidden = true;
    } catch {
      if (currentRequest !== requestId) return;
      if (groups.length > 0) {
        setStatus('友链数据暂不可刷新，当前显示上次缓存。', 'stale');
      } else {
        setStatus('友链加载失败，请检查网络后重试。', 'error');
        if (emptyEl) { emptyEl.hidden = false; emptyEl.textContent = '暂时无法获取友链数据。'; }
        if (retryButton) retryButton.hidden = false;
      }
    } finally {
      window.clearTimeout(timeout);
      if (requestController === controller) requestController = null;
    }
  };

  const getStorage = (): StorageLike | null => {
    try {
      const storage = window.localStorage;
      storage.getItem('__astro_whono_links_probe__');
      return storage;
    } catch {
      return null;
    }
  };

  const load = () => {
    void fetchTombstones();
    let cached: LinksCacheReadResult = { state: 'missing', record: null };
    const storage = getStorage();
    if (storage) {
      cached = readLinksCache(storage);
    }
    if (cached.record) {
      render(cached.record.groups);
      void fetchLatency();
      if (cached.state === 'fresh') {
        setStatus('');
        return;
      }
      setStatus('正在刷新友链数据…', 'stale');
    }
    void fetchData();
  };

  const handleTagClick = (event: Event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-links-tag]');
    if (!target) return;
    activeTag = target.dataset.linksTag || '';
    renderFilters();
    renderGroups();
    if (latencyPayload !== null) applyLatency(latencyPayload);
  };
  filtersEl?.addEventListener('click', handleTagClick);
  groupsEl?.addEventListener('click', handleTagClick);
  retryButton?.addEventListener('click', () => {
    setStatus('正在重新加载友链…');
    void fetchData();
  });
  load();
}
