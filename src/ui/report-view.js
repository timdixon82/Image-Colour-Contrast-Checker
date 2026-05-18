// DOM renderer for the report (summary + per-image cards).

import { makeSwatch, makeClip, makePreview, makeThumb, THRESHOLDS_FOOTER, DISCLAIMER_TEXT } from '../lib/swatch.js';

export function renderResultsHeader(headerEl, timestamp) {
  headerEl.innerHTML = '';
  const h2 = document.createElement('h2');
  h2.textContent = 'Image Colour Contrast Audit';
  const time = document.createElement('p');
  time.className = 'timestamp';
  time.textContent = timestamp;

  const disc = document.createElement('div');
  disc.className = 'results-disclaimer';
  disc.setAttribute('role', 'note');
  disc.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
    + '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>'
    + '<line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
    + `<span>${DISCLAIMER_TEXT}</span>`;

  headerEl.append(h2, time, disc);
}

export function renderThresholdsFooter(footerEl) {
  footerEl.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'thresholds-line';
  p.textContent = THRESHOLDS_FOOTER;
  footerEl.append(p);
}

export function renderSummary(summaryEl, items) {
  summaryEl.innerHTML = '';
  if (!items.length) return;
  const h2 = document.createElement('h2');
  h2.textContent = 'Summary';
  summaryEl.append(h2);

  const scroll = document.createElement('div');
  scroll.className = 'table-scroll';

  const table = document.createElement('table');
  table.className = 'summary-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th scope="col"></th>
        <th scope="col">Image</th>
        <th scope="col">Result</th>
        <th scope="col">Worst ratio</th>
        <th scope="col">Failing pairs</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');
  for (const item of items) {
    const tr = document.createElement('tr');
    const thumbCell = document.createElement('td');
    if (item.thumb) thumbCell.append(item.thumb);
    const nameCell = document.createElement('td');
    const anchor = document.createElement('a');
    anchor.href = `#card-${item.id}`;
    anchor.textContent = item.filename;
    nameCell.append(anchor);
    const resultCell = document.createElement('td');
    resultCell.className = `verdict verdict-${item.verdict.toLowerCase()}`;
    resultCell.textContent = verdictBadge(item.verdict);
    const ratioCell = document.createElement('td');
    ratioCell.textContent = item.worstRatio != null ? `${item.worstRatio.toFixed(2)}:1` : '—';
    const failCell = document.createElement('td');
    failCell.textContent = item.failCount != null ? String(item.failCount) : '—';
    tr.append(thumbCell, nameCell, resultCell, ratioCell, failCell);
    tbody.append(tr);
  }
  scroll.append(table);
  summaryEl.append(scroll);
}

function verdictBadge(verdict) {
  if (verdict === 'PASS') return '✓ PASS';
  if (verdict === 'FAIL') return '✗ FAIL';
  return '— NO TEXT';
}

export function renderImageCard(cardsEl, entry) {
  const { id, filename, sourceCanvas, report } = entry;
  const card = document.createElement('article');
  card.className = `image-card image-card-${report.flag ? 'fail' : (report.verdict === 'PASS' ? 'pass' : 'no-text')}`;
  card.id = `card-${id}`;

  const title = document.createElement('h3');
  title.className = 'image-card-title';
  title.textContent = filename;
  card.append(title);

  const preview = makePreview(sourceCanvas, 600);
  preview.canvas.className = 'image-card-preview';
  preview.canvas.setAttribute('alt', `Preview of ${filename}`);
  card.append(preview.canvas);
  entry.previewDataUrl = preview.dataUrl;

  const resultLine = document.createElement('p');
  resultLine.className = 'image-card-result';
  resultLine.innerHTML = `<strong>Result:</strong> ${verdictBadge(report.verdict)} — ${escapeHtml(report.detail)}`;
  card.append(resultLine);

  if (report.hasText && report.colourPairs.length) {
    const h4 = document.createElement('h4');
    h4.textContent = 'Colour combinations detected';
    card.append(h4);

    const scroll = document.createElement('div');
    scroll.className = 'table-scroll';

    const table = document.createElement('table');
    table.className = 'pair-table';
    // Background listed before Foreground — bg is the base context for reading
    table.innerHTML = `
      <thead>
        <tr>
          <th scope="col">Swatch</th>
          <th scope="col">Background</th>
          <th scope="col">Foreground</th>
          <th scope="col">Ratio</th>
          <th scope="col">AA</th>
          <th scope="col">AAA</th>
          <th scope="col">Check</th>
          <th scope="col">Example words</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    entry.pairAssets = [];
    for (const p of report.colourPairs) {
      const swatch = makeSwatch(p.fgHex, p.bgHex);
      const tr = document.createElement('tr');
      const swatchCell = document.createElement('td');
      swatchCell.append(swatch.canvas);
      // Background first, then Foreground
      const bgCell = document.createElement('td');
      bgCell.innerHTML = `<code>${p.bgHex}</code>`;
      const fgCell = document.createElement('td');
      fgCell.innerHTML = `<code>${p.fgHex}</code>`;
      const ratioCell = document.createElement('td');
      ratioCell.textContent = `${p.contrast.toFixed(2)}:1`;
      const aaCell = document.createElement('td');
      aaCell.className = p.pass ? 'pass' : 'fail';
      aaCell.textContent = p.pass ? '✓ Pass' : '✗ Fail';
      const aaaCell = document.createElement('td');
      aaaCell.className = p.passAaa ? 'pass' : 'fail';
      aaaCell.textContent = p.passAaa ? '✓ Pass' : '✗ Fail';
      const checkCell = document.createElement('td');
      const a = document.createElement('a');
      a.href = `https://webaim.org/resources/contrastchecker/?fcolor=${p.fgHex.slice(1)}&bcolor=${p.bgHex.slice(1)}`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = 'WebAIM ↗';
      checkCell.append(a);
      const exCell = document.createElement('td');
      exCell.className = 'examples';
      exCell.textContent = p.examples.map((e) => `"${e}"`).join(', ');
      tr.append(swatchCell, bgCell, fgCell, ratioCell, aaCell, aaaCell, checkCell, exCell);
      tbody.append(tr);

      entry.pairAssets.push({
        pair: p,
        swatchDataUrl: swatch.dataUrl
      });
    }
    scroll.append(table);
    card.append(scroll);

    const failing = report.colourPairs.filter((p) => !p.pass);
    if (failing.length) {
      const fh = document.createElement('h4');
      fh.textContent = 'Failing regions';
      card.append(fh);
      for (const p of failing) {
        const heading = document.createElement('p');
        heading.className = 'clip-heading';
        heading.innerHTML = `<code>${p.bgHex}</code> background / <code>${p.fgHex}</code> foreground — ${p.contrast.toFixed(2)}:1`;
        card.append(heading);
        const clip = makeClip(sourceCanvas, p.bboxes);
        clip.canvas.className = 'clip-canvas';
        card.append(clip.canvas);
        const asset = entry.pairAssets.find((a) => a.pair === p);
        if (asset) asset.clipDataUrl = clip.dataUrl;
      }
    }
  }

  cardsEl.append(card);
  return card;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export { verdictBadge };
