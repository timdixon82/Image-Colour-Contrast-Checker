/**
 * Pure WCAG 2.2 contrast math.
 * No DOM, no browser APIs — safe to run in Node, workers, or the browser.
 *
 * @module core/contrast
 */

// sRGB linearisation per IEC 61966-2-1 (threshold 0.04045).
export function linearise(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

// Pre-computed look-up table for the pixel loop hot path.
const LIN_LUT = new Float64Array(256);
for (let i = 0; i < 256; i++) LIN_LUT[i] = linearise(i);

/** Relative luminance from integer 0–255 RGB channels. */
export function luminance(r, g, b) {
  return 0.2126 * LIN_LUT[r] + 0.7152 * LIN_LUT[g] + 0.0722 * LIN_LUT[b];
}

/** Relative luminance from float RGB (rounds to nearest integer first). */
export function luminanceFloat(r, g, b) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return luminance(clamp(r), clamp(g), clamp(b));
}

/** WCAG contrast ratio between two relative luminance values. */
export function wcagContrast(l1, l2) {
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/** Parse a 6-digit hex colour string to [r, g, b] integers. */
export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}

/** Encode integer RGB to uppercase hex string with leading #. */
export function rgbToHex(r, g, b) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n)))
    .toString(16).padStart(2, '0').toUpperCase();
  return '#' + c(r) + c(g) + c(b);
}

