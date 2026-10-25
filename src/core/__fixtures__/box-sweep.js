/**
 * Box-sweep helper for tests (Node only, never imported by app code).
 *
 * The OCR box is not known to the pixel: a different screenshot size, scale or
 * crop moves it by a few pixels, and a strip rule that is right for one box can
 * be wrong for its neighbour. A fixed box per fixture cannot see that. This
 * helper builds the variants a real run would see, without a browser:
 *   crop    trim cx px off the left and cy px off the top of the fixture;
 *   scale   resample by k (bilinear, like a browser would);
 *   box     the whole image less the fixture's 2 px margin (or, for a full
 *           screenshot, the given box in the original image, moved and scaled
 *           with it), then grown or trimmed by an offset on each side.
 */

/** Trim `cx` px off the left and `cy` px off the top. */
export function cropTopLeft(img, cx, cy) {
  const width = img.width - cx, height = img.height - cy;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const from = ((y + cy) * img.width + cx) * 4;
    data.set(img.data.subarray(from, from + width * 4), y * width * 4);
  }
  return { width, height, data };
}

/** Bilinear resample by factor `k`. */
export function scaleImage(img, k) {
  if (k === 1) return img;
  const width = Math.round(img.width * k), height = Math.round(img.height * k);
  const data = new Uint8ClampedArray(width * height * 4);
  const g = (x, y, c) => img.data[(y * img.width + x) * 4 + c];
  for (let y = 0; y < height; y++) {
    const sy = Math.min(img.height - 1.001, Math.max(0, (y + 0.5) / k - 0.5));
    const y0 = Math.floor(sy), fy = sy - y0;
    for (let x = 0; x < width; x++) {
      const sx = Math.min(img.width - 1.001, Math.max(0, (x + 0.5) / k - 0.5));
      const x0 = Math.floor(sx), fx = sx - x0;
      for (let c = 0; c < 4; c++) {
        data[(y * width + x) * 4 + c] = Math.round(
          g(x0, y0, c) * (1 - fx) * (1 - fy) + g(x0 + 1, y0, c) * fx * (1 - fy) +
          g(x0, y0 + 1, c) * (1 - fx) * fy + g(x0 + 1, y0 + 1, c) * fx * fy
        );
      }
    }
  }
  return { width, height, data };
}

/**
 * Bilinear resample by `k` with the sample point at x / k (corner aligned),
 * which is how the images behind real-OCR-boxes.json were made. scaleImage
 * above samples pixel centres, so it lands half a pixel away and does not
 * reproduce those pixels. Used only to rebuild that data.
 */
export function scaleImageCorner(img, k) {
  const width = Math.round(img.width * k), height = Math.round(img.height * k);
  const data = new Uint8ClampedArray(width * height * 4);
  const g = (x, y, c) => img.data[(y * img.width + x) * 4 + c];
  for (let y = 0; y < height; y++) {
    const sy = Math.min(img.height - 1.001, y / k);
    const y0 = Math.floor(sy), fy = sy - y0;
    for (let x = 0; x < width; x++) {
      const sx = Math.min(img.width - 1.001, x / k);
      const x0 = Math.floor(sx), fx = sx - x0;
      for (let c = 0; c < 4; c++) {
        data[(y * width + x) * 4 + c] = Math.round(
          g(x0, y0, c) * (1 - fx) * (1 - fy) + g(x0 + 1, y0, c) * fx * (1 - fy) +
          g(x0, y0 + 1, c) * (1 - fx) * fy + g(x0 + 1, y0 + 1, c) * fx * fy
        );
      }
    }
  }
  return { width, height, data };
}

/**
 * Resample the way the app does before OCR: the long edge is brought into
 * 800 to 1400 px (see targetSize in image.js). The browser's own resampler
 * is not reproducible here, so a bilinear stand-in is used.
 */
export function fitLikeApp(img) {
  const long = Math.max(img.width, img.height);
  if (long >= 800 && long <= 1400) return img;
  return scaleImage(img, (long < 800 ? 800 : 1400) / long);
}

export const DEFAULT_SCALES = [1, 1.25, 1.5, 2, 2.5, 3];
export const DEFAULT_CROPS = [[0, 0], [5, 0], [0, 3]];
// [left, top, right, bottom] growth in px (negative trims) from the margin box.
export const DEFAULT_OFFSETS = [[0, 0, 0, 0], [0, -3, 0, 0], [-2, 0, 0, 0], [0, 0, 0, -2], [2, 2, 2, 2]];

/**
 * Run `measure(img, x, y, w, h)` over every crop x scale x box-offset variant
 * of `fixture`. Offsets are in the scaled image's pixels. Pass `box`
 * ([x, y, w, h] in the fixture's own pixels) for a full screenshot; leave it
 * out for a crop that is already the box plus a 2 px margin.
 *
 * @returns {{ label: string, result: * }[]}
 */
export function sweepBoxes(fixture, measure, {
  scales = DEFAULT_SCALES,
  crops = DEFAULT_CROPS,
  offsets = DEFAULT_OFFSETS,
  box = null
} = {}) {
  const out = [];
  for (const [cx, cy] of crops) {
    const cropped = cropTopLeft(fixture, cx, cy);
    for (const k of scales) {
      const img = scaleImage(cropped, k);
      const [bx, by, bw, bh] = box
        ? [Math.round((box[0] - cx) * k), Math.round((box[1] - cy) * k), Math.round(box[2] * k), Math.round(box[3] * k)]
        : [2, 2, img.width - 4, img.height - 4];
      for (const [l, t, r, b] of offsets) {
        const x = bx - l, y = by - t;
        const w = bw + l + r, h = bh + t + b;
        if (x < 0 || y < 0 || h < 10 || x + w > img.width || y + h > img.height) continue;
        out.push({ label: `k${k} c${cx}-${cy} box${[l, t, r, b]}`, result: measure(img, x, y, w, h) });
      }
    }
  }
  return out;
}
