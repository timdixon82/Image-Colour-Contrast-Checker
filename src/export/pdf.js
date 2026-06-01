/**
 * PDF export via PDFKit — ISO 14289-1 (PDF/UA-1) compliant.
 *
 * Replaces the pdfmake implementation. Uses the `src/lib/pdf-ua/` wrapper
 * which handles PDFKit 0.18.0 bug workarounds (see ADR 010 and the wrapper's
 * module-level comment).
 *
 * Public API is unchanged:
 *   downloadPdf(entries, timestamp, filename) — browser download
 *
 * Additional export for tests:
 *   buildPdf(entries, timestamp) — returns Promise<Buffer>
 *
 * @module export/pdf
 */

import {
  createDocument,
  addHeading,
  addParagraph,
  addFigure,
  artifact,
  toBlob,
  toBuffer,
} from '../lib/pdf-ua/index.js';

import {
  APP_NAME,
  SITE_URL,
  THRESHOLDS_FOOTER,
  DISCLAIMER_TEXT,
  VESTIBULAR_CHECKER_URL,
  VESTIBULAR_CHECKER_FULL_LABEL,
  checkInfoUrl,
} from './strings.js';

import {
  pairChecks,
  wcagLine,
  advancedLine,
  pairBadges,
  statusWord,
  CHECK_GROUPS,
} from './checks.js';

// ── Font loading ─────────────────────────────────────────────────────────────
// Browser (Vite): fonts are served from /fonts/ by the dev server and
//   copied to dist/fonts/ by the production build via scripts/copy-models.mjs.
//   Loaded as ArrayBuffer via fetch() so no Node.js built-ins are needed.
// Node.js (Vitest): node:url / node:path are available; fonts are read from
//   node_modules/pdfmake/fonts/ by filesystem path.
//   The dynamic import('node:url') branch is dead code in browser builds and
//   tree-shaken by Vite/Rolldown before it can reach the bundler's module
//   externalization check.

let _fonts = null;

async function loadFonts() {
  if (_fonts) return _fonts;

  if (typeof window === 'undefined') {
    // Node.js / Vitest — use filesystem paths so PDFKit reads fonts directly.
    const { fileURLToPath } = await import('node:url');
    const { join }          = await import('node:path');
    const __dirname = fileURLToPath(new URL('.', import.meta.url));
    const fontDir   = join(__dirname, '../../node_modules/pdfmake/fonts/Roboto');
    _fonts = {
      regular: join(fontDir, 'Roboto-Regular.ttf'),
      medium:  join(fontDir, 'Roboto-Medium.ttf'),
    };
  } else {
    // Browser — fetch fonts from /fonts/ (served by Vite dev and production build).
    // Pass the raw ArrayBuffer directly: pdfkit's PDFFontFactory.open has an
    // `instanceof ArrayBuffer` branch that wraps it with `new Uint8Array(src)`
    // internally before handing it to fontkit.  This avoids any cross-realm
    // or polyfill issue with `src instanceof Uint8Array` failing on a Buffer
    // or externally-constructed Uint8Array.
    const [regBuf, medBuf] = await Promise.all([
      fetch('/fonts/Roboto-Regular.ttf').then((r) => r.arrayBuffer()),
      fetch('/fonts/Roboto-Medium.ttf').then((r)  => r.arrayBuffer()),
    ]);
    _fonts = {
      regular: regBuf,
      medium:  medBuf,
    };
  }
  return _fonts;
}

// Available page width for A4 with 40 pt left/right margins
const PAGE_W = 515;

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusStyle(status) {
  if (status === 'PASS' || status === 'SAFE') return 'pass';
  if (status === 'FAIL' || status === 'HIGH') return 'fail';
  return 'warn';
}

function pillCell(status) {
  const colours = {
    pass:    { backgroundColor: '#dcfce7', color: '#14532d' },
    fail:    { backgroundColor: '#fee2e2', color: '#7f1d1d' },
    warn:    { backgroundColor: '#fef3c7', color: '#663a00' },
    neutral: { backgroundColor: '#f0f2f5', color: '#4b5563' },
  };
  const c = colours[statusStyle(status)] || colours.neutral;
  return { text: status, ...c, font: { size: 8 }, padding: [6, 2, 6, 2] };
}

/**
 * Write a paragraph (P structure element) containing multiple inline spans.
 * Each span can carry a link, colour, fontSize, and font switch.
 *
 * @param {import('pdfkit')} doc
 * @param {Array<{
 *   text: string,
 *   link?: string,
 *   color?: string,
 *   fontSize?: number,
 *   font?: string,
 *   oblique?: boolean,
 * }>} spans
 */
