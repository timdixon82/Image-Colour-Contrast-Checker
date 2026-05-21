/**
 * Image decode and resize utilities.
 *
 * Normalises any Blob/File to a long-edge range of 800–1400 px before
 * analysis. Staying inside this window keeps OCR accuracy high while
 * bounding memory use.
 *
 * @module core/image
 */

const MIN_LONG_EDGE = 800;
const MAX_LONG_EDGE = 1400;

/**
 * Compute the output dimensions that bring an image into the target range.
 *
 * @param {number} width
 * @param {number} height
 * @returns {{ width: number, height: number, scale: number }}
 */
export function targetSize(width, height) {
  const long = Math.max(width, height);
  let scale = 1;
  if (long < MIN_LONG_EDGE) scale = MIN_LONG_EDGE / long;
  else if (long > MAX_LONG_EDGE) scale = MAX_LONG_EDGE / long;
  return {
    width:  Math.max(1, Math.round(width  * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale
  };
}

/** Create a drawing surface, preferring OffscreenCanvas where available. */
function makeCanvas(width, height) {
  return (typeof OffscreenCanvas !== 'undefined')
    ? new OffscreenCanvas(width, height)
    : Object.assign(document.createElement('canvas'), { width, height });
}

/**
 * Decode a Blob/File into a colour-management-off ImageBitmap at the
 * canonical long-edge target size.
 *
 * The downscale is done by drawing onto a bounded canvas rather than via
 * createImageBitmap's resize options: those options are silently ignored by
 * older Safari, which would then return a full-resolution image. iPhone
 * photos are 12–48 MP, and a full-resolution result reaching
 * bitmapToImageData would make getImageData allocate a pixel buffer large
 * enough to crash the iOS content process.
 *
 * @param {Blob|File} blob
 * @returns {Promise<ImageBitmap>}
 */
export async function decodeAndResize(blob) {
  const full = await createImageBitmap(blob, { colorSpaceConversion: 'none' });
  const t = targetSize(full.width, full.height);

  if (t.scale === 1) return full;

  const canvas = makeCanvas(t.width, t.height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(full, 0, 0, t.width, t.height);
  full.close?.();
  return createImageBitmap(canvas);
}

/**
 * Draw an ImageBitmap onto a canvas and extract its sRGB ImageData.
 * Uses OffscreenCanvas when available (worker-compatible).
 *
 * @param {ImageBitmap} bitmap
 * @returns {{ canvas: OffscreenCanvas|HTMLCanvasElement, ctx: CanvasRenderingContext2D, imageData: ImageData }}
 */
export function bitmapToImageData(bitmap) {
  const canvas = makeCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' });
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  return { canvas, ctx, imageData };
}