/** Euclidean distance between two hex colour strings. */
export function colourDistance(h1, h2) {
  const [r1, g1, b1] = hexToRgb(h1);
  const [r2, g2, b2] = hexToRgb(h2);
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * 1-D k-means with k=2.
 * Initialises from the 25th/75th percentile values and iterates to
 * fixed-point. Returns [dark, light] centroids, or null for < 4 values.
 * @param {ArrayLike<number>} values
 * @returns {[number, number]|null}
 */
export function kmeans2(values) {
  if (!values || values.length < 4) return null;

  const sv = Float64Array.from(values).sort();
  const n  = sv.length;
  let c0 = sv[Math.floor(n * 0.25)];
  let c1 = sv[Math.floor(n * 0.75)];
  if (c0 === c1) c1 = c0 + 1e-9;

  for (let iter = 0; iter < 60; iter++) {
    let s0 = 0, s1 = 0, n0 = 0, n1 = 0;
    for (let i = 0; i < n; i++) {
      const v = sv[i];
      if (Math.abs(v - c1) < Math.abs(v - c0)) { s1 += v; n1++; }
      else                                      { s0 += v; n0++; }
    }
    const nc0 = n0 ? s0 / n0 : c0;
    const nc1 = n1 ? s1 / n1 : c1;
    if (Math.abs(nc0 - c0) < 1e-7 && Math.abs(nc1 - c1) < 1e-7) { c0 = nc0; c1 = nc1; break; }
    c0 = nc0; c1 = nc1;
  }

  if (c0 > c1) { const t = c0; c0 = c1; c1 = t; }
  return [c0, c1];
}

// Thresholds for isTextLike. All are relative to the cluster separation or to
// the strip size, so faint text is judged by its shape and never by its
// absolute contrast.
//
//   BAND         0.15  hysteresis half-band as a share of separation.
//   LINE_CHANGES 2     bg, stroke, bg: the minimum for a stroke crossing.
//   LINE_SHARE   0.20  share of rows AND of columns that must be stroke-like.
//   MIN_MINORITY 0.02  smaller cluster must hold at least this share of pixels.
//   MAX_CORE     0.35  at most this share of the minority pixels may have their
//                      whole (2R+1) square inside the cluster, R = strip height
//                      / CORE_DIV (18), at least 1 px. Strokes are thin; a
//                      ribbon is a wide blob.
//   MAX_SPREAD   0.40  std dev of the minority cluster's luminance as a share
//                      of the separation. A stroke is one solid colour.
//   MIN_RUN      0.25  longest unbroken vertical run of minority pixels, as a
//                      share of the strip height: a glyph has a stem or a
//                      curve at least this tall ...
//   COMPACT      0.50  ... or the run is at least this share of the rows the
//                      minority pixels occupy at all: a full stop or comma is
//                      short but is one compact blob, whereas a thin line
//                      crossing at a slope touches many rows with a short run
//                      in each.
//
// Why each rule exists, from per-strip numbers on a real chart screenshot
// (dark labels on flat panels, gradient ribbons between them; fixtures in
// src/core/__fixtures__). Real text strips (35 kept): smaller line share 0.22
// to 0.9, core 0.00 to 0.29, spread 0.09 to 0.32. Ribbon strips
// the first version wrongly kept:
//   - ribbon edges with one axis only (row share 0.00 to 0.08, or column
//     share 0.04): rejected by requiring BOTH axes. A glyph has strokes
//     across its rows and its columns; a one-pixel-wide ribbon edge has them
//     in one direction only. (The first version accepted either axis.)
//   - wide ribbon blobs against a dark panel (core 0.43 to 0.64): rejected by
//     MAX_CORE (real strips reach 0.29, so that margin is small).
//   - a hard panel edge plus gradient (spread 0.52 to 0.53): rejected by
//     MAX_SPREAD; the minority "cluster" is a mixture, not one colour.
// Second round, same chart, boxes "kWh GRID" and "24.69% 63.33 kWh": a thin
// (2 to 3 px) ribbon edge line crossing the dark gap between panels, faint
// (separation 0.05 to 0.08) but with crossings on both axes, one solid colour
// and no core, so every rule above accepted it (1.71 and 1.56 reported). What
// separates it is its direction: it runs across the strip at a shallow slope,
// so its longest vertical run is 0.10 to 0.21 of the strip height and only
// 0.20 to 0.36 of the rows it occupies. Real text strips (including the
// genuinely faint "63.33 kWh" at separation 0.06) have a longest run of 0.30
// to 1.00 of the strip height. Dots and commas fail the height test but their
// run fills their own rows (ratio near 1), so the COMPACT alternative keeps
// them: a first version without it made a punctuation-only box pass in 40 more
// steep-ramp sweep cases. Not hardened further: a near-vertical edge line
// would still pass.
// Sharpness of steps relative to the separation was measured too and did not
// separate them (ribbon edges are as crisp as glyph edges), so it is not used.
const BAND = 0.15;
const LINE_CHANGES = 2;
const LINE_SHARE = 0.20;
const MIN_MINORITY = 0.02;
const MAX_CORE = 0.35;
const CORE_DIV = 18;
const MAX_SPREAD = 0.40;
const MIN_RUN = 0.25;
const COMPACT = 0.50;

/**
 * Does a region's dark/light split look like text rather than a smooth ramp,
 * a single hard edge, or a gradient ribbon? Labels each pixel dark or light
 * with hysteresis (a Schmitt trigger, so noise on a ramp makes no fake
 * transitions), then requires all of:
 *   1. stroke crossings (background, stroke, background) on enough rows AND
 *      enough columns;
 *   2. a minority cluster that is thin (little of it survives erosion);
 *   3. a minority cluster of one solid colour (small luminance spread);
 *   4. a stem, curve or compact mark: a vertical run of minority pixels at
 *      least MIN_RUN of the strip height, or at least COMPACT of the rows the
 *      minority pixels occupy (a shallow thin line has neither).
 *
 * @param {Float64Array} lums    Row-major luminance, rw * rh values
 * @param {number} rw
 * @param {number} rh
 * @param {number} cDark         Dark k-means centre
 * @param {number} cLight        Light k-means centre
 * @returns {boolean}
 */
export function isTextLike(lums, rw, rh, cDark, cLight) {
  const sep = cLight - cDark;
  const mid = (cDark + cLight) / 2;
  const lo = mid - BAND * sep;
  const hi = mid + BAND * sep;

  /**
   * Hysteresis-label every line along one axis. Returns the share of lines
   * with a stroke crossing and, when `labels` is given, writes the labels.
   */
  const scan = (lines, len, lineStride, step, labels) => {
    let strokeLines = 0;
    for (let l = 0; l < lines; l++) {
      let i = l * lineStride;
      let state = lums[i] >= mid;
      let changes = 0;
      for (let k = 0; k < len; k++, i += step) {
        const v = lums[i];
        if (state ? v < lo : v > hi) { state = !state; changes++; }
        if (labels) labels[i] = state ? 1 : 0;
      }
      if (changes >= LINE_CHANGES) strokeLines++;
    }
    return strokeLines / lines;
  };

  const n = rw * rh;
  const labels = new Uint8Array(n);
  const rowShare = scan(rh, rw, rw, 1, labels);
  let light = 0;
  for (let i = 0; i < n; i++) light += labels[i];
  const minLabel = light <= n - light ? 1 : 0;
  if (Math.min(light, n - light) / n < MIN_MINORITY) return false;
  if (rowShare < LINE_SHARE) return false;
  if (scan(rw, rh, 1, rw) < LINE_SHARE) return false;

  // Spread of the minority cluster's luminance.
  let count = 0, sum = 0, sumSq = 0;
  for (let i = 0; i < n; i++) {
    if (labels[i] !== minLabel) continue;
    count++; sum += lums[i]; sumSq += lums[i] * lums[i];
  }
  const mean = sum / count;
  if (Math.sqrt(Math.max(0, sumSq / count - mean * mean)) / sep > MAX_SPREAD) return false;

  // Longest vertical run of the minority cluster, and how many rows it occupies.
  let longest = 0;
  const occupied = new Uint8Array(rh);
  for (let x = 0; x < rw; x++) {
    let run = 0;
    for (let y = 0; y < rh; y++) {
      if (labels[y * rw + x] === minLabel) {
        run++;
        occupied[y] = 1;
        if (run > longest) longest = run;
      } else {
        run = 0;
      }
    }
  }
  const rows = occupied.reduce((a, v) => a + v, 0);
  if (longest < MIN_RUN * rh && longest < COMPACT * rows) return false;

  // Core share: minority pixels whose whole (2R+1) square is minority.
  const R = Math.max(1, Math.round(rh / CORE_DIV));
  let core = 0;
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      if (labels[y * rw + x] !== minLabel) continue;
      let deep = true;
      for (let dy = -R; dy <= R && deep; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= rh) continue;
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx;
          if (xx >= 0 && xx < rw && labels[yy * rw + xx] !== minLabel) { deep = false; break; }
        }
      }
      if (deep) core++;
    }
  }
  return core / count <= MAX_CORE;
}

