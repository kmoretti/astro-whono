import { DEFAULT_LINKS_SETTINGS } from './links-settings';

export const VERIFY_SUBMISSIONS_URL = DEFAULT_LINKS_SETTINGS.submissionUrl;
export const EXCHANGE_PAGE_SIZE = 8;

export type ExchangeSubmissionType = 'apply' | 'update';

export interface ExchangeSubmissionPayload {
  type: ExchangeSubmissionType;
  name: string;
  url: string;
  description?: string;
  avatar: string;
  friendslink: string;
  siteshot?: string;
  feeds?: string;
  email?: string;
  originalUrl?: string;
}

export interface PublicSubmission {
  id: string;
  name: string;
  url: string;
  description: string;
  friendslink: string;
  feeds: string;
  status: 'pending' | 'approved' | 'rejected' | 'unknown';
  type: ExchangeSubmissionType;
}

const asText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const asOptionalText = (value: unknown): string | undefined => {
  const text = asText(value);
  return text || undefined;
};

export const createSubmissionPayload = (
  type: ExchangeSubmissionType,
  values: Record<string, FormDataEntryValue | null>
): ExchangeSubmissionPayload => {
  const payload: ExchangeSubmissionPayload = {
    type,
    name: asText(values.name),
    url: asText(values.url),
    avatar: asText(values.avatar),
    friendslink: asText(values.friendslink)
  };
  const description = asOptionalText(values.description);
  const siteshot = asOptionalText(values.siteshot);
  const feeds = asOptionalText(values.feeds);
  const email = asOptionalText(values.email);
  const originalUrl = asOptionalText(values.originalUrl);
  if (description) payload.description = description;
  if (siteshot) payload.siteshot = siteshot;
  if (feeds) payload.feeds = feeds;
  if (email) payload.email = email;
  if (type === 'update' && originalUrl) payload.originalUrl = originalUrl;
  return payload;
};

const normalizeStatus = (value: unknown): PublicSubmission['status'] => {
  const status = asText(value).toLowerCase();
  if (status === 'pending' || status === 'approved' || status === 'rejected') return status;
  return 'unknown';
};

const normalizeType = (value: unknown): ExchangeSubmissionType =>
  asText(value).toLowerCase() === 'update' ? 'update' : 'apply';

export const normalizePublicSubmissions = (payload: unknown): PublicSubmission[] => {
  const rows = typeof payload === 'object' && payload !== null && Array.isArray((payload as { submissions?: unknown }).submissions)
    ? (payload as { submissions: unknown[] }).submissions
    : [];
  return rows.flatMap((row, index) => {
    if (typeof row !== 'object' || row === null) return [];
    const item = row as Record<string, unknown>;
    const name = asText(item.name);
    const url = asText(item.url);
    if (!name || !url) return [];
    return [{
      id: asText(item.id) || `${name}-${index}`,
      name,
      url,
      description: asText(item.description),
      friendslink: asText(item.friendslink),
      feeds: asText(item.feeds),
      status: normalizeStatus(item.status),
      type: normalizeType(item.type)
    }];
  });
};

export const filterPublicSubmissions = (
  submissions: readonly PublicSubmission[],
  status: string,
  query: string
): PublicSubmission[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return submissions.filter((item) =>
    (!status || item.status === status) && (!normalizedQuery || `${item.name} ${item.description}`.toLocaleLowerCase().includes(normalizedQuery))
  );
};

export const paginatePublicSubmissions = <T>(items: readonly T[], page: number, size = EXCHANGE_PAGE_SIZE): T[] =>
  items.slice(Math.max(0, page - 1) * size, Math.max(0, page - 1) * size + size);
