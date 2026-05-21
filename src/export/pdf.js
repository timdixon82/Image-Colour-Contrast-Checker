/**
 * PDF export via pdfmake.
 * Accepts an array of AnalysedEntry (see core/schema.js) plus a timestamp
 * string. Nothing from the app's internal state leaks in here.
 *
 * @module export/pdf
 */

import { APP_NAME, SITE_URL, THRESHOLDS_FOOTER, DISCLAIMER_TEXT, METHODOLOGY_URL } from './strings.js';
import { pairChecks, overallLine, pairBadges, statusWord, CHECK_GROUPS } from './checks.js';

let pdfMakePromise = null;

async function loadPdfMake() {
  if (pdfMakePromise) return pdfMakePromise;
  pdfMakePromise = (async () => {
    const pdfMake = (await import('pdfmake/build/pdfmake.js')).default;
    const fonts   = (await import('pdfmake/build/vfs_fonts.js')).default;
    pdfMake.vfs = fonts.vfs ?? fonts.pdfMake?.vfs ?? fonts;
    return pdfMake;
  })();
  return pdfMakePromise;
}

function verdictLabel(verdict) {
  if (verdict === 'PASS') return '✓ PASS';
  if (verdict === 'FAIL') return '✗ FAIL';
  return '— NO TEXT';
}

/** Map a check status to a pdfmake style name. */
function statusStyle(status) {
  if (status === 'PASS' || status === 'SAFE') return 'pass';
  if (status === 'FAIL' || status === 'HIGH') return 'fail';
  return 'warn'; // WARN, HARSH
}

/** Whole-image colour-blindness simulations, two per row. */
function cbSimBlock(cbSimAssets) {
  if (!cbSimAssets.length) return [];
  const cell = (a) => a
    ? { stack: [
        { image: a.dataUrl, width: 232 },
        { text: `${a.label} — ${a.note}`, fontSize: 8, color: '#4b5563', margin: [0, 3, 0, 6] }
      ] }
    : {};
  const rows = [];
  for (let i = 0; i < cbSimAssets.length; i += 2) {
    rows.push([cell(cbSimAssets[i]), cell(cbSimAssets[i + 1])]);
  }
  return [
    { text: 'Colour-blindness simulation', style: 'h3', margin: [0, 8, 0, 4] },
    { table: { widths: ['*', '*'], body: rows }, layout: 'noBorders', margin: [0, 0, 0, 10] }
  ];
}

/** One colour combination: header line, every check, and the cropped region. */
function pairBlock(p, asset) {
  const webaim = `https://webaim.org/resources/contrastchecker/?fcolor=${p.fgHex.slice(1)}&bcolor=${p.bgHex.slice(1)}`;
  const out = [];

  const badgeText = pairBadges(p).flatMap((b) => [
    { text: `${b.short} ${statusWord(b.status)}`, style: statusStyle(b.status), bold: true },
    { text: '    ' }
  ]);

  out.push({
    columns: [
      asset?.swatchDataUrl
        ? { image: asset.swatchDataUrl, width: 48, height: 14, margin: [0, 2, 8, 0] }
        : { text: '', width: 1 },
      {
        width: '*',
        text: [
          ...badgeText,
          { text: `Background ${p.bgHex}  ·  Foreground ${p.fgHex}`, bold: true }
        ]
      }
    ],
    margin: [0, 10, 0, 2]
  });

  out.push({
    text: [
      p.examples.length ? { text: p.examples.map((e) => `"${e}"`).join(', ') + '   ', style: 'examples' } : '',
      { text: 'WebAIM ↗', link: webaim, style: 'link' }
    ],
    fontSize: 9,
    margin: [0, 0, 0, 4]
  });

  const body = [[
    { text: 'Check',         style: 'th' },
    { text: 'Value',         style: 'th' },
    { text: 'Status',        style: 'th' },
    { text: 'What it means', style: 'th' }
  ]];
  const checks = pairChecks(p);
  for (const grp of CHECK_GROUPS) {
    body.push([{ text: grp.label, colSpan: 4, style: 'checkGroup' }, {}, {}, {}]);
    for (const c of checks.filter((check) => check.group === grp.id)) {
      body.push([
        { text: c.label, link: `${METHODOLOGY_URL}#${c.id}`, style: 'link' },
        c.value || '—',
        { text: c.status, style: statusStyle(c.status) },
        { text: c.detail, style: 'examples' }
      ]);
    }
  }
  out.push({
    table: { headerRows: 1, widths: ['auto', 'auto', 'auto', '*'], body },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 4]
  });

  if (asset?.clipDataUrl) {
    out.push({ text: 'Where this combination appears:', style: 'examples', margin: [0, 2, 0, 3] });
    out.push({ image: asset.clipDataUrl, width: 360, margin: [0, 0, 0, 6] });
  }
  return out;
}

/**
 * Build the pdfmake document definition from a batch of analysed entries.
 *
 * @param {import('../core/schema.js').AnalysedEntry[]} entries
 * @param {string} timestamp
 * @returns {Object}  pdfmake docDefinition
 */
