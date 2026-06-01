/**
 * pdf-ua — a small, reusable wrapper around PDFKit for authoring
 * **formally PDF/UA-1 (ISO 14289-1) compliant** tagged PDFs.
 *
 * Design goals (see ADR 010):
 *   - ZERO project-specific code. No brand colours, no report strings, no
 *     layout. Everything here is generic PDF/UA plumbing. This module is meant
 *     to be lifted into a standalone package later.
 *   - Works in BOTH Node.js (tests, server) and the browser (Vite + Node
 *     polyfills). The produced bytes are identical in both environments.
 *   - Hides PDFKit 0.18.0's two PDF/UA bugs so consumers never touch them:
 *       1. The `subset: 'PDF/UA'` constructor option emits a malformed CIDSet
 *          that veraPDF rejects. We omit it and inject the `pdfuaid:part`
 *          XMP claim manually instead.
 *       2. The low-level `doc.struct('TH', { scope })` API silently drops the
 *          `Scope`/`Headers` attributes. Tables MUST be authored with the
 *          high-level `doc.table()` API (see "Tables" note below) — this module
 *          deliberately does NOT wrap tables.
 *
 * Dependencies (only these two — keep it portable):
 *   - pdfkit       0.18.0
 *   - blob-stream  (browser Blob output)
 *
 * No DOM APIs. No `document`, no `window`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Tables (read this before authoring a table)
 * ─────────────────────────────────────────────────────────────────────────
 * This wrapper provides NO `addTable` helper. PDFKit's own high-level table
 * API already emits correct TH / Scope / Headers tagging, which is the one
 * thing PDF/UA needs and the low-level `struct()` API gets wrong. Call it
 * directly on the document returned by `createDocument()`:
 *
 *     doc.table({
 *       // first row is the header row
 *       data: [
 *         [ { type: 'TH', scope: 'column', value: 'Image' },
 *           { type: 'TH', scope: 'column', value: 'Result' } ],
 *         [ 'logo.png', 'PASS' ],
 *       ],
 *     });
 *
 * Use `type: 'TH'` and `scope: 'column'` (or `'row'`) on every header cell.
 * Do NOT build tables from `doc.struct('Table'…)` — the Scope attribute will
 * be dropped and veraPDF will fail the document. See ADR 010, Finding 2.
 *
 * @module lib/pdf-ua
 */

import PDFDocument from 'pdfkit';
// blob-stream is a CommonJS module. Use namespace import + default fallback
// so it works whether Vite transforms it to ESM (default on .default) or
// leaves it as CJS interop (default on the module itself).
import * as _blobStreamModule from 'blob-stream';
const blobStream = _blobStreamModule.default ?? _blobStreamModule;

/**
 * If `src` is a data URL, decode it to a Uint8Array so PDFKit's image loader
 * receives raw bytes rather than a data URL string — the browser build of
 * PDFKit may not parse data URLs correctly.
 * In Node.js (Vitest), data URLs are handled by PDFKit natively; this helper
 * is a no-op for non-data-URL inputs.
 *
 * @param {string|Buffer|Uint8Array} src
 * @returns {string|Buffer|Uint8Array}
 */
function normaliseImageSrc(src) {
  if (typeof src !== 'string' || !src.startsWith('data:')) return src;
  const commaIdx = src.indexOf(',');
  if (commaIdx === -1) return src;
  const base64 = src.slice(commaIdx + 1);
  // Use atob if available (browser), otherwise fall back to Buffer (Node)
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return Buffer.from(bytes);
  }
  return Buffer.from(base64, 'base64');
}

/**
 * @typedef {Object} FontPaths
 * @property {string} regular  Absolute (Node) or bundler-resolved path to the regular TTF.
 * @property {string} [medium] Path to the medium/bold TTF. Optional but recommended.
 */

/**
 * @typedef {Object} CreateDocumentOptions
 * @property {string}  title                 Document title (`/Title`, `dc:title`, and the
 *                                           displayed window title). Required by PDF/UA.
 * @property {FontPaths} fonts               TTF font paths. The wrapper registers these and
 *                                           selects `regular` as the default. Never use a
 *                                           built-in AFM font in a PDF/UA document.
 * @property {string}  [lang='en']           BCP-47 language tag → document `/Lang`.
 * @property {number|[number,number]} [size='A4'] PDFKit page size.
 * @property {[number,number,number,number]|number} [margins=50] Page margins.
 * @property {string}  [author]              Optional `/Author` (`dc:creator`).
 * @property {string}  [subject]             Optional `/Subject`.
 * @property {string}  [creator]             Optional producing-app name (`/Creator`).
 */

