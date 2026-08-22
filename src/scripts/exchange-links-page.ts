import {
  EXCHANGE_PAGE_SIZE,
  VERIFY_SUBMISSIONS_URL,
  createSubmissionPayload,
  filterPublicSubmissions,
  normalizePublicSubmissions,
  paginatePublicSubmissions,
  type ExchangeSubmissionType,
  type PublicSubmission
} from '../lib/exchange-links';

const root = document.querySelector<HTMLElement>('[data-exchange-root]');

if (root) {
  const submissionUrl = root.dataset.submissionUrl || VERIFY_SUBMISSIONS_URL;
  const conditions = Array.from(root.querySelectorAll<HTMLInputElement>('[data-exchange-condition]'));
  const workspace = root.querySelector<HTMLElement>('[data-exchange-workspace]');
  const conditionStatus = root.querySelector<HTMLElement>('[data-exchange-condition-status]');
  const statusFilter = root.querySelector<HTMLSelectElement>('[data-exchange-status-filter]');
  const searchInput = root.querySelector<HTMLInputElement>('[data-exchange-search]');
  const list = root.querySelector<HTMLElement>('[data-exchange-list]');
  const pagination = root.querySelector<HTMLElement>('[data-exchange-pagination]');
  const listStatus = root.querySelector<HTMLElement>('[data-exchange-list-status]');
  let submissions: PublicSubmission[] = [];
  let page = 1;

  const updateGate = () => {
    const unlocked = conditions.length > 0 && conditions.every((input) => input.checked);
    if (workspace) workspace.hidden = !unlocked;
    if (conditionStatus) conditionStatus.textContent = unlocked ? '已确认全部条件，可以提交申请。' : `还需确认 ${conditions.filter((input) => !input.checked).length} 项条件。`;
  };

  const setFormStatus = (form: HTMLFormElement, text: string) => {
    const target = form.querySelector<HTMLElement>('[data-exchange-form-status]');
    if (target) target.textContent = text;
  };

  const renderList = () => {
    if (!list || !pagination) return;
    const filtered = filterPublicSubmissions(submissions, statusFilter?.value ?? '', searchInput?.value ?? '');
    const pages = Math.max(1, Math.ceil(filtered.length / EXCHANGE_PAGE_SIZE));
    page = Math.min(page, pages);
    const items = paginatePublicSubmissions(filtered, page);
    list.replaceChildren(...items.map((item) => {
      const article = document.createElement('article');
      article.className = 'exchange-submission';
      const title = document.createElement('a');
      title.href = item.url;
      title.target = '_blank';
      title.rel = 'noopener noreferrer';
      title.textContent = item.name;
      const meta = document.createElement('p');
      meta.className = 'exchange-submission__meta';
      meta.textContent = `${item.type === 'update' ? '更新' : '申请'} · ${({ pending: '待审核', approved: '已通过', rejected: '未通过', unknown: '未知状态' })[item.status]}`;
      const description = document.createElement('p');
      description.textContent = item.description || '暂无描述';
      article.append(title, meta, description);
      return article;
    }));
    if (items.length === 0) list.textContent = '暂无匹配的公开记录。';
    pagination.replaceChildren(...Array.from({ length: pages }, (_, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(index + 1);
      button.setAttribute('aria-current', index + 1 === page ? 'page' : 'false');
      button.addEventListener('click', () => { page = index + 1; renderList(); });
      return button;
    }));
  };

  const loadSubmissions = async () => {
    if (listStatus) listStatus.textContent = '正在加载…';
    try {
      const response = await fetch(`${submissionUrl}?public=1`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      submissions = normalizePublicSubmissions(await response.json());
      if (listStatus) listStatus.textContent = `${submissions.length} 条公开记录`;
      renderList();
    } catch {
      if (listStatus) listStatus.textContent = '公开记录暂时无法加载。';
      if (list) list.textContent = '请稍后重试。';
    }
  };

  root.querySelectorAll<HTMLButtonElement>('[data-exchange-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.exchangeMode;
      root.querySelectorAll<HTMLButtonElement>('[data-exchange-mode]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      root.querySelectorAll<HTMLFormElement>('[data-exchange-form]').forEach((form) => { form.hidden = form.dataset.exchangeForm !== mode; });
    });
  });

  root.querySelectorAll<HTMLFormElement>('[data-exchange-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const type = form.dataset.exchangeForm as ExchangeSubmissionType;
      const submit = form.querySelector<HTMLButtonElement>('[data-exchange-submit]');
      const payload = createSubmissionPayload(type, Object.fromEntries(new FormData(form).entries()));
      submit?.setAttribute('disabled', '');
      setFormStatus(form, '正在提交…');
      try {
        const response = await fetch(submissionUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
        const result = await response.json().catch(() => null) as { message?: unknown } | null;
        if (!response.ok) throw new Error(typeof result?.message === 'string' ? result.message : '提交失败，请稍后重试。');
        setFormStatus(form, '已提交，审核结果将显示在公开记录中。');
        form.reset();
      } catch (error) {
        const message = error instanceof Error ? error.message : '提交失败，请稍后重试。';
        setFormStatus(form, `提交失败：${message}。如持续出现跨域错误，请让 verify 服务放行本站域名。`);
      } finally { submit?.removeAttribute('disabled'); }
    });
  });

  conditions.forEach((input) => input.addEventListener('change', updateGate));
  statusFilter?.addEventListener('change', () => { page = 1; renderList(); });
  searchInput?.addEventListener('input', () => { page = 1; renderList(); });
  updateGate();
  void loadSubmissions();
}
