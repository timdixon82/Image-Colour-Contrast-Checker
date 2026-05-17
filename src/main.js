// UI controller: file queue + OCR driver + report rendering + exports.

import './styles.css';
import { version } from '../package.json';
import { preloadModels } from './lib/preloader.js';
import { initDropzone } from './ui/dropzone.js';
import { createQueueRow, setRowStage } from './ui/progress.js';
import {
  renderResultsHeader,
  renderSummary,
  renderImageCard,
  renderThresholdsFooter
} from './ui/report-view.js';
import { decodeAndResize, bitmapToImageData } from './lib/resize.js';
import { makeThumb } from './lib/swatch.js';
import { analyseImage } from './lib/wcag.js';

// OCR is lazy-loaded on first use (it pulls in ~10 MB of opencv + ORT JS).
let ocrModulePromise = null;
function loadOcrModule() {
  if (!ocrModulePromise) ocrModulePromise = import('./lib/ocr.js');
  return ocrModulePromise;
}
import { buildMarkdown, downloadMarkdown } from './export/markdown.js';
import { downloadPdf } from './export/pdf.js';

const preloaderEl     = document.getElementById('preloader');
const preloaderBar    = document.getElementById('preloader-bar');
const preloaderPct    = document.getElementById('preloader-pct');
const preloaderStatus = document.getElementById('preloader-status');
const appEl           = document.getElementById('app');

const dropzoneEl   = document.getElementById('dropzone');
const inputEl      = document.getElementById('file-input');
const chooseBtn    = document.getElementById('choose-files');
const modelBanner  = document.getElementById('model-banner');
const landing      = document.getElementById('landing');
const processing   = document.getElementById('processing');
const queueEl      = document.getElementById('queue');
const results      = document.getElementById('results');
const headerEl     = document.getElementById('results-header');
const summaryEl    = document.getElementById('summary');
const cardsEl      = document.getElementById('cards');
const thresholdsEl = document.getElementById('thresholds');
const actionBar    = document.getElementById('action-bar');
const downloadPdfBtn = document.getElementById('download-pdf');
const downloadMdBtn  = document.getElementById('download-md');
const resetBtn       = document.getElementById('reset');

const state = {
  ocrReady: false,
  ocrLoading: false,
  queue: [],
  entries: new Map(),
  busy: false,
  batchTimestamp: null
};

// Lazy-load the OCR module + start downloading models. Triggered on the
// first interaction (file picker click or drop) so the landing page stays
// light.
function warmOcr() {
  if (state.ocrLoading || state.ocrReady) return;
  state.ocrLoading = true;
  modelBanner.hidden = false;
  loadOcrModule()
    .then((mod) => mod.getOcr())
    .then(() => {
      state.ocrReady = true;
      state.ocrLoading = false;
      modelBanner.hidden = true;
    })
    .catch((err) => {
      state.ocrLoading = false;
      const text = modelBanner.querySelector('.model-banner-text');
      if (text) text.textContent = `OCR failed to load: ${err.message}`;
    });
}

