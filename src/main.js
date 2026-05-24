// App entry point — UI wiring and processing orchestration.
// Each concern lives in its own module; this file only coordinates them.

import './styles.css';
import { version }                    from '../package.json';
import { preloadModels }              from './preloader.js';
import { initDropzone }               from './ui/dropzone.js';
import { createQueueRow, setRowStage } from './ui/progress.js';
import {
  renderResultsHeader,
  renderSummary,
  renderImageCard,
  renderThresholdsFooter,
  summaryItemFromEntry
} from './ui/report-view.js';
import { decodeAndResize, bitmapToImageData } from './core/image.js';
// render/canvas.js is used via report-view.js; no direct imports needed here.
import { analyseImage }               from './core/analyse.js';
import { buildMarkdown, downloadMarkdown } from './export/markdown.js';
import { downloadPdf }                from './export/pdf.js';

// OCR is lazy-loaded on first use to keep the initial page weight low.
let ocrModulePromise = null;
function loadOcrModule() {
  if (!ocrModulePromise) ocrModulePromise = import('./adapters/paddle-ocr.js');
  return ocrModulePromise;
}

// ── DOM refs ─────────────────────────────────────────────────────────────────
const dlBar    = document.getElementById('dl-bar');
const dlPct    = document.getElementById('dl-pct');
const dlStatus = document.getElementById('dl-status');

const dropzoneEl     = document.getElementById('dropzone');
const inputEl        = document.getElementById('file-input');
const chooseBtn      = document.getElementById('choose-files');
const landing        = document.getElementById('landing');
const processing     = document.getElementById('processing');
const queueEl        = document.getElementById('queue');
const results        = document.getElementById('results');
const headerEl       = document.getElementById('results-header');
const summaryEl      = document.getElementById('summary');
const cardsEl        = document.getElementById('cards');
const thresholdsEl   = document.getElementById('thresholds');
const actionBar      = document.getElementById('action-bar');
const downloadPdfBtn = document.getElementById('download-pdf');
const downloadMdBtn  = document.getElementById('download-md');
const resetBtn       = document.getElementById('reset');

// ── App state ─────────────────────────────────────────────────────────────────
const state = {
  ocrPromise:     null,
  queue:          [],
  entries:        new Map(),
  busy:           false,
  batchTimestamp: null
};

// ── OCR warm-up ───────────────────────────────────────────────────────────────
// Loads the OCR module and initialises its model session. Idempotent: the
// first call starts the work and every later call awaits the same promise.
// The promise always resolves — a load failure is logged and surfaces later
// as a per-image error in the processing queue.
function warmOcr() {
  if (!state.ocrPromise) {
    state.ocrPromise = loadOcrModule()
      .then((mod) => mod.getOcr())
      .catch((err) => { console.error('OCR engine failed to load:', err); });
  }
  return state.ocrPromise;
}

// ── File handling ─────────────────────────────────────────────────────────────
// Safari before 15.4 has no crypto.randomUUID; fall back to a simple unique id.
function uuid() {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function handleFiles(files) {
  state.busy           = true;
  state.batchTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  landing.hidden    = false;
  processing.hidden = false;
  results.hidden    = true;
  actionBar.hidden  = true;

  try {
    for (const file of files) {
      const id    = uuid();
      const row   = createQueueRow(file.name);
      queueEl.append(row);
      const entry = { id, file, filename: file.name, row };
      state.entries.set(id, entry);
      state.queue.push(id);
    }

    for (const id of state.queue.slice()) {
      const entry = state.entries.get(id);
      if (!entry || entry.processed) continue;
      entry.processed = true;
      try {
        await processOne(entry);
      } catch (err) {
        console.error(`[${entry.filename}]`, err);
        setRowStage(entry.row, 'failed', err.message);
      }
    }
  } catch (err) {
    console.error('[handleFiles]', err);
    const li = document.createElement('li');
    li.className = 'queue-row';
    li.dataset.stage = 'failed';
    li.textContent = `Could not process the selection: ${err?.message || err}`;
    queueEl.append(li);
  }

  finishBatch();
}

async function processOne(entry) {
  setRowStage(entry.row, 'decoding');

  const bitmap              = await decodeAndResize(entry.file);
  const { canvas, imageData } = bitmapToImageData(bitmap);
  bitmap.close?.();
  entry.sourceCanvas = htmlCanvasFrom(canvas);

  const blob    = await canvasToBlob(entry.sourceCanvas);
  const blobUrl = URL.createObjectURL(blob);

  try {
    setRowStage(entry.row, 'ocr');
    const { runOcrOnUrl } = await loadOcrModule();
    entry.detections = await runOcrOnUrl(blobUrl);

    setRowStage(entry.row, 'analysing');
    entry.report = analyseImage(imageData, entry.detections);

    setRowStage(entry.row, 'done');

    if (results.hidden) {
      results.hidden = false;
      renderResultsHeader(headerEl, state.batchTimestamp);
      renderThresholdsFooter(thresholdsEl);
    }
    renderImageCard(cardsEl, entry);
    refreshSummary();
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function htmlCanvasFrom(maybeOffscreen) {
  if (maybeOffscreen instanceof HTMLCanvasElement) return maybeOffscreen;
  const canvas = document.createElement('canvas');
  canvas.width  = maybeOffscreen.width;
  canvas.height = maybeOffscreen.height;
  canvas.getContext('2d', { colorSpace: 'srgb' }).drawImage(maybeOffscreen, 0, 0);
  return canvas;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('canvas.toBlob returned null')), 'image/png');
  });
}

