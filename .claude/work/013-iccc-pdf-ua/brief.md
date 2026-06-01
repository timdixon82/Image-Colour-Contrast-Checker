# Brief: 013-iccc-pdf-ua

## Summary

Replace the pdfmake PDF export in `src/export/pdf.js` with a PDFKit-direct implementation that produces formally ISO 14289-1 (PDF/UA-1) compliant output verified by veraPDF. The PDFKit authoring layer is extracted into a reusable wrapper module (`src/lib/pdf-ua/`) with zero ICCC-specific code, so it can be ported to other Tim Dixon projects. The ICCC-specific layout stays in `src/export/pdf.js`.

## Mockup mode

D — no mockup required. The output must visually reproduce the current pdfmake PDF.

## Context from smoke test

The smoke test (2026-05-31) proved a PDFKit 0.18.0 document containing H1, P, tagged table (TH/Scope/Headers), and Figure with alt text passes veraPDF PDF/UA-1 with 106 rules checked and 0 failures, using these key techniques:
- Omit `subset: 'PDF/UA'` from the PDFKit constructor to avoid a buggy hardcoded CIDSet; inject the `pdfuaid:part` XMP namespace manually via `doc.appendXML()`
- Use `doc.table()` with `type: 'TH'` and `scope: 'column'` for header cells — the low-level `struct()` API silently ignores `Scope`/`Headers` attributes
- Draw decorative fills (backgrounds) as page-level artifacts via `doc.markContent('Artifact', ...) / doc.endMarkedContent()` outside structure elements
- Set `lang: 'en'` in the constructor for `/Lang` in the document catalog
- Register and use Roboto TTF (already present in node_modules/pdfmake/fonts/) — never use PDFKit's built-in AFM fonts

Smoke test artefacts live at `/tmp/pdfkit-smoke/smoke.js` (reference only — do not copy directly into src/).

## Architecture

### The reusable wrapper: `src/lib/pdf-ua/`

A self-contained module with zero ICCC imports. Exports:
- `createDocument(options)` — PDFKit doc with correct PDF/UA settings + XMP workaround
- Tagged element helpers (headings, paragraphs, figures, artifact wrapper)
- `doc.table()` is used directly (PDFKit's own high-level API handles TH/Scope)
- `toBlob(doc)` — browser download helper (via blob-stream)
- `toBuffer(doc)` — Node.js buffer helper (for tests)

The wrapper is designed to be extracted into a standalone package. No ICCC-specific strings, colours, or layout logic belongs here.

### ICCC layout: `src/export/pdf.js`

Rewrites `buildDocDefinition` and `downloadPdf` to use the wrapper. Reproduces the current visual output exactly:
1. Branded header (navy background, white/orange title, sky-blue tagline) — decorative block, must be Artifact
2. Disclaimer block (amber fill, near-black text)
3. Summary table (Image | Result columns)
4. Per-image sections (heading + preview + result line + CVD simulation + contrast results + per-pair blocks)
5. Footer

All text must be in tagged structure elements. All decorative fills, borders, and backgrounds must be Artifacts.

### Vite configuration

`vite.config.js` must add `vite-plugin-node-polyfills` to polyfill `buffer`, `stream`, `zlib`, `util`, `process` for PDFKit browser use. Also add `blob-stream` to `optimizeDeps.include`.

### Tests

#### 1. Vitest unit test (`src/lib/pdf-ua/pdf-ua.test.js`)
- Import the wrapper in Node.js (no browser needed — the output is identical)
- Generate a minimal PDF (heading, paragraph, table, figure)
- Write to a temp file
- Run `verapdf --flavour ua1` against it
- Assert `isCompliant="true"` in the XML output
- This test runs in CI

#### 2. Vitest integration test (`src/export/pdf.test.js`)
- Build a mock `AnalysedEntry[]` with at least one image, two colour pairs, CVD simulation assets
- Call `downloadPdf` (adapted to return a Buffer in test mode rather than triggering a download)
- Run veraPDF on the output
- Assert PDF/UA-1 compliant

#### 3. Visual test (Carol — Playwright)
- Not automated in CI for this PR; Carol runs a manual Playwright session to compare the PDF output against a reference screenshot of the current pdfmake PDF
- Output must be visually equivalent: same layout structure, same colours, same content order

## Dependencies to add

- `pdfkit` — already present in node_modules from the smoke test; add to `package.json` as a production dependency
- `blob-stream` — browser stream-to-Blob helper (MIT, same author as PDFKit)
- `vite-plugin-node-polyfills` — Vite build plugin for Node built-in polyfills (MIT, devDependency)

pdfmake remains in `package.json` (do not remove — the version bump PRs are still pending; remove only after this PR lands and is confirmed working).

## Out of scope

- Removing pdfmake from package.json (separate cleanup after merge)
- Markdown export — unchanged
- Any changes to the `AnalysedEntry[]` contract
- Link support in the tagged PDF — links are included as plain text in the first version (tagged link elements are a Phase 2 enhancement)
- Pagination control — reproduce current behaviour

## Risk and rollback

Medium risk. The wrapper is new code; the ICCC layout is a full rewrite of pdf.js. The `AnalysedEntry[]` contract is unchanged, so rollback is: revert the branch and the pdfmake import is immediately restored.

Mitigation: veraPDF test in CI catches regressions automatically from merge onward.

## Definition of done

- `npm run lint` exits 0 (all three linters)
- `npm run build` passes (Vite builds with the new polyfills)
- Vitest unit test passes: wrapper PDF is veraPDF PDF/UA-1 compliant
- Vitest integration test passes: ICCC report PDF is veraPDF PDF/UA-1 compliant
- Carol signs off visual equivalence with the current pdfmake output
- All CI checks green on the PR
- `docs/accessibility.md` updated: ACC-ICCC-005 / D8 marked resolved
- `todo.md` updated: D8 marked done
- `package.json` version bumped
- ADR written for the PDFKit wrapper architecture decision

## Approved GitHub actions

- [x] Create a branch — `feat/pdf-ua-rewrite`
- [x] Commit to that branch
- [x] Push that branch
- [x] Open a pull request
- [ ] Comment on a pull request — not pre-approved
- [ ] Create an issue — not pre-approved

Merge to main always requires Tim's express approval.
