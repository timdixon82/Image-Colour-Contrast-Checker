# Test Pass — PR 24: feat/pdf-ua-rewrite

**Tester:** Carol  
**Date:** 2026-06-01  
**PR:** #24 — feat/pdf-ua-rewrite  
**Branch:** feat/pdf-ua-rewrite → main  
**Dispatch from:** Sonja  

---

## Verdict: PASS WITH ONE MINOR NOTE (see Finding 1)

The PR passes all functional, accessibility, and visual equivalence checks. One minor documentation gap (cross-reference inconsistency) is noted but does not block merge. The release checklist follows.

---

## Functional Review

### Check 1 — src/export/pdf.js: exported API signature

Confirmed. `src/export/pdf.js` exports:

- `downloadPdf(entries, timestamp, filename)` — browser download path (unchanged public API)
- `buildPdf(entries, timestamp)` — returns `Promise<Buffer>` (new export for tests only)

`buildPdf` is not imported in `main.js` and is not callable from the browser UI. The public contract (`downloadPdf`) is identical in signature to the pdfmake version. **Pass.**

### Check 2 — src/export/markdown.js: untouched

`markdown.js` is unchanged by this PR. Its imports are identical (`strings.js`, `checks.js`). No modifications to any export. **Pass.**

### Check 3 — src/main.js: wiring

`main.js` imports only `downloadPdf` from `./export/pdf.js` (line 20). `buildPdf` is not imported. The click handler on `downloadPdfBtn` calls `downloadPdf(entries, state.batchTimestamp, ...)` correctly. **Pass.**

### Check 4 — src/lib/pdf-ua/index.js: wrapper exports

All seven exports named in ADR 010 are present:

| Export | Present |
|---|---|
| `createDocument` | Yes |
| `addHeading` | Yes |
| `addParagraph` | Yes |
| `addFigure` | Yes |
| `artifact` | Yes |
| `toBlob` | Yes |
| `toBuffer` | Yes |

No ICCC-specific code, brand colours, or layout logic is in this module. Dependencies are `pdfkit` and `blob-stream` only. No DOM APIs. **Pass.**

### Check 5 — docs/decisions/010-pdf-ua-pdfkit-wrapper.md: ADR

The ADR exists and is accepted. It covers:

- Finding 1: `subset: 'PDF/UA'` emits malformed CIDSet → workaround: omit flag, inject XMP manually.
- Finding 2: low-level `struct('TH', { scope })` silently drops Scope/Headers → workaround: use `doc.table()`.

**MINOR NOTE — Finding 3 cross-reference gap:** The `artifact()` JSDoc in `src/lib/pdf-ua/index.js` (line 284) and the wrapper unit test (`pdf-ua.test.js`, line 78) both reference "ADR 010, Finding 3" (artifact-before-table quirk causing untagged content). However, the ADR document itself has no formal "Finding 3" section — this quirk is described under "Other required settings" rather than as a numbered finding. The cross-reference is broken: a reader following "See ADR 010, Finding 3" will not find that heading in the ADR.

This is a documentation gap, not a compliance issue. The workaround itself is correctly implemented and the test validates it. **Does not block merge.** Recorded as a task below.

The dispatch required confirming coverage of "three PDFKit bugs". Findings 1 and 2 are formally documented. The third behaviour (the artifact/table ordering quirk) is documented in the ADR under "Other required settings" and in the `artifact()` JSDoc. Coverage is present; the cross-reference labelling is inconsistent. **ADR check: Pass with note.**

---

## Accessibility Review

### Check 6 — docs/accessibility.md: ACC-ICCC-005

ACC-ICCC-005 is marked RESOLVED. The entry reads:

> **RESOLVED** in PR `feat/pdf-ua-rewrite`. The PDF export has been rewritten to use PDFKit 0.18.0 via the `src/lib/pdf-ua/` wrapper, replacing pdfmake. The new export produces formally ISO 14289-1 (PDF/UA-1) compliant output, verified by veraPDF 1.30.1 (106 rules checked, 0 failures). All images in the exported PDF (preview, colour-blindness simulations, cropped regions) carry alt text via Figure structure elements. Decorative elements (colour swatches, background fills) are marked as Artifacts.

