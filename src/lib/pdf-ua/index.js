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
 *          `Scope`/`Headers` attributes when called directly. `addTable` works
 *          around this by injecting Scope/Headers attributes manually via the
 *          struct's attribute dictionary (the same approach PDFKit's own
 *          `doc.table()` uses internally).
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
 * Use `addTable` from this module for any table that needs rich cell content
 * (inline hyperlinks, mixed font spans). `addTable` manually injects the
 * Table/TR/TH/TD structure tree with correct Scope and Headers attributes,
 * and wraps linked spans in `Link` child structs (PDF/UA-1 §7.18).
 *
 * For simple tables that contain only plain text and require no inline links,
 * PDFKit's own `doc.table()` API is also acceptable and slightly simpler:
 *
 *     doc.table({
 *       data: [
 *         [ { type: 'TH', scope: 'column', text: 'Image' },
 *           { type: 'TH', scope: 'column', text: 'Result' } ],
 *         [ 'logo.png', 'PASS' ],
 *       ],
 *     });
 *
 * Do NOT build tables from raw `doc.struct('Table'…)` calls — the Scope /
 * Headers attributes will be silently dropped and veraPDF will fail the
 * document. Always use `addTable` or `doc.table()`. See ADR 010, Finding 2.
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
 * Temporarily override `doc.link` to inject visible `text` as the annotation
 * `Contents` value, then run `fn`, then restore the original `doc.link`.
 *
 * PDFKit 0.18.0 bug (§7.18.1): in `tagged` mode, `doc.link()` always sets
 * `Contents` to an empty string. veraPDF rejects empty Contents on link
 * annotations. This wrapper injects the correct string for the duration of
 * one `doc.text()` call without mutating any persistent state.
 *
 * PDFKit serialises `new String(...)` (a String object) as a PDF string
 * literal `"(...)"`. A plain primitive string would be serialised as a PDF
 * name `/...`, which is invalid for `/Contents` (veraPDF parse error).
 *
 * @param {import('pdfkit')} doc
 * @param {string} text  The visible link text — used verbatim as `/Contents`.
 * @param {() => void} fn  Called while `doc.link` is patched.
 * @returns {void}
 */
function _withLinkContents(doc, text, fn) {
  const _orig = doc.link.bind(doc);
  doc.link = (x, y, w, h, u, opts = {}) => {
    // eslint-disable-next-line no-new-wrappers
    opts.Contents = new String(text);
    return _orig(x, y, w, h, u, opts);
  };
  try { fn(); }
  finally { doc.link = _orig; }
}

/**
 * Add a hyperlink span inside an existing parent structure element.
 *
 * PDF/UA-1 §7.18 requires every link annotation to be wrapped in a `Link`
 * structure element with a non-empty `Contents` key on the annotation.
 * PDFKit 0.18.0 bug: when `tagged` mode is active, `doc.link()` sets
 * `Contents` to an empty string, violating §7.18.1. This helper works around
 * that via `_withLinkContents`.
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
    _withLinkContents(doc, text, () => {
      doc.text(text, { continued, link: url, underline: true, oblique: false });
    });
  });
  linkEl.end();
}

/**
 * One styled run of text within a table cell. A span with a `link` is rendered
 * as a PDF/UA `Link` structure element wrapping its annotation (clause 7.18),
 * with the span's visible `text` injected as the annotation `Contents`.
 *
 * @typedef {Object} TableSpan
 * @property {string}  text              Visible text of this run (also the Link Contents/Alt when linked).
 * @property {string}  [link]            Destination URL. Present → rendered as a Link struct + annotation.
 * @property {string}  [color]           Fill colour (hex or CSS name) for this run.
 * @property {string}  [font]            Registered font name to select for this run.
 * @property {number}  [fontSize]        Font size in points for this run.
 * @property {boolean} [underline=false] Underline this run. Linked runs default to underlined.
 * @property {boolean} [italic=false]    Render this run obliqued/italic.
 */

/**
 * One table cell. `content` is either a plain string (single default-styled
 * run) or an array of {@link TableSpan} for mixed styling / inline links.
 *
 * @typedef {Object} TableCell
 * @property {'TH'|'TD'}             [type='TD']
 * @property {'column'|'row'|'both'} [scope]      Required when type is 'TH'.
 * @property {string|TableSpan[]}    content
 * @property {string}  [backgroundColor]
 * @property {string}  [color]
 * @property {string}  [font]
 * @property {number}  [fontSize]
 * @property {'left'|'center'|'right'} [align='left']
 */

/**
 * @typedef {Object} TableColumnStyle
 * @property {number} [width]  Fixed column width in points.
 */

