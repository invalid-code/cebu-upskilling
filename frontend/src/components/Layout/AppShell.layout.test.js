import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// jsdom does not evaluate media queries, so breakpoint layouts are asserted against the CSS source.
const css = (name) => readFileSync(resolve(process.cwd(), 'src/components/Layout', name), 'utf8');

/** Returns the body of the first `@media (max-width: <px>px) { ... }` block. */
function mediaBlock(source, px) {
  const start = source.indexOf(`@media (max-width: ${px}px)`);
  if (start === -1) return '';
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(source.indexOf('{', start) + 1, i);
  }
  return '';
}

describe('shell breakpoint layouts', () => {
  const shell = css('AppShell.module.css');
  const sidebar = css('Sidebar.module.css');
  const mobile = css('MobileNav.module.css');

  it('uses a 248px rail at 1024px and up', () => {
    expect(shell).toMatch(/\.shell\s*{[^}]*grid-template-columns:\s*248px/);
  });

  it('uses a 72px icon rail from 640 to 1023px', () => {
    expect(mediaBlock(shell, 1023)).toMatch(/grid-template-columns:\s*72px/);
    expect(mediaBlock(sidebar, 1023)).toMatch(/\.label[\s\S]*clip/); // labels visually hidden, still in DOM
  });

  it('removes the rail and shows the bottom nav only below 640px', () => {
    expect(mediaBlock(shell, 639)).toMatch(/display:\s*block/);
    expect(mediaBlock(sidebar, 639)).toMatch(/\.rail\s*{[^}]*display:\s*none/);
    expect(mobile).toMatch(/\.nav\s*{\s*display:\s*none/);
    expect(mediaBlock(mobile, 639)).toMatch(/\.nav\s*{[^}]*display:\s*flex/);
  });

  it('keeps 44px touch targets and avoids horizontal scroll', () => {
    expect(sidebar).toMatch(/\.link\s*{[^}]*min-height:\s*44px/);
    expect(mobile).toMatch(/\.link\s*{[^}]*min-width:\s*44px/);
    expect(shell).toMatch(/\.main\s*{[^}]*overflow-x:\s*clip/);
    expect(shell).toMatch(/\.shell\s*{[^}]*max-width:\s*100%/);
  });
});

