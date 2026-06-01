# Work Folder Log: 013-iccc-pdf-ua

This log is chronological and append-only.

## [2026-05-31] open | PDF/UA rewrite — work folder opened

Tim approved the PDF/UA-1 rewrite. Brief written. Dispatching Jacob (ADR + wrapper API design) and Tad (requirements) in parallel, then Sean to build.

Key inputs:
- Smoke test at /tmp/pdfkit-smoke/smoke.js proven veraPDF-clean with 0 failures
- Workaround for PDFKit CIDSet bug documented in brief
- Current pdf.js (344 lines, pdfmake) is the visual reference
- [2026-05-31 23:53:28] subagent completed
- [2026-05-31 23:53:44] subagent completed
- [2026-06-01 00:02:32] subagent completed
- [2026-06-01 00:13:01] subagent completed
- [2026-06-01 09:49:46] subagent completed
- [2026-06-01 09:56:53] subagent completed
- [2026-06-01 11:41:14] subagent completed
- [2026-06-01 11:45:00] subagent completed
- [2026-06-01 14:21:46] subagent completed
- [2026-06-01 14:37:26] subagent completed
- [2026-06-01 14:49:29] subagent completed
- [2026-06-01 14:53:11] subagent completed
- [2026-06-01 15:07:27] subagent completed

## [2026-06-01] Carol — browser smoke test: PASS

Tested the deepClone ArrayBuffer fix (commit replacing `font: { src: fonts.medium }` with
`font: { src: 'Medium' }` at 7 sites in `src/export/pdf.js`) against the live dev server.

Results:
- Font fetches: `/fonts/Roboto-Regular.ttf` HTTP 200, `/fonts/Roboto-Medium.ttf` HTTP 200
- No "Not a supported font format or standard PDF font." error in console
- No uncaught JavaScript errors in the PDF export code path
- PDF download triggered: `contrast-audit-2026-06-01-14-20-09.pdf`
- Console errors present were pre-existing and unrelated to PDF export:
  - CSP `frame-ancestors` meta-element warning (benign)
  - CSP block on `data:` URI fetch by ONNX Runtime (WASM loading, unrelated to PDF)
  - WebGPU adapter unavailable in headless Chromium (expected in CI/headless)
  - GoatCounter analytics not counting on localhost (expected)

Verdict: PASS. The fix is confirmed effective in the browser runtime.
- [2026-06-01 15:25:44] subagent completed
- [2026-06-01 15:29:02] subagent completed
- [2026-06-01 15:43:54] subagent completed
- [2026-06-01 16:17:00] subagent completed

## [2026-06-01] Carol — visual PDF audit: FAIL

Visual audit of the PDFKit rewrite. PDF downloaded successfully (26744 bytes, valid PDF/1.5 header). Rendered with pdftoppm at 200dpi and analysed pixel-by-pixel.

**Result: FAIL — six distinct visual defects identified.**

See test report in Carol's handoff message.
- [2026-06-01 16:20:06] subagent completed
- [2026-06-01 16:28:17] subagent completed

## [2026-06-01] Carol — re-audit after v0.4.6 fixes: FAIL

Re-audit following the three stated fixes:
1. Margins fix (object passed to wrapper treated as array)
2. addHeading/addParagraph fix (explicit options added to doc.text())
3. addFigure image fix (pre-decoding data URLs to Uint8Array)

PDF downloaded successfully (27460 bytes, valid PDF/1.5 header). Rendered with pdftoppm
at 120dpi and 200dpi; PDF content stream decompressed and analysed directly.

**Result: FAIL — root bug persists, one new issue identified.**

Root cause confirmed via PDF content stream analysis:
`doc.text()` inside `markStructureContent()` produces EMPTY BT/ET blocks in the browser build.
All structure elements (H1, H2, H3, P, Figure) have correct BDC/EMC markers but contain
no actual text or image rendering commands. Only `doc.table()` produces visible output.

Fix 2 (explicit options on doc.text()) did not resolve the root cause.
Fix 3 (Uint8Array decode) did not resolve the root cause for addFigure either.

See full test report in Carol's handoff for section-by-section breakdown.
- [2026-06-01 17:39:41] subagent completed
- [2026-06-01 17:43:02] subagent completed
- [2026-06-01 17:46:52] subagent completed
- [2026-06-01 17:58:51] subagent completed
- [2026-06-01 18:05:35] subagent completed
- [2026-06-01 18:24:19] subagent completed
- [2026-06-01 18:28:53] subagent completed

## [2026-06-01] Carol — re-audit after v0.4.10 layout fixes: PASS

Re-audit of the two previously-failing layout sections, plus full visual pass of all
sections, after the v0.4.10 fixes. PDF: 253279 bytes, valid PDF/1.5 header.
Rendered with pdftoppm at 150dpi and analysed pixel-by-pixel.

**Result: PASS — both previously-failing sections now correct; all previously-passing sections remain correct.**

