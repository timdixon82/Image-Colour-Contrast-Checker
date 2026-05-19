# Architecture

Image Colour Contrast Checker is a **fully client-side** web app. Every step of the pipeline — file decode, OCR, contrast analysis, and report generation — runs inside the user's browser. No data is sent to any server.

Live tool: [image-colour-contrast-checker.timdixon.net](https://image-colour-contrast-checker.timdixon.net)

---

## Directory layout

```
/
├── index.html              Main app entry point
├── privacy.html            Privacy statement page
├── vite.config.js          Build configuration
├── package.json            Scripts and dependencies
├── scripts/
│   └── copy-models.mjs     Post-install: copies model + WASM assets into public/
├── public/                 Static assets (served as-is; most are gitignored)
│   ├── favicon.svg
│   ├── coi-serviceworker.js  (generated) COOP/COEP service worker
│   ├── models/               (generated) PaddleOCR ONNX model files
│   └── ort/                  (generated) ONNX Runtime Web WASM binaries
└── src/
    ├── main.js             Application controller (entry point for JS)
    ├── styles.css          All styles — design tokens, components, dark mode
    ├── lib/
    │   ├── preloader.js    Download model + WASM files; show progress
    │   ├── ocr.js          PaddleOCR wrapper (text detection + recognition)
    │   ├── resize.js       Canonical image resize before analysis
    │   ├── swatch.js       Canvas helpers for visual report artefacts
    │   └── wcag.js         WCAG contrast math + region analysis
    ├── ui/
    │   ├── dropzone.js     Drag-and-drop + file picker UI
    │   ├── progress.js     Per-file queue row (stage badge)
    │   └── report-view.js  DOM renderer for summary table + image cards
    └── export/
        ├── markdown.js     Markdown export (base64-embedded images)
        └── pdf.js          PDF export via pdfmake (lazy-loaded)
```

The `public/models/` and `public/ort/` directories are populated by `scripts/copy-models.mjs`, which runs automatically via `postinstall`, `predev`, and `prebuild` npm hooks. They are gitignored and should never be committed.

---

## Pipeline

```
User drops image files
        │
        ▼
src/lib/resize.js — decodeAndResize()
  createImageBitmap() with colorSpaceConversion:'none'
  Resize to 800–1400 px long edge (pass-through if already in range)
  bitmapToImageData() → { canvas, imageData }
        │
        ▼
src/lib/ocr.js — runOcrOnUrl()
  PaddleOCR PP-OCRv4 via @gutenye/ocr-browser + onnxruntime-web
  WebGPU execution provider if navigator.gpu is available, WASM fallback
  Returns [{ text, score, bbox: {x,y,w,h} }]
        │
        ▼
src/lib/wcag.js — analyseImage()
  filterOcrDetections()  — drop low-confidence / too-small detections
  For each detection:
    worstStripContrast()
      Splits bbox into vertical strips (width ≈ text height × 0.75)
      Per strip: regionContrast()
        Expand bbox by 2 px on each side
        Build Float64Array of per-pixel luminance
        kmeans2() — 1-D k-means, k=2, init at 25th/75th percentile
        Minority cluster = text, majority = background
        Re-assign pixels to clusters to get mean RGB per cluster
        wcagContrast() → ratio
      Return strip with worst (lowest) ratio
  buildColourPairs()
    Merge findings with similar FG+BG colours (Euclidean distance < 25)
    When merging: keep worst contrast, accumulate example words + bboxes
    Deduplicate example words; cap at 6 per pair
    Sort pairs by contrast ascending (worst first)
  Return: { hasText, colourPairs, verdict (PASS/FAIL/NO_TEXT), flag, detail }
        │
        ▼
src/ui/report-view.js — renderImageCard()
  Thumbnail via src/lib/swatch.js — makePreview()
  Per-pair: makeSwatch() (80×20 canvas, bg left / fg right)
  Per-failing pair: makeClip() (cropped + red-outlined region)
  WebAIM contrast checker link per pair
        │
        ▼
  (optional) Export
  src/export/markdown.js  — base64 images embedded in Markdown tables
  src/export/pdf.js       — pdfmake document with embedded images (lazy-loaded)
```

---

## Module reference

### `src/main.js`

Application controller. No exports — this is the Vite entry point.

Responsibilities:
- Wires all DOM events (drag-drop, file picker, PDF/Markdown download, reset)
- Orchestrates the per-file pipeline (resize → OCR → analyse → render)
- Manages a `state` object: `{ queue, entries, busy, batchTimestamp }`
- Builds the app footer (version, licence links, privacy link)
- Initialises the theme toggle (reads/writes `localStorage['td-theme']`)
- Calls `preloadModels()` on startup and unlocks the UI when done

The OCR module (`src/lib/ocr.js`) is **lazy-loaded** on first file interaction via a dynamic `import()`. This keeps the initial bundle small (~10 MB OCR + OpenCV code is deferred).

---

### `src/lib/preloader.js`

Exported: `preloadModels(onProgress)`

Downloads OCR models and WASM runtime before the user can interact. Detects WebGPU availability and downloads the appropriate WASM variant:

| File | Size (approx) | When |
|------|--------------|------|
| `models/ch_PP-OCRv4_det_infer.onnx` | 4.7 MB | Always |
| `models/ch_PP-OCRv4_rec_infer.onnx` | 10.5 MB | Always |
| `ort/ort-wasm-simd-threaded.jsep.wasm` | 26 MB | WebGPU only |
| `ort/ort-wasm-simd-threaded.wasm` | 12.6 MB | WASM fallback |
| `ort/ort-wasm-simd-threaded.jsep.mjs` | 46 KB | WebGPU only |
| `ort/ort-wasm-simd-threaded.mjs` | 24 KB | WASM fallback |
| `models/ppocr_keys_v1.txt` | 26 KB | Always |

`onProgress` callback signature: `{ pct: 0–100, label: string, fileIndex: number, fileCount: number, done: boolean }`

Uses `fetch()` with a streaming body reader to track actual byte progress. Falls back to approximate sizes on network errors or missing `Content-Length`.

---

### `src/lib/ocr.js`

Exported: `getOcr()`, `runOcrOnUrl(url)`

Wraps `@gutenye/ocr-browser` (PaddleOCR PP-OCRv4). `getOcr()` is a singleton factory — it creates the OCR instance once and caches the promise.

`runOcrOnUrl(url)` accepts a blob URL, calls `ocr.detect()`, converts polygon detections to axis-aligned bboxes via `polyToBbox()`, and filters out zero-size detections.

The ORT WASM path is set at module load time:
```js
ort.env.wasm.wasmPaths = new URL('ort/', document.baseURI).href;
```
This must be an absolute URL because ORT's dynamic `import()` resolves relative to the bundle file in `assets/`, not the page root.

---

### `src/lib/resize.js`

Exported: `targetSize(width, height)`, `decodeAndResize(blob)`, `bitmapToImageData(bitmap)`

Normalises images to an 800–1400 px long edge before OCR and analysis. This range was chosen to:
- Avoid character detection failures on very small images (< 800 px)
- Keep memory and inference time reasonable on large screenshots (> 1400 px)

`createImageBitmap` with `colorSpaceConversion: 'none'` prevents the browser applying a colour profile, which would alter the raw pixel values used for contrast calculation. `bitmapToImageData` pins the canvas colour space to `srgb` for the same reason.

---

### `src/lib/wcag.js`

Exported: `linearise`, `luminance`, `luminanceFloat`, `wcagContrast`, `hexToRgb`, `rgbToHex`, `colourDistance`, `kmeans2`, `regionContrast`, `worstStripContrast`, `thresholdsFor`, `filterOcrDetections`, `buildColourPairs`, `analyseImage`

The main entry point for callers outside this module is `analyseImage(imageData, ocrDetections)`.

Key implementation details:

**LUT for linearisation** — `LIN_LUT` is a 256-element `Float64Array` pre-computed at module load. Each pixel channel is looked up instead of computed, which is the dominant cost for large images.

**k-means (k=2) on luminance** — Initialised at the 25th and 75th percentile luminance values to avoid symmetric initialisation failures. Convergence threshold is 1e-7. On convergence the two centroids are swapped so `c[0]` is always the darker cluster.

**Text = minority cluster** — After k-means, each pixel is re-assigned to the nearest centroid and cluster sizes are counted. The smaller cluster is assumed to be text (ink), the larger is background. Mean RGB is computed per cluster for hex output.

**Strip-based worst-case** — `worstStripContrast` divides each OCR bounding box into vertical strips approximately one character wide (`strip_width = max(6, floor(h × 0.75))`). This catches gradient backgrounds where contrast degrades across a single word. The strip with the lowest ratio is reported.

**Colour pair merging** — `buildColourPairs` merges detections whose FG and BG hex colours are both within Euclidean RGB distance 25. When merging a worse detection into an existing pair, the pair's hex values, contrast, and AA/AAA flags are updated to the worse values. Up to 6 example words are kept per pair.

**WCAG thresholds** — `thresholdsFor(heightPx)` classifies text as large (≥ 24 px OCR box height) and returns the appropriate AA (4.5:1 normal / 3:1 large) and AAA (7:1 normal / 4.5:1 large) minimums.

---

### `src/lib/swatch.js`

Exported: `makeSwatch`, `makeClip`, `makePreview`, `makeThumb`, `sourceDataUrl`, `THRESHOLDS_FOOTER`

All functions return `{ canvas, dataUrl }` so the same rendered artefact can be inserted into the DOM and reused for PDF/Markdown export without re-drawing.

`THRESHOLDS_FOOTER` is a shared string appended to every PDF and Markdown export.

---

### `src/ui/dropzone.js`

Exported: `initDropzone({ dropzoneEl, inputEl, chooseBtn, onFiles })`

Handles drag-and-drop, file picker, and keyboard activation (Enter/Space on the dropzone element). Filters files to `image/*` MIME type. Delegates to `onFiles(files)` in `main.js`.

---

### `src/ui/progress.js`

Exported: `createQueueRow(filename)`, `setRowStage(row, stage, extra?)`

Stages (in order): `queued` → `decoding` → `ocr` → `analysing` → `done` | `failed`

CSS classes on the row element drive the badge colour (neutral → accent → pass/fail).

---

### `src/ui/report-view.js`

Exported: `renderResultsHeader`, `renderSummary`, `renderImageCard`, `renderThresholdsFooter`

Renders the DOM report. All DOM nodes are created with `document.createElement` (no `innerHTML` for user-derived content). The only `innerHTML` usage is for static table scaffolding and `escapeHtml()`-sanitised text.

`escapeHtml()` is a private function. It escapes `& < > " '` to HTML entities.

`verdictBadge()` is a private function used only inside this module.

---

### `src/export/markdown.js`

Exported: `buildMarkdown(entries, timestamp)`, `downloadMarkdown(markdown, filename)`

Builds a Markdown string with a summary table followed by per-image sections. All images (previews, swatches, clips) are embedded as base64 data URIs. The file is downloaded via a temporary `<a>` element with `download` attribute.

Note: GitHub strips embedded images from Markdown renders. The output is best viewed in VS Code, Obsidian, or Typora.

---

### `src/export/pdf.js`

Exported: `downloadPdf(entries, timestamp, filename)`

Lazy-loads `pdfmake` (and its bundled Roboto font VFS) on first call. Builds a multi-page pdfmake document definition with a summary table followed by one section per image. All images are passed as base64 data URIs.

---

### `scripts/copy-models.mjs`

Not a module — runs as a Node.js script.

Copies three asset groups from `node_modules` into `public/`:

| Source | Destination | Purpose |
|--------|-------------|---------|
| `@gutenye/ocr-models/assets/*.onnx` + `.txt` | `public/models/` | PaddleOCR models |
| `onnxruntime-web/dist/*.wasm` + `.mjs` | `public/ort/` | ONNX Runtime WASM |
| `coi-serviceworker/coi-serviceworker.min.js` | `public/coi-serviceworker.js` | COOP/COEP service worker |

Run via: `npm run postinstall` (also bound to `predev` and `prebuild`).

---

## Build and deploy

### Development

```bash
npm install          # installs deps AND runs copy-models.mjs
npm run dev          # starts Vite dev server at http://localhost:5173
```

The dev server adds `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers, which are required for `SharedArrayBuffer` (used by the multi-threaded WASM ORT backend). On GitHub Pages these headers are provided by the `coi-serviceworker.js` service worker instead.

### Production build

```bash
npm run build        # outputs to dist/
npm run preview      # preview the dist/ build locally
```

Vite builds two HTML entry points (`index.html` and `privacy.html`) into `dist/`. The build target is ES2022. ORT is excluded from Vite's dep-optimisation because it ships pre-bundled WASM assets that must remain as separate files.

### Deployment

The `dist/` directory is a self-contained static site. Deploy it to any static host. The current live deployment is at [image-colour-contrast-checker.timdixon.net](https://image-colour-contrast-checker.timdixon.net).

No server-side configuration is required beyond HTTPS. The `coi-serviceworker.js` handles COOP/COEP on hosts (like GitHub Pages) that cannot set custom response headers.

---

## Design decisions

**Why PaddleOCR PP-OCRv4?**
Available as a browser-native ONNX model via `@gutenye/ocr-browser`. No server needed. Supports WebGPU acceleration on Chrome/Edge desktop for sub-second inference on typical screenshots.

**Why k-means for foreground/background separation?**
UI screenshots have complex backgrounds — gradients, shadows, blended colours. A simple light/dark split by median luminance misclassifies text on mid-tone backgrounds. k-means with k=2 on luminance converges reliably to a two-cluster solution that mirrors how accessibility auditors think about text colour vs background colour.

**Why strip-based worst-case?**
A single-region contrast check across an entire bounding box averages out gradient degradation. Splitting into character-width vertical strips finds the worst contrast within a word — which is what a WCAG auditor reports.

**Why OffscreenCanvas with sRGB pin?**
`OffscreenCanvas` runs off the main thread where browsers support it, avoiding UI jank during `getImageData`. The `srgb` colour space pin and `colorSpaceConversion: 'none'` on `createImageBitmap` ensure the pixel values are exactly the sRGB values that WCAG contrast math expects, with no browser colour management applied.

**Why lazy-load OCR and pdfmake?**
The OCR module (`@gutenye/ocr-browser` + `onnxruntime-web` + `@techstark/opencv-js`) is approximately 10 MB of JavaScript. pdfmake (with Roboto fonts) is approximately 1 MB. Deferring both to first-use keeps the initial page load fast and prevents unnecessary downloads for users who never export to PDF.

**Why no framework?**
The UI state machine is simple (landing → processing → results). Adding a framework would increase bundle size and complexity with no benefit at this scale.

---

## Extending the tool

### Adding a new export format

1. Create `src/export/yourformat.js` exporting a `downloadYourFormat(entries, timestamp, filename)` function.
2. Each `entry` in `entries` has: `filename`, `sourceCanvas` (HTMLCanvasElement), `report` (from `analyseImage`), `pairAssets` (array of `{ pair, swatchDataUrl, clipDataUrl? }`), `previewDataUrl`.
3. Import and wire the new button in `src/main.js` following the pattern of `downloadPdfBtn` / `downloadMdBtn`.

### Changing WCAG thresholds

Edit `thresholdsFor()` in `src/lib/wcag.js` and update `THRESHOLDS_FOOTER` in `src/lib/swatch.js`.

### Replacing the OCR engine

Replace `src/lib/ocr.js`. The contract is: `runOcrOnUrl(blobUrl)` must return a promise resolving to `[{ text: string, score: number, bbox: { x, y, w, h } }]`. The `bbox` coordinates must be in the same pixel space as the `imageData` passed to `analyseImage`.

### Adding a new UI page

1. Create `yourpage.html` at the repo root alongside `index.html`.
2. Add it to `vite.config.js` under `build.rollupOptions.input`.
3. Link to it from `src/main.js` footer using the `lnk()` helper.