/**
 * Contrast result for a single image region.
 * @typedef {Object} RegionResult
 * @property {number} contrast
 * @property {string} fgHex
 * @property {string} bgHex
 * @property {number[]} fgRgb
 * @property {number[]} bgRgb
 */

/**
 * Sample a rectangular region of an ImageData and return the WCAG contrast
 * ratio between the text (minority pixel cluster) and background (majority).
 * Expands the region by 2 px on every side to capture anti-aliasing fringe.
 * Returns null for regions that are too small or near-uniform (no real text).
 *
 * @param {ImageData} imageData
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @returns {RegionResult|null}
 */
export function regionContrast(imageData, x, y, w, h) {
  const m = measureRegion(imageData, x, y, w, h, false);
  return m ? m.result : null;
}

/**
 * Shared body of regionContrast. When `checkShape` is true it also reports
 * whether the region's two clusters are arranged like text (see isTextLike).
 * The flag stays internal so RegionResult keeps its shape.
 *
 * @returns {{ result: RegionResult, textLike: boolean, inkShare: number, inkLighter: boolean }|null}
 */
function measureRegion(imageData, x, y, w, h, checkShape) {
  const W = imageData.width, H = imageData.height;
  const data = imageData.data;

  const x1 = Math.max(0, x - 2), y1 = Math.max(0, y - 2);
  const x2 = Math.min(W, x + w + 2), y2 = Math.min(H, y + h + 2);
  const rw = x2 - x1, rh = y2 - y1;
  if (rw < 4 || rh < 4) return null;

  const lums = new Float64Array(rw * rh);
  let i = 0;
  for (let yy = y1; yy < y2; yy++) {
    const rowStart = yy * W;
    for (let xx = x1; xx < x2; xx++) {
      const off = (rowStart + xx) * 4;
      lums[i++] = 0.2126 * LIN_LUT[data[off]]
                + 0.7152 * LIN_LUT[data[off + 1]]
                + 0.0722 * LIN_LUT[data[off + 2]];
    }
  }

  const c = kmeans2(lums);
  if (!c) return null;
  const [cDark, cLight] = c;

  // Skip near-uniform regions — prevents false positives where OCR strips
  // land on pure background and k-means splits anti-aliasing noise.
  if (cLight - cDark < 0.02) return null;

  let r0 = 0, g0 = 0, b0 = 0, n0 = 0;
  let r1 = 0, g1 = 0, b1 = 0, n1 = 0;
  i = 0;
  for (let yy = y1; yy < y2; yy++) {
    const rowStart = yy * W;
    for (let xx = x1; xx < x2; xx++) {
      const off = (rowStart + xx) * 4;
      const v = lums[i++];
      if (Math.abs(v - cLight) < Math.abs(v - cDark)) {
        r1 += data[off]; g1 += data[off + 1]; b1 += data[off + 2]; n1++;
      } else {
        r0 += data[off]; g0 += data[off + 1]; b0 += data[off + 2]; n0++;
      }
    }
  }

  const mean0 = n0 ? [r0 / n0, g0 / n0, b0 / n0] : [0, 0, 0];
  const mean1 = n1 ? [r1 / n1, g1 / n1, b1 / n1] : [255, 255, 255];

  // Text = minority cluster; background = majority.
  const fgRgb = (n0 <= n1) ? mean0 : mean1;
  const bgRgb = (n0 <= n1) ? mean1 : mean0;

  const fgHex = rgbToHex(...fgRgb);
  const bgHex = rgbToHex(...bgRgb);
  const contrast = wcagContrast(luminanceFloat(...fgRgb), luminanceFloat(...bgRgb));

  return {
    result: { contrast, fgHex, bgHex, fgRgb, bgRgb },
    textLike: checkShape ? isTextLike(lums, rw, rh, cDark, cLight) : false,
    // Share of the region the minority (ink) cluster covers, and whether that
    // ink is the lighter of the two clusters. Used by thinBrightLine.
    inkShare: Math.min(n0, n1) / (n0 + n1),
    inkLighter: n1 < n0
  };
}

