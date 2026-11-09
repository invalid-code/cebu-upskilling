import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Lesson content authored by recruiters/providers is rendered to learners,
// so markdown HTML must be sanitized (stored-XSS vector otherwise).
marked.setOptions({ breaks: true, gfm: true });

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// DOMPurify's default profile already removes <script>, on* handlers and
// javascript: URLs; the explicit lists make that guarantee visible.
const SANITIZE_CONFIG = {
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus'],
  ALLOW_UNKNOWN_PROTOCOLS: false,
};

// Shared markdown → safe HTML util: marked, then DOMPurify. If either step
// throws, fall back to escaped plain text; unsanitised HTML is never returned.
export function renderMarkdown(markdown) {
  if (!markdown) return '';
  try {
    const html = marked.parse(String(markdown), { async: false });
    const clean = DOMPurify.sanitize(html, SANITIZE_CONFIG);
    if (typeof clean !== 'string') throw new Error('Sanitiser returned non-string');
    return clean;
  } catch {
    return escapeHtml(markdown);
  }
}

// Lossless-enough conversion of the legacy typed blocks (text/heading/code)
// into markdown source for the editor. Display-identical by construction.
export function blocksToMarkdown(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) return '';
  return blocks
    .map((block) => {
      const text = (block.content || '').trim();
      if (!text) return '';
      const type = (block.blockType || 'text').toLowerCase();
      if (type === 'heading') return `# ${text}`;
      if (type === 'code') return `\`\`\`\n${block.content || ''}\n\`\`\``;
      if (type === 'markdown') return block.content || '';
      return text;
    })
    .filter(Boolean)
    .join('\n\n');
}
