# Architecture

Image Colour Contrast Checker is a **fully client-side** web app. Every step of
the pipeline — file decode, OCR, contrast analysis, and report generation —
runs inside the user's browser. No image data is ever uploaded.

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
│   └── copy-models.mjs     Copies model + WASM assets into public/ (install/build hook)
├── public/                 Static assets (served as-is)
│   ├── favicon.svg
│   ├── sw.js               Service worker — cross-origin isolation + model caching
│   ├── models/             (generated, gitignored) PaddleOCR ONNX model files
│   └── ort/                (generated, gitignored) ONNX Runtime Web WASM binaries
└── src/
    ├── main.js             Application orchestrator (Vite entry point)
    ├── preloader.js        Downloads model + runtime files with progress
    ├── styles.css          All styles — design tokens, components, dark mode
    ├── core/               Pure logic — no DOM, no browser-only APIs
    │   ├── schema.js       JSDoc type definitions (no runtime code)
    │   ├── contrast.js     WCAG contrast math primitives
    │   ├── analyse.js      Analysis pipeline: ImageData + OcrWord[] → ReportData
    │   └── image.js        Image decode + resize
    ├── adapters/           Swappable OCR engine integrations
    │   └── paddle-ocr.js   PaddleOCR PP-OCRv4 via @gutenye/ocr-browser + ONNX Runtime Web
    ├── render/             Browser canvas drawing utilities
    │   └── canvas.js       Swatch / clip / preview / thumbnail canvases
    ├── export/             Report generators
    │   ├── strings.js      Single source of truth for user-facing copy
    │   ├── pdf.js          PDF export via pdfmake (lazy-loaded)
    │   └── markdown.js     Markdown export with base64-embedded images
    └── ui/                 App-specific DOM components
        ├── dropzone.js     Drag-and-drop + file picker
        ├── progress.js     Per-file queue row (stage badge)
        └── report-view.js  DOM renderer for the summary table + image cards
```

The codebase is organised in layers with strict dependency rules:

- **`core/`** — pure logic. No DOM, no browser-only APIs, so it stays
  unit-testable and worker-safe. Never imports from `adapters/`, `render/`,
  `ui/`, or `export/`.
- **`adapters/`** — wraps one OCR engine behind a fixed interface
  (`getOcr()`, `runOcrOnUrl()`). Swapping OCR engines means adding one file here.
- **`render/`** — pure canvas drawing; no strings, no app state.
- **`export/`** — turns analysed results into downloadable files.
- **`ui/`** — owns the DOM components.
- **`main.js`** — wires everything together; contains no business logic.

`public/models/` and `public/ort/` are populated by `scripts/copy-models.mjs`,
which runs automatically via the `postinstall`, `predev`, and `prebuild` npm
hooks. They are gitignored and must never be committed.

---

## Data types

All data flows through the types defined in `src/core/schema.js` (JSDoc only —
no runtime code):

| Type | Description |
|---|---|
| `BBox` | `{ x, y, w, h }` — pixel coordinates in the resized image |
| `OcrWord` | `{ text, score, bbox }` — one word from an OCR adapter |
| `ColourPair` | A unique foreground/background colour combination, merged across the image, with its WCAG contrast ratio and AA/AAA pass flags |
| `ReportData` | `{ hasText, colourPairs[], verdict, flag, detail }` — the full analysis of one image |
| `PairAsset` | A `ColourPair` plus its rendered swatch / clip canvases |
| `AnalysedEntry` | `{ id, filename, report, previewDataUrl, pairAssets[] }` — the contract handed to the export modules |

`AnalysedEntry` is the boundary between the UI layer and the export layer:
`pdf.js` and `markdown.js` accept an array of `AnalysedEntry` and nothing else
from app internals.

---

## Pipeline

```
User drops / selects image files
        │
        ▼
src/core/image.js — decodeAndResize()
  createImageBitmap() with colorSpaceConversion:'none'
  Downscale onto a bounded canvas (long edge 800–1400 px)
  bitmapToImageData() → { canvas, imageData }
        │
        ▼
src/adapters/paddle-ocr.js — runOcrOnUrl()
  PaddleOCR PP-OCRv4 via @gutenye/ocr-browser + onnxruntime-web
  WebGPU execution provider on supported desktop browsers; WASM otherwise
  Returns OcrWord[] — [{ text, score, bbox }]
        │
        ▼
src/core/analyse.js — analyseImage()
  filterOcrDetections()  — drop low-confidence / too-small detections
  For each detection (math in src/core/contrast.js):
    worstStripContrast()
      Split bbox into vertical strips (~ one character wide)
      Per strip: regionContrast()
        Build per-pixel luminance, kmeans2() (k=2)
        Minority cluster = text, majority = background
        wcagContrast() → ratio
      Keep the strip with the worst (lowest) ratio
  buildColourPairs()
    Merge findings with similar FG+BG colours
    Keep worst contrast; accumulate example words + bboxes
    Sort pairs worst-contrast-first
  Returns ReportData — { hasText, colourPairs, verdict, flag, detail }
        │
        ▼
