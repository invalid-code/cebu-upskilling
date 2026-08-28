import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('resolveFileUrl', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('passes absolute http(s) urls through untouched', async () => {
    const { resolveFileUrl } = await import('./fileUrl');
    expect(resolveFileUrl('https://cdn.example.com/documents/a.pdf')).toBe('https://cdn.example.com/documents/a.pdf');
    expect(resolveFileUrl('http://cdn.example.com/documents/b.docx')).toBe('http://cdn.example.com/documents/b.docx');
  });

  it('leaves protocol-relative and bare paths untouched', async () => {
    const { resolveFileUrl } = await import('./fileUrl');
    expect(resolveFileUrl('//cdn.example.com/a.pdf')).toBe('//cdn.example.com/a.pdf');
    expect(resolveFileUrl('documents/a.pdf')).toBe('documents/a.pdf');
  });

  it('prefixes the api origin for root-relative urls when VITE_API_URL is absolute', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/api/');
    const { resolveFileUrl } = await import('./fileUrl');
    expect(resolveFileUrl('/uploads/documents/a.pdf')).toBe('https://api.example.com/uploads/documents/a.pdf');
  });

  it('keeps root-relative urls same-origin when no absolute api base is configured', async () => {
    vi.stubEnv('VITE_API_URL', '/api');
    const { resolveFileUrl } = await import('./fileUrl');
    expect(resolveFileUrl('/uploads/documents/a.pdf')).toBe('/uploads/documents/a.pdf');
  });

  it('handles nullish and empty input', async () => {
    const { resolveFileUrl } = await import('./fileUrl');
    expect(resolveFileUrl(null)).toBeNull();
    expect(resolveFileUrl(undefined)).toBeUndefined();
    expect(resolveFileUrl('')).toBe('');
  });
});
