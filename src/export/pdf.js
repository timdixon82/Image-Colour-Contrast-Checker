/**
 * PDF export via pdfmake.
 * Accepts an array of AnalysedEntry (see core/schema.js) plus a timestamp
 * string. Nothing from the app's internal state leaks in here.
 *
 * @module export/pdf
 */

import {
  APP_NAME, SITE_URL, THRESHOLDS_FOOTER, DISCLAIMER_TEXT, checkInfoUrl,
  VESTIBULAR_CHECKER_URL
} from './strings.js';
import { pairChecks, wcagLine, advancedLine, pairBadges, statusWord, CHECK_GROUPS } from './checks.js';

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

/** Map a check status to a pdfmake style name. */
function statusStyle(status) {
  if (status === 'PASS' || status === 'SAFE') return 'pass';
  if (status === 'FAIL' || status === 'HIGH') return 'fail';
  return 'warn'; // WARN, HARSH
}

/**
 * Whole-image colour-blindness simulations, two per row.
 * Returns a single unbreakable stack so the heading and image grid stay
 * together on the same page. CVD images are capped at fit:[220,150] so
 * the four-image group fits reliably on a single A4 page.
 */
function cbSimBlock(cbSimAssets) {
  if (!cbSimAssets.length) return [];
  const cell = (a) => a
    ? { stack: [
        { image: a.dataUrl, fit: [220, 150] },
        { text: `${a.label} — ${a.note}`, fontSize: 8, color: '#4b5563', margin: [0, 3, 0, 6] }
      ] }
    : {};
  const rows = [];
  for (let i = 0; i < cbSimAssets.length; i += 2) {
    rows.push([cell(cbSimAssets[i]), cell(cbSimAssets[i + 1])]);
  }
  return [{
    stack: [
      { text: 'Colour-blindness simulation', style: 'h3', margin: [0, 8, 0, 4] },
      { table: { widths: ['*', '*'], body: rows }, layout: 'noBorders', margin: [0, 0, 0, 10] }
    ],
    unbreakable: true
  }];
}

/**
 * Build a solid-fill pill cell for a pdfmake table cell.
 * Uses a single-cell table with fillColor so the pill has a visible
 * background in print. All colour pairings are WCAG 2.2 AAA (7:1 minimum).
 */
