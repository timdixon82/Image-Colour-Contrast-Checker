/**
 * DOM renderer for the report (summary table + per-image cards).
 * Consumes AnalysedEntry objects (see core/schema.js).
 *
 * @module ui/report-view
 */

import { makeSwatch, makeClip, makePreview, makeThumb, makeCbSim } from '../render/canvas.js';
import { THRESHOLDS_FOOTER, DISCLAIMER_TEXT, CVD_TYPES }            from '../export/strings.js';
import {
  pairChecks, overallLine, advancedStatus, pairBadges,
  statusWord, CHECK_GROUPS, CHECK_INFO
}                                                                   from '../export/checks.js';

export function renderResultsHeader(headerEl, timestamp) {
  headerEl.innerHTML = '';
  const h2 = document.createElement('h2');
  h2.textContent = 'Image Colour Contrast Audit';

  const time = document.createElement('p');
  time.className   = 'timestamp';
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
  p.className   = 'thresholds-line';
  p.textContent = THRESHOLDS_FOOTER;
  footerEl.append(p);
}

/**
 * Render the on-page "What the checks mean" glossary. Each check is a native
 * <details> element with a stable id, so the info links inside the report can
 * jump to it and open it — no new tab, no leaving the page (WCAG 3.2.5).
 *
 * @param {HTMLElement} glossaryEl
 */
export function renderCheckGlossary(glossaryEl) {
  ensureGlossaryNav();
  glossaryEl.innerHTML = '';

  const h2 = document.createElement('h2');
  h2.id = 'glossary-heading';
  h2.textContent = 'What the checks mean';

  const intro = document.createElement('p');
  intro.className = 'glossary-intro';
  intro.textContent =
    'Every colour combination is graded against these checks. Use the ⓘ link '
    + 'beside any check in the report to jump straight to its explanation here.';

  glossaryEl.append(h2, intro);

  for (const grp of CHECK_GROUPS) {
    const h3 = document.createElement('h3');
    h3.className   = 'glossary-group';
    h3.textContent = grp.label;
    glossaryEl.append(h3);

    for (const info of CHECK_INFO.filter((c) => c.group === grp.id)) {
      const det = document.createElement('details');
      det.className = 'glossary-item';
      det.id = `check-info-${info.id}`;

      const sum = document.createElement('summary');
      sum.textContent = info.label;

      const body = document.createElement('p');
      body.textContent = info.summary;

      det.append(sum, body);
      glossaryEl.append(det);
    }
  }

  const more = document.createElement('p');
  more.className = 'glossary-more';
  const link = document.createElement('a');
  link.href        = 'methodology.html';
  link.target      = '_blank';
  link.rel         = 'noopener';
  link.textContent = 'Full methodology ↗';
  more.append(link);
  glossaryEl.append(more);
}

/**
 * @param {HTMLElement} summaryEl
 * @param {Array<{ id:string, filename:string, thumb:HTMLCanvasElement|null, verdict:string, worstRatio:number|null, failCount:number|null }>} items
 */
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

    const nameCell  = document.createElement('td');
    const anchor    = document.createElement('a');
    anchor.href        = `#card-${item.id}`;
    anchor.textContent = item.filename;
    nameCell.append(anchor);

    const resultCell = document.createElement('td');
    resultCell.className   = `verdict verdict-${item.verdict.toLowerCase()}`;
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

/**
 * Render a single per-image card and append it to cardsEl.
 * Also populates entry.previewDataUrl, entry.pairAssets and entry.cbSimAssets
 * so the export modules can consume them without touching the DOM again.
 *
 * @param {HTMLElement} cardsEl
 * @param {Object} entry  App-internal entry augmented with sourceCanvas
 */
