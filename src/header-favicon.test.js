import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const pages = ['index.html', 'privacy.html'];
const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

describe.each(pages)('%s header favicon', (page) => {
  const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');
  const header = html.match(/<header class="app-header">[\s\S]*?<\/header>/)?.[0] ?? '';
  const img = header.match(/<img\b[^>]*>/)?.[0] ?? '';

  it('has one favicon image in the header', () => {
    expect(img).toMatch(/src="\/favicon\.svg"/);
  });

  it('is decorative with an empty alt', () => {
    expect(img).toMatch(/\balt=""/);
  });

  it('declares width and height to avoid layout shift', () => {
    expect(img).toMatch(/\bwidth="\d+"/);
    expect(img).toMatch(/\bheight="\d+"/);
  });

  it('sits before the title text in the header', () => {
    expect(header.indexOf('<img')).toBeLessThan(header.indexOf('<h1'));
  });
});

describe('header favicon styling', () => {
  const rule = css.match(/\.app-header-brand\s*\{[^}]*\}/)?.[0] ?? '';
  const logo = css.match(/\.app-header-logo\s*\{[^}]*\}/)?.[0] ?? '';

  it('wraps the logo and title as a flex row', () => {
    expect(rule).toMatch(/display:\s*flex/);
  });

  it('uses no hardcoded colours', () => {
    expect(rule + logo).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('keeps the logo from shrinking', () => {
    expect(logo).toMatch(/flex-shrink:\s*0/);
  });
});
