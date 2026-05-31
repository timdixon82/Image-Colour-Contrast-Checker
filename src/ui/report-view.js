/**
 * DOM renderer for the report (summary table + per-image cards).
 * Consumes AnalysedEntry objects (see core/schema.js).
 *
 * @module ui/report-view
 */

import { makeSwatch, makeClip, makePreview, makeThumb, makeCbSim } from '../render/canvas.js';
import {
  THRESHOLDS_FOOTER, DISCLAIMER_TEXT, CVD_TYPES,
  VESTIBULAR_CHECKER_URL, VESTIBULAR_CHECKER_FULL_LABEL
}                                                                   from '../export/strings.js';
import {
  pairChecks, wcagLine, advancedLine,
  advancedStatus, pairBadges, statusWord, CHECK_GROUPS
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
 * @param {HTMLElement} summaryEl
 * @param {Array<{ id:string, filename:string, thumb:HTMLCanvasElement|null, hasText:boolean, badges:Array }>} items
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
        <th scope="col"><span class="sr-only">Thumbnail</span></th>
        <th scope="col">Image</th>
        <th scope="col">WCAG</th>
        <th scope="col">Advanced checks</th>
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

    const wcagCell = document.createElement('td');
    const advCell  = document.createElement('td');
    if (item.hasText && item.badges) {
      wcagCell.append(wcagBadges(item.badges));
      advCell.append(badge('', item.badges[2].status, 'Advanced checks'));
    } else {
      wcagCell.textContent = '—';
      advCell.textContent  = '—';
    }

    tr.append(thumbCell, nameCell, wcagCell, advCell);
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

  // Preview image — canvas does not support the alt attribute; role="img"
  // plus aria-label is the correct pattern (matches the CBSim canvas below).
  const preview = makePreview(sourceCanvas, 600);
  preview.canvas.className = 'image-card-preview';
  preview.canvas.setAttribute('role', 'img');
  preview.canvas.setAttribute('aria-label', `Preview of ${filename}`);
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
 * The card's "Result" line: the two formal WCAG levels and the rolled-up
 * Advanced-checks verdict as separate badges.
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
  } else {
    line.append(document.createTextNode(`${verdictBadge(report.verdict)} — ${report.detail}`));
  }
  return line;
}

/** Image-level roll-up: every pair must pass for the badge to pass. */
function imageBadges(report) {
  const pairs = report.colourPairs;
  const adv   = pairs.map(advancedStatus);
  return [
    { label: 'WCAG AA',  short: 'AA',  status: pairs.every((p) => p.pass) ? 'PASS' : 'FAIL' },
    { label: 'WCAG AAA', short: 'AAA', status: pairs.every((p) => p.passAaa) ? 'PASS' : 'FAIL' },
    {
      label: 'Advanced Checks', short: 'Advanced',
      status: adv.includes('FAIL') ? 'FAIL' : adv.includes('WARN') ? 'WARN' : 'PASS'
    }
  ];
}