export function renderImageCard(cardsEl, entry) {
  const { id, filename, sourceCanvas, report } = entry;

  const card = document.createElement('article');
  card.className = `image-card image-card-${report.flag ? 'fail' : (report.verdict === 'PASS' ? 'pass' : 'no-text')}`;
  card.id = `card-${id}`;

  const title = document.createElement('h3');
  title.className   = 'image-card-title';
  title.textContent = filename;
  card.append(title);

  // Preview image
  const preview = makePreview(sourceCanvas, 600);
  preview.canvas.className = 'image-card-preview';
  preview.canvas.setAttribute('alt', `Preview of ${filename}`);
  card.append(preview.canvas);
  entry.previewDataUrl = preview.dataUrl;

  // Result line
  card.append(buildResultLine(report));

  // Colour-blindness simulation — applies to the whole image, text or not
  renderCbSim(card, entry);

  entry.pairAssets = [];
  if (report.hasText && report.colourPairs.length) {
    renderContrastResults(card, entry);
  }

  cardsEl.append(card);
  return card;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * The card's "Result" line. For images with text it shows the two formal WCAG
 * levels and the rolled-up Advanced-checks verdict as separate badges, so a
 * pass on WCAG AA is never confused with passing the perceptual checks.
 *
 * @param {import('../core/schema.js').ReportData} report
 * @returns {HTMLElement}
 */
function buildResultLine(report) {
  const line = document.createElement('p');
  line.className = 'image-card-result';

  const strong = document.createElement('strong');
  strong.textContent = 'Result:';
  line.append(strong, document.createTextNode(' '));

  if (report.hasText && report.colourPairs.length) {
    const badges = document.createElement('span');
    badges.className = 'card-verdict';
    for (const b of imageBadges(report)) badges.append(badge(b.label, b.status));
    line.append(badges);

    const detail = document.createElement('span');
    detail.className   = 'card-verdict-detail';
    detail.textContent = ` — ${report.detail}`;
    line.append(detail);
  } else {
    line.append(
      document.createTextNode(`${verdictBadge(report.verdict)} — ${report.detail}`)
    );
  }
  return line;
}

/** Image-level roll-up: every pair must pass for the badge to pass. */
function imageBadges(report) {
  const pairs = report.colourPairs;
  const adv   = pairs.map(advancedStatus);
  return [
    { label: 'WCAG AA',        status: pairs.every((p) => p.pass) ? 'PASS' : 'FAIL' },
    { label: 'WCAG AAA',       status: pairs.every((p) => p.passAaa) ? 'PASS' : 'FAIL' },
    {
      label: 'Advanced Checks',
      status: adv.includes('FAIL') ? 'FAIL' : adv.includes('WARN') ? 'WARN' : 'PASS'
    }
  ];
}

/**
 * Append a colour-blindness simulation grid: the source image transformed for
 * each common colour-vision deficiency. Also populates entry.cbSimAssets so
 * the export modules can embed the same images without redrawing.
 *
 * @param {HTMLElement} card
 * @param {Object} entry  Augmented entry with sourceCanvas + filename
 */
function renderCbSim(card, entry) {
  const { sourceCanvas, filename } = entry;

  const heading = document.createElement('h4');
  heading.textContent = 'Colour-blindness simulation';
  card.append(heading);

  const note = document.createElement('p');
  note.className   = 'cb-sim-note';
  note.textContent = 'How this image may appear to viewers with the most common colour-vision deficiencies.';
  card.append(note);

  const grid = document.createElement('div');
  grid.className = 'cb-sim-grid';
  entry.cbSimAssets = [];

  for (const t of CVD_TYPES) {
    const sim = makeCbSim(sourceCanvas, t.key, 600);

    const figure = document.createElement('figure');
    figure.className = 'cb-sim-figure';

    sim.canvas.className = 'cb-sim-canvas';
    sim.canvas.setAttribute('role', 'img');
    sim.canvas.setAttribute('aria-label', `${filename} simulated for ${t.label} (${t.note})`);

    const caption = document.createElement('figcaption');
    caption.className = 'cb-sim-caption';
    caption.innerHTML = `<strong>${escapeHtml(t.label)}</strong><span>${escapeHtml(t.note)}</span>`;

    figure.append(sim.canvas, caption);
    grid.append(figure);

    entry.cbSimAssets.push({ key: t.key, label: t.label, note: t.note, dataUrl: sim.dataUrl });
  }

  card.append(grid);
}

/**
 * Append the unified contrast-results table: one expandable row per colour
 * combination. The collapsed row shows the swatch, the two WCAG badges and the
 * Advanced-checks badge, colours, WebAIM link and detected text; the expanded
 * panel groups every check into WCAG and Advanced sections. Rows stay
 * collapsed until the reader chooses to open them.
 *
 * @param {HTMLElement} card
 * @param {Object} entry
 */
function renderContrastResults(card, entry) {
  const { id, sourceCanvas, report } = entry;
  const pairs = report.colourPairs;

  const heading = document.createElement('h4');
  heading.textContent = 'Contrast results';
  card.append(heading);

  // Overall summary line
  const overall = document.createElement('p');
  overall.className   = 'results-overall';
  overall.textContent = overallLine(report);
  card.append(overall);

  const scroll = document.createElement('div');
  scroll.className = 'table-scroll';

  const table = document.createElement('table');
  table.className = 'results-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th scope="col"><span class="sr-only">Expand</span></th>
        <th scope="col">Swatch</th>
        <th scope="col">Result</th>
        <th scope="col">Background</th>
        <th scope="col">Foreground</th>
        <th scope="col">Check</th>
        <th scope="col">Detected text</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');

  pairs.forEach((p, i) => {
    const swatch = makeSwatch(p.fgHex, p.bgHex);
    const clip   = makeClip(sourceCanvas, p.bboxes);
    entry.pairAssets.push({ pair: p, swatchDataUrl: swatch.dataUrl, clipDataUrl: clip.dataUrl });

    const detailId = `detail-${id}-${i}`;

    // ── Collapsed header row ──
    const hdr = document.createElement('tr');
    hdr.className = `result-row result-row-${p.overall.toLowerCase()}`;

    const toggleCell = document.createElement('td');
    const toggle = document.createElement('button');
    toggle.type      = 'button';
    toggle.className = 'row-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', detailId);
    toggle.innerHTML = '<span class="caret" aria-hidden="true">▸</span>'
      + `<span class="sr-only">Toggle checks for background ${p.bgHex}, foreground ${p.fgHex}</span>`;
    toggleCell.append(toggle);

    swatch.canvas.className = 'swatch-canvas';
    const swatchCell = document.createElement('td');
    swatchCell.append(swatch.canvas);

    const resultCell = document.createElement('td');
    const badges = document.createElement('div');
    badges.className = 'row-badges';
    for (const b of pairBadges(p)) badges.append(badge(b.short, b.status, b.label));
    resultCell.append(badges);

    const bgCell = document.createElement('td');
    bgCell.innerHTML = `<code>${p.bgHex}</code>`;
    const fgCell = document.createElement('td');
    fgCell.innerHTML = `<code>${p.fgHex}</code>`;

    const checkCell = document.createElement('td');
    checkCell.append(webaimLink(p.fgHex, p.bgHex));

    const textCell = document.createElement('td');
    textCell.className   = 'examples';
    textCell.textContent = p.examples.map((e) => `"${e}"`).join(', ');

    hdr.append(toggleCell, swatchCell, resultCell, bgCell, fgCell, checkCell, textCell);

    // ── Expandable detail row ──
    const det = document.createElement('tr');
    det.className = 'result-detail';
    det.id = detailId;
    det.hidden = true;
    const detCell = document.createElement('td');
    detCell.colSpan = 7;
    detCell.append(buildDetailPanel(p, clip.canvas));
    det.append(detCell);

    toggle.addEventListener('click', () => {
      const willOpen = det.hidden;
      det.hidden = !willOpen;
      toggle.setAttribute('aria-expanded', String(willOpen));
      toggle.querySelector('.caret').textContent = willOpen ? '▾' : '▸';
    });

    tbody.append(hdr, det);
  });

  scroll.append(table);
  card.append(scroll);
}

