import { describe, it, expect } from 'vitest';
import { filterFaqs } from './helpFaqs';

const faqs = [
  { id: 'a', question: 'Connection dropped?', answer: 'Progress saves locally.' },
  { id: 'b', question: 'Assessment privacy', answer: 'Proctoring permissions first.' },
  { id: 'c', question: 'Still need help?', answer: 'Tell us what blocked you.' },
];

describe('filterFaqs', () => {
  it('matches case-insensitively', () => {
    expect(filterFaqs(faqs, 'CONNECTION').map((f) => f.id)).toEqual(['a']);
  });

  it('matches on question or answer', () => {
    expect(filterFaqs(faqs, 'privacy').map((f) => f.id)).toEqual(['b']);
    expect(filterFaqs(faqs, 'blocked').map((f) => f.id)).toEqual(['c']);
  });

  it('returns every entry for an empty query', () => {
    expect(filterFaqs(faqs, '')).toEqual(faqs);
    expect(filterFaqs(faqs, undefined)).toEqual(faqs);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterFaqs(faqs, 'zzz-nope')).toEqual([]);
  });
});
