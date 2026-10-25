/**
 * core/contrast.js: the 019 and 020 fixtures swept over many boxes (work item
 * 020, rework after the real-browser test of PR 75).
 *
 * The OCR box moves by a few pixels with the screenshot size, scale and crop,
 * so one fixed box per fixture hides regressions. Each fixture is cropped,
 * rescaled and measured in many boxes (see __fixtures__/box-sweep.js), and in
 * every variant the reported pair must be real text on its own background with
 * a contrast inside the range the true text has.
 *
 * `texts` lists the real text pairs [ink, background] (RGB, tolerance 30 on
 * each colour, either way round). `lo`..`hi` is the range the lowest real text
 * scores across the sweep: `hi` is what catches a higher-contrast pair hiding
 * the real lowest one (batte154 at 2x, kwh_grid at 1x), and the colour check
 * catches a pair made of two backgrounds (mwh762 and mwh_kwh with the top
 * trimmed 3 px).
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { worstStripContrast } from './contrast.js';
import { decodePng } from './__fixtures__/decode-png.js';
import { sweepBoxes } from './__fixtures__/box-sweep.js';

const load = (name) =>
  decodePng(fs.readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}.png`, import.meta.url))));

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const near = (hex, ref) => rgb(hex).every((v, i) => Math.abs(v - ref[i]) <= 30);
const isRealText = (r, texts) =>
  texts.some(([a, b]) => (near(r.fgHex, a) && near(r.bgHex, b)) || (near(r.fgHex, b) && near(r.bgHex, a)));

// [left, top, right, bottom] growth in px; negative trims the box.
const OFFSETS = [];
for (const t of [-3, 0]) for (const b of [-2, 0]) for (const l of [-4, 0]) for (const r of [-4, 0]) OFFSETS.push([l, t, r, b]);
OFFSETS.push([2, 2, 2, 2], [0, -4, 0, -4], [-4, -3, -4, -4], [0, -3, -6, -4], [-6, -3, -6, -4]);

const CASES = [
  { name: 'mwh762',     lo: 2.0, hi: 2.5, texts: [[[47, 71, 92], [126, 222, 220]], [[60, 52, 107], [140, 86, 223]]] },
  { name: 'mwh_kwh',    lo: 2.2, hi: 2.9, texts: [[[76, 79, 73], [233, 223, 113]], [[46, 65, 85], [89, 141, 144]]] },
  { name: 'batte154',   lo: 2.2, hi: 2.7, texts: [[[56, 51, 100], [138, 85, 219]]] },
  { name: 'kwh_grid',   lo: 2.4, hi: 3.3, texts: [[[63, 71, 119], [131, 138, 236]]] },
  { name: 'kwh_grid2',  lo: 2.7, hi: 3.7, texts: [[[62, 70, 115], [133, 141, 240]], [[164, 170, 240], [70, 75, 140]]] },
  { name: 'pct2469',    lo: 1.5, hi: 3.1, texts: [[[47, 55, 106], [78, 82, 179]], [[55, 63, 100], [131, 139, 236]]] },
  { name: 'pct2469b',   lo: 1.55, hi: 2.0, texts: [[[47, 55, 106], [78, 82, 179]]] },
  { name: 's105_80039', lo: 2.4, hi: 3.0, texts: [[[78, 82, 74], [230, 221, 112]], [[45, 63, 83], [87, 138, 141]]] }
];

const REAL = (c) => (r) => !!r && isRealText(r, c.texts) && r.contrast >= c.lo && r.contrast <= c.hi;
const describe_ = (r) => r && `${r.fgHex} on ${r.bgHex} ${r.contrast.toFixed(2)}`;

describe('worstStripContrast: 019 fixtures over cropped, scaled and shifted boxes', () => {
  for (const c of CASES) {
    it(`${c.name}: never worse than keeping every text-like strip`, () => {
      const ok = REAL(c);
      const worse = [];
      sweepBoxes(load(c.name), (img, x, y, w, h) => ({
        base: worstStripContrast(img, x, y, w, h, { dropRibbonLines: false, bands: false }),
        now: worstStripContrast(img, x, y, w, h)
      }), { offsets: OFFSETS }).forEach(({ label, result }) => {
        if (ok(result.base) && !ok(result.now)) worse.push(`${label}: ${describe_(result.base)} -> ${describe_(result.now)}`);
      });
      expect(worse).toEqual([]);
    });
  }
});

// Tim's two full screenshots (red outline painted over): the box he saw is at
// (33, 33) in each. On main, a chevron (buttons) or a ribbon edge (cards) won
// in some crops and scales; the pair must always be the real text.
describe("worstStripContrast: Tim's screenshots over crops and scales", () => {
  const SCALES = [0.6, 0.8, 1, 1.5, 2, 2.5, 3, 4];
  const CROPS = [[0, 0], [0, 6], [9, 0], [5, 0]];
  const FULL = [
    { name: 'btn2026_full', box: [33, 33, 360, 31], lo: 7,
      texts: [[[245, 245, 245], [58, 61, 67]]] },
    { name: 'pct2469b_full', box: [33, 33, 538, 24], lo: 1.6,
      texts: [[[43, 51, 96], [78, 82, 179]], [[43, 51, 96], [131, 139, 236]]] }
  ];
  for (const { name, box, lo, texts } of FULL) {
    it(`${name}: every crop and scale reports its real text`, () => {
      const bad = sweepBoxes(load(name), worstStripContrast, {
        scales: SCALES, crops: CROPS, offsets: [[0, 0, 0, 0]], box
      }).filter(({ result: r }) => !(r && isRealText(r, texts) && r.contrast >= lo))
        .map(({ label, result: r }) => `${label}: ${describe_(r)}`);
      expect(bad).toEqual([]);
    });
  }
});

// Work item 020, follow-up: two failures that were left open after PR 75.
//
// A. kwh_grid: one thin ribbon edge over the dark gap passes the shape test on
//    a single strip, so it is the only strip of its pair and sits between
//    ribbon strips that are not text. On main this reported the ribbon (about
//    1.8 to 1.9) at 1.25x to 3x in 46 of the variants swept here, instead of
//    the real text (2.8 and above).
describe('worstStripContrast: a lone ribbon-edge strip never beats the real text (kwh_grid)', () => {
  const run = () => {
    const c = CASES.find((x) => x.name === 'kwh_grid');
    const ok = REAL(c);
    return sweepBoxes(load('kwh_grid'), (img, x, y, w, h) => ({
      base: worstStripContrast(img, x, y, w, h, { dropRibbonLines: false, bands: false }),
      now: worstStripContrast(img, x, y, w, h)
    }), { offsets: OFFSETS }).map(({ label, result: r }) => ({ label, r, ok }));
  };

  it('reports the real text, or the reading it had before, in every variant at 1x to 3x', () => {
    // A box where no strip looks like text keeps its whole-box reading unless
    // the bands find fainter text (see worstStripContrast), so the three 1x
    // variants cropped 3 px from the top keep the ribbon reading main gave
    // (2.36): not real text, but never lower than before.
    const bad = run()
      .filter(({ r, ok }) => !ok(r.now) && !(r.now.contrast >= r.base.contrast - 0.02))
      .map(({ label, r }) => `${label}: ${describe_(r.now)} (was ${describe_(r.base)})`);
    expect(bad).toEqual([]);
  });

  it('still replaces the ribbon with the real text in at least 40 variants', () => {
    const fixed = run().filter(({ r, ok }) => !ok(r.base) && ok(r.now)).length;
    expect(fixed).toBeGreaterThanOrEqual(40);
  });
});

// B. energy_card_gap: a crop of Tim's energy screenshot (the "24.69%" and
//    "63.33 kWh" row). When the OCR box reaches 6 px or more below the card
//    into the dark gap, every strip holds three colours and none looks like
//    text, so the whole box was measured: periwinkle card against the gap,
//    about 2.6 (non-text). The real lowest pair is navy on indigo, about 1.6.
//    Crop origin in the screenshot is (30, 930); the box is the text line,
//    grown downwards by 0 to 21 px and moved or trimmed on the left.
describe("worstStripContrast: a box that reaches below the card into the gap (Tim's energy screenshot)", () => {
  const NAVY_ON_INDIGO = [[[43, 51, 96], [78, 82, 179]]];
  const OFFS = [];
  for (const l of [0, 10, -4]) for (const b of [0, 5, 11, 15, 21]) OFFS.push([l, 0, 0, b]);

  it('reports navy on indigo, 1.5 to 2.0, at 0.75x to 1.5x', () => {
    const bad = sweepBoxes(load('energy_card_gap'), worstStripContrast, {
      scales: [0.75, 0.8, 1, 1.5], crops: [[0, 0]], offsets: OFFS, box: [26, 21, 489, 34]
    }).filter(({ result: r }) => !(r && isRealText(r, NAVY_ON_INDIGO) && r.contrast >= 1.5 && r.contrast <= 2.0))
      .map(({ label, result: r }) => `${label}: ${describe_(r)}`);
    expect(bad).toEqual([]);
  });
});
