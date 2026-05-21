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
    analyse.js     Analysis pipeline: ImageData + OcrWord[] → ReportData
    image.js       Image decode and resize

  adapters/        Swappable integrations (one file per engine)
    paddle-ocr.js  PaddleOCR PP-OCRv4 via ONNX Runtime Web

  render/          Browser canvas utilities — pure drawing, no strings
    canvas.js      makeSwatch, makeClip, makePreview, makeThumb, sourceDataUrl

  export/          Report generators — accept AnalysedEntry[], produce files
    strings.js     All user-facing copy: footers, disclaimers, URLs
    pdf.js         PDF via pdfmake
    markdown.js    Markdown with embedded base64 images

  ui/              App-specific DOM components
    dropzone.js    Drag-drop and file-picker
    progress.js    Queue row progress badges
    report-view.js DOM report renderer (summary table + image cards)

  preloader.js     Model download progress (app-level, not shareable)
  main.js          Orchestration only — wires modules together, no logic
  styles.css       All CSS (CSS custom properties for theming)
```

---

## The data types (src/core/schema.js)

Everything flows through these types. Always check schema.js before creating new data shapes.

```
BBox            { x, y, w, h }  — pixel coordinates in the resized image

OcrWord         { text, score, bbox }  — one word from an OCR adapter

ColourPair      { fgHex, bgHex, contrast, pass, required,
                  passAaa, requiredAaa, examples[], bboxes[] }
                — a unique fg/bg combination merged across the whole image

ReportData      { hasText, colourPairs[], verdict, flag, detail }
                — the complete analysis result for one image

PairAsset       { pair, swatchDataUrl, clipDataUrl? }
                — canvas assets built during DOM rendering

AnalysedEntry   { id, filename, report, previewDataUrl, pairAssets[] }
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
  └─ ui/report-view.js     renderImageCard()        → DOM + populates entry.pairAssets
                                                        and entry.previewDataUrl

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
- `THRESHOLDS_FOOTER`, `DISCLAIMER_TEXT`, `SITE_URL`, `APP_NAME` are defined here.
- Edit here once; PDF and Markdown are always in sync because both import from this file.
- Do not hardcode any of these strings in `pdf.js`, `markdown.js`, or `report-view.js`.

### export/ (pdf.js, markdown.js)
- Both accept `AnalysedEntry[]` as defined in `schema.js`.
- They must not import from `ui/`, `adapters/`, or `core/image.js`.
- Column order is **Background → Foreground** (bg is the reading context).

### ui/report-view.js
- Imports from `render/canvas.js` and `export/strings.js` only (within the project).
- `renderImageCard()` has a side-effect: it populates `entry.previewDataUrl` and `entry.pairAssets` on the entry object it is passed. This is intentional — it means the export modules can run after rendering without re-drawing anything.
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
- Light mode `--pass: #14532d`  — 9.1:1 on white ✓
- Light mode `--fail: #7f1d1d`  — 10:1 on white ✓
- Dark mode  `--pass: #4ade80`  — 8.8:1 on card bg ✓
- Dark mode  `--fail: #fca5a5`  — 8.1:1 on card bg ✓

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

Current version: **0.2.3** — bump `package.json` on every behavioural change.

---

## Deployment

GitHub Pages via `.github/workflows/deploy.yml`. The `dist/` folder is built by Vite and deployed from the `main` branch. The live URL is:

**https://timdixon82.github.io/Image-Colour-Contrast-Checker**

This URL is the canonical value of `SITE_URL` in `src/export/strings.js`.