/**
 * Split a bounding box into narrow vertical strips (~one character wide at
 * 60 % of cap height) and return the text strip with the lowest contrast.
 * This ensures each letter in a word is individually sampled.
 *
 * Only strips that look like text (see isTextLike) compete, so a stretch of
 * plain background between words cannot win. If no strip looks like text, the
 * box is retried as three overlapping horizontal bands (see BAND_HEIGHT), so
 * text with a card edge or a gap under it is still found; if that finds none
 * it falls back to the whole box, then to the lowest of all strips, so a real
 * failure is never silenced.
 *
 * @param {ImageData} imageData
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {{ dropRibbonLines?: boolean, bands?: boolean }} [options]
 *        `dropRibbonLines: false` keeps every text-like strip, and
 *        `bands: false` skips the band retry. Together they give the behaviour
 *        before work item 020 follow-up; tests use that as the baseline a
 *        change must not make worse.
 * @returns {RegionResult|null}
 */
export function worstStripContrast(imageData, x, y, w, h, { dropRibbonLines = true, bands = true } = {}) {
  const lowest = (list) =>
    list.reduce((worst, r) => (r.contrast < worst.contrast ? r : worst), list[0]);

  const first = textStrips(imageData, x, y, w, h, dropRibbonLines);
  if (first.text.length) return lowest(first.text);

  const bandH = Math.round(h * BAND_HEIGHT);
  if (bands && bandH >= MIN_BAND) {
    const found = [];
    for (const start of BAND_STARTS) {
      const by = y + Math.round(h * start);
      found.push(...textStrips(imageData, x, by, w, Math.min(bandH, y + h - by), dropRibbonLines).text);
    }
    if (found.length) return lowest(found);
  }

  const whole = regionContrast(imageData, x, y, w, h);
  if (whole) return whole;
  return first.all.length ? lowest(first.all) : null;
}