function pillCell(status) {
  const PILL_COLOURS = {
    pass:    { text: '#14532d', fill: '#dcfce7' }, /* 9.1:1 AAA */
    fail:    { text: '#7f1d1d', fill: '#fee2e2' }, /* 10:1 AAA */
    warn:    { text: '#663a00', fill: '#fef3c7' }, /* 8.7:1 AAA */
    neutral: { text: '#4b5563', fill: '#f0f2f5' }  /* 7.6:1 AAA */
  };
  const key  = statusStyle(status);
  const pair = PILL_COLOURS[key] || PILL_COLOURS.neutral;
  return {
    table: {
      widths: ['auto'],
      body: [[{
        text: status,
        bold: true,
        color: pair.text,
        fillColor: pair.fill,
        margin: [6, 2, 6, 2],
        fontSize: 8
      }]]
    },
    layout: 'noBorders'
  };
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
      { text: 'WebAIM', link: webaim, style: 'link' },
      { text: '   ' },
      { text: 'Vestibular Accessible Design Checker', link: VESTIBULAR_CHECKER_URL, style: 'link' }
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
        { text: c.label, link: checkInfoUrl(c.id), style: 'link' },
        c.value || '—',
        pillCell(c.status),
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

  // ── Branded header block + title lines (unbreakable: prevents timestamp orphan) ──
  content.push({
    stack: [
      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              {
                text: [
                  { text: 'Image Colour ',    color: '#ffffff', fontSize: 18, bold: true },
                  { text: 'Contrast Checker', color: '#FF7C00', fontSize: 18, bold: true }
                ]
              },
              {
                // Tagline line: sky blue, 87.5% of body font size (10pt × 0.875 ≈ 8.75pt)
                text: 'Drop in images for WCAG 2.2 AA / AAA compliance and advanced perceptual checks. Runs entirely in your browser — nothing is uploaded.',
                color: '#63D2FF',
                fontSize: 8.75,
                margin: [0, 4, 0, 0]
              }
            ],
            fillColor: '#061528',
            margin: [16, 14, 16, 14]
          }]]
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 12]
      },
      { text: 'Audit Report', style: 'h1', margin: [0, 0, 0, 2] },
      { text: `Generated ${timestamp}`, style: 'timestamp', margin: [0, 0, 0, 4] },
      {
        text: [
          { text: 'Generated by ', style: 'timestamp' },
          { text: APP_NAME, link: SITE_URL, style: 'link', fontSize: 9 }
        ],
        margin: [0, 0, 0, 10]
      }
    ],
    unbreakable: true
  });

  // ── Disclaimer — brand-adjacent amber fill, near-black text (#1a1a1a, 13.5:1 AAA) ──
  content.push({
    table: {
      widths: ['*'],
      body: [[{
        text: [
          { text: 'Automated analysis only — ', bold: true },
          { text: DISCLAIMER_TEXT.replace('This report is generated automatically to help speed up accessibility review. ', '') }
        ],
        fillColor: '#fef3c7', /* --warn-bg light mode token */
        color: '#1a1a1a',    /* near-black, 13.5:1 on #fef3c7 AAA */
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
    const verdictStatus = e.report.flag ? 'FAIL' : (e.report.verdict === 'PASS' ? 'PASS' : 'NO TEXT');
    summaryBody.push([
      e.filename,
      pillCell(verdictStatus)
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

    // Unbreakable: per-image H2 heading plus preview image — prevents the heading
    // appearing at the bottom of a page with the image on the next.
    const headingAndPreview = [
      { text: filename, style: 'h2', pageBreak: 'before' }
    ];
    if (previewDataUrl) {
      headingAndPreview.push({ image: previewDataUrl, width: 420, margin: [0, 6, 0, 8] });
    }
    content.push({ stack: headingAndPreview, unbreakable: true });

    const verdictStatus = report.flag ? 'FAIL' : (report.verdict === 'PASS' ? 'PASS' : 'NO TEXT');

    if (report.hasText && report.colourPairs.length) {
      // Unbreakable: result line + WCAG/Advanced summary + Tas link — approx 80pt, fits any page.
      content.push({
        stack: [
          {
            columns: [
              { text: 'Result: ', bold: true, width: 'auto' },
              { width: 'auto', ...pillCell(verdictStatus) },
              { text: ` — ${report.detail}`, margin: [4, 2, 0, 0] }
            ],
            margin: [0, 0, 0, 8]
          },
          // Unbreakable: contrast results H3 + WCAG/Advanced summary
          {
            stack: [
              { text: 'Contrast results', style: 'h3', margin: [0, 8, 0, 2] },
              { text: wcagLine(report), style: 'examples', margin: [0, 0, 0, 1] },
              { text: advancedLine(report), style: 'examples', margin: [0, 0, 0, 4] }
            ],
            unbreakable: true
          }
        ],
        unbreakable: true
      });

      const assetByPair = new Map(pairAssets.map((a) => [a.pair, a]));
      for (const p of report.colourPairs) {
        // Unbreakable: each pairBlock stays together — prevents header orphaning.
        content.push({ stack: pairBlock(p, assetByPair.get(p)), unbreakable: true });
      }
    } else {
      // No text found — show result line only.
      content.push({
        columns: [
          { text: 'Result: ', bold: true, width: 'auto' },
          { width: 'auto', ...pillCell(verdictStatus) },
          { text: ` — ${report.detail}`, margin: [4, 2, 0, 0] }
        ],
        margin: [0, 0, 0, 12]
      });
    }

    content.push(...cbSimBlock(cbSimAssets));
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
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.4 },
    pageMargins: [40, 50, 40, 50],
    styles: {
      h1:          { fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
      h2:          { fontSize: 14, bold: true, margin: [0, 12, 0, 6] },
      h3:          { fontSize: 12, bold: true },
      th:          { bold: true, fillColor: '#f3f4f6' },
      /* checkGroup: #1a1a1a on #e5e7eb — approx 13.8:1 AAA (was #374151, 6.1:1 AA only) */
      checkGroup:  { bold: true, fillColor: '#e5e7eb', fontSize: 8, color: '#1a1a1a' },
      pass:        { color: '#14532d', bold: true }, /* used in pairBadges inline text */
      fail:        { color: '#7f1d1d', bold: true },
      warn:        { color: '#663a00', bold: true },
      neutral:     { color: '#4b5563' },
      timestamp:   { fontSize: 9, color: '#4b5563' },
      examples:    { italics: true, color: '#374151' },
      link:        { color: '#061528', decoration: 'underline' }, /* Navy on white 18.33:1 AAA */
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
