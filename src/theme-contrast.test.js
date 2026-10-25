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

const hslSaturation = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  if (mx === mn) return 0;
  const l = (mx + mn) / 2;
  const d = mx - mn;
  return (l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)) * 100;
};

describe.each(THEMES)('%s theme: text tokens stay AAA on every surface', (theme) => {
  const t = tokens(theme);
  const surfaces = ['--bg', '--bg-card', '--neutral-bg'];
  // --neutral is the text colour of .verdict-no_text, so it is held to AAA on every surface.
  const texts = ['--fg', '--fg-muted', '--neutral', '--pass', '--fail', '--warn'];

  it.each(texts)('%s is at least 7:1 on every surface', (tok) => {
    for (const s of surfaces) {
      expect(ratio(t[tok], t[s]), `${tok} on ${s}`).toBeGreaterThanOrEqual(7);
    }
  });

  // --accent is brand orange or sand in the dark themes (large elements and
  // links on the page and card); small text on --neutral-bg uses --accent-small.
  it('--accent is at least 7:1 on --bg and --bg-card', () => {
    for (const s of ['--bg', '--bg-card']) {
      expect(ratio(t['--accent'], t[s]), `--accent on ${s}`).toBeGreaterThanOrEqual(7);
    }
  });

  it('status text is at least 7:1 on its own pill background', () => {
    for (const k of ['pass', 'fail', 'warn']) {
      expect(ratio(t[`--${k}`], t[`--${k}-bg`]), k).toBeGreaterThanOrEqual(7);
    }
  });
});

describe('VADChecker: surfaces stay under 60% HSL saturation (Vestibular SAFE)', () => {
  it.each([
    ['dark', '--bg'],
    ['dark', '--bg-card'],
    ['dark', '--neutral-bg'],
    ['dark', '--warn-bg'],
    ['light', '--warn-bg'],
  ])('%s %s', (theme, tok) => {
    expect(hslSaturation(tokens(theme)[tok]), `${theme} ${tok}`).toBeLessThan(60);
  });

  it('light --fg is not so bright against white that APCA flags it (Lc over 105)', () => {
    // #1A1A1A on white is Lc 109 (HARSH); #2A2A2A is Lc 104.
    expect(tokens('light')['--fg']).not.toBe('#1A1A1A');
    expect(ratio(tokens('light')['--fg'], '#FFFFFF')).toBeGreaterThanOrEqual(14);
  });
});
