// PDF export via pdfmake. Produces a multi-page document with selectable text.

import { THRESHOLDS_FOOTER, sourceDataUrl } from '../lib/swatch.js';

let pdfMakePromise = null;

async function loadPdfMake() {
  if (pdfMakePromise) return pdfMakePromise;
  pdfMakePromise = (async () => {
    const pdfMake = (await import('pdfmake/build/pdfmake.js')).default;
    const fonts   = (await import('pdfmake/build/vfs_fonts.js')).default;
    // pdfmake vfs_fonts ships in two shapes depending on version.
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

function buildDocDefinition(entries, timestamp) {
  const content = [];
  content.push({ text: 'Image Colour Contrast Audit', style: 'h1' });
  content.push({ text: `Generated ${timestamp}`, style: 'timestamp', margin: [0, 0, 0, 12] });

  // Summary table.
  content.push({ text: 'Summary', style: 'h2', margin: [0, 6, 0, 6] });
  const summaryBody = [
    [{ text: 'Image', style: 'th' }, { text: 'Result', style: 'th' }]
  ];
  for (const e of entries) {
    summaryBody.push([
      e.filename,
      { text: verdictLabel(e.report.verdict), style: e.report.flag ? 'fail' : (e.report.verdict === 'PASS' ? 'pass' : 'neutral') }
    ]);
  }
  content.push({
    table: { headerRows: 1, widths: ['*', 'auto'], body: summaryBody },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 12]
  });

  entries.forEach((entry, idx) => {
    const { filename, sourceCanvas, report } = entry;
    content.push({ text: filename, style: 'h2', pageBreak: 'before' });

    content.push({
      image: sourceDataUrl(sourceCanvas),
      width: 420,
      margin: [0, 6, 0, 8]
    });

    content.push({
      text: [
        { text: 'Result: ', bold: true },
        { text: verdictLabel(report.verdict) + ' — ', style: report.flag ? 'fail' : (report.verdict === 'PASS' ? 'pass' : 'neutral') },
        report.detail
      ],
      margin: [0, 0, 0, 12]
    });

    if (report.hasText && report.colourPairs.length) {
      content.push({ text: 'Colour combinations detected', style: 'h3', margin: [0, 8, 0, 4] });

      const assetByPair = new Map();
      for (const a of entry.pairAssets || []) assetByPair.set(a.pair, a);

      const body = [[
        { text: 'Swatch',      style: 'th' },
        { text: 'Foreground',  style: 'th' },
        { text: 'Background',  style: 'th' },
        { text: 'Ratio',       style: 'th' },
        { text: 'AA',          style: 'th' },
        { text: 'AAA',         style: 'th' },
        { text: 'Check',       style: 'th' },
        { text: 'Examples',    style: 'th' }
      ]];
      for (const p of report.colourPairs) {
        const asset = assetByPair.get(p);
        const webaim = `https://webaim.org/resources/contrastchecker/?fcolor=${p.fgHex.slice(1)}&bcolor=${p.bgHex.slice(1)}`;
        body.push([
          asset ? { image: asset.swatchDataUrl, width: 60, height: 15 } : '',
          p.fgHex,
          p.bgHex,
          `${p.contrast.toFixed(2)}:1`,
          { text: p.pass ? '✓' : '✗', style: p.pass ? 'pass' : 'fail' },
          { text: p.passAaa ? '✓' : '✗', style: p.passAaa ? 'pass' : 'fail' },
          { text: 'WebAIM ↗', link: webaim, style: 'link' },
          { text: p.examples.map((e) => `"${e}"`).join(', '), style: 'examples' }
        ]);
      }
      content.push({
        table: { headerRows: 1, widths: [60, 'auto', 'auto', 'auto', 20, 20, 'auto', '*'], body },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 10]
      });

      const failing = report.colourPairs.filter((p) => !p.pass);
      if (failing.length) {
        content.push({ text: 'Failing regions', style: 'h3', margin: [0, 8, 0, 4] });
        for (const p of failing) {
          const asset = assetByPair.get(p);
          content.push({
            text: `${p.fgHex} on ${p.bgHex} — ${p.contrast.toFixed(2)}:1`,
            style: 'clipHeading',
            margin: [0, 6, 0, 4]
          });
          if (asset?.clipDataUrl) {
            content.push({
              image: asset.clipDataUrl,
              width: 420,
              margin: [0, 0, 0, 8]
            });
          }
        }
      }
    }
  });

  content.push({
    text: THRESHOLDS_FOOTER,
    style: 'footer',
    italics: true,
    margin: [0, 16, 0, 0]
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
      pass:        { color: '#15803d', bold: true },
      fail:        { color: '#dc2626', bold: true },
      neutral:     { color: '#6b7280' },
      timestamp:   { fontSize: 9, color: '#6b7280' },
      examples:    { italics: true, color: '#374151' },
      link:        { color: '#1d4ed8', decoration: 'underline' },
      clipHeading: { bold: true },
      footer:      { fontSize: 9, color: '#6b7280' }
    }
  };
}

export async function downloadPdf(entries, timestamp, filename) {
  const pdfMake = await loadPdfMake();
  const docDef = buildDocDefinition(entries, timestamp);
  pdfMake.createPdf(docDef).download(filename);
}
