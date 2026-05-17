// Long-edge resize used before OCR + contrast analysis.
// < 800 px long edge -> upscale to 800.
// > 1400 px long edge -> downscale to 1400.
// Otherwise pass-through.
//
// Uses createImageBitmap so the heavy decode + resample happens off the main
// thread where the browser supports it.

const MIN_LONG_EDGE = 800;
const MAX_LONG_EDGE = 1400;

export function targetSize(width, height) {
  const long = Math.max(width, height);
  let scale = 1;
  if (long < MIN_LONG_EDGE) scale = MIN_LONG_EDGE / long;
  else if (long > MAX_LONG_EDGE) scale = MAX_LONG_EDGE / long;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale
  };
}

// Decode a Blob/File into a colour-managed-OFF ImageBitmap at the canonical
// long-edge target size.
export async function decodeAndResize(blob) {
  // Probe size first so we can hand sizing hints to createImageBitmap.
  const probe = await createImageBitmap(blob, {
    colorSpaceConversion: 'none'
  });
  const { width, height } = probe;
  const t = targetSize(width, height);

  if (t.scale === 1) return probe;

  // Re-decode at the target size to keep memory low and quality high.
  probe.close?.();
  return createImageBitmap(blob, {
    resizeWidth: t.width,
    resizeHeight: t.height,
    resizeQuality: 'high',
    colorSpaceConversion: 'none'
  });
}

// Draw a bitmap onto an OffscreenCanvas and return its ImageData.
// The canvas is returned too so callers can reuse it for swatch / clip ops.
export function bitmapToImageData(bitmap) {
  const canvas = (typeof OffscreenCanvas !== 'undefined')
    ? new OffscreenCanvas(bitmap.width, bitmap.height)
    : Object.assign(document.createElement('canvas'), {
        width: bitmap.width, height: bitmap.height
      });
  const ctx = canvas.getContext('2d', {
    willReadFrequently: true,
    colorSpace: 'srgb'
  });
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  return { canvas, ctx, imageData };
}