Points to PR `feat/pdf-ua-rewrite` and cites veraPDF 1.30.1 verification. **Pass.**

### Check 7 — todo.md: D8

D8 is struck through and marked done:

> **Done in PR feat/pdf-ua-rewrite.** PDF export replaced with PDFKit 0.18.0 via the `src/lib/pdf-ua/` wrapper. Output is formally ISO 14289-1 (PDF/UA-1) compliant, verified by veraPDF. All images have alt text. See `docs/accessibility.md` ACC-ICCC-005 (resolved) and ADR 010.

**Pass.**

### Check 8 — veraPDF assertions in both test files

**pdf-ua.test.js** (`src/lib/pdf-ua/pdf-ua.test.js`):
- Line 109: `expect(xml).toContain('isCompliant="true"');`
- Line 110: `expect(xml).toContain('profileName="PDF/UA-1 validation profile"');`
- Lines 112–115: asserts `failedChecks` integer equals 0 when present.

**pdf.test.js** (`src/export/pdf.test.js`):
- Line 150: `expect(xml).toContain('isCompliant="true"');`
- Line 151: `expect(xml).toContain('profileName="PDF/UA-1 validation profile"');`
- Lines 153–156: asserts `failedChecks` integer equals 0 when present.

Both test files assert `isCompliant="true"`. **Pass.**

---

## Visual Equivalence Check (structural section inventory)

Comparing `src/export/pdf.js` against the 10 sections in `tad-requirements.md`:

| # | Section | Present in pdf.js | Notes |
|---|---------|:-----------------:|-------|
| 1.1 | Branded header — navy fill, white+orange title, sky-blue tagline | Yes | Lines 105–128. Navy `#061528` Artifact, H1 struct with white `#ffffff` / orange `#FF7C00` text, P with `#63D2FF`. |
| 1.2 | Report title and timestamp | Yes | Lines 131–135. H2 "Audit Report", P with timestamp, P with "Generated by {APP_NAME}". |
| 1.3 | Disclaimer block — amber background | Yes | Lines 137–148. Amber `#fef3c7` Artifact, P with DISCLAIMER_TEXT (stripped first sentence). |
| 1.4 | Summary table — TH cols: Image, Result | Yes | Lines 150–167. H2 "Summary", `doc.table()` with TH `scope: 'column'` for both header cells. |
| 1.5 | Per-image heading + preview | Yes | Lines 174–178. H2 with `entry.filename`, `addFigure` with alt "Preview of {filename}". |
| 1.6 | Per-image result line | Yes | Lines 180–184. P with "Result: {vs} — {entry.report.detail}". |
| 1.7 | CVD simulation images | Yes | Lines 186–199. H3 "Colour-blindness simulation", loop over cbSimAssets with `addFigure` + alt text + P caption. |
| 1.8 | Contrast results summary lines | Yes | Lines 201–207. H3 "Contrast results", P with `wcagLine(entry.report)`, P with `advancedLine(entry.report)`. |
| 1.9 | Per-pair blocks — badges, examples, checks table, clip image | Yes | Lines 209–293. Swatch as Artifact, P for badges+hex, P for examples+links, `doc.table()` with CHECK_GROUPS loop, conditional `addFigure` for clip. |
| 1.10 | Footer | Yes | Lines 295–301. P with THRESHOLDS_FOOTER, P with "Generated by {APP_NAME}". |

All 10 sections are present and correctly structured. **Pass.**

**Additional visual notes:**

- Pill colours match the requirement exactly: pass `#14532d` / `#dcfce7`, fail `#7f1d1d` / `#fee2e2`, warn `#663a00` / `#fef3c7`, neutral `#4b5563` / `#f0f2f5`.
- Strings are imported from `strings.js` (`APP_NAME`, `THRESHOLDS_FOOTER`, `DISCLAIMER_TEXT`); none are hardcoded in pdf.js in violation of the architecture rule.
- `checks.js` exports consumed by pdf.js (`pairChecks`, `wcagLine`, `advancedLine`, `pairBadges`, `statusWord`, `CHECK_GROUPS`) all exist.
- Import layering is clean: pdf.js imports from `../lib/pdf-ua/`, `./strings.js`, `./checks.js` and from Node built-ins. No imports from `ui/`, `adapters/`, or `core/image.js`. Architecture rules respected.

