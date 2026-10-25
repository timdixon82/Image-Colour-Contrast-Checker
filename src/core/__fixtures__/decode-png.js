/**
 * Minimal PNG reader for the test fixtures in this folder (Node only, never
 * imported by app code). Handles 8-bit RGB or RGBA, non-interlaced, which is
 * what the fixtures use. Returns an ImageData-like { width, height, data }.
 */
import zlib from 'node:zlib';
import { Buffer } from 'node:buffer';

export function decodePng(buf) {
  let p = 8, width = 0, height = 0, colourType = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const body = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      colourType = body[9];
      if (body[8] !== 8 || body[12] !== 0 || (colourType !== 2 && colourType !== 6)) {
        throw new Error('decode-png: only 8-bit non-interlaced RGB/RGBA is supported');
      }
    } else if (type === 'IDAT') {
      idat.push(body);
    }
    p += 12 + len;
  }

  const bpp = colourType === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const data = new Uint8ClampedArray(width * height * 4);
  let prev = new Uint8Array(stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = new Uint8Array(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      if (filter === 1) line[i] += a;
      else if (filter === 2) line[i] += b;
      else if (filter === 3) line[i] += (a + b) >> 1;
      else if (filter === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        line[i] += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      data[o] = line[x * bpp];
      data[o + 1] = line[x * bpp + 1];
      data[o + 2] = line[x * bpp + 2];
      data[o + 3] = bpp === 4 ? line[x * bpp + 3] : 255;
    }
    prev = line;
  }
  return { width, height, data };
}
