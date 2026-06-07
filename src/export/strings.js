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

/** URL for the Tas the Artist Vestibular Accessible Design Checker. */
export const VESTIBULAR_CHECKER_URL =
  'https://tastheartist.com/vestibular-accessible-design-checker/';

/**
 * Short brand label used as the visible text in the web report link only.
 * The arrow glyph that follows it is rendered separately with aria-hidden.
 */
export const VESTIBULAR_CHECKER_BRAND_LABEL = 'Tas the Artist';

/**
 * Full descriptive label used as the web aria-label, the PDF link text,
 * and the Markdown link text.
 * If the visible text "Tas the Artist" is ever removed from the web link
 * and the aria-label is removed too, restore a sr-only "(opens in new window)"
 * span to preserve the new-window announcement for screen reader users.
 */
export const VESTIBULAR_CHECKER_FULL_LABEL =
  'Check and adjust colours with Tas the Artist: Vestibular Accessible Design Checker (opens in new window)';
