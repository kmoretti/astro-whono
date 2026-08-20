import {
  FCIRCLE_SOURCE_URL,
  normalizeFcircleData,
  type FcircleArticle,
  type NormalizedFcircleData
} from '../lib/fcircle';

const root = document.querySelector<HTMLElement>('[data-fcircle-root]');

if (root) {
  const status = root.querySelector<HTMLElement>('[data-fcircle-status]');
  const summary = root.querySelector<HTMLElement>('[data-fcircle-summary]');
  const stream = root.querySelector<HTMLElement>('[data-fcircle-stream]');
  const empty = root.querySelector<HTMLElement>('[data-fcircle-empty]');
  const retry = root.querySelector<HTMLButtonElement>('[data-fcircle-retry]');
  const updated = root.querySelector<HTMLElement>('[data-fcircle-updated]');
  const controller = { current: null as AbortController | null, requestId: 0 };
  const timeoutMs = 12000;

  const setState = (state: 'loading' | 'ready' | 'empty' | 'error', message: string) => {
    if (!status) return;
    status.dataset.state = state;
    status.textContent = message;
  };

  const setLink = (element: HTMLAnchorElement, url: string) => {
    element.href = url;
    element.target = '_blank';
    element.rel = 'noreferrer noopener';
  };

  const renderArticle = (article: FcircleArticle): HTMLElement => {
    const entry = document.createElement('article');
    entry.className = 'fcircle-entry';

    const avatar = document.createElement('div');
    avatar.className = 'fcircle-entry__avatar';
    if (article.avatar) {
      const image = document.createElement('img');
      image.src = article.avatar;
      image.alt = `${article.author} 的头像`;
      image.loading = 'lazy';
      image.referrerPolicy = 'no-referrer';
      avatar.append(image);
    }

    const content = document.createElement('div');
    content.className = 'fcircle-entry__content';

    const author = document.createElement('a');
    author.className = 'fcircle-entry__author';
    author.textContent = article.author;
    setLink(author, article.siteLink ?? article.link);

    const title = document.createElement('a');
    title.className = 'fcircle-entry__title';
    title.textContent = article.title;
    title.title = article.title;
    setLink(title, article.link);

    const meta = document.createElement('p');
    meta.className = 'fcircle-entry__meta';
    if (article.publishedAt) {
      const time = document.createElement('time');
      time.textContent = article.publishedAt;
      if (/^\d{4}-\d{2}-\d{2}/.test(article.publishedAt)) time.dateTime = article.publishedAt.replace(' ', 'T');
      meta.append(time);
    }
    const source = document.createElement('span');
    source.className = 'fcircle-entry__source';
    source.textContent = article.siteName;
    meta.append(source);

    content.append(author, title, meta);
    entry.append(avatar, content);
    return entry;
  };

  const render = (data: NormalizedFcircleData) => {
    if (summary) {
      const values = [data.stats.friends, data.stats.active, data.stats.articles];
      summary.querySelectorAll<HTMLElement>('[data-fcircle-stat]').forEach((element, index) => {
        element.textContent = String(values[index] ?? 0);
      });
    }
    if (updated) updated.textContent = data.stats.updatedAt ? `最后更新：${data.stats.updatedAt}` : '最后更新时间未知';
    if (stream) {
      stream.replaceChildren(...data.articles.map(renderArticle));
      stream.hidden = data.articles.length === 0;
    }
    if (empty) empty.hidden = data.articles.length !== 0;
    if (retry) retry.hidden = true;
    setState(data.articles.length ? 'ready' : 'empty', data.articles.length ? '已加载' : '暂无收录文章');
  };

  const load = async () => {
    controller.current?.abort();
    const requestId = ++controller.requestId;
    const requestController = new AbortController();
    controller.current = requestController;
    const timeout = window.setTimeout(() => requestController.abort(), timeoutMs);
    setState('loading', '正在加载朋友圈…');
    if (retry) retry.hidden = true;
    try {
      const response = await fetch(FCIRCLE_SOURCE_URL, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: requestController.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = normalizeFcircleData(await response.json());
      if (requestId === controller.requestId) render(data);
    } catch {
      if (requestId !== controller.requestId) return;
      setState('error', '朋友圈数据加载失败');
      if (empty) {
        empty.hidden = false;
        empty.textContent = '暂时无法获取远程数据，请稍后重试。';
      }
      if (stream) stream.replaceChildren();
      if (retry) retry.hidden = false;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  retry?.addEventListener('click', () => void load());
  void load();
}
