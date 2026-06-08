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
- [2026-06-01 19:42:05] subagent completed
- [2026-06-01 19:57:43] subagent completed

## [2026-06-01] Carol — full visual audit v0.4.12: PASS

Full visual audit of the v0.4.12 PDFKit rewrite. Test image: "thank you image.jpg"
(4 colour pairs, 3 failing). PDF: 2,277,629 bytes, 5 pages. Rendered with pdftoppm
at 150dpi; pixel-level analysis at all 8 required checkpoints.

**Result: PASS — all 8 pass criteria met.**

All measurements at scale 2.0833 px/pt (150dpi):

### Navy header
- Navy rect RGB(6,21,40) at y=104-287px = 50-138pt, height=88pt (coded HEADER_H=88pt) — PASS
- Navy left edge: x=83px = 39.8pt (= left margin 40pt) — confirmed
- H1 "Image Colour Contrast Checker" first text pixel: x=111px = 53.3pt from page left
- H1 inner left padding = 111-83 = 28px = **13.4pt** (target >=10pt) — PASS
- H1 top padding = 137-104 = 33px = 15.8pt (target ~12pt) — PASS
- Orange "Contrast Checker": RGB(255,124,0) at x=523,y=135 — confirmed — PASS
- Sky-blue tagline: RGB(97,206,250) at x=110,y=177 — confirmed — PASS

### Disclaimer block
- Amber block RGB(254,243,199): y=402-517, height=55.2pt (coded 56pt) — confirmed — PASS
- Corner pixel at (83,402): RGB(255,255,255) = white — rounded corners visible — PASS
- First text pixel: x=109, y=426 → left padding = 109-83 = 26px = **12.5pt** (target >=10pt) — PASS
- Top padding = 426-402 = 24px = 11.5pt (target ~10pt) — PASS
- "Automated analysis only" bold pixel density = 43, regular continuation = 20, ratio 2.15 — PASS

### Generated-by link underline
- Link text at y=372-385 (168-185pt): x=110-485, width=180px=86pt
- Plain-text portion "Generated by " left-most pixels: RGB(75,85,99) = #4b5563 gray — PASS
- Link portion "Image Colour Contrast Checker": RGB(6,21,40) = navy #061528 — PASS
- Underline at y=389: continuous run **262px=125.5pt** wide, x=224-485 — underline confirmed — PASS
- Underline aligns with link text start (x=224 vs estimated link start x=218, 2.9pt delta) — PASS
- Footer also has underline: y=190-191, 150px=72pt continuous run under "Image Colour Contrast Checker" — PASS

### Summary table
- Grey TH header row RGB(243,244,246): confirmed — PASS
- FAIL pill RGB(254,226,226): confirmed at y=638-683, x=970 — PASS

### Preview image
- Occupies lower portion of page 1 from y~720 to bottom of page — PASS
- Does NOT overflow page width (contained within 515pt content area) — PASS

### Result line
- "Result: FAIL — ..." visible at top of page 2 (y=51.4pt on page 2) — PASS
- Appears on page after preview image — no overlap — PASS

### CVD simulation grid
- 4 images in 2-column layout confirmed:
  - Row 1: Deuteranopia (left) + Protanopia (right)
  - Row 2: Tritanopia (left) + Achromatopsia (right)
- Labels below each image confirmed — PASS
- Dual-column pixel content confirmed across both rows — PASS

