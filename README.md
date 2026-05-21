# Image Colour Contrast Checker

**Live tool:** [image-colour-contrast-checker.timdixon.net](https://image-colour-contrast-checker.timdixon.net)

A privacy-respecting, **fully client-side** web app that audits images for text accessibility. Drop in one or more screenshots, get back a per-image report: for every foreground/background colour pair it runs six checks — WCAG AA, WCAG AAA, APCA, colour-vision-deficiency contrast, vestibular saturation and a cognitive verdict — alongside whole-image colour-blindness simulations, cropped failing regions, and one-click PDF or Markdown export.

Nothing is uploaded. OCR, contrast analysis, and report generation all run in your browser. See the [Privacy Statement](https://image-colour-contrast-checker.timdixon.net/privacy.html) for full details.

For a full technical description of every module, the data pipeline, and how to extend the tool, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Features

- **WCAG 2.2 AA & AAA** contrast analysis with the per-strip "worst-case" sampling used by accessibility auditors (catches gradient backgrounds where contrast degrades mid-word).
- **APCA** perceptual contrast — the Advanced Perceptual Contrast Algorithm, vendored from [`apca-w3`](https://github.com/Myndex/apca-w3) into `src/core/apca.js` (no runtime dependency). A beta perceptual signal beyond the WCAG ratio (not a WCAG requirement).
- **Colour-vision-deficiency contrast** — each pair's contrast recomputed for deuteranopia, protanopia and tritanopia using the Machado (2009) matrices, flagging pairs that pass for normal vision but fail for a CVD viewer.
- **Whole-image colour-blindness simulation** — every image rendered as four common deficiencies see it.
- **Vestibular & cognitive checks** — flags highly saturated pairings that can shimmer, and rolls every check into one plain-language verdict.
- **Expandable per-combination report** — one row per colour pair, collapsed until you open it. A static "What the checks mean" section explains every check, and each check's ⓘ link jumps straight to its entry.
- **PaddleOCR PP-OCRv4** text detection + recognition via [`@gutenye/ocr-browser`](https://github.com/gutenye/ocr) + [`onnxruntime-web`](https://github.com/microsoft/onnxruntime). WebGPU on Chrome/Edge desktop; WASM fallback everywhere else.
- **k-means colour split** per OCR region — text = minority cluster, background = majority — so it works on real-world UI screenshots, not just plain text on solid backgrounds.
- **Similar-colour merging** so visually-identical foreground/background pairs roll up into one row with their worst-case ratio.
- **Streaming results** — each image's card appears as it finishes; no waiting for the batch.
- **Exports**:
  - **PDF** via [pdfmake](https://github.com/bpampuch/pdfmake) — selectable text, per-image page breaks, embedded swatches, simulations and clips.
  - **Single-file Markdown** with base64-embedded preview, simulations, swatches, and cropped regions. Best viewed in VS Code / Obsidian / Typora (GitHub strips embedded images from Markdown).

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
File -> decode + downscale to 800-1400 px long edge (sRGB, no colour management)
     -> canvas + ImageData
     -> PaddleOCR PP-OCRv4 detection + recognition (via onnxruntime-web)
     -> per-detection vertical-strip scan
        -> k-means (k=2) on per-pixel luminance
        -> minority cluster = text, majority = background
        -> WCAG contrast ratio
     -> merge similar-colour findings
     -> per pair: WCAG AA/AAA, APCA, CVD contrast, vestibular, cognitive
        -> rolled-up overall verdict (PASS / WARN / FAIL)
     -> verdict (PASS / FAIL / NO_TEXT)
     -> render summary table + per-image cards (expandable rows
        + colour-blindness simulations)
     -> optional PDF / Markdown export
```

WCAG thresholds applied:

- **AA**: 4.5:1 normal text · 3:1 large text
- **AAA**: 7:1 normal text · 4.5:1 large text
- Large text = OCR bbox height ≥ 24 px (in the canonical resized image space).

See `src/core/contrast.js` for the contrast-ratio math.

## Browser support

| Browser | Status | Notes |
|---|---|---|
| Chrome / Edge (desktop) | Full | WebGPU OCR acceleration |
| Safari (desktop)        | Full | WASM OCR (5-15s per image) |
| Firefox (desktop)       | Full | WASM OCR |
| Chrome (Android)        | Full | WASM OCR |
| Safari (iOS / iPadOS)   | Full | WASM OCR; WebGPU disabled (ORT's WebGPU backend is unsupported on iOS) |

First use downloads about 28 MB total (PaddleOCR detection + recognition models + ORT WASM). A service worker caches them in the Cache Storage API, so later visits load them without re-downloading.

## Privacy

All processing happens in your browser. No images, OCR text, or contrast data ever leaves your device. Network traffic is limited to the one-time fetch of the PaddleOCR model files and the `onnxruntime-web` WASM binaries (served from the same origin as the app), plus a cookieless, privacy-friendly [GoatCounter](https://www.goatcounter.com/) page-view count — no cookies, no personal data, no cross-site tracking.

Full details: [Privacy Statement](https://image-colour-contrast-checker.timdixon.net/privacy.html)

## Tech stack

- **[Vite](https://vitejs.dev/)** — build tool
- **Vanilla ES modules** — no framework
- **[@gutenye/ocr-browser](https://github.com/gutenye/ocr)** — PaddleOCR-in-the-browser
- **[onnxruntime-web](https://github.com/microsoft/onnxruntime)** — ONNX model inference
- **[APCA](https://github.com/Myndex/apca-w3)** — perceptual-contrast math, vendored into `src/core/apca.js` (not an npm dependency)
- **[pdfmake](https://github.com/bpampuch/pdfmake)** — PDF generation

## Dependencies and licensing

Every runtime and build-time dependency uses a permissive licence (MIT / Apache-2.0 / BSD-3-Clause / ISC / Boost-1.0). The one piece of non-permissive code is the APCA contrast math, which is **vendored** into the source tree rather than installed as a dependency — see [A note on the APCA licence](#a-note-on-the-apca-licence) below.

The GoatCounter analytics client (`public/count.js`, ISC) is also vendored — self-hosted rather than loaded from `gc.zgo.at` so it works under the app's cross-origin isolation (see [Privacy](#privacy)).

### Direct dependencies

Declared in `package.json` — imported directly by the source, or consumed directly by the build:

| Package | Spec | Licence | Role |
|---|---|---|---|
| [@gutenye/ocr-browser](https://github.com/gutenye/ocr) | ^1.4.8 | MIT | Browser PaddleOCR PP-OCRv4 pipeline |
| [onnxruntime-web](https://github.com/microsoft/onnxruntime) | ^1.26.0 | MIT | ONNX inference runtime — imported by `src/adapters/paddle-ocr.js` |
| [pdfmake](https://github.com/bpampuch/pdfmake) | ^0.2.10 | MIT | PDF export |
| [@gutenye/ocr-models](https://github.com/gutenye/ocr) | ^1.4.2 | MIT | Packaged PP-OCRv4 ONNX models — copied into `public/models/` by `copy-models.mjs` (dev dependency) |
| [vite](https://vitejs.dev/) | ^5.4.10 | MIT | Build tool (dev dependency) |

`onnxruntime-web` is declared explicitly even though `@gutenye/ocr-browser` also depends on it: `src/adapters/paddle-ocr.js` imports it directly, so it is a first-class dependency rather than an implicit transitive one. `@gutenye/ocr-models` is declared for the same reason — `scripts/copy-models.mjs` reads its files at build time.

### A note on the APCA licence

The APCA contrast math in `src/core/apca.js` is **vendored verbatim from [`apca-w3`](https://github.com/Myndex/apca-w3) 0.1.9** — it is *not* an npm dependency. Vendoring is deliberate: the `apca-w3` package depends on `colorparsley` (**AGPL v3**), a CSS-colour-string parser this project never needs because colours are always parsed from hex by `src/core/contrast.js`. Copying only the two W3-licensed functions the tool calls (`APCAcontrast` and `sRGBtoY`) keeps APCA working while leaving the AGPL code out of the dependency tree entirely.

APCA is **not** permissively licensed. It is distributed under a **"Limited W3 License"**: the [W3C Software and Document License](https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document), narrowed by the APCA author to permit use **only** for predicting the contrast of web-based content in support of WCAG accessibility guidelines. Commercial use beyond that scope requires a separate written agreement, and uses unrelated to web-content contrast (medical, clinical, safety-related, aerospace, transportation, military) are prohibited.

This tool uses APCA solely to predict the contrast of text in web-UI screenshots for accessibility review — squarely within the licence's permitted scope. The vendored file keeps its original W3 licence header and unmodified G-4g constants. **If you fork this project, be aware that `src/core/apca.js` is not covered by this repository's MIT licence** and carries the usage restrictions above. APCA is also still in public beta and is not a WCAG requirement; it is reported here as an additional perceptual signal only.

### Notable transitive dependencies

| Package | Licence | Pulled in by |
|---|---|---|
| [@gutenye/ocr-common](https://github.com/gutenye/ocr) | MIT | @gutenye/ocr-browser |
| [@techstark/opencv-js](https://github.com/TechStark/opencv-js) | Apache-2.0 | @gutenye/ocr-browser — contour finding |
| onnxruntime-common | MIT | onnxruntime-web |
| tiny-invariant | MIT | @gutenye/ocr-browser |
| js-clipper | Boost-1.0 | @gutenye/ocr-browser |
| protobufjs + `@protobufjs/*` | BSD-3-Clause | onnxruntime-web |
| flatbuffers, long | Apache-2.0 | onnxruntime-web |
| pdfmake's `@foliojs-fork/*` family (pdfkit, fontkit, linebreak, restructure) | MIT | pdfmake |
| Rollup, esbuild, PostCSS | MIT | vite |

The complete, version-pinned tree is in `package-lock.json`.

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

MIT was chosen because every runtime and build-time dependency is permissively licenced (MIT, Apache-2.0, BSD-3-Clause, ISC, BlueOak-1.0.0, Boost-1.0, MIT/Zlib), and MIT is fully compatible with all of them. The one exception is the vendored APCA math in `src/core/apca.js` (Limited W3 License) — this repository's MIT licence covers the project's own code, **not** that vendored file, which keeps its own usage restrictions; see [A note on the APCA licence](#a-note-on-the-apca-licence).

> If you redistribute this project, please retain attribution for the upstream projects listed above — in particular **PaddleOCR** (Apache-2.0) for the OCR models and **OpenCV** (Apache-2.0) for `@techstark/opencv-js`. Apache-2.0 requires that the licence text and any NOTICE files travel with redistributed binaries. Both projects' licence files ship inside their `node_modules` directories and inside the published `dist/` build.

## Acknowledgements

- **[PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)** — the upstream OCR project from PaddlePaddle.
- **[gutenye/ocr](https://github.com/gutenye/ocr)** — the browser-first port of PaddleOCR that makes this app possible.
- **[ONNX Runtime](https://github.com/microsoft/onnxruntime)** — Microsoft's cross-platform inference engine.
- **[OpenCV.js (TechStark)](https://github.com/TechStark/opencv-js)** — OpenCV in the browser.
- **[pdfmake](https://github.com/bpampuch/pdfmake)** — client-side PDF generation.
- **[APCA](https://github.com/Myndex/apca-w3)** — Andrew Somers / Myndex; the Advanced Perceptual Contrast Algorithm.
- **WCAG 2.2** — the W3C guideline whose contrast thresholds are encoded here.
