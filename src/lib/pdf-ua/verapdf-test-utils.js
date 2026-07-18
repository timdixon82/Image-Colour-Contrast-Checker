/**
 * Shared veraPDF test helpers.
 *
 * veraPDF is an external tool, not an npm dependency, so it is only ever
 * present on a developer's machine where it has been installed manually.
 * CI runners (and any machine without veraPDF on PATH) must NOT fail the
 * suite for its absence — Tim's call is that veraPDF stays an optional,
 * local-only compliance check (it has known false positives, so gating the
 * build on it is undesirable). Tests that depend on it use
 * `describe.skipIf(!veraPdfAvailable)` / `it.skipIf(!veraPdfAvailable)` so
 * they run and assert when veraPDF is present, and are reported as SKIPPED
 * (not failed) everywhere else.
 *
 * Resolution order: `VERAPDF_PATH` env var (explicit override) takes
 * precedence; otherwise fall back to `verapdf` resolved via the system PATH
 * — this works on any OS/install location, not just the macOS Homebrew path
 * this used to be hardcoded to (`/opt/homebrew/bin/verapdf`).
 */

import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** The veraPDF command to invoke — an explicit override, or a bare name resolved via PATH. */
export const VERAPDF = process.env.VERAPDF_PATH || 'verapdf';

/**
 * Whether veraPDF actually launches, checked once at module load (so
 * `describe.skipIf`/`it.skipIf` can evaluate it synchronously at collection
 * time). `result.error` is set (ENOENT) when the binary cannot be found or
 * executed at all.
 */
export const veraPdfAvailable = (() => {
  const result = spawnSync(VERAPDF, ['--version'], { encoding: 'utf8' });
  return !result.error && result.status === 0;
})();

if (!veraPdfAvailable) {
  console.warn(
    `[pdf-ua] veraPDF not found on PATH (${VERAPDF}); skipping PDF/UA compliance checks. ` +
    'Install veraPDF locally, or set VERAPDF_PATH, to run them.'
  );
}

/**
 * Run veraPDF against a Buffer and return its stdout XML.
 * Uses spawnSync with an explicit argument array (no shell) to avoid any
 * injection risk. veraPDF exits 1 (not 0) when the PDF is non-compliant but
 * still emits valid XML, so stdout is captured regardless of exit code.
 *
 * @param {Buffer} pdfBuffer
 * @param {string} [tmpPrefix='pdf-ua-test'] Prefix for the temp file name.
 * @returns {string}
 */
export function verapdfXml(pdfBuffer, tmpPrefix = 'pdf-ua-test') {
  const tmpFile = join(tmpdir(), `${tmpPrefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  writeFileSync(tmpFile, pdfBuffer);
  try {
    const result = spawnSync(VERAPDF, ['--flavour', 'ua1', tmpFile], { encoding: 'utf8' });
    return result.stdout || '';
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore cleanup errors */ }
  }
}
