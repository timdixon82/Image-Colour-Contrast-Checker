// Canvas renderers for the small visual artefacts in the report.
// Each returns { canvas, dataUrl } so the same node can be inserted into
// the DOM and re-encoded for PDF / Markdown without re-drawing.

const SWATCH_W = 80;
const SWATCH_H = 20;
const CLIP_PADDING = 32;

function newCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Side-by-side swatch: left = background colour, right = foreground colour.
export function makeSwatch(fgHex, bgHex) {
  const canvas = newCanvas(SWATCH_W, SWATCH_H);
  const ctx = canvas.getContext('2d');
  const half = SWATCH_W / 2;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, half, SWATCH_H);
  ctx.fillStyle = fgHex;
  ctx.fillRect(half, 0, SWATCH_W - half, SWATCH_H);
  return { canvas, dataUrl: canvas.toDataURL('image/png') };
}

// Crop the source canvas to the union of bboxes + padding and outline each
// bbox in red. Matches make_clip() (padding=32, stroke=(220,38,38), width=2).
export function makeClip(sourceCanvas, bboxes, padding = CLIP_PADDING) {
  if (!bboxes || bboxes.length === 0) {
    const c = newCanvas(10, 10);
    return { canvas: c, dataUrl: c.toDataURL('image/png') };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of bboxes) {
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y + b.h > maxY) maxY = b.y + b.h;
  }
  const x1 = Math.max(0, Math.floor(minX - padding));
  const y1 = Math.max(0, Math.floor(minY - padding));
  const x2 = Math.min(sourceCanvas.width,  Math.ceil(maxX + padding));
  const y2 = Math.min(sourceCanvas.height, Math.ceil(maxY + padding));
  const w = Math.max(1, x2 - x1);
  const h = Math.max(1, y2 - y1);

  const canvas = newCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sourceCanvas, x1, y1, w, h, 0, 0, w, h);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgb(220,38,38)';
  for (const b of bboxes) {
    ctx.strokeRect(b.x - x1, b.y - y1, b.w, b.h);
  }
  return { canvas, dataUrl: canvas.toDataURL('image/png') };
}

// Shrink the source canvas to a target max width. Returns the new canvas
// plus its data URL — used for the on-screen preview AND the PDF page image.
export function makePreview(sourceCanvas, maxWidth = 600) {
  const scale = Math.min(1, maxWidth / sourceCanvas.width);
  const w = Math.max(1, Math.round(sourceCanvas.width * scale));
  const h = Math.max(1, Math.round(sourceCanvas.height * scale));
  const canvas = newCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0, w, h);
  return { canvas, dataUrl: canvas.toDataURL('image/png') };
}

// Thumbnail for the summary table.
export function makeThumb(sourceCanvas, size = 40) {
  const scale = size / Math.max(sourceCanvas.width, sourceCanvas.height);
  const w = Math.max(1, Math.round(sourceCanvas.width * scale));
  const h = Math.max(1, Math.round(sourceCanvas.height * scale));
  const canvas = newCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0, w, h);
  return { canvas, dataUrl: canvas.toDataURL('image/png') };
}

// Encode the full source canvas as a data URL — for the Markdown export.
export function sourceDataUrl(sourceCanvas) {
  return sourceCanvas.toDataURL('image/png');
}

export const THRESHOLDS_FOOTER =
  'Contrast thresholds — AA: 4.5:1 normal / 3:1 large text · AAA: 7:1 normal / 4.5:1 large text. '
  + 'Large text = ≥24 px OCR box height. Detected via PaddleOCR PP-OCRv4.';

export const DISCLAIMER_TEXT =
  'This report is generated automatically to help speed up accessibility review. '
  + 'Results are indicative only — manual verification is required before citing for formal WCAG compliance.';