/** Stacked AA + AAA badges for a WCAG table cell. */
function wcagBadges(badges) {
  const wrap = document.createElement('div');
  wrap.className = 'row-badges';
  wrap.append(
    badge(badges[0].short, badges[0].status, badges[0].label),
    badge(badges[1].short, badges[1].status, badges[1].label)
  );
  return wrap;
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
 * combination. The collapsed row shows the swatch, separate WCAG and Advanced
 * columns, colours, WebAIM link and detected text; the expanded panel groups
 * every check into WCAG and Advanced sections. Rows stay collapsed until the
 * reader chooses to open them.
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

  // Split summary: one line for WCAG checks, one for Advanced checks
  const summaryGroup = document.createElement('div');
  summaryGroup.className   = 'results-summary-group';
  summaryGroup.setAttribute('aria-live', 'polite');
  summaryGroup.setAttribute('aria-atomic', 'true');

  const wcagSummary = document.createElement('p');
  wcagSummary.className   = 'results-overall';
  wcagSummary.textContent = wcagLine(report);

  const advSummary = document.createElement('p');
  advSummary.className   = 'results-overall';
  advSummary.textContent = advancedLine(report);

  summaryGroup.append(wcagSummary, advSummary);
  card.append(summaryGroup);

  const scroll = document.createElement('div');
  scroll.className = 'table-scroll';

  const table = document.createElement('table');
  table.className = 'results-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th scope="col"><span class="sr-only">Expand</span></th>
        <th scope="col">Swatch</th>
        <th scope="col">WCAG</th>
        <th scope="col">Advanced</th>
        <th scope="col">Background</th>
        <th scope="col">Foreground</th>
        <th scope="col">External Checkers</th>
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
    const badges   = pairBadges(p);

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

    const wcagCell = document.createElement('td');
    wcagCell.append(wcagBadges(badges));

    const advCell = document.createElement('td');
    advCell.append(badge('', badges[2].status, 'Advanced checks'));

    const bgCell = document.createElement('td');
    bgCell.innerHTML = `<code>${p.bgHex}</code>`;
    const fgCell = document.createElement('td');
    fgCell.innerHTML = `<code>${p.fgHex}</code>`;

    const checkCell = document.createElement('td');
    const ul = document.createElement('ul');
    ul.className = 'external-checkers-list';
    const liWebaim = document.createElement('li');
    liWebaim.append(webaimLink(p.fgHex, p.bgHex));
    const liVestibular = document.createElement('li');
    liVestibular.append(vestibularLink());
    ul.append(liWebaim, liVestibular);
    checkCell.append(ul);

    const textCell = document.createElement('td');
    textCell.className   = 'examples';
    textCell.textContent = p.examples.map((e) => `"${e}"`).join(', ');

    hdr.append(toggleCell, swatchCell, wcagCell, advCell, bgCell, fgCell, checkCell, textCell);

    // ── Expandable detail row ──
    const det = document.createElement('tr');
    det.className = 'result-detail';
    det.id = detailId;
    det.hidden = true;
    const detCell = document.createElement('td');
    detCell.colSpan = 8;
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
 * A roll-up badge: a pill carrying a pass/fail word (and an optional label),
 * so the verdict is conveyed by text and not by colour alone (WCAG 1.4.1).
 *
 * @param {string} label       Short visible label, e.g. "AA" — may be empty
 * @param {string} status      PASS | WARN | FAIL
 * @param {string} [fullLabel] Longer label for the accessible name
 */
function badge(label, status, fullLabel) {
  const word = statusWord(status);
  const span = pill(label ? `${label} ${word}` : word, status);
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

function webaimLink(fgHex, bgHex) {
  // The ↗ arrow is placed in an aria-hidden span so screen readers (VoiceOver,
  // JAWS, NVDA) announce "Check this pair on WebAIM, link" rather than
  // "WebAIM north-east arrow, link". The visible appearance is unchanged.
  const a = document.createElement('a');
  a.href   = `https://webaim.org/resources/contrastchecker/?fcolor=${fgHex.slice(1)}&bcolor=${bgHex.slice(1)}`;
  a.target = '_blank';
  a.rel    = 'noopener noreferrer';
  a.textContent = 'Check this pair on WebAIM';
  const arrow = document.createElement('span');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = ' ↗';
  a.append(arrow);
  return a;
}

function vestibularLink() {
  const a = document.createElement('a');
  a.href   = VESTIBULAR_CHECKER_URL;
  a.target = '_blank';
  a.rel    = 'noopener noreferrer';
  a.setAttribute('aria-label', VESTIBULAR_CHECKER_FULL_LABEL);
  a.textContent = 'Vestibular Accessible Design Checker';
  const arrow = document.createElement('span');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = ' ↗';
  a.append(arrow);
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

// ── "What the checks mean" navigation ────────────────────────────────────────
// The check explanations live as static <details> in index.html. An info link
// or an incoming deep link (#check-info-<id>) opens the matching entry and
// moves focus there, without ever leaving the page (WCAG 3.2.5).

function openCheckDetails(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.tagName === 'DETAILS') el.open = true;
  el.scrollIntoView({ block: 'start' });
  (el.querySelector('summary') || el).focus({ preventScroll: true });
}

function initChecksNav() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest?.('a.check-info');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    if (document.getElementById(id)) {
      e.preventDefault();
      openCheckDetails(id);
    }
  });
  const fromHash = () => {
    if (location.hash.startsWith('#check-info-')) openCheckDetails(location.hash.slice(1));
  };
  window.addEventListener('hashchange', fromHash);
  fromHash();
}
initChecksNav();

/**
 * Build summary row data for a processed entry. Called by main.js after
 * each image completes so the summary table can be refreshed incrementally.
 *
 * @param {Object} entry
 * @param {HTMLCanvasElement} sourceCanvas
 * @returns {Object}
 */
export function summaryItemFromEntry(entry, sourceCanvas) {
  const report  = entry.report;
  const hasText = report.hasText && report.colourPairs.length > 0;
  return {
    id:       entry.id,
    filename: entry.filename,
    thumb:    sourceCanvas ? makeThumb(sourceCanvas, 40).canvas : null,
    hasText,
    badges:   hasText ? imageBadges(report) : null
  };
}