src/ui/report-view.js — renderImageCard()
  Builds the DOM card; draws swatch / clip / preview canvases
  via src/render/canvas.js
  Side effect: populates entry.previewDataUrl and entry.pairAssets
        │
        ▼
  (optional) Export — accepts AnalysedEntry[]
  src/export/markdown.js  — base64 images embedded in Markdown
  src/export/pdf.js       — pdfmake document (lazy-loaded)
```

`src/main.js` is the orchestrator: it runs this pipeline per file and calls the
renderers.

WCAG thresholds applied (`thresholdsFor()` in `core/contrast.js`):

- **AA**: 4.5:1 normal text · 3:1 large text
- **AAA**: 7:1 normal text · 4.5:1 large text
- Large text = OCR bbox height ≥ 24 px in the resized image space.

---

## Module reference

### `src/main.js`

Application orchestrator and Vite entry point. No exports.

- Wires DOM events (drag-drop, file picker, PDF/Markdown download, reset)
- Runs the per-file pipeline (decode → OCR → analyse → render)
- Holds the `state` object: `{ ocrReady, ocrLoading, queue, entries, busy, batchTimestamp }`
- Builds the footer and initialises the theme toggle (`localStorage['td-theme']`)
- Calls `preloadModels()` on startup, then warms the OCR engine

OCR is loaded through a dynamic `import()` of `adapters/paddle-ocr.js`, keeping
the ~10 MB OCR + runtime code out of the initial bundle. Warm-up (`getOcr()`) is
triggered as soon as the preloader finishes downloading the model files, so the
engine is ready before the user selects an image; `handleFiles()` also calls it
as an idempotent fallback.

### `src/preloader.js`

Exported: `preloadModels(onProgress)`

Downloads the OCR models and the ONNX runtime before the user can interact.
WebGPU availability (and platform) decides which WASM variant is fetched:

| File | Size (approx) | When |
|------|--------------|------|
| `models/ch_PP-OCRv4_det_infer.onnx` | 4.7 MB | Always |
| `models/ch_PP-OCRv4_rec_infer.onnx` | 10.5 MB | Always |
| `models/ppocr_keys_v1.txt` | 26 KB | Always |
| `ort/ort-wasm-simd-threaded.jsep.wasm` + `.mjs` | 26 MB | WebGPU build |
| `ort/ort-wasm-simd-threaded.wasm` + `.mjs` | 12.6 MB | WASM build |

`onProgress` signature: `{ pct, label, fileIndex, fileCount, done }`. Progress
uses a streaming `fetch()` body reader; it falls back to approximate sizes on
network errors or a missing `Content-Length`.

### `src/core/schema.js`

JSDoc `@typedef` definitions only — no runtime code. See "Data types" above.

### `src/core/contrast.js`

Exported: `linearise`, `luminance`, `luminanceFloat`, `wcagContrast`,
`hexToRgb`, `rgbToHex`, `colourDistance`, `kmeans2`, `regionContrast`,
`worstStripContrast`, `thresholdsFor`

Pure WCAG math and the per-region colour-separation primitives.

- **LUT for linearisation** — `LIN_LUT`, a 256-element `Float64Array` precomputed
  at module load; the dominant per-pixel cost is a lookup, not a `Math.pow`.
- **k-means (k=2) on luminance** — initialised at the 25th / 75th percentile to
  avoid symmetric-initialisation failure; centroids are ordered so `c[0]` is the
  darker cluster.
- **Strip-based worst case** — `worstStripContrast()` divides a bbox into
  character-width vertical strips and reports the worst strip, catching gradient
  backgrounds where contrast degrades across a single word.

### `src/core/analyse.js`

Exported: `filterOcrDetections`, `buildColourPairs`, `analyseImage`

`analyseImage(imageData, ocrDetections)` is the entry point. It filters
detections, derives a `ColourPair` per detection (text = minority luminance
cluster, background = majority), merges visually-similar pairs (Euclidean RGB
distance < 25, keeping the worst contrast and up to 6 example words), and
produces `ReportData`.

### `src/core/image.js`

Exported: `targetSize`, `decodeAndResize`, `bitmapToImageData`

Normalises any `Blob`/`File` to a long-edge range of 800–1400 px before OCR and
analysis. `decodeAndResize()` decodes once, then downscales by drawing onto a
bounded canvas — it never materialises a full-resolution pixel buffer, which
previously crashed iOS Safari on large (12–48 MP) phone photos.
`colorSpaceConversion: 'none'` on `createImageBitmap` and an `srgb` canvas keep
pixel values exactly as the WCAG contrast math expects, with no browser colour
management applied.

### `src/adapters/paddle-ocr.js`

Exported: `getOcr()`, `runOcrOnUrl(url)`

Wraps `@gutenye/ocr-browser` (PaddleOCR PP-OCRv4). `getOcr()` is a memoised
singleton factory. `runOcrOnUrl()` accepts a blob URL, runs detection, and
converts polygon detections to axis-aligned `BBox`es.

The WebGPU execution provider is used only where ONNX Runtime Web's WebGPU
backend actually works — desktop browsers that expose `navigator.gpu`.
iOS/iPadOS expose `navigator.gpu` but ORT's WebGPU backend fails there, so Apple
mobile devices fall back to the multi-threaded WASM backend.

The ORT WASM path is set at module load:
```js
ort.env.wasm.wasmPaths = new URL('ort/', document.baseURI).href;
```
It must be absolute because ORT's dynamic `import()` of the WASM glue otherwise
resolves relative to the bundle file in `assets/`, not the page root.

To swap OCR engines, add a sibling file in `adapters/` exporting `getOcr()` and
`runOcrOnUrl()`, and change the import in `main.js`. Nothing else changes.

### `src/render/canvas.js`

Exported: `makeSwatch`, `makeClip`, `makePreview`, `makeThumb`, `sourceDataUrl`

Pure canvas drawing. Every function returns `{ canvas, dataUrl }` so the same
artefact can be inserted into the DOM and reused for PDF/Markdown export without
redrawing. No strings, no app state.

### `src/export/strings.js`

Exported: `APP_NAME`, `SITE_URL`, `THRESHOLDS_FOOTER`, `DISCLAIMER_TEXT`

The single source of truth for user-facing copy shared by the export modules —
edit once, and PDF and Markdown stay in sync.

### `src/export/markdown.js`

Exported: `buildMarkdown(entries, timestamp)`, `downloadMarkdown(markdown, filename)`

Builds a Markdown report with a summary table and per-image sections; every
image (preview, swatches, clips) is embedded as a base64 data URI. GitHub strips
embedded images from Markdown renders — the output is best viewed in VS Code,
Obsidian, or Typora.

### `src/export/pdf.js`

Exported: `downloadPdf(entries, timestamp, filename)`

Lazy-loads `pdfmake` (and its bundled Roboto fonts) on first call and builds a
multi-page document with embedded images.

Both export modules accept `AnalysedEntry[]`. Column order in the reports is
**Background → Foreground** (the background is the reading context).

### `src/ui/dropzone.js`

Exported: `initDropzone({ dropzoneEl, inputEl, chooseBtn, onFiles })`

Handles drag-and-drop, the file picker, and keyboard activation. Filters files
to the `image/*` MIME type and delegates to `onFiles()` in `main.js`.

### `src/ui/progress.js`

Exported: `createQueueRow(filename)`, `setRowStage(row, stage, extra?)`

Per-file queue rows. Stages, in order:
`queued → decoding → ocr → analysing → done | failed`. CSS classes on the row
drive the badge colour.

### `src/ui/report-view.js`

Exported: `renderResultsHeader`, `renderThresholdsFooter`, `renderSummary`,
`renderImageCard`, `summaryItemFromEntry`

Renders the DOM report. DOM nodes are created with `document.createElement` (no
`innerHTML` for user-derived content). `renderImageCard()` has a deliberate side
effect: it populates `entry.previewDataUrl` and `entry.pairAssets`, so the
export modules can run afterwards without redrawing. `summaryItemFromEntry()`
extracts the data `renderSummary()` needs.

---

## Service worker (`public/sw.js`)

A single hand-written service worker does two jobs:

1. **Cross-origin isolation** — injects `Cross-Origin-Opener-Policy` and
   `Cross-Origin-Embedder-Policy` headers (the `coi-serviceworker` technique) so
   `crossOriginIsolated` is true and the multi-threaded WASM ORT backend can use
   `SharedArrayBuffer`. On hosts that set those headers themselves this is
   redundant but harmless.
2. **Model caching** — cache-first for `/models/` and `/ort/` requests, stored
   in the Cache Storage API (`icc-model-cache-v*`). iOS Safari evicts large
   files from its HTTP cache between visits; Cache Storage is durable, so the
   ~30 MB of models and runtime download only once.

Only one service worker can control a scope, so both jobs share this file. Bump
`MODEL_CACHE` in `sw.js` whenever the runtime or model files change.

---

## Build and deploy

### Development

```bash
npm install          # installs deps AND runs copy-models.mjs
npm run dev          # Vite dev server at http://localhost:5173
```

The dev server sets the `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`
headers directly (see `vite.config.js`), which are required for
`SharedArrayBuffer`. In production those headers come from `public/sw.js`.

### Production build

```bash
npm run build        # outputs to dist/
npm run preview      # preview the dist/ build locally
```

Vite builds two HTML entry points (`index.html`, `privacy.html`). The build
target is ES2022. `onnxruntime-web` is excluded from Vite's dependency
optimisation because it ships pre-bundled WASM assets that must remain separate
files.

### Deployment

The `dist/` directory is a self-contained static site — deploy it to any HTTPS
static host. The live deployment uses GitHub Pages via
`.github/workflows/deploy.yml` (build and deploy on push to `main`). No
server-side configuration is required: `public/sw.js` supplies the COOP/COEP
headers on hosts that cannot set them.

---

## Dependencies

Dependencies are declared in `package.json` and pinned in `package-lock.json`:

| Package | Type | Role |
|---|---|---|
| `@gutenye/ocr-browser` | dependency | PaddleOCR PP-OCRv4 pipeline |
| `onnxruntime-web` | dependency | ONNX inference runtime — imported directly by `adapters/paddle-ocr.js` |
| `pdfmake` | dependency | PDF export |
| `@gutenye/ocr-models` | devDependency | Packaged PP-OCRv4 ONNX models — `copy-models.mjs` copies these into `public/models/` |
| `vite` | devDependency | Build tool |

`onnxruntime-web` is declared explicitly even though `@gutenye/ocr-browser`
pulls it in transitively: `adapters/paddle-ocr.js` imports it directly, so it
must be a first-class dependency. Likewise `@gutenye/ocr-models` is declared
explicitly because `scripts/copy-models.mjs` reads its files at build time.

Every package in the tree is permissively licensed (MIT / Apache-2.0 /
BSD-3-Clause / ISC / Boost-1.0) — no copyleft. The README's "Dependencies and
licensing" section has the full breakdown.

---

## Design decisions

**Why PaddleOCR PP-OCRv4?**
Available as a browser-native ONNX model via `@gutenye/ocr-browser` — no server
needed, with WebGPU acceleration on supported desktop browsers.

**Why k-means for foreground/background separation?**
UI screenshots have gradients, shadows, and blended colours. A median-luminance
split misclassifies text on mid-tone backgrounds; k-means (k=2) on luminance
converges to a two-cluster solution that mirrors how accessibility auditors
think about text colour vs background colour.

**Why strip-based worst case?**
Checking a whole bounding box averages out gradient degradation. Character-width
vertical strips find the worst contrast within a word — which is what a WCAG
auditor reports.

**Why `colorSpaceConversion: 'none'` and an sRGB canvas?**
They ensure the pixel values are exactly the sRGB values WCAG contrast math
expects, with no browser colour management applied.

**Why lazy-load OCR and pdfmake?**
The OCR stack (`@gutenye/ocr-browser` + `onnxruntime-web` + `@techstark/opencv-js`)
is ~10 MB of JavaScript; pdfmake with Roboto fonts is ~1 MB. Deferring both
keeps the initial page load fast. OCR is still warmed proactively once the page
is interactive (see `main.js`).

**Why a layered `core/adapters/render/export/ui` structure?**
Each layer has one job and one dependency direction. `core/` stays pure and
testable, the OCR engine is swappable, and user-facing copy lives in exactly one
place (`export/strings.js`).

**Why no framework?**
The UI state machine is simple (landing → processing → results). A framework
would add bundle size and complexity with no benefit at this scale.

---

## Extending the tool

### Adding a new export format

1. Create `src/export/your-format.js` exporting
   `downloadYourFormat(entries, timestamp, filename)`.
2. Import types from `../core/schema.js` and copy from `./strings.js`.
3. Each `entry` is an `AnalysedEntry`:
   `{ id, filename, report, previewDataUrl, pairAssets[] }`.
4. Wire a button in `index.html` and a handler in `src/main.js`.

### Changing WCAG thresholds

Edit `thresholdsFor()` in `src/core/contrast.js` and `THRESHOLDS_FOOTER` in
`src/export/strings.js`.

### Replacing the OCR engine

Add `src/adapters/your-engine.js` exporting `getOcr()` and
`runOcrOnUrl(blobUrl)`, where `runOcrOnUrl` resolves to `OcrWord[]`
(`{ text, score, bbox }`) in the same pixel space as the `imageData` passed to
`analyseImage()`. Change the import in `main.js`. Nothing else changes.

### Adding a new UI page

1. Create `yourpage.html` at the repo root alongside `index.html`.
2. Add it to `build.rollupOptions.input` in `vite.config.js`.
3. Link to it from the `src/main.js` footer via the `lnk()` helper.
