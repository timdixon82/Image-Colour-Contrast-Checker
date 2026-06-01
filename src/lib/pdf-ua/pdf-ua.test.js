/**
 * pdf-ua wrapper — Vitest unit tests.
 *
 * Tests PDF/UA-1 compliance using veraPDF. Each test generates a PDF via the
 * wrapper, writes it to a temp file, and validates it with:
 *   /opt/homebrew/bin/verapdf --flavour ua1 <file>
 *
 * veraPDF exit codes: 0 = compliant, 1 = non-compliant (but still outputs XML).
 * We capture stdout from both cases and assert on the XML directly.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

import {
  createDocument,
  addHeading,
  addParagraph,
  addFigure,
  artifact,
  toBuffer,
} from './index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FONT_DIR   = join(__dirname, '../../../node_modules/pdfmake/fonts/Roboto');
const FONTS      = {
  regular: join(FONT_DIR, 'Roboto-Regular.ttf'),
  medium:  join(FONT_DIR, 'Roboto-Medium.ttf'),
};

/**
 * Create a minimal valid N×N black RGB PNG as a Buffer.
 * Uses Node.js zlib so the compressed data is correct — no hand-crafted bytes.
 */
function makeTestPng(size = 4) {
  // CRC-32 lookup table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c;
  }
  const crc32 = (buf, start = 0, end = buf.length) => {
    let c = 0xFFFFFFFF;
    for (let i = start; i < end; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };
  const chunk = (type, data) => {
    const t = Buffer.from(type, 'ascii');
    const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
    const crcBuf = Buffer.concat([t, d]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcBuf));
    return Buffer.concat([len, t, d, crc]);
  };
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  // IHDR: size×size, 8-bit RGB (colour type 2)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  // IDAT: filter byte (0) + RGB black pixels per scanline
  const scanline = Buffer.alloc(1 + size * 3, 0);
  const rows = Buffer.concat(Array.from({ length: size }, () => scanline));
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

// Minimal 4×4 black PNG for Figure tests — generated via deflateSync (guaranteed valid)
const RED_PNG = makeTestPng(4);

/**
 * Run verapdf against a Buffer. Returns the XML output string.
 * Uses spawnSync with an argument array (no shell) to avoid any injection risk.
 * @param {Buffer} pdfBuffer
 * @returns {string}
 */
function verapdfXml(pdfBuffer) {
  const tmpFile = join(tmpdir(), `pdf-ua-test-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  writeFileSync(tmpFile, pdfBuffer);
  try {
    // spawnSync with explicit argument array: no shell, no interpolation risk.
    const result = spawnSync(
      '/opt/homebrew/bin/verapdf',
      ['--flavour', 'ua1', tmpFile],
      { encoding: 'utf8' }
    );
    // veraPDF exits 1 when the PDF is non-compliant but still emits valid XML.
    // Capture stdout regardless of exit code.
    return result.stdout || '';
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore cleanup errors */ }
  }
}

// ── veraPDF compliance test ─────────────────────────────────────────────────

describe('pdf-ua wrapper — veraPDF PDF/UA-1 compliance', () => {
  it('produces a compliant document with heading, paragraph, artifact, table, and figure', async () => {
    const doc = createDocument({ title: 'Unit Test Document', fonts: FONTS });

    addHeading(doc, 1, 'Test Heading', { fontSize: 20 });
    addParagraph(doc, 'Test paragraph text.', { fontSize: 12 });

    // Decorative fill as page-level artifact (not inside a structure element)
    artifact(doc, (d) => { d.rect(72, doc.y, 100, 20).fill('#cccccc'); });

    // PDFKit 0.18.0 quirk: at least one markStructureContent call must follow
    // an artifact() before doc.table() — otherwise the table emits untagged
    // content. addParagraph() provides that call. See ADR 010, Finding 3.
    addParagraph(doc, 'Section heading.', { fontSize: 11 });
    doc.table({
      structParent: doc,
      data: [
        [
          { type: 'TH', scope: 'column', text: 'Check'  },
          { type: 'TH', scope: 'column', text: 'Result' },
        ],
        ['WCAG AA',  'PASS'],
        ['WCAG AAA', 'FAIL'],
      ],
      columnStyles: [{ width: 200 }, { width: 200 }],
    });

    // Figure with non-empty alt text
    doc.moveDown();
    addFigure(doc, RED_PNG, 'A small red test square used as a visual sample.', {
      width: 50, height: 50,
    });

    addParagraph(doc, 'Footer paragraph.', { fontSize: 9 });

    const buffer = await toBuffer(doc);

    // Basic structural checks
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');

    // veraPDF PDF/UA-1 validation
    const xml = verapdfXml(buffer);
    expect(xml).toContain('isCompliant="true"');
    expect(xml).toContain('profileName="PDF/UA-1 validation profile"');

    const failedMatch = xml.match(/failedChecks="(\d+)"/);
    if (failedMatch) {
      expect(parseInt(failedMatch[1], 10)).toBe(0);
    }
  });
});

// ── Guard tests ─────────────────────────────────────────────────────────────

describe('pdf-ua wrapper — input guards', () => {
  it('throws when title is missing', () => {
    expect(() => createDocument({ fonts: FONTS })).toThrow(/title/i);
  });

  it('throws when fonts.regular is missing', () => {
    expect(() => createDocument({ title: 'T' })).toThrow(/fonts/i);
  });

  it('throws when addFigure is called with empty alt text', () => {
    const doc = createDocument({ title: 'T', fonts: FONTS });
    expect(() => addFigure(doc, RED_PNG, '')).toThrow(/altText/i);
    expect(() => addFigure(doc, RED_PNG, '   ')).toThrow(/altText/i);
  });
});
