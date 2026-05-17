// Wraps @gutenye/ocr-browser (PaddleOCR PP-OCRv4 via onnxruntime-web).
// Runs on the main thread because the underlying ImageRaw helper uses
// document.createElement('canvas'). The heavy work happens inside ORT
// (which internally uses workers / WebGPU when available), so the UI
// stays responsive during inference.

import Ocr from '@gutenye/ocr-browser';
import * as ort from 'onnxruntime-web';

const MODEL_PATHS = {
  detectionPath:   import.meta.env.BASE_URL + 'models/ch_PP-OCRv4_det_infer.onnx',
  recognitionPath: import.meta.env.BASE_URL + 'models/ch_PP-OCRv4_rec_infer.onnx',
  dictionaryPath:  import.meta.env.BASE_URL + 'models/ppocr_keys_v1.txt'
};

// Tell ORT where to find its WASM assets. Both dev and the built dist/ serve
// these from /ort/ via the public/ort symlink populated at install/build.
ort.env.wasm.wasmPaths = import.meta.env.BASE_URL + 'ort/';

let ocrPromise = null;

export function getOcr() {
  if (ocrPromise) return ocrPromise;
  ocrPromise = (async () => {
    return Ocr.create({
      models: MODEL_PATHS,
      onnxOptions: {
        // Try WebGPU first (Chrome/Edge desktop), otherwise WASM.
        executionProviders: hasWebGpu() ? ['webgpu', 'wasm'] : ['wasm']
      }
    });
  })();
  return ocrPromise;
}

function hasWebGpu() {
  return typeof navigator !== 'undefined' && !!navigator.gpu;
}

// Convert a polygon (4 [x,y] points) to an axis-aligned bbox.
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

// Run OCR on a URL (typically a blob: URL produced by URL.createObjectURL).
// Returns [{ text, score, bbox: {x,y,w,h} }, ...].
export async function runOcrOnUrl(url) {
  const ocr = await getOcr();
  const lines = await ocr.detect(url);
  return (lines || [])
    .map((line) => ({
      text: line.text || '',
      score: typeof line.mean === 'number' ? line.mean : 1,
      bbox: polyToBbox(line.box)
    }))
    .filter((d) => d.bbox && d.bbox.w > 0 && d.bbox.h > 0);
}
