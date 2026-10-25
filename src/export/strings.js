/**
 * Shared user-facing strings for all report outputs (web, PDF, Markdown).
 * Edit here once; PDF and Markdown stay in sync automatically.
 *
 * @module export/strings
 */

export const APP_NAME = 'Image Colour Contrast Checker';

export const SITE_URL = 'https://image-colour-contrast-checker.timdixon.net';

export const THRESHOLDS_FOOTER =
  'WCAG = Web Content Accessibility Guidelines; APCA = Advanced Perceptual Contrast Algorithm; CVD = Colour Vision Deficiency. '
  + 'Contrast thresholds — AA: 4.5:1 normal / 3:1 large text · '
  + 'AAA: 7:1 normal / 4.5:1 large text. '
  + 'Large text = ≥24 px OCR box height. '
  + 'Detected via PaddleOCR PP-OCRv4.';

export const DISCLAIMER_TEXT =
  'This report is generated automatically to help speed up accessibility review. '
  + 'Results are indicative only — manual verification is required before '
  + 'citing for formal WCAG compliance.';

/**
 * Colour-vision deficiencies simulated for every image, in display order.
 * Shared by the web report, PDF and Markdown so the labels stay in sync.
 * `key` matches the matrices in core/colour-vision.js.
 */
export const CVD_TYPES = [
  { key: 'deuteranopia',  label: 'Deuteranopia',  note: 'green-blind' },
  { key: 'protanopia',    label: 'Protanopia',    note: 'red-blind' },
  { key: 'tritanopia',    label: 'Tritanopia',    note: 'blue-blind' },
  { key: 'achromatopsia', label: 'Achromatopsia', note: 'total colour-blindness' }
];

/**
 * Builds the deep link to one check's entry in the on-page "What the checks
 * mean" section. The `id` matches a check id from export/checks.js.
 */
export const checkInfoUrl = (id) => `${SITE_URL}/#check-info-${id}`;

const VESTIBULAR_CHECKER_BASE = 'https://vadchecker.com/tool/';
const HEX6 = /^#?([0-9a-f]{6})$/i;

/**
 * Builds the VADChecker (Tas's Vestibular Accessible Design Checker) link for
 * one colour pair. `txt` is the text colour, `bg` the background, both hex
 * without the hash. Falls back to the bare tool URL if either value is not a
 * 6-digit hex colour.
 * @param {string} fgHex
 * @param {string} bgHex
 * @returns {string}
 */
export function vestibularCheckerUrl(fgHex, bgHex) {
  const fg = HEX6.exec(String(fgHex ?? ''));
  const bg = HEX6.exec(String(bgHex ?? ''));
  if (!fg || !bg) return VESTIBULAR_CHECKER_BASE;
  return `${VESTIBULAR_CHECKER_BASE}?txt=${fg[1].toLowerCase()}&bg=${bg[1].toLowerCase()}`;
}

/**
 * Short brand label used as the visible text in the web report link and the
 * Markdown link. The arrow glyph that follows it is rendered separately with
 * aria-hidden.
 */
export const VESTIBULAR_CHECKER_BRAND_LABEL = 'VADChecker';

/**
 * Full descriptive label used as the web aria-label, the PDF link text,
 * and the Markdown link text.
 * If the visible text "VADChecker" is ever removed from the web link
 * and the aria-label is removed too, restore a sr-only "(opens in new window)"
 * span to preserve the new-window announcement for screen reader users.
 */
export const VESTIBULAR_CHECKER_FULL_LABEL =
  'Check and adjust this colour pair with VADChecker (opens in new window)';