function writeParagraph(doc, spans) {
  const struct = doc.struct('P');
  doc.addStructure(struct);
  struct.add(doc.markStructureContent('P', () => {
    spans.forEach((span, i) => {
      const isLast = i === spans.length - 1;
      if (span.font)     doc.font(span.font);
      if (span.fontSize) doc.fontSize(span.fontSize);
      if (span.color)    doc.fillColor(span.color);
      doc.text(span.text, {
        continued: !isLast,
        link:      span.link    || null,
        underline: !!span.link,
        oblique:   !!span.oblique,
      });
    });
  }));
  struct.end();
}

/**
 * Reset font, size and fill colour to document defaults.
 * Call after any section that leaves non-default state.
 *
 * @param {import('pdfkit')} doc
 */
function resetState(doc) {
  doc.font('Regular').fontSize(10).fillColor('#000000');
  doc.x = doc.page.margins.left;
}

// ── Document builder ─────────────────────────────────────────────────────────

async function buildDocument(entries, timestamp) {
  const fonts = await loadFonts();
  const doc   = createDocument({
    title: 'Audit Report',
    fonts,
    lang:    'en',
    size:    'A4',
    margins: { top: 50, bottom: 50, left: 40, right: 40 },
  });

  // ── Branded header ────────────────────────────────────────────────────────
  // Draw navy background first at calculated height, then position text
  // inside via doc.x / doc.y (not explicit x,y args to doc.text, which can
  // emit untagged positioning operators outside the marked-content scope).
  const INNER_PAD_H = 16; // horizontal inner padding
  const INNER_PAD_V = 14; // vertical inner padding
  // Approximate: H1 line height + 4pt gap + tagline line height
  const HEADER_CONTENT_HEIGHT = 18 * 1.4 + 4 + 8.75 * 1.4;
  const HEADER_H = INNER_PAD_V * 2 + HEADER_CONTENT_HEIGHT;

  const headerTop = doc.y;
  artifact(doc, (d) => {
    d.rect(doc.page.margins.left, headerTop, PAGE_W, HEADER_H).fill('#061528');
  });

  // Pre-position cursor inside the navy block, then call helpers without
  // explicit x/y so no untagged positioning operators are emitted.
  doc.x = doc.page.margins.left + INNER_PAD_H;
  doc.y = headerTop + INNER_PAD_V;

  const h1 = doc.struct('H1');
  doc.addStructure(h1);
  h1.add(doc.markStructureContent('H1', () => {
    doc.font('Medium').fontSize(18)
       .fillColor('#ffffff').text('Image Colour ', { continued: true, lineBreak: false })
       .fillColor('#FF7C00').text('Contrast Checker', { continued: false });
  }));
  h1.end();

  // Tagline — PDFKit advanced doc.y after the H1; keep doc.x at inner position
  doc.x = doc.page.margins.left + INNER_PAD_H;
  addParagraph(doc,
    'Drop in images for WCAG 2.2 AA / AAA compliance and advanced perceptual checks. '
    + 'Runs entirely in your browser — nothing is uploaded.',
    { fontSize: 8.75, fillColor: '#63D2FF', width: PAGE_W - INNER_PAD_H * 2 }
  );

  // Move past the header block + 12pt outer margin
  doc.y = headerTop + HEADER_H + 12;
  resetState(doc);

  // ── Report title + timestamp ──────────────────────────────────────────────
  doc.y += 12;
  addHeading(doc, 2, 'Audit Report', { font: 'Medium', fontSize: 14 });
  doc.y += 6;
  resetState(doc);
  addParagraph(doc, `Generated ${timestamp}`, { fontSize: 9, fillColor: '#4b5563' });
  resetState(doc);
  writeParagraph(doc, [
    { text: 'Generated by ',  fontSize: 9, color: '#4b5563' },
    { text: APP_NAME,         fontSize: 9, color: '#061528', link: SITE_URL },
  ]);
  resetState(doc);
  doc.moveDown(0.5);

  // ── Disclaimer ────────────────────────────────────────────────────────────
  // Draw background at calculated height, then position text inside via
  // doc.x / doc.y (same technique as the branded header — no explicit x/y
  // args to doc.text inside markStructureContent).
  const DISCL_INNER_H = 10; // horizontal inner padding
  const DISCL_INNER_V = 8;  // vertical inner padding
  const DISCL_FONT_SIZE = 9;
  const DISCL_LINE_HEIGHT = DISCL_FONT_SIZE * 1.4;
  const DISCL_TEXT_WIDTH = PAGE_W - DISCL_INNER_H * 2;
  // Approximate 2-3 lines of wrapped disclaimer text at 9pt
  const DISCL_CONTENT_HEIGHT = DISCL_LINE_HEIGHT * 2.5;
  const DISCL_H = DISCL_INNER_V * 2 + DISCL_CONTENT_HEIGHT;

  const disclTop = doc.y;
  artifact(doc, (d) => {
    d.rect(doc.page.margins.left, disclTop, PAGE_W, DISCL_H).fill('#fef3c7');
  });

  // Pre-position cursor inside the disclaimer block
  doc.x = doc.page.margins.left + DISCL_INNER_H;
  doc.y = disclTop + DISCL_INNER_V;

  const shortDisclaimer = DISCLAIMER_TEXT.replace(
    'This report is generated automatically to help speed up accessibility review. ', ''
  );
  const disclStruct = doc.struct('P');
  doc.addStructure(disclStruct);
  disclStruct.add(doc.markStructureContent('P', () => {
    doc.font('Medium').fontSize(DISCL_FONT_SIZE).fillColor('#1a1a1a')
       .text('Automated analysis only — ', { continued: true, lineBreak: false });
    doc.font('Regular')
       .text(shortDisclaimer, { continued: false, width: DISCL_TEXT_WIDTH });
  }));
  disclStruct.end();

  // Move past disclaimer block + 14pt outer margin
  doc.y = disclTop + DISCL_H + 14;
  resetState(doc);

  // ── Summary table ─────────────────────────────────────────────────────────
  doc.y += 12;
  addHeading(doc, 2, 'Summary', { font: 'Medium', fontSize: 14 });
  doc.y += 6;
  resetState(doc);
  doc.y += 6; // gap between heading and table
  doc.table({
    columnStyles: [{ width: PAGE_W - 100 }, { width: 100 }],
    defaultStyle: { fontSize: 10 },
    data: [
      [
        { type: 'TH', scope: 'column', text: 'Image',  font: { src: 'Medium' }, backgroundColor: '#f3f4f6' },
        { type: 'TH', scope: 'column', text: 'Result', font: { src: 'Medium' }, backgroundColor: '#f3f4f6' },
      ],
      ...entries.map((e) => {
        const vs = e.report.flag ? 'FAIL' : (e.report.verdict === 'PASS' ? 'PASS' : 'NO TEXT');
        return [{ text: e.filename }, pillCell(vs)];
      }),
    ],
  });
  doc.moveDown();

  // ── Per-image sections ────────────────────────────────────────────────────
  entries.forEach((entry, idx) => {
    if (idx > 0) doc.addPage();
    resetState(doc);

    // Filename heading + preview
    doc.y += 12;
    addHeading(doc, 2, entry.filename, { font: 'Medium', fontSize: 14 });
    doc.y += 6;
    resetState(doc);

    if (entry.previewDataUrl) {
      addFigure(doc, entry.previewDataUrl, `Preview of ${entry.filename}`, { width: 420 });
      resetState(doc);
    }

    // Result line — bold prefix, coloured verdict, plain detail
    const vs = entry.report.flag
      ? 'FAIL'
      : (entry.report.verdict === 'PASS' ? 'PASS' : 'NO TEXT');
    const vsStyle = statusStyle(vs);
    const vsColor = { pass: '#14532d', fail: '#7f1d1d', warn: '#663a00', neutral: '#4b5563' }[vsStyle] || '#4b5563';
    writeParagraph(doc, [
      { text: 'Result: ', font: 'Medium', fontSize: 10, color: '#000000' },
      { text: vs,         font: 'Medium', fontSize: 8,  color: vsColor },
      { text: ` — ${entry.report.detail}`, font: 'Regular', fontSize: 10, color: '#000000' },
    ]);
    resetState(doc);

    // CVD simulations — single-column with addFigure / addParagraph
    // (explicit x/y positioning breaks PDF/UA tagging on page boundaries;
    // addFigure draws at doc.y and is veraPDF-validated safe)
    if (entry.cbSimAssets && entry.cbSimAssets.length) {
      doc.y += 8;
      addHeading(doc, 3, 'Colour-blindness simulation', { font: 'Medium', fontSize: 12 });
      doc.y += 4;
      resetState(doc);
      for (const asset of entry.cbSimAssets) {
        addFigure(doc, asset.dataUrl,
          `${asset.label} colour vision simulation — ${asset.note}`,
          { width: 220 }
        );
        addParagraph(doc, `${asset.label} — ${asset.note}`, {
          fontSize: 8, fillColor: '#4b5563', oblique: true,
        });
        resetState(doc);
      }
      doc.moveDown(0.5);
    }

    // Contrast results + per-pair blocks
    if (entry.report.hasText && entry.report.colourPairs && entry.report.colourPairs.length) {
      doc.y += 8;
      addHeading(doc, 3, 'Contrast results', { font: 'Medium', fontSize: 12 });
      doc.y += 4;
      resetState(doc);
      addParagraph(doc, wcagLine(entry.report),     { fontSize: 10, fillColor: '#374151', oblique: true });
      resetState(doc);
      addParagraph(doc, advancedLine(entry.report), { fontSize: 10, fillColor: '#374151', oblique: true });
      resetState(doc);

      const assetMap = new Map((entry.pairAssets || []).map((a) => [a.pair, a]));

      for (const pair of entry.report.colourPairs) {
        const asset = assetMap.get(pair);
        doc.moveDown(0.5);
        resetState(doc);

        // 1.9.1 Swatch (decorative) + badge strip + hex pair label
        if (asset?.swatchDataUrl) {
          const swatchY = doc.y;
          artifact(doc, (d) => {
            d.image(asset.swatchDataUrl, doc.page.margins.left, swatchY, { width: 48, height: 14 });
          });
          doc.y = swatchY + 18;
          doc.x = doc.page.margins.left;
        }
        const badges = pairBadges(pair)
          .map((b) => `${b.short} ${statusWord(b.status)}`)
          .join('    ');
        addParagraph(doc,
          `${badges}    Background ${pair.bgHex}  ·  Foreground ${pair.fgHex}`,
          { font: 'Regular', fontSize: 10, fillColor: '#000000' }
        );
        resetState(doc);

        // 1.9.2 Examples + links (with working hyperlinks)
        const webaim = `https://webaim.org/resources/contrastchecker/?fcolor=${pair.fgHex.slice(1)}&bcolor=${pair.bgHex.slice(1)}`;
        const exampleSpans = pair.examples && pair.examples.length
          ? [{ text: pair.examples.map((e) => `"${e}"`).join(', ') + '   ', fontSize: 9, color: '#374151', oblique: true }]
          : [];
        writeParagraph(doc, [
          ...exampleSpans,
          { text: 'WebAIM',                          fontSize: 9, color: '#061528', link: webaim },
          { text: '   ',                             fontSize: 9, color: '#374151' },
          { text: VESTIBULAR_CHECKER_FULL_LABEL,     fontSize: 9, color: '#061528', link: VESTIBULAR_CHECKER_URL },
        ]);
        resetState(doc);

        // 1.9.3 Checks table — Check column cells carry hyperlinks
        const checks    = pairChecks(pair);
        const tableRows = [[
          { type: 'TH', scope: 'column', text: 'Check',         font: { src: 'Medium' }, backgroundColor: '#f3f4f6' },
          { type: 'TH', scope: 'column', text: 'Value',         font: { src: 'Medium' }, backgroundColor: '#f3f4f6' },
          { type: 'TH', scope: 'column', text: 'Status',        font: { src: 'Medium' }, backgroundColor: '#f3f4f6' },
          { type: 'TH', scope: 'column', text: 'What it means', font: { src: 'Medium' }, backgroundColor: '#f3f4f6' },
        ]];

        for (const grp of CHECK_GROUPS) {
          tableRows.push([
            { type: 'TH', scope: 'row', text: grp.label,
              font: { src: 'Medium', size: 8 },
              backgroundColor: '#e5e7eb', color: '#1a1a1a' },
            { text: '' }, { text: '' }, { text: '' },
          ]);
          for (const c of checks.filter((ch) => ch.group === grp.id)) {
            tableRows.push([
              { text: c.label, link: checkInfoUrl(c.id), underline: true, color: '#061528' },
              { text: c.value || '—' },
              pillCell(c.status),
              { text: c.detail, oblique: true },
            ]);
          }
        }

        doc.y += 6; // gap between preceding content and table
        doc.table({
          data: tableRows,
          columnStyles: [
            { width: 110 }, { width: 80 }, { width: 80 }, { width: 225 },
          ],
        });

        // 1.9.4 Clip image (conditional)
        if (asset?.clipDataUrl) {
          addParagraph(doc, 'Where this combination appears:', {
            fontSize: 9, fillColor: '#374151', oblique: true,
          });
          resetState(doc);
          addFigure(doc, asset.clipDataUrl,
            `Cropped region showing where ${pair.bgHex} background with `
            + `${pair.fgHex} foreground text appears in the image`,
            { width: 360 }
          );
          resetState(doc);
        }
      }
    }
  });

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.moveDown();
  resetState(doc);
  addParagraph(doc, THRESHOLDS_FOOTER, { fontSize: 9, fillColor: '#4b5563', oblique: true });
  resetState(doc);
  writeParagraph(doc, [
    { text: 'Generated by ', fontSize: 9, color: '#4b5563' },
    { text: APP_NAME,        fontSize: 9, color: '#061528', link: SITE_URL },
  ]);

  return doc;
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function downloadPdf(entries, timestamp, filename) {
  const blob = await toBlob(await buildDocument(entries, timestamp));
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function buildPdf(entries, timestamp) {
  return toBuffer(await buildDocument(entries, timestamp));
}