/** Internal: name the wrapper registers the regular font under. */
const FONT_REGULAR = 'Regular';
/** Internal: name the wrapper registers the medium/bold font under. */
const FONT_MEDIUM = 'Medium';

/**
 * The XMP fragment that asserts the PDF/UA-1 conformance claim.
 * Injected manually (rather than via `subset: 'PDF/UA'`) to avoid PDFKit
 * 0.18.0's malformed-CIDSet bug. See ADR 010, Finding 1.
 * @returns {string}
 */
function pdfUaXmp() {
  return (
    '<rdf:Description rdf:about="" xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/">' +
    '<pdfuaid:part>1</pdfuaid:part>' +
    '</rdf:Description>'
  );
}

/**
 * Create a PDFDocument configured for PDF/UA-1 authoring.
 *
 * Applies the full set of PDF/UA prerequisites and the PDFKit 0.18.0
 * workarounds:
 *   - `tagged: true` so a structure tree is produced.
 *   - `lang` → catalog `/Lang`.
 *   - `displayTitle: true` + `info.Title` so the title (not the filename) is
 *     shown by viewers, as PDF/UA requires.
 *   - Embedded TTF fonts (no AFM built-ins).
 *   - The `pdfuaid:part 1` XMP claim injected manually; `subset: 'PDF/UA'`
 *     is deliberately NOT passed (Finding 1).
 *
 * The returned document is a plain PDFKit `PDFDocument`. Author content on it
 * with the helpers in this module, with `doc.table()` for tables, and with any
 * other PDFKit method (columns, page breaks, etc.) directly.
 *
 * @param {CreateDocumentOptions} options
 * @returns {import('pdfkit')} A PDFDocument ready for PDF/UA-1 authoring.
 */
export function createDocument(options) {
  const {
    title,
    fonts,
    lang = 'en',
    size = 'A4',
    margins = 50,
    author,
    subject,
    creator,
  } = options || {};

  if (!title) {
    throw new Error('createDocument: `title` is required for PDF/UA (document must have a title).');
  }
  if (!fonts || !fonts.regular) {
    throw new Error('createDocument: `fonts.regular` (a TTF path) is required — AFM built-in fonts are not PDF/UA-valid.');
  }

  const doc = new PDFDocument({
    // NOTE: do NOT pass `subset: 'PDF/UA'` — it emits a malformed CIDSet in
    // PDFKit 0.18.0 (ADR 010, Finding 1). We claim PDF/UA via XMP below.
    // pdfVersion '1.5' is the value the smoke test validated against; keep it
    // unless a later veraPDF run confirms a different version still passes.
    //
    // `font: null` — suppress PDFKit's default Helvetica initialisation.
    // Without this, PDFDocument() calls this.font('Helvetica') during
    // construction, which immediately runs:
    //   fs.readFileSync(__dirname + '/data/Helvetica.afm')
    // In the browser __dirname is not defined (ReferenceError). We register
    // Roboto TTF immediately after construction, so the Helvetica default
    // is both wrong and unnecessary.
    font: null,
    pdfVersion: '1.5',
    tagged: true,
    displayTitle: true,
    lang,
    size,
    margins: typeof margins === 'number'
      ? { top: margins, bottom: margins, left: margins, right: margins }
      : Array.isArray(margins)
        ? { top: margins[0], right: margins[1], bottom: margins[2], left: margins[3] }
        : margins,
    info: {
      Title: title,
      ...(author ? { Author: author } : {}),
      ...(subject ? { Subject: subject } : {}),
      ...(creator ? { Creator: creator } : {}),
    },
  });

  // Register fonts. Roboto (or any embedded TTF) — never a built-in AFM font.
  doc.registerFont(FONT_REGULAR, fonts.regular);
  if (fonts.medium) doc.registerFont(FONT_MEDIUM, fonts.medium);
  doc.font(FONT_REGULAR);

  // Inject the PDF/UA-1 conformance claim into the XMP packet manually.
  // `appendXML` is the supported hook for adding RDF descriptions to the
  // metadata stream PDFKit builds when `tagged`/`displayTitle` are set.
  doc.appendXML(pdfUaXmp());

  return doc;
}

/**
 * Add a heading (H1–H6) as a tagged structure element.
 *
 * Authors an `H1`…`H6` structure element via the
 * `struct() / markStructureContent() / end()` pattern proven by the smoke
 * test, so the heading text lands inside the correct structure element.
 * `level` is clamped to 1–6.
 *
 * @param {import('pdfkit')} doc
 * @param {number} level                 1–6 → H1–H6.
 * @param {string} text                  Heading text.
 * @param {Object} [options]             PDFKit text options (font, size, fillColor, …).
 * @param {string} [options.font]        Font name to select for this heading.
 * @param {number} [options.fontSize]    Font size in points.
 * @returns {void}
 */
