/**
 * core/contrast.js: one OCR box covering several separate text items on
 * different backgrounds (work item 020).
 *
 * Fixtures are Tim's two screen-grabs of the app, with the red OCR outline
 * painted over (src/core/__fixtures__):
 *   btn2026_full   two dark buttons: "2026", a grey chevron, "Lifeti..." and a
 *                  down-arrow. The box spans both buttons and the gap.
 *   pct2469b_full  a blue/purple card with "24.69%" (dark text), a ribbon over
 *                  a dark gap, and a dark panel with "63.33 kWh" (dark text on
 *                  indigo, genuinely faint). The box spans all three.
 *   btn2026, pct2469b  the same two boxes cropped to the inside of the
 *                  outline (box inset 2 px, the same convention as
 *                  contrast.real.test.js).
 *
 * The OCR box position is not known to the pixel, so each case is checked over
 * a grid of boxes around the outline: shifted, grown and trimmed. The reported
 * pair must be real text on its own local background in every one of them,
 * never the chevron, the page against a button, or a ribbon edge.
 *
 * On main before this change: case 1 passes in every box (the chevron never
 * wins at this scale, so those tests are guards, not reproductions); case 2
 * fails in 196 of the grid's boxes, all with a ribbon edge over the dark gap
 * reported as the pair (#4E5E83 on #3A3D48 and similar, 1.67 to 1.73).
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { worstStripContrast } from './contrast.js';
import { decodePng } from './__fixtures__/decode-png.js';

const load = (name) =>
  decodePng(fs.readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}.png`, import.meta.url))));

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const near = (hex, ref, tol) => rgb(hex).every((v, i) => Math.abs(v - ref[i]) <= tol);

// Boxes around the outline interior [bx, by, bw, bh]: grow or shrink each side.
function boxGrid(bx, by, bw, bh, img) {
  const out = [];
  for (let top = -4; top <= 4; top += 2) {
    for (let bottom = -4; bottom <= 4; bottom += 2) {
      for (let left = -6; left <= 10; left += 4) {
        for (let right = -6; right <= 10; right += 4) {
          const x = bx - left, y = by - top;
          const w = bw + left + right, h = bh + top + bottom;
          if (h < 10 || x < 2 || y < 2 || y + h > img.height - 2 || x + w > img.width - 2) continue;
          out.push({ x, y, w, h, label: `${x},${y},${w},${h}` });
        }
      }
    }
  }
  return out;
}

describe('case 1: one box across two buttons, a chevron and an arrow', () => {
  // "2026" and "Lifeti..." are near-white on a dark grey button: about 9 to 11.
  const isButtonText = (r) => near(r.fgHex, [245, 245, 245], 25) && near(r.bgHex, [58, 61, 67], 30);

  it('crop inside the outline reports white text on its own button', () => {
    const img = load('btn2026');
    const r = worstStripContrast(img, 2, 2, img.width - 4, img.height - 4);
    expect(isButtonText(r)).toBe(true);
    expect(r.contrast).toBeGreaterThanOrEqual(7);
  });

  it('every box around the outline reports button text, never the chevron or the gap', () => {
    const img = load('btn2026_full');
    const boxes = boxGrid(33, 33, 360, 31, img);
    expect(boxes.length).toBeGreaterThan(200);
    const bad = [];
    for (const b of boxes) {
      const r = worstStripContrast(img, b.x, b.y, b.w, b.h);
      if (!r || !isButtonText(r) || r.contrast < 7) bad.push(`${b.label} -> ${r && r.fgHex + ' on ' + r.bgHex + ' ' + r.contrast.toFixed(2)}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('case 2: one box across a card, a ribbon and a panel', () => {
  // Both texts are dark navy ink: "24.69%" on blue (#838BEC) and "63.33 kWh"
  // on indigo (#4E52B3). "63.33 kWh" is the faint one (about 1.8) and is the
  // right answer; "24.69%" scores about 3.3 to 3.9. A ribbon edge over the
  // dark gap (#4E5E83 on #3A3D48, 1.67 to 1.73) is not text.
  const isCardText = (r) =>
    near(r.fgHex, [43, 51, 96], 30) && (near(r.bgHex, [78, 82, 179], 30) || near(r.bgHex, [131, 139, 236], 30));

  it('crop inside the outline reports "63.33 kWh" on its own indigo', () => {
    const img = load('pct2469b');
    const r = worstStripContrast(img, 2, 2, img.width - 4, img.height - 4);
    expect(isCardText(r)).toBe(true);
    expect(r.contrast).toBeGreaterThanOrEqual(1.7);
  });

  it('every box around the outline reports card text, never a ribbon edge', () => {
    const img = load('pct2469b_full');
    const boxes = boxGrid(33, 33, 538, 24, img);
    expect(boxes.length).toBeGreaterThan(200);
    const bad = [];
    for (const b of boxes) {
      const r = worstStripContrast(img, b.x, b.y, b.w, b.h);
      if (!r || !isCardText(r) || r.contrast < 1.7) bad.push(`${b.label} -> ${r && r.fgHex + ' on ' + r.bgHex + ' ' + r.contrast.toFixed(2)}`);
    }
    expect(bad).toEqual([]);
  });
});
