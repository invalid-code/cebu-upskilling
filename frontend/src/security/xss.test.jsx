import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import DiscussionModal from '../components/shared/DiscussionModal';
import LessonContent from '../components/shared/LessonContent';

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

import { api } from '../api/client';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..', '..');
const srcRoot = resolve(projectRoot, 'src');

const PAYLOADS = [
  '<script>window.__pwned = true;</script>',
  '<img src=x onerror="window.__pwned = true">',
  '<svg onload="window.__pwned = true"></svg>',
  '"><svg/onload="window.__pwned=true">',
  '<a href="javascript:window.__pwned=true">click</a>',
];

function walkJsxFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules' || entry === 'security') continue;
      out.push(...walkJsxFiles(full));
    } else if (/\.(jsx?|tsx?)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('XSS escaping in user-rendered content', () => {
  beforeEach(() => {
    window.__pwned = false;
    api.get.mockReset();
    api.post.mockReset();
  });

  it('escapes script tags in discussion post bodies', async () => {
    const payload = '<script>window.__pwned = true;</script>';
    api.get.mockResolvedValue({
      posts: [
        { postId: 1, authorName: 'Mallory', content: payload, createdAt: '2026-08-01T00:00:00Z', isOwn: false },
      ],
    });

    render(<DiscussionModal open onClose={() => {}} lessonId={1} />);
    const body = await screen.findByText(payload);
    expect(body).toBeInTheDocument();
    expect(body.innerHTML).not.toContain('<script>');
    expect(window.__pwned).toBe(false);
  });

  it('escapes img onerror handlers in discussion post bodies', async () => {
    const payload = '<img src=x onerror="window.__pwned = true">';
    api.get.mockResolvedValue({
      posts: [
        { postId: 1, authorName: 'Mallory', content: payload, createdAt: '2026-08-01T00:00:00Z', isOwn: false },
      ],
    });

    render(<DiscussionModal open onClose={() => {}} lessonId={1} />);
    await screen.findByText(payload);
    expect(window.__pwned).toBe(false);
  });

  it('escapes svg onload handlers in author names', async () => {
    const payload = '<svg onload="window.__pwned = true"></svg>';
    api.get.mockResolvedValue({
      posts: [
        { postId: 1, authorName: payload, content: 'hi', createdAt: '2026-08-01T00:00:00Z', isOwn: false },
      ],
    });

    render(<DiscussionModal open onClose={() => {}} lessonId={1} />);
    await screen.findByText('hi');
    expect(window.__pwned).toBe(false);
  });

  it('does not render raw HTML in lesson content blocks', () => {
    const lesson = {
      name: '<img src=x onerror="window.__pwned = true">',
      contentBlocks: [
        { blockType: 'text', content: '<img src=x onerror="window.__pwned = true">' },
        { blockType: 'heading', content: '<script>window.__pwned=true</script>' },
        { blockType: 'code', content: '<script>window.__pwned=true</script>' },
      ],
    };

    render(<LessonContent lesson={lesson} />);
    expect(window.__pwned).toBe(false);

    const matches = screen.getAllByText('<img src=x onerror="window.__pwned = true">');
    expect(matches.length).toBeGreaterThan(0);
    matches.forEach((el) => {
      expect(el.innerHTML).not.toMatch(/<img/i);
    });
  });

  it('covers the full payload set without triggering any handler', async () => {
    for (const payload of PAYLOADS) {
      window.__pwned = false;
      api.get.mockReset();
      api.get.mockResolvedValue({
        posts: [
          { postId: 1, authorName: 'Mallory', content: payload, createdAt: '2026-08-01T00:00:00Z', isOwn: false },
        ],
      });
      const { unmount } = render(<DiscussionModal open onClose={() => {}} lessonId={1} />);
      await screen.findByText(payload);
      expect(window.__pwned).toBe(false);
      unmount();
    }
  });
});

describe('Static source-level XSS audit', () => {
  const files = walkJsxFiles(srcRoot);

  it('scans at least a handful of files', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('contains no dangerouslySetInnerHTML usages in app source', () => {
    const offenders = [];
    for (const f of files) {
      const lines = readFileSync(f, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (/dangerouslySetInnerHTML/.test(line)) offenders.push(`${f}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('contains no eval / new Function / document.write in app source', () => {
    const offenders = [];
    for (const f of files) {
      const lines = readFileSync(f, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (/\beval\s*\(|new\s+Function\s*\(|document\.write\s*\(/.test(line)) {
          offenders.push(`${f}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('only loads external scripts from the Google Identity Services origin', () => {
    const offenders = [];
    for (const f of files) {
      const lines = readFileSync(f, 'utf8').split('\n');
      lines.forEach((line, i) => {
        const m = line.match(/src\s*=\s*['"`](https?:\/\/[^'"`]+)['"`]/);
        if (m && !m[1].startsWith('https://accounts.google.com/gsi/')) {
          offenders.push(`${f}:${i + 1} → ${m[1]}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
