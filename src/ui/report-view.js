// DOM renderer for the report (summary + per-image cards).
// Mirrors the markdown reference report.md layout.

import { makeSwatch, makeClip, makePreview, makeThumb, THRESHOLDS_FOOTER } from '../lib/swatch.js';

export function renderResultsHeader(headerEl, timestamp) {
  headerEl.innerHTML = '';
  const h2 = document.createElement('h2');
  h2.textContent = 'Image Colour Contrast Audit';
  const time = document.createElement('p');
  time.className = 'timestamp';
  time.textContent = timestamp;
  headerEl.append(h2, time);
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

  const table = document.createElement('table');
  table.className = 'summary-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th></th>
        <th>Image</th>
        <th>Result</th>
        <th>Worst ratio</th>
        <th>Failing pairs</th>
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
  summaryEl.append(table);
}

function verdictBadge(verdict) {
  if (verdict === 'PASS') return '✓ PASS';
  if (verdict === 'FAIL') return '✗ FAIL';
  return '— NO TEXT';
}

// Renders a single per-image card and appends it to `cardsEl`.
// Returns the rendered card element so callers can scroll-to or replace.
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

    const table = document.createElement('table');
    table.className = 'pair-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Swatch (bg · fg)</th>
          <th>Foreground</th>
          <th>Background</th>
          <th>Ratio</th>
          <th>AA</th>
          <th>AAA</th>
          <th>Check</th>
          <th>Example words</th>
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
      const fgCell = document.createElement('td');
      fgCell.innerHTML = `<code>${p.fgHex}</code>`;
      const bgCell = document.createElement('td');
      bgCell.innerHTML = `<code>${p.bgHex}</code>`;
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
      tr.append(swatchCell, fgCell, bgCell, ratioCell, aaCell, aaaCell, checkCell, exCell);
      tbody.append(tr);

      entry.pairAssets.push({
        pair: p,
        swatchDataUrl: swatch.dataUrl
      });
    }
    card.append(table);

    const failing = report.colourPairs.filter((p) => !p.pass);
    if (failing.length) {
      const fh = document.createElement('h4');
      fh.textContent = 'Failing regions';
      card.append(fh);
      for (const p of failing) {
        const heading = document.createElement('p');
        heading.className = 'clip-heading';
        heading.innerHTML = `<code>${p.fgHex}</code> on <code>${p.bgHex}</code> — ${p.contrast.toFixed(2)}:1`;
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