/**
 * Build the expanded detail panel for one colour pair: a table of every check,
 * split into WCAG-compliance and Advanced-check groups, followed by the
 * cropped image region.
 *
 * @param {Object} p             ColourPair (see core/schema.js)
 * @param {HTMLCanvasElement} clipCanvas
 * @returns {HTMLElement}
 */
function buildDetailPanel(p, clipCanvas) {
  const panel = document.createElement('div');
  panel.className = 'detail-panel';

  const scroll = document.createElement('div');
  scroll.className = 'table-scroll';

  const table = document.createElement('table');
  table.className = 'check-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th scope="col">Check</th>
        <th scope="col">Value</th>
        <th scope="col">Status</th>
        <th scope="col">What it means</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');
  const checks = pairChecks(p);

  for (const grp of CHECK_GROUPS) {
    const groupRow = document.createElement('tr');
    groupRow.className = 'check-group-row';
    const gh = document.createElement('th');
    gh.colSpan     = 4;
    gh.scope       = 'colgroup';
    gh.textContent = grp.label;
    groupRow.append(gh);
    tbody.append(groupRow);

    for (const c of checks.filter((check) => check.group === grp.id)) {
      tbody.append(checkRow(c));
    }
  }

  scroll.append(table);
  panel.append(scroll);

  const fig = document.createElement('figure');
  fig.className = 'detail-clip';
  const cap = document.createElement('figcaption');
  cap.textContent = 'Where this combination appears in the image';
  clipCanvas.className = 'detail-clip-canvas';
  fig.append(cap, clipCanvas);
  panel.append(fig);

  return panel;
}

