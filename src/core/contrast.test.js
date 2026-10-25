/**
 * core/contrast.js — Vitest unit tests.
 *
 * Covers strip selection in worstStripContrast: strips that hold no real
 * text (a smooth background ramp between words) must not decide the result.
 * Plain { width, height, data } objects stand in for ImageData in Node.
 * See .claude/work/019-iccc-swatch-text-misdetection/ for the design.
 */

import { describe, it, expect } from 'vitest';
import {
  regionContrast,
  worstStripContrast,
  isTextLike,
  kmeans2,
  luminance
} from './contrast.js';
import { analyseImage } from './analyse.js';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Build an ImageData-like object; fn(x, y) returns [r, g, b]. */
function makeImage(width, height, fn) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = fn(x, y);
      const o = (y * width + x) * 4;
      data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
    }
  }
  return { width, height, data };
}

/** Deterministic PRNG (mulberry32) so noise tests are repeatable. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c0, c1, t) => c0.map((v, i) => lerp(v, c1[i], t));

/** Glyph-like vertical strokes: 2 px wide, 8 px pitch, rows 4..(h-4). */
const isStroke = (x, y, h) => x % 8 < 2 && y >= 4 && y < h - 4;

const W = 200;
const H = 28;
const BOX = { x: 0, y: 4, w: W, h: 20 };
const CYAN = [105, 131, 179];   // about 0.22 luminance
const PURPLE = [140, 168, 222]; // about 0.38 luminance, steeper than the real case
const WHITE = [255, 255, 255];

/** True for the two text blobs; the 110 px between them is text-free. */
const inTextBlob = (x) => x < 48 || x >= 152;

/** Smooth vertical ramp with white strokes at both ends and a text-free gap. */
function rampWithGap({ noise = 0, seed = 1 } = {}) {
  const rand = rng(seed);
  const jitter = () => (noise ? Math.round((rand() * 2 - 1) * noise) : 0);
  return makeImage(W, H, (x, y) => {
    const base = isStroke(x, y, H) && inTextBlob(x)
      ? WHITE
      : mix(CYAN, PURPLE, y / (H - 1));
    return base.map((v) => Math.max(0, Math.min(255, Math.round(v) + jitter())));
  });
}

const near = (hex, rgb, tol) => {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return v.every((c, i) => Math.abs(c - rgb[i]) <= tol);
};

// ── 1. Characterisation (must pass before and after the fix) ─────────────────

describe('worstStripContrast: characterisation', () => {
  const bars = (fg, bg) => makeImage(120, 28, (x, y) => (isStroke(x, y, 28) ? fg : bg));

  it('black text bars on white give about 21:1', () => {
    const r = worstStripContrast(bars([0, 0, 0], WHITE), 0, 4, 120, 20);
    expect(r.contrast).toBeGreaterThan(20);
    expect(r.contrast).toBeLessThan(21.5);
  });

  it('mid-grey #777 on white gives about 4.5:1', () => {
    const r = worstStripContrast(bars([0x77, 0x77, 0x77], WHITE), 0, 4, 120, 20);
    expect(r.contrast).toBeGreaterThan(4.3);
    expect(r.contrast).toBeLessThan(4.7);
  });

  it('faint #BBB on white still reports a failing contrast, not null', () => {
    const r = worstStripContrast(bars([0xBB, 0xBB, 0xBB], WHITE), 0, 4, 120, 20);
    expect(r).not.toBeNull();
    expect(r.contrast).toBeGreaterThan(1.7);
    expect(r.contrast).toBeLessThan(2.1);
  });

  it('a uniform fill returns null', () => {
    const img = makeImage(120, 28, () => [200, 200, 200]);
    expect(regionContrast(img, 0, 4, 120, 20)).toBeNull();
    expect(worstStripContrast(img, 0, 4, 120, 20)).toBeNull();
  });
});

// ── 2. Repro: ramp, text at both ends, text-free gap ─────────────────────────

describe('worstStripContrast: text-free strips in a wide box', () => {
  it('reports the text colours, not two shades of the background ramp', () => {
    const r = worstStripContrast(rampWithGap(), BOX.x, BOX.y, BOX.w, BOX.h);
    expect(r.contrast).toBeGreaterThan(2);
    expect(near(r.fgHex, WHITE, 25)).toBe(true);
  });
});

// ── 3. Gradient only, no text ────────────────────────────────────────────────