### Contrast tables
- Grey TH header rows (#f3f4f6): confirmed on page 3 — PASS
- Column dividers at x=635 (304.8pt) and x=1031 (494.9pt) — PASS
- FAIL/PASS pills rendered — PASS
- WebAIM and Vestibular links: underlined (confirmed on page 2 bottom) — PASS

### Console errors
Zero non-baseline errors. All pre-existing: CSP frame-ancestors meta, ONNX data: URI
CSP block, WebGPU unavailable in headless, GoatCounter localhost skip.
- [2026-06-01 20:44:36] subagent completed
- [2026-06-01 20:48:13] subagent completed
- [2026-06-01 20:54:28] subagent completed
- [2026-06-01 21:13:26] subagent completed
- [2026-06-01 21:19:44] subagent completed
- [2026-06-01 21:50:41] subagent completed
- [2026-06-01 21:58:07] subagent completed

## [2026-06-01] session-summary | compact for session handoff

### Last user message

Tim said: "the links to move information on what the checks mean are missing" (referring to the per-pair checks table in the PDF — check names WCAG AA, WCAG AAA, APCA, CVD contrast, Vestibular, Cognitive should be clickable hyperlinks to `checkInfoUrl(c.id)`). He also asked Tad to write a comprehensive test spec for Carol so she stops missing defects. His tone was frustrated.

### Open agents

None.

### Open pull requests

- **PR #24** — `feat(pdf): PDF/UA-1 compliant export via PDFKit wrapper (ACC-ICCC-005)` on branch `feat/pdf-ua-rewrite` — OPEN (awaiting check-info links resolution, then Tim's merge approval)
- **PR #23** — `chore(main): release 0.4.1` on branch `release-please--branches--main` — OPEN (release-please auto-PR, not relevant to this work folder)

### Unresolved items

1. **Check-info links in per-pair checks table** — PDFKit 0.18.0's `doc.table()` API silently ignores `link`/`underline` on top-level cell objects. Using `cell.textOptions.link` creates untagged link annotations that fail veraPDF clause 7.18 with 36 failures. A PDF/UA-1 compliant implementation requires either (a) a custom table cell renderer not using `doc.table()` or (b) patching PDFKit. Tim has been presented two options but has not yet responded:
   - **Option A**: Ship PR #24 now without check-info links in table cells; implement as Phase 2.
   - **Option B**: Hold the PR and build a custom cell renderer now (est. 1–2 hours, plus full Carol re-test).
2. **Carol full re-test not yet run** — Carol's test spec (12 sections, `.claude/work/013-iccc-pdf-ua/carol-test-spec.md`) was written by Tad but Carol has not yet run a full audit against it. The spec includes mandatory click-verification for every link (section 12) and explicit layout continuity checks. Carol should not re-test until the check-info links question is resolved.

### Next step

Resume by asking Tim for his decision on Option A vs Option B for the check-info links in the checks table, then dispatch accordingly (Sean to implement if Option B, Carol for full test spec audit if Option A or after Option B is built).
- [2026-06-01 22:01:56] subagent completed
- [2026-06-01 22:15:22] subagent completed
- [2026-06-01 22:22:05] subagent completed

## [2026-06-01] Carol — full audit per 12-section test spec: FAIL

Full audit of PDF generated on branch `feat/pdf-ua-rewrite` from dev server at `http://localhost:5173`.
Test image: `test-contrast-image.png` (synthetic PIL image, 4 colour pairs, 2 FAIL AA).
PDF: 205,039 bytes (200KB), valid PDF/1.5 header, 31 pages. Rendered at 150dpi with pdftoppm.

**Result: FAIL — three defects found.**

### Sections 1–4 (Header, Metadata, Disclaimer, Summary): PASS
All header, metadata, disclaimer, and summary sections pass. Specific measurements:
- Navy block: 88.3pt height, RGB(6,21,40), left edge 39.8pt — PASS
- H1 white/orange: RGB(255,255,255)/RGB(255,124,0), padding 13.4pt — PASS
- Tagline: RGB(97,206,250), inside navy block — PASS
- Audit Report H2: white background, confirmed — PASS
- Timestamp: RGB(75,85,99) grey — PASS
- Generated-by link: navy RGB(6,21,40), underline 262px continuous — PASS
- Disclaimer: RGB(254,243,199) amber, rounded corners (corner pixel white), padding 12.5pt — PASS
- Bold "Automated analysis only": density ratio 2.15 — PASS
- Summary header: RGB(243,244,246) grey — PASS
- FAIL pill: RGB(254,226,226) background — PASS (text colour rendering at 8pt produces near-black glyphs; source colour #7f1d1d is correct)

### Section 5 (Image section): PASS
- H2 "test-contrast-image.png": at x=107 (51.4pt from page left) — PASS
- Preview image: navy content visible y=763-1568, not blank — PASS
- Result line: y=1572 > image bottom y=1568, no overlap, 4px gap — PASS

### DEFECT 1 — Section 6 (CVD grid): FAIL
- Section 6.1: "Colour-blindness simulation" heading at x=107 (51.4pt) — PASS (heading correct)
- Section 6.2: ONLY 2 of 4 CVD images render (row 1, Deuteranopia+Protanopia visible at bottom of page 1). Row 2 (Tritanopia+Achromatopsia) images are NOT visible on any page. Pages 2-5 show only captions with no image content. — FAIL
- Section 6.3: Row 1 shows correct 2-column layout (col1 left=40pt, col2 left=284.7pt), but row 2 images are missing entirely — PARTIAL/FAIL
- Section 6.4: Captions on pages 2-5 are present (Deuteranopia/Protanopia at wrong x positions; Tritanopia/Achromatopsia captions visible) but without corresponding images — FAIL

Root cause: `addFigure` uses absolute y positioning (`y: rowTop`). When `rowTop` is near the bottom of the page, the images overflow the page boundary and are not rendered on the next page. The label text uses a separate `doc.text(lblX, labelY, ...)` call which does page-wrap, producing captions on overflow pages without images.

### DEFECT 2 — Sections 7 and 11 (Layout continuity after CVD grid): FAIL
After the CVD grid overflow, the document cursor is at x=305pt (right-column position) instead of 40pt (left margin).

Affected content for pair 1 only (page 6):
- "Contrast results" H3 heading: x=637px = 305.8pt (expected ≤45pt) — FAIL
- WCAG summary line: x=641 (307.7pt) — FAIL
- Advanced checks summary line: x=641 (307.7pt) — FAIL
- Badge strip (partial): right-side portion at x=568-699 — FAIL
- WebAIM link: x=635 (305pt) — FAIL

Pairs 2-4 are NOT affected (subsequent `addTable` calls reset `doc.x = margins.left` before the next pair's `writeParagraph`).

Root cause: The `doc._x = doc.page.margins.left` reset in the CVD grid loop runs after each row, but when the image absolute positioning causes a page overflow, the cursor is left at the right-column x position. PDFKit's internal x state is not properly reset when flowing to a new page after absolute positioning.

### Sections 8–11 (Per-pair blocks): MIXED
- Section 8.1: All 4 pairs present — PASS
- Section 9.1: Swatches visible at left margin — PASS (swatch uses explicit `x=doc.page.margins.left`)
- Section 9.2: Badge strip at left margin for pairs 2-4; pair 1 partially misaligned — FAIL (from Defect 2)
- Section 9.3: Examples text present (grey italic) — PASS
- Section 9.4: WebAIM link: navy with underline, correct URL with fcolor/bcolor params — PASS (pairs 2-4 at left margin; pair 1 misaligned but link is correct)
- Section 9.5: Vestibular link: underline confirmed, correct URL — PASS
- Section 9.6: 4-column table structure: 110pt/80pt/80pt/225pt columns — PASS
- Section 9.7: All 6 check-info links present with underlines (WCAG AA 83px, WCAG AAA 95px, APCA 48px, CVD contrast 110px, Vestibular 83px, Cognitive 78px). URLs confirmed: wcag-aa, wcag-aaa, apca, cvd, vestibular, cognitive. PDF has 24 total check-info annotations (4 pairs × 6 checks) — PASS
- Section 9.8: Value column content present (contrast ratios, Lc values, saturation %) — PASS
- Section 9.9: PASS/FAIL/SAFE pills with correct colours (RGB(220,252,231)/RGB(254,226,226)/RGB(220,252,231)) — PASS
- Section 9.10: "What it means" column italic text present — PASS
- Section 9.11: Clip image present with "Where this combination appears:" label, at left margin — PASS

### DEFECT 3 — Table cell page overflow (Sections 8-9):
Individual table cells are split across many pages (31 pages for 4 pairs is excessive). The `addTable` function does not implement row-level page breaks: it calculates `rowY` sequentially and individual rows (and even cells) overflow page boundaries. Page 7 shows "WCAG AAA" only; page 8 shows "4.03:1" and a FAIL pill at the page bottom — these are individual table cells. This causes severe readability issues.

Not a criterion in the 12-section spec but is a significant functional defect.

### Section 10 (Footer): PASS
- Footer grey text: RGB(75,85,99) confirmed at y=1030-1085 on page 31 — PASS
- Footer link "Image Colour Contrast Checker": navy underline (260px continuous at y=1089) — PASS
- URL: confirmed `https://image-colour-contrast-checker.timdixon.net` in PDF (2 occurrences: page 1 + footer) — PASS

### Section 12 (Link verification): PASS for URLs; FAIL for alignment of pair 1 links
URL inventory (all 12 required link types present):
- Site root: 2× (page 1 + footer) — PASS
- WebAIM: 4× (one per pair, with correct fcolor/bcolor params) — PASS
- Vestibular: 9× (pair count × lines wrapped, all same URL) — PASS
- wcag-aa: 4× — PASS
- wcag-aaa: 4× — PASS
- apca: 4× — PASS
- cvd: 4× — PASS
- vestibular: 4× — PASS (in Contents field; 9 annotations due to text wrap)
- cognitive: 4× — PASS
All 6 check-info links have Contents fields set correctly per PDF/UA §7.18.1.

Total link count: 39 URIs in PDF. Expected for 4 pairs: 2 + 8×4 = 34 (plus vestibular multi-line = 39 observed). Correct.

### Console errors
Zero non-baseline errors. All errors are pre-existing: ONNX data: URI CSP block, ONNX Runtime node assignment warnings. No PDF export errors.

### Overall verdict: FAIL
Three defects require rework by Sean:
1. CVD row 2 images not rendering (absolute y positioning overflows page boundary)
2. Layout cursor not reset to left margin after CVD grid overflow (pair 1 content misaligned at x=305pt)
3. `addTable` does not implement row-level page breaks (cells split across many pages, 31 pages for 4 pairs)

Defect 3 was not in the previous test spec but is observable. Defects 1 and 2 are failures of sections 6 and 7 respectively.
- [2026-06-01 22:51:42] subagent completed
- [2026-06-01 22:54:03] subagent completed

## [2026-06-02] Carol — targeted re-check after three fixes: PASS

Targeted re-check of the three defects fixed by Sean. Test image: "thank you image.jpg"
(4 colour pairs). PDF: 2,268,689 bytes, valid PDF/1.5. Rendered with pdftoppm at 150dpi;
pixel analysis with PIL+NumPy plus visual inspection of all 5 pages.

**Total pages: 5** (previously 31 — Fix 3 confirmed effective)

### Fix 1: CVD grid row 2 images — PASS
All 4 CVD simulation images present in a 2×2 grid on page 2:
- Row 1: Deuteranopia (col1, x=40pt) + Protanopia (col2, x=305pt) — both confirmed with
  image content variance >2800 at y≈50-120pt on page 2
- Row 2: Tritanopia (col1) + Achromatopsia (col2) — both confirmed present, both columns
  showing BOTH-IMG at y≈165-295pt on page 2 (no page overflow, page-break guard working)
- Image content confirmed distinct between columns (mean colour diff 16.1 between row 1 images;
  row 2 col2 shows higher R/G/B uniformity consistent with Achromatopsia greyscale)
- Visual inspection confirms 2-column layout (not stacked vertically)

### Fix 2: Cursor reset after CVD grid — PASS
After the CVD grid, the "Contrast results" heading starts at:
- y=1354px (650pt) on page 2, leftmost dark pixel x=87px (41.8pt) — within ≤45pt threshold
- WCAG summary lines: x=85-89px (40.8-42.7pt) — within threshold
- Badge strip (pair 1): x=93-95px (44.6-45.6pt) — within threshold
- Page 3 continuation: x=93-96px (44.6-46.1pt) — within threshold

The x=687px (330pt) dark pixel detected at y=1200px is a vertical table cell border
(confirmed by 82px vertical span at that x — not heading text).

### Fix 3: addTable page breaks — PASS
PDF is 5 pages (previously 31 for same 4-pair input). Row-level page break guard working
correctly; no table rows split across page boundaries observed in visual inspection.

### Regression 1: Navy header (Section 1.1) — PASS
- Navy block y=104-287px = height 87.8pt (target 88pt ±5) — PASS
- RGB(6,21,40) confirmed at centre column — PASS
- Left edge at x=83px (40pt) — PASS
- Orange text confirmed at x=523px (251pt) within header — PASS

### Regression 2: Disclaimer block (Section 3) — PASS
- Amber block y=402-517px = height 55.2pt (target ~56pt) — PASS
- Top-left corner pixel RGB(255,255,255) — rounded corners confirmed — PASS
- Inner padding ~12.5pt (target ≥10pt) — PASS

### Regression 3: Check-info links (Section 9.7) — PASS
All 6 check types × 4 pairs = 24 check-info link annotations confirmed:
- wcag-aa × 4, wcag-aaa × 4, apca × 4, cvd × 4, vestibular × 4, cognitive × 4
- URL format: https://image-colour-contrast-checker.timdixon.net/#check-info-{id} — correct
- Also: WebAIM × 4 (with fcolor/bcolor params), site root × 2, Vestibular × 8

### Regression 4: Footer link (Section 10.2) — PASS
- Grey footer text at y=108-134px (52-64pt) on page 5 — confirmed RGB ~(75,85,99) — PASS
- Navy underline at y=164px (78.7pt): x=200-453px, run=253px (121pt) continuous — PASS
- Navy "Generated by Image Colour Contrast Checker" link text confirmed y=152-164px — PASS

### Console errors
All console warnings are pre-existing baseline: GoatCounter localhost, WebGPU unavailable.
Zero non-baseline errors.

### Overall verdict: PASS
All three targeted fixes verified. All four regression sections pass. PDF has 5 pages
(target 5-12 for 4 pairs). Handoff to Sonja for merge gate.
- [2026-06-02 00:55:49] subagent completed

---

## Closed [2026-06-08]

PR #24 merged to main. Deploy to GitHub Pages successful. Version 0.4.18 live at https://image-colour-contrast-checker.timdixon.net.

**Delivered:**
- ISO 14289-1 (PDF/UA-1) compliant PDF export via PDFKit wrapper (`src/lib/pdf-ua/`)
- veraPDF compliance verified in CI on every push (106 rules, 0 failures)
- Keep-together table guard: tables that fit on one page are never split
- All WCAG 2.2 AAA findings resolved (web UI and PDF): row-group headers, link text, abbreviations, plain-English status labels, canvas aria-hidden, focus management, batch-complete announcement, JAWS heading navigation
- 0 axe violations on web UI
- veraPDF SHA-256 pinned in CI (supply-chain integrity)

**Status: CLOSED**
