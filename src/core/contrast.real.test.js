/**
 * core/contrast.js: real-screenshot regression tests.
 *
 * Each fixture is a crop of an OCR box from a real phone screenshot of an
 * energy-flow chart: dark labels sit on flat panels at both ends, and
 * semi-transparent gradient ribbons cross the middle of the box. The ribbons
 * contain no text, so a pair made only of ribbon shades is a false report.
 *
 * Fixtures carry a 2 px margin around the box (the same margin the analysis
 * adds), so the box inside each PNG is at (2, 2) and 4 px smaller each way.
 *
 * Findings behind the expectations are in the comment above isTextLike.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { worstStripContrast, luminance } from './contrast.js';
import { decodePng } from './__fixtures__/decode-png.js';

const load = (name) =>
  decodePng(fs.readFileSync(fileURLToPath(new URL(`./__fixtures__/${name}.png`, import.meta.url))));

const hexLum = (hex) =>
  luminance(...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));

function winner(name) {
  const img = load(name);
  return worstStripContrast(img, 2, 2, img.width - 4, img.height - 4);
}

// minContrast: the lowest a real text strip scores in that box (rounded down).
// Every false ribbon pair scored 2.01 or less before the fix.
const CASES = [
  { name: 'mwh762',     minContrast: 2.3, note: '"762.03 MWh": teal and purple panels' },
  { name: 'batte154',   minContrast: 2.3, note: '"BATTE.. 1.54"' },
  { name: 'mwh_kwh',    minContrast: 2.5, note: '"MWh kWh"' },
  { name: 'kwh_grid',   minContrast: 2.9, note: '"kWh GRID"' },
  { name: 's105_80039', minContrast: 2.7, note: '"1.05 800.39" (already right, must stay right)' }
];

describe('worstStripContrast: real chart crops with gradient ribbons', () => {
  for (const { name, minContrast, note } of CASES) {
    it(`${note} reports real text, not two ribbon shades`, () => {
      const r = winner(name);
      expect(r).not.toBeNull();
      expect(r.contrast).toBeGreaterThanOrEqual(minContrast);
      // The labels are dark; a ribbon shade is never this dark.
      expect(Math.min(hexLum(r.fgHex), hexLum(r.bgHex))).toBeLessThan(0.1);
    });
  }
});