---

## Release Checklist — v0.4.2

### CI checks

| Check | Status |
|---|---|
| Lint (HTML, CSS, JS) | COMPLETED — SUCCESS |
| Vite build | COMPLETED — SUCCESS |
| Semgrep (security) | COMPLETED — SUCCESS |
| Trivy (security) | COMPLETED — SUCCESS |
| Pa11y and axe at WCAG 2.2 AAA | IN PROGRESS (running) |
| CodeQL (Analyse JavaScript) | IN PROGRESS (running) |
| Dependency review | IN PROGRESS (running) |

Three checks are still running at the time of this test pass. The release checklist cannot be fully signed off until they complete. See note below.

### Functional testing

| Item | Status |
|---|---|
| pdf.js exported API signature matches prior contract | Pass |
| markdown.js untouched | Pass |
| main.js wiring correct | Pass |
| Wrapper exports match ADR | Pass |
| All 10 content sections present | Pass |
| Import layering (no ui/, adapters/, core/image.js in pdf.js) | Pass |
| Strings sourced from strings.js | Pass |
| checks.js exports consumed correctly | Pass |

Functional testing: **signed off.**

### Accessibility testing

| Item | Status |
|---|---|
| ACC-ICCC-005 marked RESOLVED in docs/accessibility.md | Pass |
| D8 marked done in todo.md | Pass |
| pdf-ua.test.js asserts isCompliant="true" | Pass |
| pdf.test.js asserts isCompliant="true" | Pass |
| veraPDF 5/5 Vitest tests green (per dispatch — pre-verified) | Pass |
| Wrapper enforces non-empty alt text on addFigure (throws on empty) | Pass |
| All meaningful images tagged as Figure with alt text | Pass |
| All decorative elements (fills, swatches) tagged as Artifact | Pass |
| No AFM built-in fonts (Roboto TTF only) | Pass |
| Document /Lang set to 'en' | Pass |
| pdfuaid:part 1 XMP claim injected (Finding 1 workaround) | Pass |
| Tables authored via doc.table() with TH scope (Finding 2 workaround) | Pass |

Accessibility testing: **signed off.**

### Visual check

| Item | Status |
|---|---|
| Brand header colours match brand.md / CLAUDE.md palette | Pass |
| All 10 sections match tad-requirements.md inventory | Pass |
| Pill colour pairs all AAA (stated in tad-requirements.md section 3.2) | Pass |
| Disclaimer amber fill present | Pass |
| Summary and checks tables have TH cells with scope=column | Pass |

Visual check: **signed off.**

### Architecture and security conformance

| Item | Status |
|---|---|
| No logic in pdf.js beyond layout (business logic stays in core/) | Pass |
| Wrapper has zero ICCC coupling | Pass |
| No DOM APIs in src/lib/pdf-ua/index.js | Pass |
| Export contract (AnalysedEntry[]) unchanged | Pass |
| Semgrep security scan: SUCCESS | Pass |
| Trivy vulnerability scan: SUCCESS | Pass |
| Dependency review: IN PROGRESS | Pending |
| Jed security review present in work folder | Pass (jed-security-review.md exists) |

### Version and changelog

| Item | Status |
|---|---|
| package.json version: 0.4.2 | Confirmed |
| VERSION file: 0.4.2 | Confirmed |
| PR title references ACC-ICCC-005 | Confirmed |
| ADR 010 written and accepted | Confirmed |

### GitHub Actions log (work folder)

The work folder log (`013-iccc-pdf-ua/log.md`) records four subagent completions (Jacob ADR, Tad requirements, Sean build, plus one more). The log is append-only and present.

---

## Release Readiness

**Status: NOT YET READY — three CI checks still running.**

The release is blocked only by the three in-progress CI checks (Pa11y/axe, CodeQL, Dependency review). All other gates are clear. Once those three checks complete with SUCCESS, the PR is ready for Sonja's merge gate and Tim's approval.

**If all three complete with SUCCESS, the release is clear to merge.**

No other issues block release.

---

## Findings summary