// A box that reaches past the text (below a card into the gap, or up over its
// edge) puts three colours in every strip, so no strip looks like text. The
// retry looks at BAND_HEIGHT of the box at each of BAND_STARTS (top, middle,
// bottom), so the band holding the text is free of what lies beyond it. The
// numbers are not tuned finely: 0.5 to 0.7 of the height, with three or four
// starts, gave the same result within 3 % on the sweep fixtures. MIN_BAND keeps
// a band from shrinking below a readable glyph.
const BAND_HEIGHT = 0.6;
const BAND_STARTS = [0, 0.2, 0.4];
const MIN_BAND = 8;

/**
 * Measure one box as vertical strips.
 * @returns {{ text: RegionResult[], all: RegionResult[] }}  the text-like strips
 *          that survive the ribbon rules, and every strip that was measured
 */
function textStrips(imageData, x, y, w, h, dropRibbonLines) {
  const stripW  = Math.max(4, Math.floor(h * 0.6));
  const nStrips = Math.max(3, Math.round(w / stripW));
  const actualW = w / nStrips;
  const strips  = [];

  for (let s = 0; s < nStrips; s++) {
    const sx = x + Math.round(s * actualW);
    const sw = Math.max(4, Math.round(actualW));
    strips.push(measureRegion(imageData, sx, y, sw, h, true));
  }

  const lines = dropRibbonLines ? thinBrightLines(strips) : [];
  const kept = strips.map((m, s) => !!(m && m.textLike && !(lines.length && isRibbonLine(strips, s, lines))));
  if (dropRibbonLines) dropLoneLines(strips, kept);

  return {
    text: strips.filter((m, s) => kept[s]).map((m) => m.result),
    all: strips.filter(Boolean).map((m) => m.result)
  };
}

// LINE_SAME is the largest RGB distance (0..255 scale) at which two strips'
// colours count as the same pair. It is not a tuned value: ribbon strips in the
// fixtures differ by under 25, and a different pair differs by 50 or more.
const LINE_SAME = 30;

// THIN_INK is the largest share of a strip a bright line covers. It is measured
// on the fixtures, not derived: ribbon and chevron edges cover 4 to 28 % of a
// strip, the light text of a pill on a dark panel covers 36 % or more.
const THIN_INK = 0.25;

const rgbDist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

/** How two strips' colour pairs relate: 'same', 'swapped' (ink and background trade places) or null. */
function pairRelation(a, b) {
  if (rgbDist(a.fgRgb, b.fgRgb) <= LINE_SAME && rgbDist(a.bgRgb, b.bgRgb) <= LINE_SAME) return 'same';
  if (rgbDist(a.fgRgb, b.bgRgb) <= LINE_SAME && rgbDist(a.bgRgb, b.fgRgb) <= LINE_SAME) return 'swapped';
  return null;
}

/** A strip whose ink is the lighter colour and covers little of it: a thin bright line. */
const isThinBright = (m) => m.inkLighter && m.inkShare <= THIN_INK;

/**
 * The thin bright line strips: the slices of a ribbon edge or chevron, whether
 * or not they pass the shape test. A thin bright strip only
 * counts as a line if no strip of real text vouches for its pair. A strip vouches
 * when it is text-like, is not a thin bright line itself, holds the same pair
 * with ink and background the same way round, and does not itself look like a
 * slice of a line (continuesLine). A word has several such strips; the steep
 * spots of a line only have each other.
 *
 * @param {({ result: RegionResult, textLike: boolean, inkShare: number, inkLighter: boolean }|null)[]} strips
 */
function thinBrightLines(strips) {
  return strips.filter((m, s) =>
    m && isThinBright(m) &&
    !strips.some((q, j) =>
      j !== s && q && q.textLike && !isThinBright(q) && pairRelation(q.result, m.result) === 'same' &&
      !continuesLine(strips, j)));
}