function refreshSummary() {
  const items = [];
  for (const id of state.queue) {
    const e = state.entries.get(id);
    if (!e || !e.report) continue;
    items.push(summaryItemFromEntry(e, e.sourceCanvas));
  }
  renderSummary(summaryEl, items);
}

function finishBatch() {
  state.busy = false;
  const anyResults = state.queue.some((id) => state.entries.get(id)?.report);
  if (anyResults) {
    actionBar.hidden  = false;
    landing.hidden    = true;
    processing.hidden = true;
  } else {
    // Nothing succeeded — keep the queue (with its error messages) and the
    // dropzone on screen so the failure is visible and the user can retry.
    actionBar.hidden  = true;
    landing.hidden    = false;
    processing.hidden = false;
  }
}

function entriesForExport() {
  return state.queue
    .map((id) => state.entries.get(id))
    .filter((e) => e && e.report && e.sourceCanvas);
}

// ── Exports ───────────────────────────────────────────────────────────────────
downloadPdfBtn.addEventListener('click', async () => {
  const entries = entriesForExport();
  if (!entries.length) return;
  downloadPdfBtn.disabled = true;
  try {
    await downloadPdf(entries, state.batchTimestamp, `contrast-audit-${stamp()}.pdf`);
  } catch (err) {
    alert(`PDF export failed: ${err.message}`);
  } finally {
    downloadPdfBtn.disabled = false;
  }
});

downloadMdBtn.addEventListener('click', () => {
  const entries = entriesForExport();
  if (!entries.length) return;
  downloadMarkdown(buildMarkdown(entries, state.batchTimestamp), `contrast-audit-${stamp()}.md`);
});

resetBtn.addEventListener('click', () => {
  state.queue = [];
  state.entries.clear();
  state.busy           = false;
  state.batchTimestamp = null;
  cardsEl.innerHTML    = '';
  summaryEl.innerHTML  = '';
  thresholdsEl.innerHTML = '';
  headerEl.innerHTML   = '';
  queueEl.innerHTML    = '';
  results.hidden    = true;
  processing.hidden = true;
  actionBar.hidden  = true;
  landing.hidden    = false;
});

function stamp() {
  return new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
}

// ── Footer ────────────────────────────────────────────────────────────────────
const footerEl  = document.getElementById('app-footer');
const repoBase  = 'https://github.com/timdixon82/Image-Colour-Contrast-Checker';
const sep = () => { const s = document.createElement('span'); s.className = 'sep'; s.setAttribute('aria-hidden', 'true'); s.textContent = '·'; return s; };
// sendReferrer drops `noreferrer` (keeping `noopener`) so the destination
// sees this site as the referrer — used for the timdixon.net links.
const lnk = (href, text, sendReferrer) => Object.assign(document.createElement('a'), { href, target: '_blank', rel: sendReferrer ? 'noopener' : 'noopener noreferrer', textContent: text });
const lnkSelf = (href, text) => Object.assign(document.createElement('a'), { href, textContent: text });
if (footerEl) {
  footerEl.append(
    `v${version}`,
    sep(), lnk(repoBase, 'Open source on GitHub'),
    sep(), lnk(`${repoBase}/blob/main/LICENSE`, 'MIT Licence'),
    sep(), lnk(`${repoBase}#dependencies-and-licensing`, 'Third-party licences'),
    sep(), lnkSelf('./privacy.html', 'Privacy'), /* same-site: no new tab (finding 10) */
    sep(), lnk('https://www.timdixon.net/contact/', 'Contact / feedback', true),
    sep(), lnk('https://timdixon.net', '© Tim Dixon', true)
  );
}

// ── Theme toggle ──────────────────────────────────────────────────────────────
(function initThemeToggle() {
  const STORAGE_KEY = 'td-theme';
  const html        = document.documentElement;
  const toggleBtn   = document.getElementById('theme-toggle');
  const toggleLabel = toggleBtn?.querySelector('.theme-toggle-label');

  function syncToggle() {
    if (!toggleBtn) return;
    const isDark = html.dataset.theme === 'dark';
    toggleBtn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    if (toggleLabel) toggleLabel.textContent = isDark ? 'Light' : 'Dark';
  }

  function setTheme(theme, persist) {
    html.dataset.theme = theme;
    if (persist) localStorage.setItem(STORAGE_KEY, theme);
    syncToggle();
  }

  syncToggle();

  toggleBtn?.addEventListener('click', () => {
    setTheme(html.dataset.theme === 'dark' ? 'light' : 'dark', true);
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) setTheme(e.matches ? 'dark' : 'light', false);
  });
}());

// ── Model download ────────────────────────────────────────────────────────────
// The page is usable and scrollable while the models download — only the
// dropzone is held in a loading state. When the download finishes the dropzone
// switches to its interactive state in place, without moving the viewport, so
// a reader part-way down the page is not pulled back to the top.
function activateDropzone() {
  dropzoneEl.classList.remove('is-loading');
  dropzoneEl.removeAttribute('aria-disabled');
  dropzoneEl.setAttribute('tabindex', '0');
}

preloadModels(({ pct, label, fileIndex, fileCount, done }) => {
  dlBar.style.width = pct + '%';
  dlPct.textContent = Math.round(pct) + '%';
  if (!done) {
    dlStatus.textContent = label
      ? `Downloading ${label} (${fileIndex + 1} of ${fileCount})`
      : 'Starting download…';
  } else {
    // Files are cached — warm the OCR engine, then enable the dropzone. The
    // dropzone stays in its loading state through warm-up so there is a
    // single, in-place transition once everything is ready.
    dlStatus.textContent = 'Preparing the OCR engine…';
    warmOcr().finally(activateDropzone);
  }
});

initDropzone({ dropzoneEl, inputEl, chooseBtn, onFiles: handleFiles });
