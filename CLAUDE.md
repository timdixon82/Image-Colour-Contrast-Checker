# Image Colour Contrast Checker — Architecture Guide

This file is for AI assistants working on this project. Read it before touching any code.

---

## What this project does

Drops images into a browser, runs OCR to find text regions, measures WCAG 2.2 contrast ratios for each colour pair found, and produces a pass/fail accessibility report. Everything runs client-side — no server, no uploads.

---

## Module map

The codebase is deliberately split into layers. Each layer has one job and one set of dependencies. **Do not collapse them back together.**

```
src/
  core/            Pure logic — no DOM, no browser APIs (safe in Node/workers)
    schema.js      JSDoc type definitions only — no runtime code
    contrast.js    WCAG math primitives
    colour-vision.js Colour-vision-deficiency simulation (Machado 2009 matrices)
    apca.js        APCA contrast math (vendored verbatim from apca-w3 0.1.9)
    perceptual.js  APCA verdict, vestibular saturation, cognitive verdict
    analyse.js     Analysis pipeline: ImageData + OcrWord[] → ReportData
    image.js       Image decode and resize

  adapters/        Swappable integrations (one file per engine)
    paddle-ocr.js  PaddleOCR PP-OCRv4 via ONNX Runtime Web

  render/          Browser canvas utilities — pure drawing, no strings
    canvas.js      makeSwatch, makeClip, makePreview, makeThumb, makeCbSim, sourceDataUrl

  export/          Report generators — accept AnalysedEntry[], produce files
    strings.js     All user-facing copy: footers, disclaimers, URLs
    checks.js      Shapes a ColourPair into the six display checks (shared)
    pdf.js         PDF via pdfmake
    markdown.js    Markdown with embedded base64 images

  ui/              App-specific DOM components
    dropzone.js    Drag-drop and file-picker
    progress.js    Queue row progress badges
    report-view.js DOM report renderer (summary table + image cards)

  preloader.js     Model download progress (app-level, not shareable)
  main.js          Orchestration only — wires modules together, no logic
  styles.css       All CSS (CSS custom properties for theming)

index.html         The tool itself — includes the static "What the checks
                   mean" section (`#check-glossary`)
privacy.html       Privacy statement (Vite multi-page entry)
```

---

## The data types (src/core/schema.js)

Everything flows through these types. Always check schema.js before creating new data shapes.

```
BBox            { x, y, w, h }  — pixel coordinates in the resized image

OcrWord         { text, score, bbox }  — one word from an OCR adapter

CvdContrast     { fgHex, bgHex, contrast, pass }
                — one pair's contrast recomputed for one dichromacy

ApcaResult      { lc, status, message }              — APCA perceptual contrast
VestibularResult{ fgSat, bgSat, maxSat, status, message } — saturation / shimmer
CognitiveResult { status, message }                  — derived cognitive verdict

ColourPair      { fgHex, bgHex, contrast, pass, required,
                  passAaa, requiredAaa, examples[], bboxes[],
                  cvd{deuteranopia,protanopia,tritanopia}, cvdRisk,
                  apca, vestibular, cognitive, overall }
                — a unique fg/bg combination merged across the whole image.
                  `overall` (PASS|WARN|FAIL) rolls up every check.

ReportData      { hasText, colourPairs[], verdict, flag, detail }
                — the complete analysis result for one image

PairAsset       { pair, swatchDataUrl, clipDataUrl? }
                — canvas assets built during DOM rendering

CbSimAsset      { key, label, note, dataUrl }
                — one whole-image colour-blindness simulation

AnalysedEntry   { id, filename, report, previewDataUrl,
                  pairAssets[], cbSimAssets[] }
                — everything the export modules need; no DOM or app state
```

`AnalysedEntry` is the contract between the UI layer and the export layer. The export modules (`pdf.js`, `markdown.js`) accept `AnalysedEntry[]` and nothing else.

---

## The pipeline

```
File/Blob
  └─ core/image.js         decodeAndResize()        → ImageBitmap
  └─ core/image.js         bitmapToImageData()      → { canvas, imageData }

ImageBitmap URL
  └─ adapters/paddle-ocr.js  runOcrOnUrl()          → OcrWord[]

ImageData + OcrWord[]
  └─ core/analyse.js       analyseImage()           → ReportData

ReportData + sourceCanvas
  └─ ui/report-view.js     renderImageCard()        → DOM + populates entry.pairAssets,
                                                        entry.previewDataUrl, entry.cbSimAssets

AnalysedEntry[]
  └─ export/pdf.js         downloadPdf()            → .pdf file
  └─ export/markdown.js    downloadMarkdown()       → .md file
```

The orchestrator is `main.js`. It runs this pipeline for each file and calls the renderers.

---

## Rules for editing this codebase

### core/ files
- **No DOM APIs.** No `document`, no `window`, no `HTMLCanvasElement`.
- **No import from render/, ui/, export/, or adapters/.**
- `schema.js` has zero runtime code — only JSDoc `@typedef` blocks.
- `contrast.js` contains pure math. `analyseImage` lives in `analyse.js`, not `contrast.js`.

### adapters/
- Each file exports `getOcr()` and `runOcrOnUrl(url: string): Promise<OcrWord[]>`.
- To add a new OCR engine, create `src/adapters/my-engine.js` with those two exports. Change the import in `main.js`. Nothing else changes.

### render/canvas.js
- Every function returns `{ canvas: HTMLCanvasElement, dataUrl: string }`.
- No strings. No footers. No brand copy. Pure drawing only.

### export/strings.js
- **This is the single source of truth for all user-facing copy.**
- `THRESHOLDS_FOOTER`, `DISCLAIMER_TEXT`, `SITE_URL`, `APP_NAME`, `CVD_TYPES`
  and `checkInfoUrl()` are defined here.
- Edit here once; PDF and Markdown are always in sync because both import from this file.
- Do not hardcode any of these strings in `pdf.js`, `markdown.js`, or `report-view.js`.

### export/checks.js
- `pairChecks(pair)` shapes one `ColourPair` into the six display checks
  (WCAG AA, WCAG AAA, APCA, CVD contrast, Vestibular, Cognitive). Each check's
  `id` is also its anchor (`#check-info-<id>`) in the static "What the checks
  mean" section of `index.html`.
