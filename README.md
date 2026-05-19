# Image Colour Contrast Checker

**Live tool:** [image-colour-contrast-checker.timdixon.net](https://image-colour-contrast-checker.timdixon.net)

A privacy-respecting, **fully client-side** web app that audits images for WCAG 2.2 AA / AAA text-contrast. Drop in one or more screenshots, get back a per-image report with foreground/background colour pairs, contrast ratios, AA/AAA pass-fail, failing-region clips, and one-click PDF or Markdown export.

Nothing is uploaded. OCR, contrast analysis, and report generation all run in your browser. See the [Privacy Statement](https://image-colour-contrast-checker.timdixon.net/privacy.html) for full details.

For a full technical description of every module, the data pipeline, and how to extend the tool, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Features

- **WCAG 2.2 AA & AAA** contrast analysis with the per-strip "worst-case" sampling used by accessibility auditors (catches gradient backgrounds where contrast degrades mid-word).
- **PaddleOCR PP-OCRv4** text detection + recognition via [`@gutenye/ocr-browser`](https://github.com/gutenye/ocr) + [`onnxruntime-web`](https://github.com/microsoft/onnxruntime). WebGPU on Chrome/Edge desktop; WASM fallback everywhere else.
- **k-means colour split** per OCR region — text = minority cluster, background = majority — so it works on real-world UI screenshots, not just plain text on solid backgrounds.
- **Similar-colour merging** so visually-identical foreground/background pairs roll up into one row with their worst-case ratio.
- **Streaming results** — each image's card appears as it finishes; no waiting for the batch.
- **Exports**:
  - **PDF** via [pdfmake](https://github.com/bpampuch/pdfmake) — selectable text, per-image page breaks, embedded swatches and clips.
  - **Single-file Markdown** with base64-embedded preview, swatches, and failing-region clips. Best viewed in VS Code / Obsidian / Typora (GitHub strips embedded images from Markdown).

## Quick start

```bash
npm install
npm run dev       # local dev server (http://localhost:5173)
npm run build     # produces dist/ — deploy anywhere as static files
npm run preview   # preview the built dist/ locally
```

The `postinstall` / `prebuild` / `predev` hooks copy the PaddleOCR ONNX models and the `onnxruntime-web` WASM binaries out of `node_modules` and into `public/` so they're served as static assets.

## How it works

```
File -> createImageBitmap (resize to 800-1400 long edge, sRGB, no colour management)
     -> canvas + ImageData
     -> PaddleOCR PP-OCRv4 detection + recognition (via onnxruntime-web)
     -> per-detection vertical-strip scan
        -> k-means (k=2) on per-pixel luminance
        -> minority cluster = text, majority = background
        -> WCAG contrast ratio
     -> merge similar-colour findings
     -> verdict (PASS / FAIL / NO_TEXT) + per-pair AA/AAA
     -> render summary table + per-image cards
     -> optional PDF / Markdown export
```

WCAG thresholds applied:

- **AA**: 4.5:1 normal text · 3:1 large text
- **AAA**: 7:1 normal text · 4.5:1 large text
- Large text = OCR bbox height ≥ 24 px (in the canonical resized image space).

See `src/lib/wcag.js` for the contrast-ratio math.

## Browser support

| Browser | Status | Notes |
|---|---|---|
| Chrome / Edge (desktop) | Full | WebGPU OCR acceleration |
| Safari (desktop)        | Full | WASM OCR (5-15s per image) |
| Firefox (desktop)       | Full | WASM OCR |
| Chrome (Android)        | Full | WASM OCR |
| Safari (iOS)            | Works | WASM only; allow ~30s on first run for model + WASM cache |

First use downloads about 28 MB total (PaddleOCR detection + recognition models + ORT WASM). Cached by the browser after that.

## Privacy

All processing happens in your browser. No images, OCR text, or contrast data leaves your device. The only network traffic is the one-time fetch of the PaddleOCR model files and the `onnxruntime-web` WASM binaries (served from the same origin as the app). No cookies, no analytics, no tracking.

Full details: [Privacy Statement](https://image-colour-contrast-checker.timdixon.net/privacy.html)

## Tech stack

- **[Vite](https://vitejs.dev/)** — build tool
- **Vanilla ES modules** — no framework
- **[@gutenye/ocr-browser](https://github.com/gutenye/ocr)** — PaddleOCR-in-the-browser
- **[onnxruntime-web](https://github.com/microsoft/onnxruntime)** — ONNX model inference
- **[pdfmake](https://github.com/bpampuch/pdfmake)** — PDF generation

## Dependencies and licensing

Every runtime and build-time dependency uses a permissive licence. There are no copyleft (GPL / LGPL / AGPL) packages in the tree.

### Direct production dependencies

| Package | Version | Licence | Purpose |
|---|---|---|---|
| [@gutenye/ocr-browser](https://github.com/gutenye/ocr)   | 1.4.x | MIT | Browser entry for the PaddleOCR pipeline |
| [@gutenye/ocr-common](https://github.com/gutenye/ocr)    | 1.4.x | MIT | OCR detection + recognition core |
| [@gutenye/ocr-models](https://github.com/gutenye/ocr)    | 1.4.x | MIT | Packaged PP-OCRv4 ONNX models (see "Models" below) |
| [onnxruntime-web](https://github.com/microsoft/onnxruntime) | 1.26.x | MIT | ONNX inference runtime |
| [onnxruntime-common](https://github.com/microsoft/onnxruntime) | 1.26.x | MIT | Shared ORT types |
| [@techstark/opencv-js](https://github.com/TechStark/opencv-js) | 4.9.x | Apache-2.0 | OpenCV.js — used by OCR for contour finding |
| [pdfmake](https://github.com/bpampuch/pdfmake) | 0.2.x | MIT | PDF export |
| [tiny-invariant](https://github.com/alexreardon/tiny-invariant) | 1.3.x | MIT | Assertion helper (transitive via OCR) |
| [js-clipper](https://www.npmjs.com/package/js-clipper) | 1.0.x | Boost-1.0 | Polygon clipping (transitive via OCR) |

### Transitive dependencies (selected)

| Package | Licence |
|---|---|
| protobufjs + `@protobufjs/*` | BSD-3-Clause |
| flatbuffers | Apache-2.0 |
| long | Apache-2.0 |
| platform | MIT |
| guid-typescript | ISC |
| pako | MIT / Zlib |
| pdfmake's `@foliojs-fork/*` family (pdfkit, fontkit, linebreak, restructure) | MIT |
| brotli, clone, deep-equal, dfa, png-js, sax, unicode-properties, unicode-trie | MIT (sax is BlueOak-1.0.0) |

### Build-time dependencies

| Package | Licence |
|---|---|
| [Vite](https://vitejs.dev/) | MIT |
| Rollup | MIT |
| esbuild | MIT |
| PostCSS | MIT |

### Models

The OCR models are PaddleOCR PP-OCRv4 (Apache-2.0), distributed by [@gutenye/ocr-models](https://github.com/gutenye/ocr) and copied into `public/models/` at install time:

| File | Source | Licence |
|---|---|---|
| `ch_PP-OCRv4_det_infer.onnx` | [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) | Apache-2.0 |
| `ch_PP-OCRv4_rec_infer.onnx` | [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) | Apache-2.0 |
| `ppocr_keys_v1.txt`          | [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) | Apache-2.0 |

### Generated PDF fonts

The exported PDFs are typeset in **Roboto**, bundled inside pdfmake's `vfs_fonts.js`. Roboto is licenced under **Apache-2.0** ([upstream](https://github.com/googlefonts/roboto)).

## Licence

This project is released under the **MIT Licence** — see [`LICENSE`](./LICENSE).

MIT was chosen because every runtime and build-time dependency is permissively licenced (MIT, Apache-2.0, BSD-3-Clause, ISC, BlueOak-1.0.0, Boost-1.0, MIT/Zlib). MIT is fully compatible with all of them and imposes the lightest possible obligations on downstream users.

> If you redistribute this project, please retain attribution for the upstream projects listed above — in particular **PaddleOCR** (Apache-2.0) for the OCR models and **OpenCV** (Apache-2.0) for `@techstark/opencv-js`. Apache-2.0 requires that the licence text and any NOTICE files travel with redistributed binaries. Both projects' licence files ship inside their `node_modules` directories and inside the published `dist/` build.

## Acknowledgements

- **[PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)** — the upstream OCR project from PaddlePaddle.
- **[gutenye/ocr](https://github.com/gutenye/ocr)** — the browser-first port of PaddleOCR that makes this app possible.
- **[ONNX Runtime](https://github.com/microsoft/onnxruntime)** — Microsoft's cross-platform inference engine.
- **[OpenCV.js (TechStark)](https://github.com/TechStark/opencv-js)** — OpenCV in the browser.
- **[pdfmake](https://github.com/bpampuch/pdfmake)** — client-side PDF generation.
- **WCAG 2.2** — the W3C guideline whose contrast thresholds are encoded here.
