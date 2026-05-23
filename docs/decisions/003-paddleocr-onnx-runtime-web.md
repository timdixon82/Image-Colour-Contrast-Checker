# ADR 003: PaddleOCR PP-OCRv4 via `@gutenye/ocr-browser` and ONNX Runtime Web, with WebGPU and WASM execution providers

Status: accepted (backfilled 2026-05-23).

## Context

ICCC needs to locate text in images, in the browser, with no upload to a server. The OCR engine must be accurate enough on user-interface screenshots to find real text reliably, and it must run on the device.

## Decision

Use PaddleOCR PP-OCRv4 (detection plus recognition models) wrapped by `@gutenye/ocr-browser` and executed by ONNX Runtime Web. Select execution providers at runtime:

- WebGPU plus WASM fallback on desktop browsers that expose `navigator.gpu`.
- WASM only on iOS, iPadOS, and any browser without WebGPU (the WebGPU backend does not actually work on iOS even where `navigator.gpu` is present; the code detects this and forces WASM).

Bundle the models from `@gutenye/ocr-models` (a devDependency) and copy them into `public/models/` at install time through `scripts/copy-models.mjs`. Bundle the ONNX Runtime Web WASM binaries from `onnxruntime-web` and copy them into `public/ort/` by the same script.

## Alternatives considered

- Tesseract.js. Rejected: less accurate than PP-OCRv4 on user-interface screenshots, and tied to a different runtime.
- A cloud OCR Application Programming Interface (for example Google Vision or AWS Textract). Rejected: needs an API key and sends the image to a third party, breaking the privacy goal.
- Browser built-in OCR (the `BarcodeDetector` and Shape Detection family). Rejected: not available cross-browser and not designed for word-level detection.

## Consequences

The application produces accurate detections on real screenshots, the user keeps their image on their device, and the OCR engine is swappable through the adapter pattern in `src/adapters/`. The cost is roughly 28 MB of model and runtime files on first use, cached afterwards in Cache Storage (see ADR 008). The iOS WebGPU fragility (code detects it and forces WASM) is a known invariant; `preloader.js` and `paddle-ocr.js` keep their detection logic in sync.
