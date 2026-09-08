import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Lesson content authored by recruiters/providers is rendered to learners,
// so markdown HTML must be sanitized (stored-XSS vector otherwise).
marked.setOptions({ breaks: true, gfm: true });

export function renderMarkdown(markdown) {
  if (!markdown) return '';
  const html = marked.parse(markdown, { async: false });
  return DOMPurify.sanitize(html);
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
