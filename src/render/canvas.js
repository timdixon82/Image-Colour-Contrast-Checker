/**
 * Canvas rendering helpers — pure drawing, no app-specific strings.
 * Each function returns { canvas, dataUrl } so the same node can be
 * inserted into the DOM and re-encoded for PDF/Markdown without redrawing.
 *
 * @module render/canvas
 */

const SWATCH_W    = 80;
const SWATCH_H    = 20;
const CLIP_PADDING = 32;

function newCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/**
 * Side-by-side colour swatch: left half = background, right half = foreground.
 *
 * @param {string} fgHex
 * @param {string} bgHex
 * @returns {{ canvas: HTMLCanvasElement, dataUrl: string }}
 */
export function makeSwatch(fgHex, bgHex) {
  const canvas = newCanvas(SWATCH_W, SWATCH_H);
  const ctx    = canvas.getContext('2d');
  const half   = SWATCH_W / 2;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, half, SWATCH_H);
  ctx.fillStyle = fgHex;
  ctx.fillRect(half, 0, SWATCH_W - half, SWATCH_H);
  return { canvas, dataUrl: canvas.toDataURL('image/png') };
}

/**
 * Crop the source canvas to the union of bboxes plus padding, outlining each
 * bbox in red. Useful for highlighting failing text regions in a report.
 *
 * @param {HTMLCanvasElement} sourceCanvas
 * @param {import('../core/schema.js').BBox[]} bboxes
 * @param {number} [padding]
 * @returns {{ canvas: HTMLCanvasElement, dataUrl: string }}
 */
export function makeClip(sourceCanvas, bboxes, padding = CLIP_PADDING) {
  if (!bboxes || bboxes.length === 0) {
    const c = newCanvas(10, 10);
    return { canvas: c, dataUrl: c.toDataURL('image/png') };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of bboxes) {
    if (b.x         < minX) minX = b.x;
    if (b.y         < minY) minY = b.y;
    if (b.x + b.w   > maxX) maxX = b.x + b.w;
    if (b.y + b.h   > maxY) maxY = b.y + b.h;
  }
  const x1 = Math.max(0, Math.floor(minX - padding));
  const y1 = Math.max(0, Math.floor(minY - padding));
  const x2 = Math.min(sourceCanvas.width,  Math.ceil(maxX + padding));
  const y2 = Math.min(sourceCanvas.height, Math.ceil(maxY + padding));
  const w  = Math.max(1, x2 - x1);
  const h  = Math.max(1, y2 - y1);

  const canvas = newCanvas(w, h);
  const ctx    = canvas.getContext('2d');
  ctx.drawImage(sourceCanvas, x1, y1, w, h, 0, 0, w, h);
  ctx.lineWidth   = 2;
  ctx.strokeStyle = 'rgb(220,38,38)';
  for (const b of bboxes) ctx.strokeRect(b.x - x1, b.y - y1, b.w, b.h);
  return { canvas, dataUrl: canvas.toDataURL('image/png') };
}

/**
 * Downscale the source canvas to a maximum width, preserving aspect ratio.
 * Used for the on-screen preview and the image in PDF/Markdown reports.
 *
 * @param {HTMLCanvasElement} sourceCanvas
 * @param {number} [maxWidth=600]
 * @returns {{ canvas: HTMLCanvasElement, dataUrl: string }}
 */
export function makePreview(sourceCanvas, maxWidth = 600) {
  const scale = Math.min(1, maxWidth / sourceCanvas.width);
  const w = Math.max(1, Math.round(sourceCanvas.width  * scale));
  const h = Math.max(1, Math.round(sourceCanvas.height * scale));
  const canvas = newCanvas(w, h);
  canvas.getContext('2d').drawImage(sourceCanvas, 0, 0, w, h);
  return { canvas, dataUrl: canvas.toDataURL('image/png') };
}

/**
 * Colour-vision-deficiency transform matrices, applied per pixel in sRGB
 * space (the convention used by browser CVD emulators and web simulators).
 * Protan/deutan/tritan values are the widely-used dichromat approximations;
 * achromatopsia is a luminance-weighted greyscale.
 */
const CB_MATRICES = {
  protanopia:    [0.567, 0.433, 0.000,  0.558, 0.442, 0.000,  0.000, 0.242, 0.758],
  deuteranopia:  [0.625, 0.375, 0.000,  0.700, 0.300, 0.000,  0.000, 0.300, 0.700],
  tritanopia:    [0.950, 0.050, 0.000,  0.000, 0.433, 0.567,  0.000, 0.475, 0.525],
  achromatopsia: [0.299, 0.587, 0.114,  0.299, 0.587, 0.114,  0.299, 0.587, 0.114]
};

/** @typedef {'protanopia'|'deuteranopia'|'tritanopia'|'achromatopsia'} CbType */

/**
 * Simulate how the source image appears to a viewer with the given
 * colour-vision deficiency. Downscales to `maxWidth` first, then applies the
 * transform to every pixel.
 *
 * @param {HTMLCanvasElement} sourceCanvas
 * @param {CbType} type
 * @param {number} [maxWidth=600]
 * @returns {{ canvas: HTMLCanvasElement, dataUrl: string }}
 */
export function makeCbSim(sourceCanvas, type, maxWidth = 600) {
  const m = CB_MATRICES[type];
  if (!m) throw new Error(`Unknown colour-blindness type: ${type}`);

  const scale = Math.min(1, maxWidth / sourceCanvas.width);
  const w = Math.max(1, Math.round(sourceCanvas.width  * scale));
  const h = Math.max(1, Math.round(sourceCanvas.height * scale));
  const canvas = newCanvas(w, h);
  const ctx    = canvas.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0, w, h);

  const img = ctx.getImageData(0, 0, w, h);
  const d   = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    d[i]     = clampByte(m[0] * r + m[1] * g + m[2] * b);
    d[i + 1] = clampByte(m[3] * r + m[4] * g + m[5] * b);
    d[i + 2] = clampByte(m[6] * r + m[7] * g + m[8] * b);
  }
  ctx.putImageData(img, 0, 0);
  return { canvas, dataUrl: canvas.toDataURL('image/png') };
}

function clampByte(v) {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/**
 * Fit the source canvas into a square thumbnail of `size` pixels.
 * Used in the summary table.
 *
 * @param {HTMLCanvasElement} sourceCanvas
 * @param {number} [size=40]
 * @returns {{ canvas: HTMLCanvasElement, dataUrl: string }}
 */
export function makeThumb(sourceCanvas, size = 40) {
  const scale = size / Math.max(sourceCanvas.width, sourceCanvas.height);
  const w = Math.max(1, Math.round(sourceCanvas.width  * scale));
  const h = Math.max(1, Math.round(sourceCanvas.height * scale));
  const canvas = newCanvas(w, h);
  canvas.getContext('2d').drawImage(sourceCanvas, 0, 0, w, h);
  return { canvas, dataUrl: canvas.toDataURL('image/png') };
}

/**
 * Encode the full source canvas as a PNG data URL.
 * Used by the Markdown exporter to embed the original image.
 *
 * @param {HTMLCanvasElement} sourceCanvas
 * @returns {string}
 */
export function sourceDataUrl(sourceCanvas) {
  return sourceCanvas.toDataURL('image/png');
}