describe('worstStripContrast: gradient with no text', () => {
  it('falls back without throwing', () => {
    const img = makeImage(W, H, (x, y) => mix(CYAN, PURPLE, y / (H - 1)));
    let r;
    expect(() => { r = worstStripContrast(img, BOX.x, BOX.y, BOX.w, BOX.h); }).not.toThrow();
    // Deliberate fallback: reported as before rather than silenced.
    expect(r === null || typeof r.contrast === 'number').toBe(true);
  });
});

// ── 4. Hard edge ─────────────────────────────────────────────────────────────

describe('isTextLike', () => {
  function labelled(img, x, y, w, h) {
    const lums = new Float64Array(w * h);
    let i = 0;
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const o = (yy * img.width + xx) * 4;
        lums[i++] = luminance(img.data[o], img.data[o + 1], img.data[o + 2]);
      }
    }
    const [cDark, cLight] = kmeans2(lums);
    return { lums, w, h, cDark, cLight };
  }

  it('is false for a single hard vertical boundary with no text', () => {
    const img = makeImage(40, 24, (x) => (x < 20 ? [0, 200, 220] : [255, 255, 255]));
    const s = labelled(img, 10, 2, 20, 20);
    expect(isTextLike(s.lums, s.w, s.h, s.cDark, s.cLight)).toBe(false);
  });

  it('is false for a smooth ramp', () => {
    const img = makeImage(40, 24, (x, y) => mix(CYAN, PURPLE, y / 23));
    const s = labelled(img, 10, 0, 20, 24);
    expect(isTextLike(s.lums, s.w, s.h, s.cDark, s.cLight)).toBe(false);
  });

  it('is false for a wide solid blob (a ribbon is not a stroke)', () => {
    // 16 px wide, 16 px tall block in a 40x36 region: both axes cross it twice,
    // but almost all of it is deeper than a stroke could be.
    const img = makeImage(40, 36, (x, y) => (x >= 12 && x < 28 && y >= 10 && y < 26 ? [0, 0, 0] : WHITE));
    const s = labelled(img, 0, 0, 40, 36);
    expect(isTextLike(s.lums, s.w, s.h, s.cDark, s.cLight)).toBe(false);
  });

  it('is false when strokes cross one axis only (a ribbon edge line)', () => {
    // Full-height 2 px vertical line: every row crosses it, no column does.
    const img = makeImage(40, 28, (x) => (x >= 19 && x < 21 ? [0, 0, 0] : WHITE));
    const s = labelled(img, 0, 0, 40, 28);
    expect(isTextLike(s.lums, s.w, s.h, s.cDark, s.cLight)).toBe(false);
  });

  it('is true for stroke-like text', () => {
    const img = makeImage(40, 28, (x, y) => (isStroke(x, y, 28) ? [0, 0, 0] : WHITE));
    const s = labelled(img, 4, 2, 24, 24);
    expect(isTextLike(s.lums, s.w, s.h, s.cDark, s.cLight)).toBe(true);
  });

  it('is false for a faint thin line crossing a dark panel at a shallow slope', () => {
    // 3 px thick line, one row down per 0.8 column: crosses most rows and
    // columns of the strip, is one solid colour and has no core, but no
    // vertical run longer than 3 px in a 29 px strip (the "kWh GRID" ribbon).
    const PANEL = [57, 60, 70];
    const LINE = [78, 95, 127];
    const img = makeImage(20, 29, (x, y) => (Math.abs(y - (x * 1.25 + 3)) < 1.5 ? LINE : PANEL));
    const s = labelled(img, 0, 0, 20, 29);
    expect(isTextLike(s.lums, s.w, s.h, s.cDark, s.cLight)).toBe(false);
  });

  it('is true for a colon: short marks that are one compact blob each', () => {
    // Two 3 x 3 dots in a 14 x 14 strip: the longest run (3) is under a
    // quarter of the strip but fills the rows the marks occupy.
    const dot = (x, y) => x >= 5 && x < 8 && ((y >= 2 && y < 5) || (y >= 8 && y < 11));
    const img = makeImage(14, 14, (x, y) => (dot(x, y) ? [0, 0, 0] : WHITE));
    const s = labelled(img, 0, 0, 14, 14);
    expect(isTextLike(s.lums, s.w, s.h, s.cDark, s.cLight)).toBe(true);
  });
});

// ── 5. Low-contrast text must not be hidden ──────────────────────────────────