/**
 * @typedef {Object} AddTableOptions
 * @property {TableCell[][]} rows
 * @property {TableColumnStyle[]} [columnStyles]
 * @property {string}  [borderColor='#cccccc']
 * @property {number}  [borderWidth=0.5]
 * @property {number}  [padding=4]
 */

/**
 * Add a PDF/UA-1 compliant table with optional inline hyperlinks in cells.
 *
 * PDFKit's native `doc.table()` renders each cell with a single hard-coded
 * `doc.text(cell.text)` call and provides no per-cell renderer hook — so a
 * cell cannot contain a `Link` structure element. Any link annotation added
 * inside a `doc.table()` cell is untagged and fails veraPDF clause 7.18.
 *
 * `addTable` authors the full Table/TR/TH/TD structure tree using the
 * low-level struct API (mirroring what PDFKit's `accessibleCell` function does
 * internally), and wraps linked spans in `Link` child structs using the same
 * `_withLinkContents` trick as `addLink`.
 *
 * Scope and Headers attributes are injected directly into the struct's
 * attribute dictionary (as a `doc.ref()` object), bypassing the PDFKit
 * 0.18.0 bug where `doc.struct('TH', { scope })` silently drops those values.
 *
 * @param {import('pdfkit')} doc
 * @param {AddTableOptions} options
 * @returns {void}
 */
