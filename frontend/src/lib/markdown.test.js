import { describe, it, expect } from 'vitest';
import { renderMarkdown, blocksToMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders headings, bold, and code fences', () => {
    const html = renderMarkdown('# Hello\n\nSome **bold** text\n\n```\nconst a = 1;\n```');
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<code>');
  });

  it('strips scripts and event handlers (stored XSS)', () => {
    const html = renderMarkdown('Hello<script>alert(1)</script>\n\n<img src="x" onerror="alert(2)">');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('onerror');
    expect(html).toContain('Hello');
  });

  it('returns empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
    expect(renderMarkdown(null)).toBe('');
  });
});

describe('blocksToMarkdown', () => {
  it('converts legacy typed blocks to equivalent markdown', () => {
    const md = blocksToMarkdown([
      { blockType: 'heading', content: 'Welcome' },
      { blockType: 'text', content: 'Hello world' },
      { blockType: 'code', content: 'console.log(1)' },
    ]);
    expect(md).toContain('# Welcome');
    expect(md).toContain('Hello world');
    expect(md).toContain('```\nconsole.log(1)\n```');
  });

  it('passes markdown blocks through and drops blanks', () => {
    const md = blocksToMarkdown([
      { blockType: 'markdown', content: '# Already md' },
      { blockType: 'text', content: '   ' },
    ]);
    expect(md).toBe('# Already md');
  });

  it('returns empty string for empty input', () => {
    expect(blocksToMarkdown([])).toBe('');
    expect(blocksToMarkdown(null)).toBe('');
  });
});
