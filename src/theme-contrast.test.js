import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { hexToRgb, luminance, wcagContrast } from './core/contrast.js';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const THEMES = ['light', 'dark', 'muted-light', 'muted-dark'];

function tokens(theme) {
  const m = css.match(new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`));
  const out = {};
  for (const [, k, v] of m[1].matchAll(/(--[\w-]+):\s*(#[0-9A-Fa-f]{6})\b/g)) out[k] = v;
  return out;
}

const ratio = (a, b) => {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return wcagContrast(luminance(r1, g1, b1), luminance(r2, g2, b2));
};

/** Alpha-composite `fg` at `a` over `bg`, returned as hex. */
function over(fg, a, bg) {
  const F = hexToRgb(fg);
  const B = hexToRgb(bg);
  return '#' + F.map((v, i) => Math.round(v * a + B[i] * (1 - a)).toString(16).padStart(2, '0')).join('');
}

const SUBTLE_ALPHA = { light: 0.08, dark: 0.16, 'muted-light': 0.08, 'muted-dark': 0.16 };

describe.each(THEMES)('%s theme: small accent text reaches AAA on its real surfaces', (theme) => {
  const t = tokens(theme);

  it('defines --accent-small', () => {
    expect(t['--accent-small']).toBeDefined();
  });

  it('info icon (--accent-small) is at least 7:1 on every surface', () => {
    for (const s of ['--bg', '--bg-card', '--neutral-bg']) {
      expect(ratio(t['--accent-small'], t[s]), s).toBeGreaterThanOrEqual(7);
    }
  });

  it('queue stage text (--accent-small on tinted card) is at least 7:1', () => {
    const tint = over(t['--accent'], SUBTLE_ALPHA[theme], t['--bg-card']);
    expect(ratio(t['--accent-small'], tint)).toBeGreaterThanOrEqual(7);
  });
});