export function addHeading(doc, level, text, options = {}) {
  const lvl = Math.min(6, Math.max(1, Math.round(level)));
  const tag = `H${lvl}`;
  const { font, fontSize, fillColor, ...textOptions } = options;

  // The struct() + add(closure) + end() form. PDFKit calls _contentForClosure()
  // which opens BDC, runs the closure to render text, then closes EMC.
  const struct = doc.struct(tag);
  doc.addStructure(struct);
  struct.add(() => {
    if (font) doc.font(font);
    if (fontSize) doc.fontSize(fontSize);
    // fillColor must be set via doc.fillColor(), not as a text() option.
    if (fillColor) doc.fillColor(fillColor);
    doc.text(text, { continued: false, link: null, underline: false, oblique: false, ...textOptions });
  });
  struct.end();
}

/**
 * Add a paragraph as a tagged `P` structure element.
 *
 * @param {import('pdfkit')} doc
 * @param {string} text                  Paragraph text. (Plain text only in v1;
 *                                        tagged inline links are a Phase 2 item.)
 * @param {Object} [options]             PDFKit text options.
 * @param {string} [options.font]        Font name to select for this paragraph.
 * @param {number} [options.fontSize]    Font size in points.
 * @returns {void}
 */
export function addParagraph(doc, text, options = {}) {
  const { font, fontSize, fillColor, ...textOptions } = options;

  const struct = doc.struct('P');
  doc.addStructure(struct);
  struct.add(() => {
    if (font) doc.font(font);
    if (fontSize) doc.fontSize(fontSize);
    // fillColor must be set via doc.fillColor(), not as a text() option.
    if (fillColor) doc.fillColor(fillColor);
    doc.text(text, { continued: false, link: null, underline: false, oblique: false, ...textOptions });
  });
  struct.end();
}

/**
 * Add an image as a tagged `Figure` with alternate text.
 *
 * PDF/UA requires every Figure to carry an `/Alt` entry. This helper THROWS if
 * `altText` is missing or empty rather than silently producing a
 * non-compliant document. Pass a meaningful description (for a purely
 * decorative image, draw it with {@link artifact} instead — do not give it an
 * empty alt).
 *
 * @param {import('pdfkit')} doc
 * @param {string|Buffer|Uint8Array} imageData  PNG/JPEG path, data URL, Buffer,
 *                                               or typed array — anything `doc.image()` accepts.
 * @param {string} altText                       Non-empty alternate text (`/Alt`).
 * @param {Object} [options]                     PDFKit image options (`fit`, `width`,
 *                                               `height`, `align`, position, …).
 * @param {[number,number,number,number]} [options.bbox]  Optional Figure bounding box
 *                                               [x0,y0,x1,y1] in PDF user space; set on the
 *                                               struct's attribute dictionary, not passed to `image()`.
 * @returns {void}
 */
export function addFigure(doc, imageData, altText, options = {}) {
  if (!altText || !String(altText).trim()) {
    throw new Error('addFigure: non-empty `altText` is required for a PDF/UA Figure. For decorative images use artifact() instead.');
  }

  // Optional explicit bounding box: PDFKit accepts a `bbox` attribute on the
  // Figure struct ([x0, y0, x1, y1] in PDF user space). Pass it through the
  // `bbox` option when the caller knows the placement; otherwise omit it.
  const { bbox, ...imageOptions } = options;
  const attributes = { alt: String(altText) };
  if (bbox) attributes.bbox = bbox;

  const struct = doc.struct('Figure', attributes);
  doc.addStructure(struct);
  struct.add(() => {
    doc.image(normaliseImageSrc(imageData), { link: null, ...imageOptions });
  });
  struct.end();
}