describe('worstStripContrast: faint text on a gentle ramp', () => {
  it('still fails (contrast below 3)', () => {
    // Horizontal ramp 0.5 -> 0.55 luminance-ish grey; strokes about 1.5:1.
    const img = makeImage(W, H, (x, y) => {
      const bg = Math.round(lerp(190, 200, x / (W - 1)));
      return isStroke(x, y, H) ? [bg - 38, bg - 38, bg - 38] : [bg, bg, bg];
    });
    const r = worstStripContrast(img, BOX.x, BOX.y, BOX.w, BOX.h);
    expect(r).not.toBeNull();
    expect(r.contrast).toBeGreaterThan(1.2);
    expect(r.contrast).toBeLessThan(3);
  });
});

// ── 6. Noise ─────────────────────────────────────────────────────────────────

describe('worstStripContrast: noise tolerance', () => {
  it('+/-3 levels of noise leaves the result essentially unchanged', () => {
    const clean = worstStripContrast(rampWithGap(), BOX.x, BOX.y, BOX.w, BOX.h);
    const noisy = worstStripContrast(rampWithGap({ noise: 3 }), BOX.x, BOX.y, BOX.w, BOX.h);
    expect(noisy.contrast).toBeGreaterThan(2);
    expect(near(noisy.fgHex, WHITE, 25)).toBe(true);
    expect(Math.abs(noisy.contrast - clean.contrast)).toBeLessThan(0.4);
  });
});

// ── 7. analyseImage integration ──────────────────────────────────────────────

describe('analyseImage: wide OCR box over text and a gap', () => {
  it('yields one pair whose colours come from the text', () => {
    const report = analyseImage(rampWithGap(), [
      { text: 'ab cd ef', score: 0.95, bbox: { x: BOX.x, y: BOX.y, w: BOX.w, h: BOX.h } }
    ]);
    expect(report.colourPairs).toHaveLength(1);
    const p = report.colourPairs[0];
    expect(p.contrast).toBeGreaterThan(2);
    expect(near(p.fgHex, WHITE, 25)).toBe(true);
  });
});

// ── 5. A thin ribbon edge across a dark gap between two text items ───────────
// Work item 020. The line crosses at a shallow slope but kinks steeply in one
// place, so exactly the strip over the kink looks like a glyph. Its neighbours
// hold the same two colours and do not look like text.

describe('worstStripContrast: a thin line crossing the gap between text items', () => {
  const GAP_BG = [58, 61, 72];
  const LINE = [78, 94, 131];       // about 1.7:1 on GAP_BG
  const TEXT = [240, 240, 244];
  const LW = 300;
  const LH = 28;

  // Rows the line occupies at column x: a slow slope with a steep kink at x 140..142.
  const lineRows = (x) => {
    if (x >= 140 && x < 143) return [6, 22];
    const y = 8 + Math.round((x - 60) / 10);
    return [y, y + 1];
  };

  function image({ line = true, text = true } = {}) {
    return makeImage(LW, LH, (x, y) => {
      if (text && (x < 48 || x >= 252) && isStroke(x, y, LH)) return TEXT;
      if (line && x >= 60 && x < 240) {
        const [a, b] = lineRows(x);
        if (y >= a && y <= b) return LINE;
      }
      return GAP_BG;
    });
  }

  it('reports the text, not the line', () => {
    const r = worstStripContrast(image(), 0, 4, LW, 20);
    expect(near(r.fgHex, TEXT, 25)).toBe(true);
    expect(r.contrast).toBeGreaterThan(8);
  });

  it('is the same result as the box without the line', () => {
    const withLine = worstStripContrast(image(), 0, 4, LW, 20);
    const without = worstStripContrast(image({ line: false }), 0, 4, LW, 20);
    expect(withLine.contrast).toBeCloseTo(without.contrast, 6);
  });

  it('a lone faint glyph group among bare background is still reported', () => {
    const faint = [100, 100, 112]; // about 1.5:1 on GAP_BG
    const img = makeImage(LW, LH, (x, y) => (x < 24 && isStroke(x, y, LH) ? faint : GAP_BG));
    const r = worstStripContrast(img, 0, 4, LW, 20);
    expect(r).not.toBeNull();
    expect(near(r.fgHex, faint, 12)).toBe(true);
    expect(r.contrast).toBeLessThan(2);
  });

  it('faint real text is not mistaken for a line: strokes keep the lowest result', () => {
    const faint = [100, 100, 112];
    const img = makeImage(LW, LH, (x, y) => {
      if (x < 48 && isStroke(x, y, LH)) return faint;
      if (x >= 252 && isStroke(x, y, LH)) return TEXT;
      return GAP_BG;
    });
    const r = worstStripContrast(img, 0, 4, LW, 20);
    expect(near(r.fgHex, faint, 12)).toBe(true);
  });
});