function buildDocDefinition(entries, timestamp) {
  const content = [];

  // ── Branded header block ────────────────────────────────────────────────
  content.push({
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          {
            text: [
              { text: 'Image Colour ',  color: '#ffffff', fontSize: 18, bold: true },
              { text: 'Contrast Checker', color: '#FF7C00', fontSize: 18, bold: true }
            ]
          },
          { text: 'WCAG 2.2 Colour Contrast Audit', color: '#63D2FF', fontSize: 10, margin: [0, 4, 0, 0] }
        ],
        fillColor: '#061528',
        margin: [16, 14, 16, 14]
      }]]
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 16]
  });

  content.push({ text: 'Audit Report', style: 'h1', margin: [0, 0, 0, 2] });
  content.push({ text: `Generated ${timestamp}`, style: 'timestamp', margin: [0, 0, 0, 4] });
  content.push({
    text: [
      { text: 'Generated by ', style: 'timestamp' },
      { text: APP_NAME, link: SITE_URL, style: 'link', fontSize: 9 }
    ],
    margin: [0, 0, 0, 10]
  });

  // ── Disclaimer ──────────────────────────────────────────────────────────
  content.push({
    table: {
      widths: ['*'],
      body: [[{
        text: [
          { text: 'Automated analysis only — ', bold: true },
          { text: DISCLAIMER_TEXT.replace('This report is generated automatically to help speed up accessibility review. ', '') }
        ],
        fillColor: '#fff7ed',
        color: '#7c2d12',
        margin: [10, 8, 10, 8],
        fontSize: 9
      }]]
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 14]
  });

  // ── Summary table ────────────────────────────────────────────────────────
  content.push({ text: 'Summary', style: 'h2', margin: [0, 6, 0, 6] });
  const summaryBody = [
    [{ text: 'Image', style: 'th' }, { text: 'Result', style: 'th' }]
  ];
  for (const e of entries) {
    summaryBody.push([
      e.filename,
      {
        text:  verdictLabel(e.report.verdict),
        style: e.report.flag ? 'fail' : (e.report.verdict === 'PASS' ? 'pass' : 'neutral')
      }
    ]);
  }
  content.push({
    table: { headerRows: 1, widths: ['*', 'auto'], body: summaryBody },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 12]
  });

  // ── Per-image detail ─────────────────────────────────────────────────────
  for (const entry of entries) {
    const { filename, report, previewDataUrl, pairAssets = [], cbSimAssets = [] } = entry;
    content.push({ text: filename, style: 'h2', pageBreak: 'before' });

    if (previewDataUrl) {
      content.push({ image: previewDataUrl, width: 420, margin: [0, 6, 0, 8] });
    }

    content.push({
      text: [
        { text: 'Result: ', bold: true },
        { text: verdictLabel(report.verdict) + ' — ', style: report.flag ? 'fail' : (report.verdict === 'PASS' ? 'pass' : 'neutral') },
        report.detail
      ],
      margin: [0, 0, 0, 12]
    });

    content.push(...cbSimBlock(cbSimAssets));

    if (report.hasText && report.colourPairs.length) {
      content.push({ text: 'Contrast results', style: 'h3', margin: [0, 8, 0, 2] });
      content.push({ text: overallLine(report), style: 'examples', margin: [0, 0, 0, 2] });

      const assetByPair = new Map(pairAssets.map((a) => [a.pair, a]));
      for (const p of report.colourPairs) {
        content.push(...pairBlock(p, assetByPair.get(p)));
      }
    }
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  content.push({ text: THRESHOLDS_FOOTER, style: 'footer', italics: true, margin: [0, 16, 0, 4] });
  content.push({
    text: [
      { text: 'Generated by ' },
      { text: APP_NAME, link: SITE_URL, style: 'link' }
    ],
    style: 'footer',
    margin: [0, 4, 0, 0]
  });

  return {
    content,
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.3 },
    pageMargins: [40, 50, 40, 50],
    styles: {
      h1:          { fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
      h2:          { fontSize: 14, bold: true, margin: [0, 12, 0, 6] },
      h3:          { fontSize: 12, bold: true },
      th:          { bold: true, fillColor: '#f3f4f6' },
      checkGroup:  { bold: true, fillColor: '#e5e7eb', fontSize: 8, color: '#374151' },
      pass:        { color: '#14532d', bold: true },
      fail:        { color: '#7f1d1d', bold: true },
      warn:        { color: '#854d0e', bold: true },
      neutral:     { color: '#4b5563' },
      timestamp:   { fontSize: 9, color: '#4b5563' },
      examples:    { italics: true, color: '#374151' },
      link:        { color: '#1d4ed8', decoration: 'underline' },
      footer:      { fontSize: 9, color: '#4b5563' }
    }
  };
}

/**
 * Generate and trigger a download of the PDF report.
 *
 * @param {import('../core/schema.js').AnalysedEntry[]} entries
 * @param {string} timestamp
 * @param {string} filename
 */
export async function downloadPdf(entries, timestamp, filename) {
  const pdfMake = await loadPdfMake();
  pdfMake.createPdf(buildDocDefinition(entries, timestamp)).download(filename);
}
