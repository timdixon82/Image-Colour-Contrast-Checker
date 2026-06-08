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

Tim Dixon Design System v1.0 (May 2026). All tokens live in `src/styles.css`.

**Brand colours (used in logo, wordmark, and large accents):**
- Brand navy  `#0C3B64` — primary accent in light themes
- Brand orange `#EB9C52` — primary accent in dark themes (WARN-level, large elements only)
- Brand sky    `#52C7EB` — secondary accent in dark themes

**Four required themes** — set via `<html data-theme="…">`, managed by the inline `tdTheme` bootstrap in `<head>`:

| Theme | `data-theme` value | Character |
|---|---|---|
| Light | `light` | Vivid brand, light surfaces — WCAG AAA, vestibular WARN on accents |
| Dark | `dark` | Vivid brand, deep navy surfaces — WCAG AAA, vestibular WARN on accents |
| Muted Light | `muted-light` | Desaturated brand, light — all five checkers SAFE/PASS |
| Muted Dark | `muted-dark` | Desaturated brand, dark — all five checkers SAFE/PASS |

Every surface, component, and export must support all four themes. Never hardcode hex values — use the semantic tokens (`--bg`, `--fg`, `--accent`, `--warm`, `--pass`, `--fail`, `--warn`, etc.) defined in `src/styles.css`.

**Header** — theme-adaptive (`var(--bg-card)`); "Contrast Checker" wordmark uses `var(--accent)` in light themes, `var(--warm)` in dark themes. Bottom accent line: `linear-gradient(90deg, var(--warm), var(--accent) 70%, transparent)`.

**Theme persistence** — `localStorage["td-theme"]`; default follows OS `prefers-color-scheme`. The `tdTheme` API (set via inline script before CSS loads) exposes `.set()`, `.get()`, `.toggleMode()`, `.toggleFamily()`.

---

## Accessibility targets

This tool targets **WCAG 2.2 AAA** for its own UI.

Key colour contrast values — all ≥ 7:1 (WCAG 2.2 AAA) across all four themes:

| Token | Light | Dark | Muted Light | Muted Dark |
|---|---|---|---|---|
| `--pass` | `#15662F` | `#8FD3A2` | `#1E5631` | `#A7D9B5` |
| `--fail` | `#A12525` | `#F0A6A6` | `#8A2A2A` | `#E6A9A9` |
| `--warn` | `#544012` | `#DDB84B` | `#4E3C18` | `#DFC686` |

Status pills use **solid** `--pass-bg` / `--fail-bg` / `--warn-bg` backgrounds so contrast is independent of what is behind them.

`--fg-muted` passes ≥ 7:1 on every surface in all four themes — `--bg-card`, `--neutral-bg`, and `--bg`.

When adding a status colour, verify it ≥ 7:1 on **all three surfaces** (`--bg-card`, `--neutral-bg`, `--bg`) in **all four themes**. The `--neutral-bg` panel is typically the tightest surface.

Other requirements already in place:
- Skip-to-content link at top of `<body>`
- Global `:focus-visible` ring (3 px, offset 3 px)
- Minimum 44 px touch targets on interactive elements (`min-height: 44px`)
- `scope="col"` on all `<th>` elements
- `table-scroll` wrapper on all tables (horizontal scroll on narrow viewports)
- `aria-live` on the model-download status and the processing queue

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

Current version: **0.4.19** — bump `package.json` on every behavioural change.

---

## Service worker (`public/sw.js`)

A single hand-written service worker, registered by `<script src="sw.js">` in
`index.html`, does two things:

1. **Cross-origin isolation** — injects COOP/COEP headers (the `coi-serviceworker`
   logic) so `crossOriginIsolated` is true and multi-threaded WASM works.
2. **Model caching** — cache-first for any `/models/` or `/ort/` request, stored
   in Cache Storage (`icc-model-cache-v*`). iOS Safari evicts large files from
   its HTTP cache between visits; Cache Storage is durable, so the ~30 MB of
   models download once. Bump `MODEL_CACHE` when the runtime/model files change.

There can only be one service worker per scope, so both jobs live in this file.

## Deployment

GitHub Pages via `.github/workflows/deploy.yml` — every push to `main` builds with Vite and deploys the `dist/` artifact. The live site is:

**https://image-colour-contrast-checker.timdixon.net**

This is the canonical value of `SITE_URL` in `src/export/strings.js`; the PDF and Markdown exports build their check links from it.