/**
 * Is a text-like strip really one slice of a long thin bright line (a ribbon
 * edge or a chevron over a darker panel)? Such a line passes the shape test on
 * the odd strip where it is steep, and where it covers half a strip the roles
 * swap: the dark panel becomes the minority. Dropping a real text strip is
 * worse than keeping a line, because the pair then comes from boundary strips
 * between two backgrounds or from a brighter word, so a strip is dropped only
 * when both hold:
 *   1. at least two strips within three of it (itself included) are uncorroborated
 *      thin bright line strips (see thinBrightLines) with the same pair either
 *      way round, so one bright sliver, such as the edge of a pill, is not
 *      enough;
 *   2. its neighbours show it is a slice of a longer line (see continuesLine).
 *
 * @param {({ result: RegionResult, textLike: boolean, inkShare: number, inkLighter: boolean }|null)[]} strips
 * @param {number} s  index of a text-like strip
 * @param {typeof strips} lines  the result of thinBrightLines(strips)
 */
function isRibbonLine(strips, s, lines) {
  const onLine = [-3, -2, -1, 0, 1, 2, 3].filter((d) => {
    const n = strips[s + d];
    return n && lines.includes(n) && pairRelation(n.result, strips[s].result);
  }).length >= 2;
  return onLine && continuesLine(strips, s);
}

/**
 * Do a strip's neighbours show it is part of a longer line? They hold the same
 * two colours but either do not look like text, or have ink and background the
 * other way round (the line is the minority in one strip and the majority in
 * the next). A glyph has bare background (a gap), a text-like strip with the
 * same ink, or different colours beside it. A strip with no coloured neighbour
 * at all is kept, so a lone character is never dropped.
 *
 * @param {({ result: RegionResult, textLike: boolean }|null)[]} strips
 * @param {number} s  index of a text-like strip
 */
function continuesLine(strips, s) {
  let line = 0;
  for (const n of [strips[s - 1], strips[s + 1]]) {
    if (!n) continue;
    const rel = pairRelation(n.result, strips[s].result);
    if (!rel || (n.textLike && rel === 'same')) return false;
    line++;
  }
  return line > 0;
}

/**
 * Drop a lone thin bright line from the text-like strips (in place). Where a
 * ribbon edge crosses a gap it passes the shape test on one strip where it is
 * steep, and the strips either side are not text, so it is a strip of its own
 * pair; isRibbonLine does not see it because it needs two such strips. A word
 * has several strips of one pair, so a text-like strip is dropped only when
 * all hold:
 *   1. it is a thin bright line (see isThinBright);
 *   2. no other kept strip has its pair (so it is not part of a word);
 *   3. other kept strips do hold a pair together (so there is real text to
 *      report instead, and a box with a single odd strip is left alone);
 *   4. the strips beside it that hold anything are all non-text.
 *
 * @param {({ result: RegionResult, textLike: boolean, inkShare: number, inkLighter: boolean }|null)[]} strips
 * @param {boolean[]} kept  one flag per strip; entries are cleared when dropped
 */
function dropLoneLines(strips, kept) {
  const paired = kept.map((k, s) => k && kept.some((other, j) =>
    other && j !== s && pairRelation(strips[j].result, strips[s].result) === 'same'));
  if (!paired.some(Boolean)) return;
  kept.forEach((k, s) => {
    if (!k || paired[s] || !isThinBright(strips[s])) return;
    const beside = [strips[s - 1], strips[s + 1]].filter(Boolean);
    if (beside.length && beside.every((n) => !n.textLike)) kept[s] = false;
  });
}

/**
 * WCAG AA / AAA thresholds for the given box height.
 * Large text = bbox height ≥ 24 px in the canonical resized space.
 *
 * @param {number} heightPx
 * @returns {{ isLarge: boolean, required: number, requiredAaa: number }}
 */
export function thresholdsFor(heightPx) {
  const isLarge = heightPx >= 24;
  return {
    isLarge,
    required:    isLarge ? 3.0 : 4.5,
    requiredAaa: isLarge ? 4.5 : 7.0
  };
}
