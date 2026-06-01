/**
 * PDF export — Vitest integration tests.
 *
 * Generates a full ICCC audit-report PDF from mock AnalysedEntry data
 * and validates it with veraPDF PDF/UA-1. Mock data exercises every
 * code path: branded header, disclaimer, summary table, per-image sections,
 * CVD simulations, contrast results, per-pair blocks (with and without clip
 * images), and the footer.
 *
 * Test data is specified in `.claude/work/013-iccc-pdf-ua/tad-requirements.md`
 * sections 5.2–5.5.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join }   from 'node:path';

import { buildPdf } from './pdf.js';

// 1×1 transparent PNG data URL — used for all image fields.
const PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// ── Mock colour pairs ─────────────────────────────────────────────────────

const pairFail = {
  fgHex: '#767676',
  bgHex: '#ffffff',
  contrast: 4.48,
  pass: false,
  required: 4.5,
  passAaa: false,
  requiredAaa: 7,
  examples: ['Button label', 'Link text'],
  bboxes: [],
  cvd: {
    deuteranopia: { fgHex: '#767676', bgHex: '#ffffff', contrast: 4.48, pass: false },
    protanopia:   { fgHex: '#767676', bgHex: '#ffffff', contrast: 4.48, pass: false },
    tritanopia:   { fgHex: '#767676', bgHex: '#ffffff', contrast: 4.48, pass: false },
  },
  cvdRisk: false,
  apca:       { lc: 53.2,  status: 'WARN', message: 'Below the recommended Lc 60 threshold for body text.' },
  vestibular: { fgSat: 0, bgSat: 0, maxSat: 0, status: 'SAFE', message: 'No highly saturated colours detected.' },
  cognitive:  { status: 'PASS', message: 'No cognitive load concerns detected.' },
  overall: 'FAIL',
};

const pairPass = {
  fgHex: '#000000',
  bgHex: '#ffffff',
  contrast: 21.0,
  pass: true,
  required: 4.5,
  passAaa: true,
  requiredAaa: 7,
  examples: [],
  bboxes: [],
  cvd: {
    deuteranopia: { fgHex: '#000000', bgHex: '#ffffff', contrast: 21.0, pass: true },
    protanopia:   { fgHex: '#000000', bgHex: '#ffffff', contrast: 21.0, pass: true },
    tritanopia:   { fgHex: '#000000', bgHex: '#ffffff', contrast: 21.0, pass: true },
  },
  cvdRisk: false,
  apca:       { lc: 106.0, status: 'PASS', message: 'Meets the recommended Lc 60 threshold.' },
  vestibular: { fgSat: 0, bgSat: 0, maxSat: 0, status: 'SAFE', message: 'No highly saturated colours detected.' },
  cognitive:  { status: 'PASS', message: 'No cognitive load concerns detected.' },
  overall: 'PASS',
};

// ── Mock entries ──────────────────────────────────────────────────────────

const entries = [
  {
    id: 'entry-1',
    filename: 'homepage-hero.png',
    report: {
      hasText: true,
      verdict: 'FAIL',
      flag: true,
      detail: '2 colour combinations found — 1 fails WCAG AA.',
      colourPairs: [pairFail, pairPass],
    },
    previewDataUrl: PNG_1X1,
    pairAssets: [
      { pair: pairFail, swatchDataUrl: PNG_1X1, clipDataUrl: PNG_1X1 },
      { pair: pairPass, swatchDataUrl: PNG_1X1, clipDataUrl: null     },
    ],
    cbSimAssets: [
      { key: 'deuteranopia',  label: 'Deuteranopia',  note: 'green-blind',            dataUrl: PNG_1X1 },
      { key: 'protanopia',    label: 'Protanopia',    note: 'red-blind',              dataUrl: PNG_1X1 },
      { key: 'tritanopia',    label: 'Tritanopia',    note: 'blue-blind',             dataUrl: PNG_1X1 },
      { key: 'achromatopsia', label: 'Achromatopsia', note: 'total colour-blindness', dataUrl: PNG_1X1 },
    ],
  },
  {
    id: 'entry-2',
    filename: 'decorative-banner.png',
    report: {
      hasText: false,
      verdict: 'NO_TEXT',
      flag: false,
      detail: 'No text detected.',
      colourPairs: [],
    },
    previewDataUrl: PNG_1X1,
    pairAssets:   [],
    cbSimAssets:  [],
  },
];

// ── Helper ────────────────────────────────────────────────────────────────

/**
 * Run veraPDF against a Buffer. Returns the XML output.
 * Uses spawnSync with an explicit argument array (no shell).
 */
function verapdfXml(pdfBuffer) {
  const tmpFile = join(
    tmpdir(),
    `pdf-export-test-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`
  );
  writeFileSync(tmpFile, pdfBuffer);
  try {
    const result = spawnSync(
      '/opt/homebrew/bin/verapdf',
      ['--flavour', 'ua1', tmpFile],
      { encoding: 'utf8' }
    );
    return result.stdout || '';
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('pdf export — veraPDF PDF/UA-1 compliance', () => {
  it('produces a compliant PDF from a full mock AnalysedEntry array', async () => {
    const buffer = await buildPdf(entries, '1 June 2026 at 10:00');

    // Structural checks
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');

    // veraPDF PDF/UA-1 validation
    const xml = verapdfXml(buffer);
    expect(xml, 'veraPDF XML should be non-empty — is verapdf installed at /opt/homebrew/bin/verapdf?')
      .toBeTruthy();
    expect(xml).toContain('isCompliant="true"');
    expect(xml).toContain('profileName="PDF/UA-1 validation profile"');

    const failedMatch = xml.match(/failedChecks="(\d+)"/);
    if (failedMatch) {
      expect(parseInt(failedMatch[1], 10)).toBe(0);
    }
  });
});
