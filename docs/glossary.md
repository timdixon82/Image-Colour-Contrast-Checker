# Glossary: Image Colour Contrast Checker

Project-specific terms used across the ICCC wiki and codebase. General team terms are in the global wiki at `docs/glossary.md` in the team root.

## Terms

**AnalysedEntry.** The data contract between the user-interface layer and the export layer. It holds one image's identifier, filename, analysis report, preview data URL, colour-pair canvas assets, and colour-blindness simulation assets. Both the PDF and Markdown exporters accept `AnalysedEntry[]` and nothing else.

**APCA.** Accessible Perceptual Contrast Algorithm. A next-generation contrast algorithm developed for the Web Content Accessibility Guidelines 3.0 (WCAG 3). ICCC computes an APCA score alongside the WCAG 2.2 ratio. APCA values are advisory in the current version of the tool.

**Bounding box (BBox).** A rectangle that describes a detected text region in the resized image's pixel space. Represented as `{ x, y, w, h }`. Polygon detections from the OCR engine are converted to axis-aligned bounding boxes before colour analysis.

**Cognitive check.** A check derived from the vestibular check and the contrast result. It reports whether a colour combination poses a broad cognitive-accessibility concern. Represented as `CognitiveResult { status, message }`.

**ColourPair.** A unique foreground and background colour combination found in one image, with its WCAG contrast ratio, AA and AAA pass or fail flags, APCA result, vestibular result, cognitive result, colour-vision-deficiency simulations, and example words.

**Colour-vision-deficiency (CVD) simulation.** A simulated view of the image as it appears to a person with deuteranopia, protanopia, or tritanopia. Computed using the Machado 2009 matrices in `src/core/colour-vision.js`.

**Content Security Policy (CSP).** A HyperText Markup Language meta tag delivered in the `<head>` of each page that tells the browser which script and connection origins are allowed. ICCC's CSP is a setup-build item; see `todo.md` at the repository root.

**Cross-origin isolation.** A browser security state in which the page can use `SharedArrayBuffer` and multi-threaded WebAssembly. Achieved by serving `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` response headers. On GitHub Pages, these headers are injected by the service worker (see ADR 008).

**GoatCounter.** The team's privacy-friendly, cookie-free page-view analytics service. ICCC uses its own dedicated counter at `iccc.goatcounter.com`, not the team's shared counter. See `docs/privacy.md` and ADR 009.

**icc-model-cache-v1.** The Cache Storage key used by the service worker to persist PaddleOCR model files and ORT WASM binaries. The version suffix is bumped when those files change.

**Layered project structure.** The directory split of `src/` into `core/`, `adapters/`, `render/`, `export/`, and `ui/`, with a strict dependency direction. See ADR 002.

**ONNX Runtime Web (ORT).** An open-source runtime from Microsoft that executes machine-learning models in the browser. ICCC uses the WebGPU and multi-threaded WASM backends. The ORT WASM binaries are vendored from `onnxruntime-web` at install time.

**OCR.** Optical Character Recognition. The process of locating and reading text in an image. ICCC uses the PaddleOCR PP-OCRv4 model to find text regions (bounding boxes with confidence scores) in uploaded screenshots.

**OcrWord.** The type returned by the OCR adapter: `{ text, score, bbox }`. `text` is the detected string, `score` is the confidence (0 to 1), and `bbox` is the axis-aligned bounding box.

**PaddleOCR PP-OCRv4.** The OCR model ICCC uses. A detection model and a recognition model, both in ONNX format, packaged by `@gutenye/ocr-browser` and `@gutenye/ocr-models`.

**ReportData.** The analysis result for one image: `{ hasText, colourPairs[], verdict, flag, detail }`. This is what the analysis pipeline produces and what the rendering and export layers consume.

**SharedArrayBuffer.** A JavaScript built-in that enables shared memory between the main thread and Web Workers. Required by the multi-threaded WASM backend. Only available when the page is cross-origin isolated.

**Subresource Integrity (SRI).** A `<script>` or `<link>` attribute that specifies a cryptographic hash of the expected file content. ICCC self-hosts `count.js` from its own origin, so SRI is not required for analytics. ORT and model files are served from the same origin and are covered by the build lockfile.

**Vestibular check.** A check that estimates whether a colour combination has high colour saturation that could cause perceptual difficulty for people with vestibular sensitivity. Represented as `VestibularResult { fgSat, bgSat, maxSat, status, message }`.

**WCAG.** Web Content Accessibility Guidelines. ICCC audits images against WCAG 2.2 at both AA and AAA conformance levels, and targets WCAG 2.2 AAA for its own interface.

**Worst-strip approach.** The analysis strategy used by ICCC to measure contrast on gradient or mixed backgrounds. Each bounding box is divided into character-width vertical strips; k-means (k=2) clustering separates text from background pixels in each strip; the strip with the worst (lowest) contrast ratio is the result for that detection.
