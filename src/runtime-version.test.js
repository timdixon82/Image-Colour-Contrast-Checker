// Guards the versioned OCR runtime path and the service worker cache name.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runtimeInfo } from '../scripts/runtime-version.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => JSON.parse(readFileSync(root + rel, 'utf8'));

describe('runtimeInfo', () => {
  const info = runtimeInfo(root);

  it('derives the runtime folder from the installed onnxruntime-web version', () => {
    const v = read('node_modules/onnxruntime-web/package.json').version;
    expect(info.ortVersion).toBe(v);
    expect(info.ortDir).toBe(`ort-${v}`);
  });

  it('is not the unversioned /ort/ folder an old service worker caches', () => {
    expect(info.ortDir).not.toBe('ort');
    // The old worker matched /\/(?:models|ort)\//.
    expect(/\/(?:models|ort)\//.test(`/${info.ortDir}/x.wasm`)).toBe(false);
  });

  it('puts both package versions in the cache name, under the prunable prefix', () => {
    const m = read('node_modules/@gutenye/ocr-models/package.json').version;
    expect(info.modelCache.startsWith('icc-model-cache-')).toBe(true);
    expect(info.modelCache).toContain(info.ortVersion);
    expect(info.modelCache).toContain(m);
    expect(info.modelCache).not.toMatch(/-v[12]$/);
  });
});

describe('service worker template', () => {
  const tpl = readFileSync(root + 'scripts/sw.template.js', 'utf8');
  it('takes its cache name and runtime folder from the build-time placeholders', () => {
    expect(tpl).toContain("const MODEL_CACHE = '__MODEL_CACHE__'");
    expect(tpl).toContain("const ORT_DIR = '__ORT_DIR__'");
  });
});