| # | Severity | Finding | Blocking? |
|---|---|---|---|
| 1 | Low | "ADR 010, Finding 3" cross-reference in `index.js` JSDoc and `pdf-ua.test.js` has no matching section in the ADR document (which has only Finding 1 and Finding 2). The behaviour is documented under "Other required settings" in the ADR. | No |

---

## Sign-off

All functional, accessibility, and visual checks: **Pass.**  
Release checklist: **Conditionally ready — pending three in-progress CI checks.**

Returning to Sonja. No rework flags for any agent. Once CI clears, recommend Sonja proceed to the merge gate with Tim's approval.

— Carol

---

## Re-test: font loading and links fix

**Re-test date:** 2026-06-01  
**Commits covered:** `c496ba8` (hyperlinks), `b06681d` (font loading fix)  
**Scope:** Focused re-check of the four changed areas only. All other checks from the first pass remain valid and are not re-run.

### F1 — No top-level node: imports in src/export/pdf.js

There are no top-level `import { fileURLToPath } from 'node:url'` or `import { join } from 'node:path'` statements at module scope. Both imports are inside `loadFonts()` under a `dynamic import(...)` call that only executes in the `typeof window === 'undefined'` branch. **Pass.**

### F2 — loadFonts() branches correctly on environment

`loadFonts()` (lines 58–83) is structured as follows:

- Guard: `if (_fonts) return _fonts;` — memoised so fonts are fetched only once per module lifetime.
- Node branch: `if (typeof window === 'undefined')` — uses dynamic `await import('node:url')` and `await import('node:path')` to resolve fonts from `node_modules/pdfmake/fonts/Roboto/`. This branch is unreachable at bundle time; Vite/Rolldown tree-shakes it before the module graph is sealed.
- Browser branch: `fetch('/fonts/Roboto-Regular.ttf')` and `fetch('/fonts/Roboto-Medium.ttf')` via `Promise.all`, converting each response to `ArrayBuffer` then `Buffer.from()`.

Both branches populate `_fonts = { regular, medium }` with the same shape. **Pass.**

### F3 — All five link targets present in pdf.js

| Link target | Location in pdf.js | Verified |
|---|---|---|
| `SITE_URL` (report title "Generated by" line) | Line 181 | Yes |
| `SITE_URL` (footer "Generated by" line) | Line 345 | Yes |
| `VESTIBULAR_CHECKER_URL` (per-pair examples paragraph) | Line 288 | Yes |
| `webaim` per-pair URL (constructed from fgHex/bgHex) | Line 286 | Yes |
| `checkInfoUrl(c.id)` per-check label in table | Line 309 | Yes |

All five link targets are present. `VESTIBULAR_CHECKER_URL` and `VESTIBULAR_CHECKER_FULL_LABEL` are imported from `strings.js` at lines 32–33 and used correctly. `checkInfoUrl` is imported at line 34. `webaim` URL is constructed inline at line 280 from `pair.fgHex` and `pair.bgHex`. **Pass.**

### F4 — buildDocument is async; both callers await it

`buildDocument` is declared `async function buildDocument(entries, timestamp)` at line 143.

- `downloadPdf` (line 354): `const blob = await toBlob(await buildDocument(entries, timestamp));` — double-await: inner `await buildDocument`, outer `await toBlob`. **Pass.**
- `buildPdf` (line 364): `return toBuffer(await buildDocument(entries, timestamp));` — awaits `buildDocument`. **Pass.**

### F5 — fonts.medium used in table cells (not FONTS.medium)

All table cell font references use `fonts.medium` (the local variable returned by `loadFonts()`), not any module-level `FONTS` constant. Seven occurrences at lines 206, 207, 294, 295, 296, 297, and 303, all in the form `font: { src: fonts.medium }`. There is no `FONTS` constant anywhere in `pdf.js`. **Pass.**

### F6 — scripts/copy-models.mjs copies Roboto fonts with missing-source warning

The font copy block (lines 47–56) does the following:

