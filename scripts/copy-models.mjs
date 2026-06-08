// Copies the @gutenye/ocr-browser model files and the onnxruntime-web wasm
// assets into public/ so they're served as static assets by Vite (in both
// `dev` and the built `dist/`). Run as a `postinstall` step.

import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const modelDst = join(repoRoot, 'public', 'models');
const ortDst   = join(repoRoot, 'public', 'ort');

mkdirSync(modelDst, { recursive: true });
mkdirSync(ortDst,   { recursive: true });

const modelSrc = join(repoRoot, 'node_modules', '@gutenye', 'ocr-models', 'assets');
for (const name of [
  'ch_PP-OCRv4_det_infer.onnx',
  'ch_PP-OCRv4_rec_infer.onnx',
  'ppocr_keys_v1.txt'
]) {
  const src = join(modelSrc, name);
  if (!existsSync(src)) {
    console.warn(`[copy-models] missing ${src}`);
    continue;
  }
  copyFileSync(src, join(modelDst, name));
}

// Copy onnxruntime-web WASM + worker assets so ORT can find them at runtime.
const ortSrc = join(repoRoot, 'node_modules', 'onnxruntime-web', 'dist');
if (existsSync(ortSrc)) {
  for (const f of readdirSync(ortSrc)) {
    if (/\.(wasm|mjs)$/.test(f) || /^ort-.*\.js$/.test(f)) {
      copyFileSync(join(ortSrc, f), join(ortDst, f));
    }
  }
} else {
  console.warn('[copy-models] onnxruntime-web/dist not found — ORT WASM will not be served');
}

// Copy Roboto TTF fonts used by the PDFKit PDF export into public/fonts/ so
// they can be fetched by the browser at runtime. The fonts live in pdfmake's
// package so they are available wherever pdfmake is installed.
const fontDst = join(repoRoot, 'public', 'fonts');
mkdirSync(fontDst, { recursive: true });
const fontSrc = join(repoRoot, 'node_modules', 'pdfmake', 'fonts', 'Roboto');
if (existsSync(fontSrc)) {
  for (const name of ['Roboto-Regular.ttf', 'Roboto-Medium.ttf']) {
    copyFileSync(join(fontSrc, name), join(fontDst, name));
  }
} else {
  console.warn('[copy-models] pdfmake Roboto fonts not found — PDF export font will be missing');
}

// Cross-origin isolation is handled by the hand-written public/sw.js, which
// also caches these model + runtime files — nothing to copy for it.

console.log('[copy-models] done');
