// WCAG 2.2 contrast math + region / strip analysis.

// sRGB linearisation per IEC 61966-2-1 (the same threshold the Python source
// uses: 0.04045, not the older 0.03928 approximation).
export function linearise(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

// Pre-computed linearised channel values for fast pixel-loop access.
const LIN_LUT = new Float64Array(256);
for (let i = 0; i < 256; i++) LIN_LUT[i] = linearise(i);

export function luminance(r, g, b) {
  return 0.2126 * LIN_LUT[r] + 0.7152 * LIN_LUT[g] + 0.0722 * LIN_LUT[b];
}

// Luminance for a single RGB triple (values may be float — round before LUT).
export function luminanceFloat(r, g, b) {
  const ri = Math.max(0, Math.min(255, Math.round(r)));
  const gi = Math.max(0, Math.min(255, Math.round(g)));
  const bi = Math.max(0, Math.min(255, Math.round(b)));
  return luminance(ri, gi, bi);
}

export function wcagContrast(l1, l2) {
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}

export function rgbToHex(r, g, b) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n)))
    .toString(16).padStart(2, '0').toUpperCase();
  return '#' + c(r) + c(g) + c(b);
}

export function colourDistance(h1, h2) {
  const [r1, g1, b1] = hexToRgb(h1);
  const [r2, g2, b2] = hexToRgb(h2);
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// 1-D k-means with k=2. Init: sorted 25th / 75th percentile values
// (matches the Python `sv[int(n*0.25)] / sv[int(n*0.75)]` init).
// Iterate to fixed-point. Swap so c[0] (dark) < c[1] (light). Returns null
// if there are fewer than 4 values (matches the Python guard).
export function kmeans2(values) {
  if (!values || values.length < 4) return null;

  const sv = Float64Array.from(values).sort();
  const n = sv.length;
  let c0 = sv[Math.floor(n * 0.25)];
  let c1 = sv[Math.floor(n * 0.75)];
  if (c0 === c1) c1 = c0 + 1e-9;

  for (let iter = 0; iter < 60; iter++) {
    let s0 = 0, s1 = 0, n0 = 0, n1 = 0;
    for (let i = 0; i < n; i++) {
      const v = sv[i];
      // Distance-based assignment — equivalent to midpoint for k=2.
      if (Math.abs(v - c1) < Math.abs(v - c0)) { s1 += v; n1++; }
      else                                     { s0 += v; n0++; }
    }
    const nc0 = n0 ? s0 / n0 : c0;
    const nc1 = n1 ? s1 / n1 : c1;
    if (Math.abs(nc0 - c0) < 1e-7 && Math.abs(nc1 - c1) < 1e-7) {
      c0 = nc0; c1 = nc1; break;
    }
    c0 = nc0; c1 = nc1;
  }

  if (c0 > c1) { const t = c0; c0 = c1; c1 = t; }
  return [c0, c1];
}

// Per-region contrast. The bbox is expanded by 2 px on every side (matching
// the Python source) before sampling, and skipped if the expanded region is
// smaller than 4x4.  Text = minority cluster, background = majority.
export function regionContrast(imageData, x, y, w, h) {
  const W = imageData.width;
  const H = imageData.height;
  const data = imageData.data;

  const x1 = Math.max(0, x - 2);
  const y1 = Math.max(0, y - 2);
  const x2 = Math.min(W, x + w + 2);
  const y2 = Math.min(H, y + h + 2);
  const rw = x2 - x1;
  const rh = y2 - y1;
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

  // Re-assign each pixel to whichever centroid it is closer to, summing RGB
  // for the mean. Cluster 0 = dark (c[0]), cluster 1 = light (c[1]).
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

  // Text = minority cluster (smaller). Background = majority.
  const fgRgb = (n0 <= n1) ? mean0 : mean1;
  const bgRgb = (n0 <= n1) ? mean1 : mean0;
  const fgHex = rgbToHex(...fgRgb);
  const bgHex = rgbToHex(...bgRgb);

  // Compute luminance of the mean colour (not the centroid) — Python does
  // it this way and the two diverge for non-grey clusters.
  const fgLum = luminanceFloat(...fgRgb);
  const bgLum = luminanceFloat(...bgRgb);
  const contrast = wcagContrast(fgLum, bgLum);

  return { contrast, fgHex, bgHex, fgRgb, bgRgb };
}

// Split the box into vertical strips ~one character wide, return the strip
// with the WORST (lowest) contrast ratio. Catches gradient backgrounds
// where contrast degrades across a word.
export function worstStripContrast(imageData, x, y, w, h) {
  const stripW = Math.max(6, Math.floor(h * 0.75));
  const nStrips = Math.max(3, Math.round(w / stripW));
  const actualStripW = w / nStrips;

  const results = [];
  for (let s = 0; s < nStrips; s++) {
    const sx = x + Math.round(s * actualStripW);
    const sw = Math.max(6, Math.round(actualStripW));
    const r = regionContrast(imageData, sx, y, sw, h);
    if (r) results.push(r);
  }

  if (results.length === 0) {
    return regionContrast(imageData, x, y, w, h);
  }

  return results.reduce((worst, r) => r.contrast < worst.contrast ? r : worst, results[0]);
}

// WCAG AA / AAA thresholds for normal vs large text.
// Large text = bbox height >= 24 px in the canonical resized space.
export function thresholdsFor(heightPx) {
  const isLarge = heightPx >= 24;
  return {
    isLarge,
    required:    isLarge ? 3.0 : 4.5,
    requiredAaa: isLarge ? 4.5 : 7.0
  };
}

// Merge per-detection findings into colour pairs. Two findings merge if both
// FG-FG and BG-BG colour distance < threshold. When a newer finding has a
// worse (lower) contrast than the existing pair, the pair inherits its hex
// colours, contrast, and AA / AAA pass flags. (Mirrors the Python merge.)
export function buildColourPairs(findings, threshold = 25) {
  const pairs = [];

  for (const f of findings) {
    let merged = false;
    for (const p of pairs) {
      if (
        colourDistance(f.fgHex, p.fgHex) < threshold &&
        colourDistance(f.bgHex, p.bgHex) < threshold
      ) {
        if (f.contrast < p.contrast) {
          p.contrast = f.contrast;
          p.fgHex = f.fgHex;
          p.bgHex = f.bgHex;
          p.pass = f.pass;
          p.passAaa = f.passAaa;
          p.requiredAaa = f.requiredAaa;
        }
        p.examples.push(f.text);
        p.bboxes.push(f.bbox);
        merged = true;
        break;
      }
    }
    if (!merged) {
      pairs.push({
        fgHex: f.fgHex,
        bgHex: f.bgHex,
        contrast: f.contrast,
        pass: f.pass,
        required: f.required,
        passAaa: f.passAaa,
        requiredAaa: f.requiredAaa,
        examples: [f.text],
        bboxes: [f.bbox]
      });
    }
  }

  for (const p of pairs) {
    const seen = new Set();
    const dedup = [];
    for (const e of p.examples) {
      const key = (e || '').trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      dedup.push(e);
      if (dedup.length >= 6) break;
    }
    p.examples = dedup;
  }

  pairs.sort((a, b) => a.contrast - b.contrast);
  return pairs;
}

// OCR-result filter — mirrors run_ocr() in the Python source.
//   - drop if text length < 2, alnum chars < 2, or w/h < 4
//   - require int(score*100) >= 25 for >= 6 alnum chars, else >= 50
export function filterOcrDetections(words) {
  const out = [];
  for (const w of words) {
    const text = (w.text || '').trim();
    if (text.length < 2) continue;
    const alnum = (text.match(/[\p{L}\p{N}]/gu) || []).length;
    if (alnum < 2) continue;
    const minConf = alnum >= 6 ? 25 : 50;
    if (Math.trunc((w.score ?? 1) * 100) < minConf) continue;
    const b = w.bbox;
    if (!b || b.w < 4 || b.h < 4) continue;
    out.push({ ...w, text });
  }
  return out;
}

// Top-level analysis. Returns the report payload mirroring the Python schema.
export function analyseImage(imageData, ocrDetections) {
  const words = filterOcrDetections(ocrDetections || []);
  if (words.length === 0) {
    return {
      hasText: false,
      colourPairs: [],
      verdict: 'NO_TEXT',
      flag: false,
      detail: 'No text detected by OCR'
    };
  }

  const findings = [];
  for (const w of words) {
    const { x, y, w: bw, h: bh } = w.bbox;
    const result = worstStripContrast(
      imageData,
      Math.round(x), Math.round(y),
      Math.round(bw), Math.round(bh)
    );
    if (!result) continue;

    const { required, requiredAaa, isLarge } = thresholdsFor(bh);
    const cr = Math.round(result.contrast * 100) / 100;
    findings.push({
      text: w.text,
      contrast: cr,
      fgHex: result.fgHex,
      bgHex: result.bgHex,
      bbox: { x: Math.round(x), y: Math.round(y), w: Math.round(bw), h: Math.round(bh) },
      isLarge,
      required,
      requiredAaa,
      pass: cr >= required,
      passAaa: cr >= requiredAaa
    });
  }

  if (findings.length === 0) {
    return {
      hasText: false,
      colourPairs: [],
      verdict: 'NO_TEXT',
      flag: false,
      detail: 'No text detected by OCR'
    };
  }

  const colourPairs = buildColourPairs(findings);
  const failures = colourPairs.filter((p) => !p.pass);
  const verdict = failures.length ? 'FAIL' : 'PASS';
  const minCr = colourPairs[0].contrast;
  const maxCr = colourPairs[colourPairs.length - 1].contrast;

  let detail;
  if (failures.length) {
    const worst = failures[0];
    detail = `${failures.length}/${colourPairs.length} colour combination(s) fail WCAG 2.2 AA — `
           + `worst: ${worst.fgHex} on ${worst.bgHex} `
           + `at ${worst.contrast.toFixed(1)}:1 (required ${worst.required}:1)`;
  } else {
    detail = `All ${colourPairs.length} colour combination(s) pass `
           + `(range ${minCr.toFixed(1)}–${maxCr.toFixed(1)}:1)`;
  }

  return {
    hasText: true,
    colourPairs,
    verdict,
    flag: verdict === 'FAIL',
    detail
  };
}
