/**
 * Perceptual and vestibular checks that go beyond WCAG contrast.
 *
 * - APCA  — Advanced Perceptual Contrast Algorithm, via the vendored
 *           apca-w3 0.1.9 math in core/apca.js. APCA is in beta and is NOT a
 *           WCAG requirement; it is reported as an additional perceptual
 *           signal only.
 * - Vestibular — HSL saturation of BOTH colours (saturated text shimmers too,
 *           not just saturated backgrounds).
 * - Cognitive  — a derived verdict cascading from the other checks.
 *
 * Vestibular saturation thresholds (WARN at 60 %, HIGH at 80 %):
 * These are the project's in-house heuristic for flagging shimmer risk on
 * still images. The Web Content Accessibility Guidelines (WCAG) do not define
 * a saturation threshold — Success Criteria 2.3.1 and 2.3.3 address motion
 * and flicker, not still-image saturation. The wider accessibility literature
 * treats vestibular trigger thresholds qualitatively rather than numerically.
 * No peer-reviewed publication pins a specific HSL saturation cut-off.
 * Reviewers should treat these bands as a reasonable starting heuristic and
 * adjust them as evidence improves.
 *
 * Pure logic — no DOM. Safe to run in Node, workers, or the browser.
 *
 * @module core/perceptual
 */

import { APCAcontrast, sRGBtoY } from './apca.js';
import { hexToRgb } from './contrast.js';

/**
 * APCA lightness-contrast (Lc) for foreground text on a background.
 * @param {string} fgHex
 * @param {string} bgHex
 * @returns {{ lc:number, status:'PASS'|'WARN'|'FAIL', message:string }}
 */
export function apcaResult(fgHex, bgHex) {
  const raw = APCAcontrast(sRGBtoY(hexToRgb(fgHex)), sRGBtoY(hexToRgb(bgHex)));
  const lc  = Math.round(Number(raw) || 0);
  const abs = Math.abs(lc);
  let status, message;
  if (abs < 45)      { status = 'FAIL'; message = 'Too low — hard to read at any size.'; }
  else if (abs < 60) { status = 'WARN'; message = 'Borderline — safe only for large or bold text.'; }
  else               { status = 'PASS'; message = 'Comfortably readable.'; }
  return { lc, status, message };
}

/** HSL saturation (0–100) of an [r,g,b] triple. */
function hslSaturation([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  const l = (max + min) / 2;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  return Math.round(s * 100);
}

/**
 * Vestibular saturation check — measures BOTH the text and the background.
 * @param {string} fgHex
 * @param {string} bgHex
 * @returns {{ fgSat:number, bgSat:number, maxSat:number,
 *             status:'SAFE'|'WARN'|'HIGH', message:string }}
 */
export function vestibularResult(fgHex, bgHex) {
  const fgSat  = hslSaturation(hexToRgb(fgHex));
  const bgSat  = hslSaturation(hexToRgb(bgHex));
  const maxSat = Math.max(fgSat, bgSat);
  let status, message;
  if (maxSat >= 80)      { status = 'HIGH'; message = 'Very saturated — can shimmer and cause sensory overload.'; }
  else if (maxSat >= 60) { status = 'WARN'; message = 'Moderately saturated — may shimmer for sensitive viewers.'; }
  else                   { status = 'SAFE'; message = 'Low saturation — no shimmer risk.'; }
  return { fgSat, bgSat, maxSat, status, message };
}

/**
 * Cognitive-load verdict — a cascading check derived from the others.
 * The first matching rule wins.
 *
 * @param {Object}  p
 * @param {number}  p.contrast  WCAG contrast ratio
 * @param {boolean} p.passAA    Meets WCAG AA
 * @param {number}  p.heightPx  Smallest OCR box height (text-size proxy)
 * @param {number}  p.apcaLc    APCA Lc value
 * @param {number}  p.maxSat    Highest saturation of the pair
 * @returns {{ status:'PASS'|'WARN'|'FAIL'|'HARSH', message:string }}
 */
export function cognitiveResult({ contrast, passAA, heightPx, apcaLc, maxSat }) {
  const absLc = Math.abs(apcaLc);
  if (heightPx < 10)
    return { status: 'FAIL', message: 'Text is physically very small for comfortable reading.' };
  if (!passAA)
    return { status: 'FAIL', message: 'Fails WCAG — contrast is insufficient for comfortable reading.' };
  if (maxSat >= 80)
    return { status: 'FAIL', message: 'High saturation can feel uncomfortable for sensitive viewers.' };
  if (absLc > 105)
    return { status: 'WARN', message: 'Extremely bright against its background — can cause eye fatigue.' };
  if (maxSat > 65 && contrast > 10)
    return { status: 'WARN', message: 'Bright, saturated pairing can appear to shimmer.' };
  if (contrast > 18)
    return { status: 'HARSH', message: 'Very high contrast can feel "too sharp" for some readers.' };
  return { status: 'PASS', message: 'No cognitive-load concerns detected.' };
}