async function handleFiles(files) {
  warmOcr();
  state.busy = true;
  state.batchTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  landing.hidden = false;
  processing.hidden = false;
  results.hidden = true;
  actionBar.hidden = true;

  for (const file of files) {
    const id = crypto.randomUUID();
    const row = createQueueRow(file.name);
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

  finishBatch();
}

async function processOne(entry) {
  setRowStage(entry.row, 'decoding');

  // Decode + canonical-resize to a single canvas reused for OCR, analysis
  // and rendering. Encode it back to a blob so we can hand a URL to the
  // OCR library (whose internal ImageRaw.open() expects a URL).
  const bitmap = await decodeAndResize(entry.file);
  const { canvas, imageData } = bitmapToImageData(bitmap);
  bitmap.close?.();
  entry.sourceCanvas = htmlCanvasFrom(canvas);
  const blob = await canvasToBlob(entry.sourceCanvas);
  const blobUrl = URL.createObjectURL(blob);

  try {
    setRowStage(entry.row, 'ocr');
    const { runOcrOnUrl } = await loadOcrModule();
    const detections = await runOcrOnUrl(blobUrl);
    entry.detections = detections;

    setRowStage(entry.row, 'analysing');
    entry.report = analyseImage(imageData, detections);

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

// Promote an OffscreenCanvas (worker-style) into an HTMLCanvasElement so the
// DOM can host it and we can pass it to swatch / clip helpers that expect
// drawImage targets.
function htmlCanvasFrom(maybeOffscreen) {
  if (maybeOffscreen instanceof HTMLCanvasElement) return maybeOffscreen;
  const canvas = document.createElement('canvas');
  canvas.width = maybeOffscreen.width;
  canvas.height = maybeOffscreen.height;
  const ctx = canvas.getContext('2d', { colorSpace: 'srgb' });
  ctx.drawImage(maybeOffscreen, 0, 0);
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
    const thumb = e.sourceCanvas ? makeThumb(e.sourceCanvas, 40).canvas : null;
    const failing = (e.report.colourPairs || []).filter((p) => !p.pass);
    const worstRatio = e.report.colourPairs?.[0]?.contrast ?? null;
    items.push({
      id: e.id,
      filename: e.filename,
      thumb,
      verdict: e.report.verdict,
      worstRatio,
      failCount: failing.length
    });
  }
  renderSummary(summaryEl, items);
}

function finishBatch() {
  state.busy = false;
  actionBar.hidden = false;
  landing.hidden = true;
  processing.hidden = true;
}

function entriesForExport() {
  return state.queue
    .map((id) => state.entries.get(id))
    .filter((e) => e && e.report && e.sourceCanvas);
}

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
  const md = buildMarkdown(entries, state.batchTimestamp);
  downloadMarkdown(md, `contrast-audit-${stamp()}.md`);
});

resetBtn.addEventListener('click', () => {
  state.queue = [];
  state.entries.clear();
  state.busy = false;
  state.batchTimestamp = null;
  cardsEl.innerHTML = '';
  summaryEl.innerHTML = '';
  thresholdsEl.innerHTML = '';
  headerEl.innerHTML = '';
  queueEl.innerHTML = '';
  results.hidden = true;
  processing.hidden = true;
  actionBar.hidden = true;
  landing.hidden = false;
});

function stamp() {
  return new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
}

// Footer: version + licence links (DOM-only, no innerHTML)
const footerEl = document.getElementById('app-footer');
if (footerEl) {
  const repoBase = 'https://github.com/timdixon82/Image-Colour-Contrast-Checker';
  const sep = () => { const s = document.createElement('span'); s.className = 'sep'; s.setAttribute('aria-hidden', 'true'); s.textContent = '·'; return s; };
  const lnk = (href, text) => { const a = document.createElement('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = text; return a; };
  footerEl.append(
    `v${version}`,
    sep(),
    lnk(`${repoBase}/blob/main/LICENSE`, 'MIT Licence'),
    sep(),
    lnk(`${repoBase}#dependencies-and-licensing`, 'Third-party licences')
  );
}

initDropzone({ dropzoneEl, inputEl, chooseBtn, onFiles: handleFiles });

// Download all model and runtime files, show progress, then unlock the UI.
preloadModels(({ pct, label, fileIndex, fileCount, done }) => {
  preloaderBar.style.width = pct + '%';
  preloaderPct.textContent = Math.round(pct) + '%';
  if (!done) {
    preloaderStatus.textContent = label
      ? `Downloading ${label} (${fileIndex + 1} of ${fileCount})`
      : 'Starting download…';
  } else {
    preloaderStatus.textContent = 'Ready.';
    appEl.removeAttribute('inert');
    preloaderEl.classList.add('preloader-done');
    setTimeout(() => preloaderEl.remove(), 400);
    warmOcr();
  }
});