/**
 * Add a hyperlink span inside an existing parent structure element.
 *
 * PDF/UA-1 §7.18 requires every link annotation to be wrapped in a `Link`
 * structure element with a non-empty `Contents` key on the annotation.
 * PDFKit 0.18.0 bug: when `tagged` mode is active, `doc.link()` sets
 * `Contents` to an empty string, violating §7.18.1. This helper works around
 * that by temporarily overriding `doc.link` to inject the visible link text
 * as `Contents` before creating the annotation.
 *
 * Usage: call from inside a parent structure element's content, e.g. a `P`.
 *
 *     const p = doc.struct('P');
 *     doc.addStructure(p);
 *     p.add(() => { doc.text('See ', { continued: true }); });
 *     addLink(doc, p, 'Example', 'https://example.com', { continued: false, fontSize: 10 });
 *     p.end();
 *
 * @param {import('pdfkit')} doc
 * @param {object} parentStruct   The parent structure element (P, etc.) that will own the Link child.
 * @param {string} text           The visible link text. Also used as the annotation's Contents value.
 * @param {string} url            The destination URL.
 * @param {object} [options]
 * @param {string}  [options.font]      Font name to select.
 * @param {number}  [options.fontSize]  Font size in points.
 * @param {string}  [options.color]     Fill colour (hex or CSS name).
 * @param {boolean} [options.continued=false] Whether text continues on the same line after this link.
 * @returns {void}
 */
export function addLink(doc, parentStruct, text, url, options = {}) {
  const { font, fontSize, color, continued = false } = options;

  const linkEl = doc.struct('Link', { alt: text });
  parentStruct.add(linkEl);
  linkEl.add(() => {
    if (font)     doc.font(font);
    if (fontSize) doc.fontSize(fontSize);
    if (color)    doc.fillColor(color);

    // PDFKit 0.18.0 bug workaround (§7.18.1): override doc.link() for the
    // duration of this text call to inject the visible text as Contents.
    const _origLink = doc.link.bind(doc);
    doc.link = (x, y, w, h, u, opts = {}) => {
      // PDFKit serialises new String() as a PDF string literal "(...)";
      // a primitive string would be serialised as a PDF name "/..." which
      // is invalid for the /Contents annotation key (veraPDF parse error).
      // eslint-disable-next-line no-new-wrappers
      opts.Contents = new String(text);
      return _origLink(x, y, w, h, u, opts);
    };
    try {
      doc.text(text, { continued, link: url, underline: true, oblique: false });
    } finally {
      doc.link = _origLink;
    }
  });
  linkEl.end();
}

/**
 * Draw decorative content (background fills, rules, borders — anything that is
 * NOT part of the document's meaning) as a page-level `Artifact`.
 *
 * PDF/UA requires decorative marks to be tagged `Artifact` so they are excluded
 * from the structure tree and the reading order. This helper brackets the
 * drawing with `doc.markContent('Artifact')` / `doc.endMarkedContent()`.
 *
 * IMPORTANT: call this OUTSIDE any open structure element. Inside `drawFn`, draw
 * only with PDFKit's vector/colour primitives (`rect`, `fill`, `moveTo`/`lineTo`,
 * `stroke`, …). Do NOT emit text or images that carry meaning here — those must
 * be real structure elements (use addParagraph / addFigure).
 *
 * PDFKit 0.18.0 quirk: calling `doc.table()` immediately after `artifact()`
 * (with no `addHeading()` or `addParagraph()` call in between) causes the table's content to be
 * emitted without proper tagging — veraPDF will flag it as untagged content.
 * Always place at least one `addHeading()` or `addParagraph()` call between an
 * `artifact()` and a subsequent `doc.table()`. See ADR 010, Finding 3.
 *
 * @param {import('pdfkit')} doc
 * @param {(doc: import('pdfkit')) => void} drawFn  Receives the document; performs the drawing.
 * @returns {void}
 */
export function artifact(doc, drawFn) {
  doc.markContent('Artifact');
  try {
    drawFn(doc);
  } finally {
    doc.endMarkedContent();
  }
}

/**
 * Finalise the document and resolve to a Blob (browser download path).
 *
 * Pipes the document through `blob-stream`. Call this after ALL content has
 * been authored; it invokes `doc.end()` internally. The document must not be
 * written to afterwards.
 *
 * @param {import('pdfkit')} doc
 * @param {string} [mimeType='application/pdf']
 * @returns {Promise<Blob>}
 */
export function toBlob(doc, mimeType = 'application/pdf') {
  return new Promise((resolve, reject) => {
    const stream = doc.pipe(blobStream());
    stream.on('finish', () => {
      try {
        resolve(stream.toBlob(mimeType));
      } catch (err) {
        reject(err);
      }
    });
    stream.on('error', reject);
    doc.end();
  });
}

/**
 * Finalise the document and resolve to a Buffer (Node.js / test path).
 *
 * Collects the document's output chunks. Call this after ALL content has been
 * authored; it invokes `doc.end()` internally. Used by the veraPDF tests.
 *
 * @param {import('pdfkit')} doc
 * @returns {Promise<Buffer>}
 */
export function toBuffer(doc) {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}
