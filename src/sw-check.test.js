import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { swProblem } from '../scripts/sw-check.mjs';

describe('swProblem', () => {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'sw-check-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('returns null for a generated worker', () => {
    writeFileSync(join(dir, 'sw.js'), "const MODEL_CACHE = 'icc-v1';\nconst ORT_DIR = 'ort-1.2.3';\n");
    expect(swProblem(dir)).toBeNull();
  });

  it('reports a missing file', () => {
    expect(swProblem(dir)).toMatch(/sw\.js is missing/);
  });

  it('reports an empty file', () => {
    writeFileSync(join(dir, 'sw.js'), '');
    expect(swProblem(dir)).toMatch(/empty/);
  });

  it('reports unreplaced placeholders', () => {
    writeFileSync(join(dir, 'sw.js'), "const MODEL_CACHE = '__MODEL_CACHE__';\n");
    expect(swProblem(dir)).toMatch(/__MODEL_CACHE__/);
  });
});
