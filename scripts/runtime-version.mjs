// Single source of truth for the versioned OCR runtime path and the service
// worker cache name. Read from the installed packages at build time so a
// dependency bump changes both automatically and nothing can be forgotten.
//
// Why versioned: a returning visitor's old service worker serves anything
// under /ort/ from its cache, so after an onnxruntime-web upgrade the new page
// code would get the old runtime files until the new worker took over (up to
// about 24 hours). The old worker does not match /ort-<version>/, so the new
// page always fetches its own runtime from the network on the first visit.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function installedVersion(repoRoot, ...pkg) {
  const file = join(repoRoot, 'node_modules', ...pkg, 'package.json');
  try {
    return JSON.parse(readFileSync(file, 'utf8')).version;
  } catch {
    throw new Error(`[runtime-version] cannot read ${file}; run npm ci first`);
  }
}

/**
 * @param {string} repoRoot
 * @returns {{ ortVersion: string, ortDir: string, modelCache: string }}
 */
export function runtimeInfo(repoRoot) {
  const ortVersion = installedVersion(repoRoot, 'onnxruntime-web');
  const modelsVersion = installedVersion(repoRoot, '@gutenye', 'ocr-models');
  return {
    ortVersion,
    ortDir: `ort-${ortVersion}`,
    // Prefix is what the worker's activate step prunes on; the rest changes
    // whenever the runtime or the model package is upgraded.
    modelCache: `icc-model-cache-ort${ortVersion}-models${modelsVersion}`
  };
}
