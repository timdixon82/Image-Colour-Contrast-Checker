/**
 * Colour-vision-deficiency (CVD) simulation.
 *
 * Uses the Machado, Oliveira & Fernandes (2009) transform matrices at full
 * severity, applied in LINEAR RGB — the physically correct space, rather than
 * directly on gamma-encoded sRGB. Achromatopsia is modelled as a
 * luminance-preserving greyscale (Rec. 709 weights).
 *
 * Pure logic — no DOM. Safe to run in Node, workers, or the browser.
 *
 * @module core/colour-vision
 */

import { linearise, hexToRgb, rgbToHex, luminance, wcagContrast } from './contrast.js';

/**
 * Machado 2009 severity-1.0 matrices (row-major, linear-RGB → linear-RGB).
 * Achromatopsia uses the Rec. 709 luminance weights on every row.
 */
export const CVD_MATRICES = {
  protanopia: [
     0.152286,  1.052583, -0.204868,
     0.114503,  0.786281,  0.099216,
    -0.003882, -0.048116,  1.051998
  ],
  deuteranopia: [
     0.367322,  0.860646, -0.227968,
     0.280085,  0.672501,  0.047413,
    -0.011820,  0.042940,  0.968881
  ],
  tritanopia: [
     1.255528, -0.076749, -0.178779,
    -0.078411,  0.930809,  0.147602,
     0.004733,  0.691367,  0.303900
  ],
  achromatopsia: [
     0.2126, 0.7152, 0.0722,
     0.2126, 0.7152, 0.0722,
     0.2126, 0.7152, 0.0722
  ]
};

/** Look-up table: sRGB byte (0–255) → linear-light value (0–1). */
export const SRGB_TO_LINEAR = new Float64Array(256);
for (let i = 0; i < 256; i++) SRGB_TO_LINEAR[i] = linearise(i);

/** Inverse sRGB transfer function: linear-light value → sRGB byte (0–255). */
export function linearToSrgb8(lin) {
  const v = lin <= 0 ? 0 : lin >= 1 ? 1 : lin;
  const s = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.round(s * 255);
}

/**
 * Transform a hex colour to how it appears under the given deficiency.
 *
 * @param {string} hex   "#RRGGBB"
 * @param {string} type  Key of CVD_MATRICES
 * @returns {string} simulated hex colour
 */
export function simulateHex(hex, type) {
  const m = CVD_MATRICES[type];
  if (!m) throw new Error(`Unknown colour-vision deficiency: ${type}`);
  const [r, g, b] = hexToRgb(hex);
  const lr = SRGB_TO_LINEAR[r], lg = SRGB_TO_LINEAR[g], lb = SRGB_TO_LINEAR[b];
  return rgbToHex(
    linearToSrgb8(m[0] * lr + m[1] * lg + m[2] * lb),
    linearToSrgb8(m[3] * lr + m[4] * lg + m[5] * lb),
    linearToSrgb8(m[6] * lr + m[7] * lg + m[8] * lb)
  );
}

/**
 * Recompute the WCAG contrast of a foreground/background pair as the two
 * colours appear to a viewer with the given deficiency.
 *
 * @param {string} fgHex
 * @param {string} bgHex
 * @param {string} type  Key of CVD_MATRICES
 * @returns {{ fgHex: string, bgHex: string, contrast: number }}
 */
export function cvdPairContrast(fgHex, bgHex, type) {
  const fg = simulateHex(fgHex, type);
  const bg = simulateHex(bgHex, type);
  const contrast = wcagContrast(luminance(...hexToRgb(fg)), luminance(...hexToRgb(bg)));
  return { fgHex: fg, bgHex: bg, contrast: Math.round(contrast * 100) / 100 };
}