/** One check as a table row in the expanded detail panel. */
function checkRow(c) {
  const tr = document.createElement('tr');
  tr.className = 'check-row';

  const nameCell = document.createElement('th');
  nameCell.scope     = 'row';
  nameCell.className = 'check-name';
  nameCell.append(document.createTextNode(c.label + ' '), infoLink(c.id, c.label));

  const valueCell = document.createElement('td');
  valueCell.className   = 'check-value';
  valueCell.textContent = c.value || '—';

  const statusCell = document.createElement('td');
  statusCell.append(pill(c.status, c.status));

  const meaningCell = document.createElement('td');
  meaningCell.className   = 'check-meaning';
  meaningCell.textContent = c.detail;

  tr.append(nameCell, valueCell, statusCell, meaningCell);
  return tr;
}

function pill(text, status) {
  const span = document.createElement('span');
  span.className   = `pill pill-${pillClass(status)}`;
  span.textContent = text;
  return span;
}

/**
 * A roll-up badge: a pill carrying both a label and its pass/fail word, so the
 * verdict is conveyed by text and not by colour alone (WCAG 1.4.1).
 *
 * @param {string} label       Short visible label, e.g. "AA"
 * @param {string} status      PASS | WARN | FAIL
 * @param {string} [fullLabel] Longer label for the accessible name
 */
function badge(label, status, fullLabel) {
  const word = statusWord(status);
  const span = pill(`${label} ${word}`, status);
  span.classList.add('badge');
  span.setAttribute('aria-label', `${fullLabel || label}: ${word}`);
  return span;
}

function pillClass(status) {
  if (status === 'PASS' || status === 'SAFE') return 'pass';
  if (status === 'FAIL' || status === 'HIGH') return 'fail';
  return 'warn'; // WARN, HARSH
}

function infoLink(checkId, label) {
  const a = document.createElement('a');
  a.className   = 'check-info';
  a.href        = `#check-info-${checkId}`;
  a.textContent = 'ⓘ';
  a.setAttribute('aria-label', `What does the ${label} check mean?`);
  return a;
}

// Register one delegated handler so an info link opens — and moves focus to —
// the matching glossary <details> without navigating away from the report.
let glossaryNavReady = false;
function ensureGlossaryNav() {
  if (glossaryNavReady) return;
  glossaryNavReady = true;
  document.addEventListener('click', (e) => {
    const link = e.target.closest?.('a.check-info');
    if (!link) return;
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return; // glossary not present — fall back to default anchor
    e.preventDefault();
    if (target.tagName === 'DETAILS') target.open = true;
    target.scrollIntoView({ block: 'start' });
    (target.querySelector('summary') || target).focus({ preventScroll: true });
  });
}

function webaimLink(fgHex, bgHex) {
  const a = document.createElement('a');
  a.href        = `https://webaim.org/resources/contrastchecker/?fcolor=${fgHex.slice(1)}&bcolor=${bgHex.slice(1)}`;
  a.target      = '_blank';
  a.rel         = 'noopener noreferrer';
  a.textContent = 'WebAIM ↗';
  return a;
}

function verdictBadge(verdict) {
  if (verdict === 'PASS') return '✓ PASS';
  if (verdict === 'FAIL') return '✗ FAIL';
  return '— NO TEXT';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export { verdictBadge };

/**
 * Build summary row data for a processed entry. Called by main.js after
 * each image completes so the summary table can be refreshed incrementally.
 *
 * @param {Object} entry
 * @param {HTMLCanvasElement} sourceCanvas
 * @returns {Object}
 */
export function summaryItemFromEntry(entry, sourceCanvas) {
  const failing    = (entry.report.colourPairs || []).filter((p) => !p.pass);
  const worstRatio = entry.report.colourPairs?.[0]?.contrast ?? null;
  return {
    id:         entry.id,
    filename:   entry.filename,
    thumb:      sourceCanvas ? makeThumb(sourceCanvas, 40).canvas : null,
    verdict:    entry.report.verdict,
    worstRatio,
    failCount:  failing.length
  };
}
