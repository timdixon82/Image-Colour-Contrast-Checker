/**
 * core/contrast.js: boxes taken from a real PaddleOCR run (work item 020,
 * follow-up to PR 80).
 *
 * The fixture sweeps in the other test files build their boxes from the image
 * size, so they cannot see what the real detector does at reduced scale: it
 * returns wide boxes that span a pill, the dark gap of a chart and a second
 * pill, and boxes whose strips no longer pass the text-shape test. Those boxes
 * were captured by running the app on scaled, cropped copies of the fixtures
 * in real Chrome, and are stored as data in __fixtures__/real-ocr-boxes.json:
 *
 *   src    the committed image the case is cut from: "kwh_grid" and
 *          "kwh_grid2" are fixtures here, "tim-full-screenshot-5" is the work
 *          item 020 screenshot of the energy chart
 *   k      scale applied to src (corner-aligned bilinear, scaleImageCorner)
 *   crop   [cx, cy] px trimmed off the left and top after scaling
 *   fit    true when the app also resizes the result into 800 to 1400 px
 *          before OCR (small images only); the stand-in is fitLikeApp
 *   rs     "exact" when the image was scaled by the probe resampler
 *          (scaleImageExact); absent for the corner-aligned one
 *   box    [x, y, w, h] the OCR box, in the pixels of that final image
 *   words  (group cases) [{ text, box }] the OCR boxes of the image that set a
 *          pair, so analyseImage can be run on them: the box of `label` and
 *          every box whose reading the earlier PR 80 code changed
 *   label  the text OCR read
 *   main   what the code before PR 80 reports on these exact pixels
 *   ref    what the same label reports at 1x, where there is one; for the
 *          wide "24.69% ... 63.33 kWh" box it is the faint text's 1.65 (note)
 *   real   the contrast the real browser run gave on main and on PR 80
 *   want   (some cases) the reading the box must reach, here "atMost 2.0": the
 *          wide "24.69% ... 63.33 kWh" box holds the faint 63.33 kWh (1.65)
 *
 * Every case without `want` is a box where PR 80 as first written reported a
 * LOWER contrast than main. The rule: a result is never lower than main's unless it
 * lands within REF_TOL of the 1x value or closer to it than main was (then the
 * lower figure is the real one, and main was over-reporting). It guards against:
 *   - the band retry reaching the dark gap and reporting dark grey on darker
 *     grey (1.3 to 1.4) for a wide "kWh ... GRID" box;
 *   - the band retry on a box of plain text on one background, where cutting
 *     the box into bands leaves only half-covered strokes: a lighter ink than
 *     the real one, so a pass reads as a fail ("43.69%" 6.2 to 3.7);
 *   - the band retry reading the top edge of the faint "63.33 kWh" through a
 *     box set a few pixels high ("kWh GRID", 2.4 to 1.5).
 *
 * Group cases (those with `words`) guard the other half of the rule. A pair is
 * the lowest reading of all its boxes, so a box that reads text on a card a
 * little too low (a stroke half covered by the band, at reduced scale) pulls
 * down the pair of a different label that shares its colours: "595.07" 3.18 to
 * 2.69 at 0.85x, "1.05 800.39" 2.58 to 2.42 at 0.92x. For those the label's
 * pair must be no further from its 1x value `ref` than main's was, plus
 * GROUP_TOL.
 *
 * The F5 cases read the screenshot from the work folder, where it is
 * committed; all other inputs are in __fixtures__.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { worstStripContrast } from './contrast.js';
import { analyseImage } from './analyse.js';
import { decodePng } from './__fixtures__/decode-png.js';
import { cropTopLeft, fitLikeApp, scaleImageCorner, scaleImageExact } from './__fixtures__/box-sweep.js';

const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const SOURCES = {
  'tim-full-screenshot-5': '../../.claude/work/020-iccc-swatch-multi-region-boxes/images/tim-full-screenshot-5.png',
  kwh_grid: './__fixtures__/kwh_grid.png',
  kwh_grid2: './__fixtures__/kwh_grid2.png'
};
const ALL = JSON.parse(fs.readFileSync(here('./__fixtures__/real-ocr-boxes.json'), 'utf8'));
const CASES = ALL.filter((c) => c.box);
const GROUPS = ALL.filter((c) => c.words);

const REF_TOL = 0.35; // contrast units
const MAIN_TOL = 0.05;
const GROUP_TOL = 0.1; // contrast units, a pair may be this much further from 1x than main's

const sources = {};
const built = new Map();
function imageFor({ src, k, crop, fit, rs }) {
  const key = [src, k, crop, fit, rs].join();
  if (!built.has(key)) {
    sources[src] ??= decodePng(fs.readFileSync(here(SOURCES[src])));
    const scale = rs === 'exact' ? scaleImageExact : scaleImageCorner;
    const img = cropTopLeft(scale(sources[src], k), ...crop);
    built.set(key, fit ? fitLikeApp(img) : img);
  }
  return built.get(key);
}

describe('worstStripContrast: real OCR boxes at reduced and increased scale', () => {
  it.each(CASES.filter((c) => c.want).map((c) => [`${c.src} x${c.k} crop ${c.crop} "${c.label}" box ${c.box}`, c]))(
    '%s still finds the faint text',
    (name, c) => {
      const r = worstStripContrast(imageFor(c), ...c.box);
      expect(r.contrast).toBeLessThanOrEqual(c.want.atMost);
    }
  );

  it.each(CASES.map((c) => [`${c.src} x${c.k} crop ${c.crop} "${c.label}" box ${c.box}`, c]))(
    '%s is not read lower than before',
    (name, c) => {
      const r = worstStripContrast(imageFor(c), ...c.box);
      expect(r).not.toBeNull();
      // Lower than main is fine only where it is the better reading: within
      // REF_TOL of the 1x value, or closer to it than main was.
      if (c.ref !== null && Math.abs(r.contrast - c.ref) <= Math.max(REF_TOL, Math.abs(c.main - c.ref))) return;
      expect(r.contrast).toBeGreaterThanOrEqual(c.main - MAIN_TOL);
    }
  );
});

describe('analyseImage: a box read at reduced scale does not pull down another label\'s pair', () => {
  it.each(GROUPS.map((c) => [`${c.src} x${c.k} crop ${c.crop} "${c.label}"`, c]))(
    '%s stays near its 1x value',
    (name, c) => {
      const words = c.words.map((w) => ({ text: w.text, score: 0.99, bbox: { x: w.box[0], y: w.box[1], w: w.box[2], h: w.box[3] } }));
      const pair = analyseImage(imageFor(c), words).colourPairs.find((p) => p.examples.includes(c.label));
      expect(pair).toBeDefined();
      expect(Math.abs(pair.contrast - c.ref)).toBeLessThanOrEqual(Math.abs(c.main - c.ref) + GROUP_TOL);
    }
  );
});