Key measurements (at 150dpi, scale 2.083px/pt):
- Navy block: 34.6pt rendered height (visual), H1 title padding = 17.3pt from block top (> required 10pt)
- "Audit Report" H2 background at heading position: RGB(255,255,255) — white, confirmed
- Amber disclaimer block: 39.8pt rendered height (~40pt as coded), disclaimer text padding = 7.7pt (> required 6pt)
- "Summary" H2 background at heading position: RGB(255,255,255) — white, confirmed
- Gap from amber block end to Summary heading: 17.8pt (adequate separation)

See full test report in Carol's handoff message.
- [2026-06-01 18:51:17] subagent completed

## [2026-06-01] Sean — PNG fixture fix applied; veraPDF compliance failures exposed

Replaced corrupt base64-literal PNG fixtures in both test files with `makeTestPng()` using `deflateSync` (guaranteed valid). The PNG parse error is resolved.

**However, the tests still fail — for a different reason.** veraPDF now runs successfully against the generated PDFs and returns real compliance output. Both compliance tests now fail with `isCompliant="false"`, 4 failed rules, 195 failed checks total.

The four PDF/UA-1 rule failures (both PDFs):
1. **Clause 7.1 test 3 (174 + 12 checks)** — Content neither marked as Artifact nor tagged as real content. Untagged content scattered across multiple pages.
2. **Clause 7.18.1 test 2 (7 checks)** — Link annotations missing alternate text (alt text required on annotation objects).
3. **Clause 7.18.5 test 1 (7 checks)** — Link annotations not wrapped in a `Link` structure element (tagged as `null` instead of `Link`).
4. **Clause 7.18.5 test 2 (7 checks)** — Link annotation structure requirement (combined annotation + alt-text tag).

These are real structural bugs in `src/export/pdf.js` and/or `src/lib/pdf-ua/index.js`. They were masked by the PNG parse error aborting the PDF build before veraPDF could run. The PNG fix is correct — the test failures are now accurate signals about PDF/UA compliance bugs that need fixing.

Returning to Sonja with this finding. The PNG fixture changes are committed; the compliance bugs are a separate rework item.
- [2026-06-01 18:56:41] subagent completed
- [2026-06-01 19:05:30] subagent completed

## [2026-06-01] Carol — targeted re-check after v0.4.11 compliance fixes: PASS

Targeted re-check of the two v0.4.11 changes: (1) `structParent: doc` added to all
`doc.table()` calls; (2) `writeParagraph` link annotations removed (plain text only).

PDF downloaded from dev server: 429692 bytes (real-world test image with 11 colour pairs),
8 pages. Rendered with pdftoppm at 150dpi, pixel-analysed.

**Result: PASS — all targeted sections correct; no regressions in previously-passing sections.**

### Summary table (section 1.4)
- Two-column layout (Image / Result): column divider at 416pt from margin (target 415pt) — PASS
- Grey header row (#f3f4f6 = RGB 243,244,246): confirmed at y=518 — PASS
- Cell borders (full-width horizontal lines, 207px across): present — PASS
- FAIL pill: pink background RGB(254,226,226) confirmed at y=567 — PASS

### Per-pair checks tables (section 1.9)
- Four columns (Check / Value / Status / What it means): dividers at 111pt, 191pt, 271pt, 496pt
  (targets: 110, 190, 270, 495pt — all within 1pt) — PASS
- Grey TH header row (#f3f4f6): confirmed — PASS
- Group header rows ("WCAG compliance", "Advanced checks"): grey background confirmed — PASS
- Cell borders: present throughout all tables — PASS
- FAIL pill: RGB(254,226,226) confirmed — PASS
- PASS pill: RGB(220,252,231) confirmed — PASS
- SAFE pill: RGB(220,252,231) (green) confirmed — PASS
- No column overflow or missing text — PASS

### Plain-text links (v0.4.11 change)
- "Generated by Image Colour Contrast Checker" (page 1 + footer): navy text, NO underline — PASS
- "WebAIM": dark/navy text, NO underline — PASS
- "Vestibular Accessible Design Checker (opens in new window)": dark text, NO underline — PASS

### Previously-passing sections (regression check)
- Section 1.1: Navy header RGB(6,21,40), white H1 text, orange "Contrast Checker" (#FF7C00),
  blue subtitle (#63D2FF-ish) — all confirmed — PASS
- Header vertical extent: y=104 to y=249 = 145px = 69.6pt (target 70pt) — PASS
- Section 1.6: Preview image visible — PASS
- Section 1.7: CVD sim images (Deuteranopia, Protanopia, Tritanopia, Achromatopsia) — all visible — PASS

### Console errors
Zero non-baseline errors. All errors were pre-existing: CSP frame-ancestors meta,
ONNX data: URI CSP block, GoatCounter localhost skip.
- [2026-06-01 19:23:19] subagent completed
