/**
 * OCR adapter — PaddleOCR PP-OCRv4 via @gutenye/ocr-browser + ONNX Runtime Web.
 *
 * Implements the OcrAdapter interface:
 *   { detect(imageUrl: string): Promise<OcrWord[]> }
 *
 * To swap OCR engines (e.g. Tesseract, cloud API), create a new file in
 * src/adapters/ that exports getOcr() and runOcrOnUrl() with the same
 * signatures — nothing else in the project needs to change.
 *
 * @module adapters/paddle-ocr
 */

import Ocr  from '@gutenye/ocr-browser';
import * as ort from 'onnxruntime-web';

const MODEL_PATHS = {
  detectionPath:   import.meta.env.BASE_URL + 'models/ch_PP-OCRv4_det_infer.onnx',
  recognitionPath: import.meta.env.BASE_URL + 'models/ch_PP-OCRv4_rec_infer.onnx',
  dictionaryPath:  import.meta.env.BASE_URL + 'models/ppocr_keys_v1.txt'
};

// ORT needs an absolute URL — a relative path resolves to the bundle dir.
ort.env.wasm.wasmPaths = new URL('ort/', document.baseURI).href;

let ocrPromise = null;

/**
 * Return (and memoize) the PaddleOCR instance.
 * The first call triggers model loading; subsequent calls return the
 * cached promise so models are only fetched once per session.
 *
 * @returns {Promise<import('@gutenye/ocr-browser').default>}
 */
export function getOcr() {
  if (ocrPromise) return ocrPromise;
  ocrPromise = Ocr.create({
    models: MODEL_PATHS,
    onnxOptions: {
      executionProviders: hasWebGpu() ? ['webgpu', 'wasm'] : ['wasm']
    }
  });
  return ocrPromise;
}

/**
 * Run OCR on an image URL and return normalised word detections.
 *
 * @param {string} url  A blob: or http: URL the browser can load
 * @returns {Promise<import('../core/schema.js').OcrWord[]>}
 */
export async function runOcrOnUrl(url) {
  const ocr   = await getOcr();
  const lines = await ocr.detect(url);
  return (lines || [])
    .map((line) => ({
      text:  line.text || '',
      score: typeof line.mean === 'number' ? line.mean : 1,
      bbox:  polyToBbox(line.box)
    }))
    .filter((d) => d.bbox && d.bbox.w > 0 && d.bbox.h > 0);
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function hasWebGpu() {
  return typeof navigator !== 'undefined' && !!navigator.gpu;
}

/** Convert a 4-point polygon [[x,y]…] to an axis-aligned BBox. */
function polyToBbox(poly) {
  if (!poly || !poly.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [px, py] of poly) {
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
