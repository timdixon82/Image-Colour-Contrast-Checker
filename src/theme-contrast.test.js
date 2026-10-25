import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { hexToRgb, luminance, wcagContrast } from './core/contrast.js';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const THEMES = ['light', 'dark', 'muted-light', 'muted-dark'];

function tokens(theme) {
  const marker = `[data-theme="${theme}"]`;
  const start = css.indexOf(marker);
  if (start === -1) throw new Error(`Theme block not found: ${marker}`);
  const open = css.indexOf('{', start + marker.length);
  if (open === -1 || css.slice(start + marker.length, open).trim() !== '') {
    throw new Error(`Theme block has no opening brace: ${marker}`);
  }
  const close = css.indexOf('}', open);
  if (close === -1) throw new Error(`Theme block is not closed: ${marker}`);
  const body = css.slice(open + 1, close);
  const out = {};
  for (const [, k, v] of body.matchAll(/(--[\w-]+):\s*(#[0-9A-Fa-f]{6})\b/g)) out[k] = v;
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

// --accent is brand orange or sand in the dark themes: 5.94:1 (Dark) and
// 6.83:1 (Muted Dark) on --neutral-bg. So no rule that paints --neutral-bg may
// set its own text to --accent; it must use --accent-small (>= 7:1 above).
describe('small text on --neutral-bg never uses --accent', () => {
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => ({ sel: sel.trim(), body }));
  const offenders = rules
    .filter(({ body }) => /(^|[\s;])background(-color)?:\s*var\(--neutral-bg\)/.test(body))
    .filter(({ body }) => /(^|[\s;])color:\s*var\(--accent\)/.test(body))
    .map(({ sel }) => sel);

  it('no rule combines background --neutral-bg with color --accent', () => {
    expect(offenders).toEqual([]);
  });

  it('the check-group label uses --accent-small on --neutral-bg', () => {
    expect(css).toMatch(/\.check-group-row th\s*\{[^}]*color:\s*var\(--accent-small\)/);
  });
});

describe('dropzone keeps the global focus ring (WCAG 2.4.13)', () => {
  it('.dropzone:focus-visible draws a 3px --accent outline with 3px offset', () => {
    const m = css.match(/\.dropzone:focus-visible\s*\{([^}]*)\}/);
    expect(m, 'rule exists').not.toBeNull();
    expect(m[1]).toMatch(/outline:\s*3px solid var\(--accent\)/);
    expect(m[1]).toMatch(/outline-offset:\s*3px/);
  });

  it.each(THEMES)('%s: the ring is at least 3:1 on the page and the card', (theme) => {
    const t = tokens(theme);
    for (const s of ['--bg', '--bg-card']) {
      expect(ratio(t['--accent'], t[s]), s).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('info links inside text are not distinguished by colour alone (axe link-in-text-block)', () => {
  it('.check-info is underlined at rest', () => {
    const m = css.match(/\.check-info\s*\{([^}]*)\}/);
    expect(m[1]).toMatch(/text-decoration:\s*underline/);
  });
});

describe.each(THEMES)('%s theme: filled controls (primary button, skip link) are AAA', (theme) => {
  const t = tokens(theme);

  it('text on the button fill is at least 7:1 at rest and on hover', () => {
    expect(ratio(t['--accent-text'], t['--button-bg']), 'rest').toBeGreaterThanOrEqual(7);
    expect(ratio(t['--accent-text'], t['--button-bg-hover']), 'hover').toBeGreaterThanOrEqual(7);
  });

  it('the button fill is distinct from the page and card (non-text 3:1)', () => {
    for (const s of ['--bg', '--bg-card']) {
      expect(ratio(t['--button-bg'], t[s]), s).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('light themes keep brand navy out of control fills', () => {
  it('Light uses the softer button fill, not brand navy, so VADChecker reads SAFE', () => {
    const t = tokens('light');
    expect(t['--button-bg']).toBe('#234A73');
    expect(t['--button-bg-hover']).toBe('#1B3A5C');
    expect(t['--accent']).toBe('#0C3B64'); // text and accent use is unchanged
  });

  it('the primary button and skip link fills use the button tokens', () => {
    expect(css).toMatch(/\.skip-link\s*\{[^}]*background:\s*var\(--button-bg\)/);
    expect(css).toMatch(/\.button-primary\s*\{[^}]*background:\s*var\(--button-bg\)/);
    expect(css).toMatch(/\.button-primary:hover\s*\{[^}]*background:\s*var\(--button-bg-hover\)/);
  });
});

describe.each(THEMES)('%s theme: VADChecker, surfaces stay under 60%% HSL saturation (Vestibular SAFE)', (theme) => {
  // Dark's button fills are brand orange (79% / 73%): the documented brand accent
  // fill exception. Every other surface and button fill, in every theme, is held.
  const BRAND_ACCENT_FILLS = theme === 'dark' ? ['--button-bg', '--button-bg-hover'] : [];
  const SURFACES = ['--bg', '--bg-card', '--neutral-bg', '--code-bg', '--warn-bg', '--pass-bg', '--fail-bg', '--button-bg', '--button-bg-hover'];

  it.each(SURFACES.filter((k) => !BRAND_ACCENT_FILLS.includes(k)))('%s', (tok) => {
    expect(hslSaturation(tokens(theme)[tok]), `${theme} ${tok}`).toBeLessThan(60);
  });
});

describe('VADChecker: light text', () => {
  it('light --fg is not so bright against white that APCA flags it (Lc over 105)', () => {
    // #1A1A1A on white is Lc 109 (HARSH); #2A2A2A is Lc 104.
    expect(tokens('light')['--fg']).not.toBe('#1A1A1A');
    expect(ratio(tokens('light')['--fg'], '#FFFFFF')).toBeGreaterThanOrEqual(14);
  });
});

describe('CLAUDE.md colour table matches src/styles.css', () => {
  const md = readFileSync(new URL('../CLAUDE.md', import.meta.url), 'utf8');
  const rows = [...md.matchAll(/^\| `(--[\w-]+)`[^|]*\|\s*`(#\w{6})`\s*\|\s*`(#\w{6})`\s*\|\s*`(#\w{6})`\s*\|\s*`(#\w{6})`\s*\|$/gm)];

  it('lists the status, text and button tokens', () => {
    const names = rows.map((r) => r[1]);
    for (const n of ['--fg', '--fg-muted', '--neutral', '--pass', '--fail', '--warn', '--accent-small', '--button-bg', '--button-bg-hover']) {
      expect(names, n).toContain(n);
    }
  });

  it.each(THEMES.map((t, i) => [t, i + 2]))('%s column equals the CSS values', (theme, col) => {
    const t = tokens(theme);
    for (const row of rows) {
      expect(row[col].toUpperCase(), `${row[1]} in ${theme}`).toBe(t[row[1]].toUpperCase());
    }
  });
});