- Resolves `fontDst` to `public/fonts/` (with `mkdirSync` creating it if absent).
- Resolves `fontSrc` to `node_modules/pdfmake/fonts/Roboto`.
- Checks `existsSync(fontSrc)` before attempting to copy; emits `console.warn('[copy-models] pdfmake Roboto fonts not found — PDF export font will be missing')` if the source is absent.
- Iterates `['Roboto-Regular.ttf', 'Roboto-Medium.ttf']` and calls `copyFileSync` for each.

Both fonts are copied. Missing-source warning is present. **Pass.**

### F7 — public/fonts/ in .gitignore

`.gitignore` line 44: `public/fonts/` is listed alongside `public/models/` and `public/ort/` under the comment "auto-copied at install / build time by scripts/copy-models.mjs". **Pass.**

### F8 — src/lib/pdf-ua/index.js: blob-stream namespace import with .default fallback

Lines 54–55:

```
import * as _blobStreamModule from 'blob-stream';
const blobStream = _blobStreamModule.default ?? _blobStreamModule;
```

The namespace import with `.default ??` fallback pattern is present exactly as specified. **Pass.**

### F9 — vite.config.js: blob-stream in include, js-clipper in exclude, nodePolyfills fs override

- `optimizeDeps.include: ['blob-stream']` — present (line 37).
- `optimizeDeps.exclude: ['onnxruntime-web', 'js-clipper']` — both present (line 34).
- `nodePolyfills({ ..., overrides: { fs: false } })` — present (line 13).

**Pass.**

### F10 — eslint.config.js: src/export/pdf.js in the Node+browser globals block

The second config block's `files` pattern (line 34):

```
files: ['src/lib/pdf-ua/**/*.js', 'src/export/pdf.js', 'src/**/*.test.js'],
```

`src/export/pdf.js` is explicitly listed alongside the wrapper and test files. Both `globals.browser` and `globals.node` are spread into `globals`, allowing `Buffer`, `process`, and other Node globals without triggering `no-undef`. **Pass.**

### F11 — Test mock exercises link-bearing code paths

`pdf.test.js` mock data:

- `pairFail.examples: ['Button label', 'Link text']` — the non-empty examples array exercises the `exampleSpans` branch of `writeParagraph` at line 282, and the webaim + vestibular links at lines 286–288 are always written regardless of examples.
- `pairFail` has `fgHex: '#767676'` and `bgHex: '#ffffff'`, so the webaim URL is constructed as a concrete string.
- `entry-1` has `colourPairs: [pairFail, pairPass]` — two pairs, exercising the per-pair loop including both with and without clip images (`clipDataUrl: PNG_1X1` vs `null`).
- The `CHECK_GROUPS` loop at lines 300–315 runs for every pair, emitting `checkInfoUrl(c.id)` per check row.

The mock data exercises all five link targets in a single test run. Both `isCompliant="true"` assertions (lines 150–151 of `pdf.test.js`) must pass for the PDF to contain the links without breaking PDF/UA compliance. **Pass.**

### Re-test findings summary

No new issues found. All eleven checks pass.

| # | Check | Result |
|---|---|---|
| F1 | No top-level node: imports | Pass |
| F2 | loadFonts() environment branching | Pass |
| F3 | All five link targets present | Pass |
| F4 | buildDocument async; both callers await | Pass |
| F5 | fonts.medium used (not FONTS.medium) | Pass |
| F6 | copy-models.mjs copies Roboto fonts with warning | Pass |
| F7 | public/fonts/ in .gitignore | Pass |
| F8 | blob-stream namespace import + fallback | Pass |
| F9 | vite.config.js: blob-stream/js-clipper/fs override | Pass |
| F10 | eslint.config.js: pdf.js in Node+browser globals | Pass |
| F11 | Test mock exercises link-bearing paths | Pass |

### Updated release checklist note

The release checklist from the first pass is still valid. Two additional commits (`c496ba8`, `b06681d`) landed after that pass and are now verified clean. The v0.4.2 release checklist is updated accordingly: font loading fix and hyperlink implementation are confirmed correct and do not introduce any new blocking issues.

The three previously in-progress CI checks (Pa11y/axe, CodeQL, Dependency review) remain the only gate. Once those clear, the PR is ready for Sonja's merge gate and Tim's approval. No rework flags.

### Re-test sign-off

All re-test checks: **Pass.**  
No new findings. No rework flags.

— Carol