export function addTable(doc, options) {
  const {
    rows = [],
    columnStyles = [],
    borderColor = '#cccccc',
    borderWidth = 0.5,
    padding = 4,
  } = options || {};

  const margins     = doc.page.margins;
  const contentWidth = doc.page.width - margins.left - margins.right;

  // ── Resolve column widths ─────────────────────────────────────────────────
  const numCols   = rows.length > 0 ? rows[0].length : 0;
  let   remaining = contentWidth;
  const colWidths = [];

  // First pass: claim fixed widths
  for (let c = 0; c < numCols; c++) {
    const w = columnStyles[c] && columnStyles[c].width != null ? columnStyles[c].width : null;
    if (w != null) {
      colWidths[c] = w;
      remaining -= w;
    }
  }
  // Second pass: distribute remaining width equally among unspecified columns
  const unspecified = colWidths.filter((w) => w == null).length;  // counts undefined slots
  const freeW = unspecified > 0 ? remaining / unspecified : 0;
  for (let c = 0; c < numCols; c++) {
    if (colWidths[c] == null) colWidths[c] = freeW;
  }

  // ── Measure row heights ────────────────────────────────────────────────────
  const rowHeights = rows.map((row) => {
    let maxCellH = 0;
    row.forEach((cell, colIdx) => {
      const colW    = colWidths[colIdx] || 60;
      const textW   = colW - 2 * padding;
      const fs      = cell.fontSize || 9;
      const content = cell.content;
      doc.fontSize(fs);
      if (cell.font) doc.font(cell.font);

      let cellTextH;
      if (typeof content === 'string') {
        cellTextH = content
          ? doc.heightOfString(content, { width: textW })
          : doc.currentLineHeight();
      } else if (Array.isArray(content) && content.length > 0) {
        // For rich spans take the max height across spans
        cellTextH = content.reduce((acc, span) => {
          if (span.font)     doc.font(span.font);
          if (span.fontSize) doc.fontSize(span.fontSize);
          const h = span.text
            ? doc.heightOfString(span.text, { width: textW })
            : doc.currentLineHeight();
          return Math.max(acc, h);
        }, 0);
      } else {
        cellTextH = doc.currentLineHeight();
      }

      // Reset to default font/size after measurement
      doc.font('Regular').fontSize(9);
      maxCellH = Math.max(maxCellH, cellTextH);
    });
    return maxCellH + 2 * padding;
  });

  // ── Table structure ────────────────────────────────────────────────────────
  const tablePrefix = `t${(Date.now() % 1e6)}`;
  const table = doc.struct('Table');
  doc.addStructure(table);

  // Lookups for Headers attribute
  // headerColLookup[colIdx] = String id of the column TH
  // headerRowLookup[rowIdx] = String id of the row TH
  const headerColLookup = {};
  const headerRowLookup = {};

  let rowY = doc.y;

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row      = rows[rowIdx];
    const rowH     = rowHeights[rowIdx];
    const tr = doc.struct('TR');
    // eslint-disable-next-line no-new-wrappers
    tr.dictionary.data.ID = new String(`${tablePrefix}-r${rowIdx}`);
    table.add(tr);

    let colX = margins.left;

    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cell    = row[colIdx];
      const colW    = colWidths[colIdx] || 60;
      const content = cell.content != null ? cell.content : '';
      const isHeader = cell.type === 'TH';

      // ── Cell struct ────────────────────────────────────────────────────
      const cellStruct = doc.struct(isHeader ? 'TH' : 'TD');
      // eslint-disable-next-line no-new-wrappers
      const cellId = new String(`${tablePrefix}-r${rowIdx}-c${colIdx}`);
      cellStruct.dictionary.data.ID = cellId;
      tr.add(cellStruct);

      // ── Attributes (Scope, Headers, BackgroundColor) ───────────────────
      const attrs = { O: 'Table' };
      if (isHeader) {
        const scopeMap = { column: 'Column', row: 'Row', both: 'Both' };
        attrs.Scope = scopeMap[cell.scope] || 'Column';
      } else {
        // Build Headers array from col + row lookups
        const headers = [];
        if (headerColLookup[colIdx])  headers.push(headerColLookup[colIdx]);
        if (headerRowLookup[rowIdx])  headers.push(headerRowLookup[rowIdx]);
        if (headers.length) attrs.Headers = headers;
      }
      if (cell.backgroundColor) {
        attrs.BackgroundColor = doc._normalizeColor(cell.backgroundColor);
      }
      const attrRef = doc.ref(attrs);
      cellStruct.dictionary.data.A = attrRef;

      // Store TH ids for downstream cells' Headers attribute
      if (isHeader) {
        if (cell.scope === 'column' || cell.scope === 'both') {
          headerColLookup[colIdx] = cellId;
        }
        if (cell.scope === 'row' || cell.scope === 'both') {
          headerRowLookup[rowIdx] = cellId;
        }
      }

      // ── Cell decoration: background fill + border (Artifact) ──────────
      const cellX = colX;
      const cellY = rowY;
      artifact(doc, (d) => {
        if (cell.backgroundColor) {
          d.save().fillColor(cell.backgroundColor).rect(cellX, cellY, colW, rowH).fill().restore();
        }
        d.save().lineWidth(borderWidth).strokeColor(borderColor)
          .rect(cellX, cellY, colW, rowH).stroke().restore();
      });

      // ── Cell content closure ───────────────────────────────────────────
      const textX = cellX + padding;
      const textY = cellY + padding;
      const textW = colW - 2 * padding;

      if (typeof content === 'string') {
        // Plain cell — single text run
        cellStruct.add(() => {
          doc.font(cell.font || 'Regular');
          doc.fontSize(cell.fontSize || 9);
          doc.fillColor(cell.color || '#000000');
          doc.text(content || ' ', textX, textY, {
            width: textW,
            align: cell.align || 'left',
            link: null, underline: false, oblique: !!cell.oblique, continued: false,
          });
        });
      } else if (Array.isArray(content) && content.length > 0) {
        // Rich spans — may include Link child structs
        let firstSpan = true;
        for (let s = 0; s < content.length; s++) {
          const span    = content[s];
          const isLast  = s === content.length - 1;
          const continued = !isLast;

          if (span.link) {
            // Linked span — Link child struct wrapping the annotation
            const linkEl = doc.struct('Link', { alt: span.text });
            cellStruct.add(linkEl);
            const capturedFirst = firstSpan;
            linkEl.add(() => {
              doc.font(span.font || cell.font || 'Regular');
              doc.fontSize(span.fontSize || cell.fontSize || 9);
              doc.fillColor(span.color || cell.color || '#000000');
              _withLinkContents(doc, span.text, () => {
                if (capturedFirst) {
                  doc.text(span.text, textX, textY, {
                    width: textW, continued,
                    link: span.link,
                    underline: span.underline !== false,
                    oblique: !!span.italic,
                  });
                } else {
                  doc.text(span.text, {
                    continued,
                    link: span.link,
                    underline: span.underline !== false,
                    oblique: !!span.italic,
                  });
                }
              });
            });
            linkEl.end();
          } else {
            // Plain span
            const capturedFirst = firstSpan;
            cellStruct.add(() => {
              doc.font(span.font || cell.font || 'Regular');
              doc.fontSize(span.fontSize || cell.fontSize || 9);
              doc.fillColor(span.color || cell.color || '#000000');
              if (capturedFirst) {
                doc.text(span.text || ' ', textX, textY, {
                  width: textW, continued,
                  link: null, underline: !!span.underline, oblique: !!span.italic,
                });
              } else {
                doc.text(span.text || ' ', {
                  continued,
                  link: null, underline: !!span.underline, oblique: !!span.italic,
                });
              }
            });
          }
          firstSpan = false;
        }
      } else {
        // Empty content fallback
        cellStruct.add(() => {
          doc.font('Regular').fontSize(9).fillColor('#000000');
          doc.text(' ', textX, textY, {
            width: textW, link: null, underline: false, oblique: false, continued: false,
          });
        });
      }

      cellStruct.end();
      attrRef.end();

      colX += colW;
    }

    tr.end();
    rowY += rowH;
  }

  table.end();

  // Advance document cursor below the table
  doc.x = margins.left;
  doc.y = rowY;
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