- `overallLine(report)` builds the one-line "N combinations · X fail …" summary.
- The web report, PDF and Markdown all consume these — never rebuild the
  check list in a renderer.

### export/ (pdf.js, markdown.js)
- Both accept `AnalysedEntry[]` as defined in `schema.js`.
- They must not import from `ui/`, `adapters/`, or `core/image.js`.
- One expandable block per colour combination; in the report the detail is
  always shown (PDF) or in a `<details>` element (Markdown).

### ui/report-view.js
- Imports from `render/canvas.js`, `export/strings.js` and `export/checks.js`
  only (within the project).
- `renderImageCard()` has a side-effect: it populates `entry.previewDataUrl`, `entry.pairAssets` and `entry.cbSimAssets` on the entry object it is passed. This is intentional — it means the export modules can run after rendering without re-drawing anything.
- `summaryItemFromEntry()` extracts the data `renderSummary()` needs. Use it in `main.js` rather than building summary items manually.

### main.js
- Orchestration only. No business logic, no WCAG math, no canvas drawing.
- Keep it thin. If logic is growing here, it belongs in a `core/` or `ui/` module.

---

## Branding

Tim Dixon brand palette:
- Navy   `#061528`  — primary background, header
- Orange `#FF7C00`  — accent, CTAs (7.1:1 on navy — AAA)
- Blue   `#63D2FF`  — muted text in dark mode (10.6:1 on navy — AAA)
- White  `#ffffff`  — primary text on dark backgrounds

The header (`<header class="app-header">`) is always navy regardless of light/dark mode.
An orange `::after` line runs along its bottom edge.
The theme toggle switches between light and dark; OS preference is respected unless the user has made a manual choice (stored in `localStorage` under key `td-theme`).

---

## Accessibility targets

This tool targets **WCAG 2.2 AAA** for its own UI.

Key colour contrast values (all ≥ 7:1 where required):
- Light mode `--pass: #14532d` / `--fail: #7f1d1d` / `--warn: #663a00` — all ≥ 8:1 on their pill backgrounds ✓
- Dark mode  `--pass: #4ade80` / `--fail: #fca5a5` / `--warn: #fcd34d` — all ≥ 7.9:1 on their pill backgrounds ✓
- Status pills use **solid** backgrounds in both themes so contrast is independent of what is behind them.
- `--fg-muted` is ≥ 7.7:1 on every surface it appears on (card, panel, page) in both themes.

When adding a status colour, verify it ≥ 7:1 in **both** light and dark mode — pills and
muted text appear on the card, on `--neutral-bg` panels, and on the page background.

Other requirements already in place:
- Skip-to-content link at top of `<body>`
- Global `:focus-visible` ring (3 px, offset 3 px)
- Minimum 44 px touch targets on interactive elements (`min-height: 44px`)
- `scope="col"` on all `<th>` elements
- `table-scroll` wrapper on all tables (horizontal scroll on narrow viewports)
- `aria-live` on the preloader status and the processing queue

Do not remove or weaken any of these.

---

## Adding a new export format

1. Create `src/export/my-format.js`.
2. Import `AnalysedEntry` types from `../core/schema.js` (JSDoc only).
3. Import strings from `./strings.js`.
4. Import `sourceDataUrl` (or other helpers) from `../render/canvas.js` if you need image data.
5. Export a `downloadMyFormat(entries: AnalysedEntry[], timestamp: string, filename: string)` function.
6. Wire up a button in `index.html` and add the handler to `main.js`.

No other files need to change.

---

## Version bumping

Every commit that changes behaviour must bump `package.json` → `version`. `package-lock.json` updates automatically on the next `npm install`. Commit both files together.

Current version: **0.2.18** — bump `package.json` on every behavioural change.

---

## Service worker (`public/sw.js`)

A single hand-written service worker, registered by `<script src="/sw.js">` in
`index.html`, does two things:

1. **Cross-origin isolation** — injects COOP/COEP headers (the `coi-serviceworker`
   logic) so `crossOriginIsolated` is true and multi-threaded WASM works.
2. **Model caching** — cache-first for any `/models/` or `/ort/` request, stored
   in Cache Storage (`icc-model-cache-v*`). iOS Safari evicts large files from
   its HTTP cache between visits; Cache Storage is durable, so the ~30 MB of
   models download once. Bump `MODEL_CACHE` when the runtime/model files change.

There can only be one service worker per scope, so both jobs live in this file.

## Deployment

GitHub Pages via `.github/workflows/deploy.yml`. The `dist/` folder is built by Vite and deployed from the `main` branch. The live URL is:

**https://timdixon82.github.io/Image-Colour-Contrast-Checker**

This URL is the canonical value of `SITE_URL` in `src/export/strings.js`.
