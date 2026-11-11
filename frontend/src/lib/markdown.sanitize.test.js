import { describe, it, expect, vi, afterEach } from 'vitest';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { renderMarkdown } from './markdown';

afterEach(() => vi.restoreAllMocks());

describe('renderMarkdown sanitisation', () => {
  it('strips javascript: URLs from links and images', () => {
    const html = renderMarkdown('[click](javascript:alert(1))\n\n<a href="javascript:alert(2)">x</a>');
    expect(html.toLowerCase()).not.toContain('javascript:');
  });

  it('strips inline event handlers', () => {
    const html = renderMarkdown('<div onclick="alert(1)" onmouseover="alert(2)">hi</div>');
    expect(html).not.toMatch(/onclick|onmouseover/i);
    expect(html).toContain('hi');
  });

  it('removes script tags entirely', () => {
    const html = renderMarkdown('<script>alert(1)</script>safe');
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain('safe');
  });

  it('falls back to escaped plain text when marked throws', () => {
    vi.spyOn(marked, 'parse').mockImplementation(() => {
      throw new Error('boom');
    });
    const html = renderMarkdown('<script>alert("x")</script>');
    expect(html).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });

  it('falls back to escaped plain text when DOMPurify throws', () => {
    vi.spyOn(DOMPurify, 'sanitize').mockImplementation(() => {
      throw new Error('boom');
    });
    const html = renderMarkdown('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
});
