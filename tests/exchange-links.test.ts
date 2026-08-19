import { describe, expect, it } from 'vitest';
import {
  EXCHANGE_PAGE_SIZE,
  createSubmissionPayload,
  filterPublicSubmissions,
  normalizePublicSubmissions,
  paginatePublicSubmissions
} from '../src/lib/exchange-links';

describe('exchange link submissions', () => {
  it('creates the documented apply payload and omits blank optional fields', () => {
    expect(createSubmissionPayload('apply', {
      name: ' Example ',
      url: ' https://example.com ',
      avatar: ' https://example.com/avatar.png ',
      friendslink: ' https://example.com/links ',
      description: ' ',
      siteshot: '',
      feeds: '',
      email: ''
    })).toEqual({
      type: 'apply',
      name: 'Example',
      url: 'https://example.com',
      avatar: 'https://example.com/avatar.png',
      friendslink: 'https://example.com/links'
    });
  });

  it('creates update payloads with the original address', () => {
    expect(createSubmissionPayload('update', {
      originalUrl: 'https://old.example/',
      name: 'New',
      url: 'https://new.example/',
      avatar: 'https://new.example/avatar.png',
      friendslink: 'https://new.example/links/',
      description: 'Description',
      siteshot: 'https://new.example/shot.png',
      feeds: 'https://new.example/feed.xml',
      email: 'owner@new.example'
    })).toMatchObject({
      type: 'update',
      originalUrl: 'https://old.example/',
      siteshot: 'https://new.example/shot.png',
      email: 'owner@new.example'
    });
  });

  it('normalizes valid public rows and ignores malformed rows', () => {
    expect(normalizePublicSubmissions({
      submissions: [
        { id: 'one', name: ' One ', url: 'https://one.example/', status: 'approved', type: 'apply', description: ' Hello ' },
        { name: '', url: 'https://invalid.example/' },
        { name: 'missing URL' }
      ]
    })).toEqual([{
      id: 'one',
      name: 'One',
      url: 'https://one.example/',
      description: 'Hello',
      friendslink: '',
      feeds: '',
      status: 'approved',
      type: 'apply'
    }]);
  });

  it('filters by status and text, then paginates deterministically', () => {
    const submissions = normalizePublicSubmissions({
      submissions: Array.from({ length: EXCHANGE_PAGE_SIZE + 2 }, (_, index) => ({
        id: String(index),
        name: `Site ${index}`,
        url: `https://site-${index}.example/`,
        description: index === 1 ? 'Astro blog' : '',
        status: index % 2 === 0 ? 'pending' : 'approved',
        type: index % 3 === 0 ? 'update' : 'apply'
      }))
    });

    expect(filterPublicSubmissions(submissions, 'approved', 'astro')).toHaveLength(1);
    expect(paginatePublicSubmissions(submissions, 2)).toEqual(submissions.slice(EXCHANGE_PAGE_SIZE));
  });
});
