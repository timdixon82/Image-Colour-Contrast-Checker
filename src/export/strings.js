/**
 * Shared user-facing strings for all report outputs (web, PDF, Markdown).
 * Edit here once; PDF and Markdown stay in sync automatically.
 *
 * @module export/strings
 */

export const APP_NAME = 'Image Colour Contrast Checker';

export const SITE_URL = 'https://image-colour-contrast-checker.timdixon.net';

export const THRESHOLDS_FOOTER =
  'Contrast thresholds — AA: 4.5:1 normal / 3:1 large text · '
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
