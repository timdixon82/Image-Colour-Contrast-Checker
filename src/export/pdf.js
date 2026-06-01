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
  addLink,
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
  const p = doc.struct('P');
  doc.addStructure(p);

  spans.forEach((span, i) => {
    const isLast = i === spans.length - 1;

    if (span.link) {
      addLink(doc, p, span.text, span.link, {
        font:      span.font,
        fontSize:  span.fontSize,
        color:     span.color,
        continued: !isLast,
      });
    } else {
      p.add(() => {
        if (span.font)     doc.font(span.font);
        if (span.fontSize) doc.fontSize(span.fontSize);
        if (span.color)    doc.fillColor(span.color);
        doc.text(span.text, {
          continued: !isLast,
          link:      null,
          underline: false,
          oblique:   !!span.oblique,
        });
      });
    }
  });

  p.end();
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
  const HEADER_H     = 88;
  const HEADER_PAD_L = 12;
  const HEADER_TEXT_W = PAGE_W - HEADER_PAD_L * 2;  // 491pt (12pt left + 12pt right inner pad)

  const headerTop = doc.y;
  artifact(doc, (d) => {
    d.rect(doc.page.margins.left, headerTop, PAGE_W, HEADER_H).fill('#061528');
  });
  doc.y = headerTop + 12;  // top padding inside header

  const h1 = doc.struct('H1');
  doc.addStructure(h1);
  h1.add(() => {
    const x = doc.page.margins.left + HEADER_PAD_L;
    doc.font('Medium').fontSize(18)
       .fillColor('#ffffff')
       .text('Image Colour ', x, doc.y, { continued: true, link: null, underline: false, oblique: false, width: HEADER_TEXT_W })
       .fillColor('#FF7C00')
       .text('Contrast Checker', { continued: false, link: null, underline: false, oblique: false });
  });
  h1.end();

  // Tagline: write with explicit x to maintain inner padding (addParagraph resets to margin)
  const taglineStruct = doc.struct('P');
  doc.addStructure(taglineStruct);
  taglineStruct.add(() => {
    const x = doc.page.margins.left + HEADER_PAD_L;
    doc.font('Regular').fontSize(8.75).fillColor('#63D2FF')
       .text(
         'Drop in images for WCAG 2.2 AA / AAA compliance and advanced perceptual checks. '
         + 'Runs entirely in your browser — nothing is uploaded.',
         x, doc.y,
         { continued: false, link: null, underline: false, oblique: false, width: HEADER_TEXT_W }
       );
  });
  taglineStruct.end();

  doc.y = headerTop + HEADER_H + 12;

  // ── Report title + timestamp ──────────────────────────────────────────────
  doc.fillColor('#000000');
  addHeading(doc, 2, 'Audit Report',            { font: 'Medium', fontSize: 14 });
  addParagraph(doc, `Generated ${timestamp}`,   { fontSize: 9, fillColor: '#4b5563' });
  writeParagraph(doc, [
    { text: 'Generated by ',  fontSize: 9, color: '#4b5563' },
    { text: APP_NAME,         fontSize: 9, color: '#061528', link: SITE_URL },
  ]);
  doc.moveDown(0.5);

  // ── Disclaimer ────────────────────────────────────────────────────────────
  const DISCL_H      = 56;
  const DISCL_PAD_L  = 10;
  const DISCL_TEXT_W = PAGE_W - DISCL_PAD_L * 2;  // 495pt

  const disclTop = doc.y;
  artifact(doc, (d) => {
    d.roundedRect(doc.page.margins.left, disclTop, PAGE_W, DISCL_H, 4).fill('#fef3c7');
  });
  doc.y = disclTop + 10;  // top padding inside block

  const shortDisclaimer = DISCLAIMER_TEXT.replace(
    'This report is generated automatically to help speed up accessibility review. ', ''
  );
  // "Automated analysis only" bold + regular continuation, with inner horizontal padding
  const disclStruct = doc.struct('P');
  doc.addStructure(disclStruct);
  disclStruct.add(() => {
    const x = doc.page.margins.left + DISCL_PAD_L;
    doc.font('Medium').fontSize(9).fillColor('#1a1a1a')
       .text('Automated analysis only', x, doc.y, {
         continued: true, link: null, underline: false, oblique: false, width: DISCL_TEXT_W,
       });
    doc.font('Regular')
       .text(` — ${shortDisclaimer}`, {
         continued: false, link: null, underline: false, oblique: false,
       });
  });
  disclStruct.end();
  doc.y = disclTop + DISCL_H + 12;

  // ── Summary table ─────────────────────────────────────────────────────────
  doc.fillColor('#000000');
  addHeading(doc, 2, 'Summary', { font: 'Medium', fontSize: 14 });
  doc.moveDown(0.3);
  doc.table({
    structParent: doc,
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
    doc.fillColor('#000000');

    // Heading + preview
    addHeading(doc, 2, entry.filename, { font: 'Medium', fontSize: 14 });
    doc.moveDown(0.3);
    if (entry.previewDataUrl) {
      addFigure(doc, entry.previewDataUrl, `Preview of ${entry.filename}`, { fit: [PAGE_W, 480] });
    }

    // Result line — bold "Result:", coloured verdict word, plain detail
    const vs = entry.report.flag
      ? 'FAIL'
      : (entry.report.verdict === 'PASS' ? 'PASS' : 'NO TEXT');
    const vsColor = { pass: '#14532d', fail: '#7f1d1d', warn: '#663a00' }[statusStyle(vs)] || '#4b5563';
    doc.fillColor('#000000');
    writeParagraph(doc, [
      { text: 'Result: ',              font: 'Medium',  fontSize: 10, color: '#000000' },
      { text: vs,                      font: 'Medium',  fontSize: 8,  color: vsColor },
      { text: ` — ${entry.report.detail}`, font: 'Regular', fontSize: 10, color: '#000000' },
    ]);

    // CVD simulations — 2-column grid matching the reference layout
    if (entry.cbSimAssets && entry.cbSimAssets.length) {
      doc.fillColor('#000000');
      addHeading(doc, 3, 'Colour-blindness simulation', { font: 'Medium', fontSize: 12 });
      doc.moveDown(0.3);

      const CVD_COLS    = 2;
      const CVD_GAP     = 15;
      const CVD_COL_W   = Math.floor((PAGE_W - CVD_GAP) / CVD_COLS);  // ~250pt per column
      const CVD_IMG     = CVD_COL_W - 5;   // 245pt: max image dimension per cell
      const CVD_LBL_H   = 20;              // height reserved for label text below image
      const CVD_ROW_GAP = 12;              // gap between grid rows

      for (let row = 0; row < Math.ceil(entry.cbSimAssets.length / CVD_COLS); row++) {
        const rowTop = doc.y;

        // Images row
        for (let col = 0; col < CVD_COLS; col++) {
          const idx   = row * CVD_COLS + col;
          const asset = entry.cbSimAssets[idx];
          if (!asset) continue;

          const imgX = doc.page.margins.left + col * (CVD_COL_W + CVD_GAP);
          // addFigure passes all options to doc.image(), so x/y/fit work fine
          addFigure(doc, asset.dataUrl,
            `${asset.label} colour vision simulation — ${asset.note}`,
            { fit: [CVD_IMG, CVD_IMG], x: imgX, y: rowTop }
          );
        }

        // Labels row — rendered at fixed y below the image row
        const labelY = rowTop + CVD_IMG + 4;
        for (let col = 0; col < CVD_COLS; col++) {
          const idx   = row * CVD_COLS + col;
          const asset = entry.cbSimAssets[idx];
          if (!asset) continue;

          const lblX      = doc.page.margins.left + col * (CVD_COL_W + CVD_GAP);
          const lblStruct = doc.struct('P');
          doc.addStructure(lblStruct);
          lblStruct.add(() => {
            doc.font('Regular').fontSize(8).fillColor('#4b5563')
               .text(`${asset.label} — ${asset.note}`, lblX, labelY, {
                 continued: false, link: null, underline: false, oblique: true, width: CVD_COL_W,
               });
          });
          lblStruct.end();
        }

        doc.y  = labelY + CVD_LBL_H + CVD_ROW_GAP;
        doc._x = doc.page.margins.left;  // reset cursor after absolute-positioned grid labels
      }
      doc.moveDown(0.5);
    }

    // Contrast results + per-pair blocks
    if (entry.report.hasText && entry.report.colourPairs && entry.report.colourPairs.length) {
      doc.fillColor('#000000');
      addHeading(doc, 3, 'Contrast results', { font: 'Medium', fontSize: 12 });
      doc.moveDown(0.3);
      addParagraph(doc, wcagLine(entry.report),     { fontSize: 10, fillColor: '#374151', oblique: true });
      addParagraph(doc, advancedLine(entry.report), { fontSize: 10, fillColor: '#374151', oblique: true });

      const assetMap = new Map((entry.pairAssets || []).map((a) => [a.pair, a]));

      for (const pair of entry.report.colourPairs) {
        const asset = assetMap.get(pair);
        doc.moveDown(0.5);
        doc.fillColor('#000000');

        // 1.9.1 Swatch (decorative) + badge strip + hex pair label
        if (asset?.swatchDataUrl) {
          const swatchY = doc.y;
          artifact(doc, (d) => {
            d.image(asset.swatchDataUrl, doc.page.margins.left, swatchY, { width: 48, height: 14 });
          });
          doc.y = swatchY + 18;
        }
        const badges = pairBadges(pair)
          .map((b) => `${b.short} ${statusWord(b.status)}`)
          .join('    ');
        addParagraph(doc,
          `${badges}    Background ${pair.bgHex}  ·  Foreground ${pair.fgHex}`,
          { font: 'Regular', fontSize: 10, fillColor: '#000000' }
        );

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
              { text: c.label, color: '#061528', link: checkInfoUrl(c.id), underline: true },
              { text: c.value || '—' },
              pillCell(c.status),
              { text: c.detail, oblique: true },
            ]);
          }
        }

        doc.moveDown(0.3);
        doc.table({
          structParent: doc,
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
          addFigure(doc, asset.clipDataUrl,
            `Cropped region showing where ${pair.bgHex} background with `
            + `${pair.fgHex} foreground text appears in the image`,
            { width: 360 }
          );
        }
      }
    }
  });

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.moveDown();
  doc.fillColor('#000000');
  addParagraph(doc, THRESHOLDS_FOOTER, { fontSize: 9, fillColor: '#4b5563', oblique: true });
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
