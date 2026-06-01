# ADR 010 — PDF/UA-1 export via PDFKit-direct with a reusable wrapper

- **Status:** Accepted
- **Date:** 2026-05-31
- **Deciders:** Tim (via Sonja), Jacob (architect)
- **Supersedes (in part):** ADR 004 named pdfmake as the PDF generator; this decision replaces pdfmake for the PDF path. The export *contract* (`AnalysedEntry[]` in and a file out) from ADR 004 is unchanged.
- **Work folder:** `.claude/work/013-iccc-pdf-ua`

---

## Context

The PDF export must produce a **formally ISO 14289-1 (PDF/UA-1) compliant** document, verified
by veraPDF (`--flavour ua1`) with zero rule failures. PDF/UA-1 requires, among other things:

- A fully **tagged** structure tree (every piece of content is a structure element: H1–H6, P, Table/TR/TH/TD, Figure, …).
- **TH cells** that carry a `Scope` (or `Headers`) attribute so assistive technology can associate data cells with their headers.
- **Figures** with an `/Alt` (alternate text) entry.
- All **decorative** content (background fills, rules, borders) marked as `Artifact` so it is excluded from the structure tree and the reading order.
- A document `/Lang`, an embedded font (no built-in/standard 14 AFM fonts — they have no `ToUnicode` / glyph data the standard requires), and the `pdfuaid:part 1` claim in the XMP metadata.

### Why not pdfmake (the incumbent)

pdfmake (ADR 004) cannot emit a tagged structure tree at all. Its output is untagged
content streams: no structure tree, no `Marked` flag, no `Scope` on header cells, no
`/Alt` on images. There is no configuration or plugin path to PDF/UA-1 from pdfmake.
For a tool whose entire purpose is accessibility auditing, shipping an inaccessible PDF
is not defensible. This is tracked as accessibility debt item **ACC-ICCC-005 / D8**.

### The smoke test (2026-05-31)

Before committing to the rewrite, a smoke test (`/tmp/pdfkit-smoke/smoke.js`, reference only)
was run against **PDFKit 0.18.0**. A document containing an H1, a paragraph, a tagged table
(with TH/Scope), and a Figure with alt text **passed veraPDF PDF/UA-1: 106 rules checked,
0 failures.** The smoke test surfaced two non-obvious PDFKit behaviours that the production
code must work around. They are documented below because they are load-bearing — without them
the output silently fails validation even though the API calls appear correct.

#### Finding 1 — the CIDSet / `subset: 'PDF/UA'` bug

PDFKit exposes a `subset: 'PDF/UA'` constructor option that is supposed to do the PDF/UA
plumbing for you. In 0.18.0 it instead emits a **malformed / hardcoded CIDSet** for the
embedded subset font, which veraPDF rejects (the CIDSet must accurately reflect the glyphs
actually embedded). The working approach is to **omit `subset: 'PDF/UA'` entirely** and
instead:

1. Construct the document with `pdfVersion: '1.5'` (the version the smoke test validated),
   `lang`, `displayTitle`, `tagged: true` and the accessibility metadata, but *without* the
   `subset` flag, so PDFKit emits a correct CIDSet for the real subset.
2. Inject the PDF/UA identifier into the XMP packet manually via
   `doc.appendXML('<rdf:Description … xmlns:pdfuaid="…"><pdfuaid:part>1</pdfuaid:part>…')`
   so the `pdfuaid:part 1` claim is present without going through the buggy code path.

#### Finding 2 — the low-level `struct()` API drops `Scope` / `Headers`

PDFKit's low-level `doc.struct('TH', { scope: 'Column' }, …)` API **silently ignores** the
`Scope` and `Headers` attributes — they never reach the structure element's attribute
dictionary, so the table fails the "TH must have Scope or be referenced by Headers"
PDF/UA rule. PDFKit's *high-level* table API, `doc.table({ data, … })` with cells typed
`{ type: 'TH', scope: 'column' }`, **does** emit correct `/Scope` attributes. Therefore all
tagged tables must be authored through `doc.table()`, not hand-built from `struct()` calls.

#### Other required settings (confirmed by the smoke test)

- `lang: 'en'` in the constructor → `/Lang` in the catalog.
- Register and use **Roboto TTF** (`Roboto-Regular.ttf`, `Roboto-Medium.ttf`, already present
  under `node_modules/pdfmake/fonts/Roboto/`); **never** select a built-in AFM font.
- Draw every decorative fill/border via `doc.markContent('Artifact'); …; doc.endMarkedContent();`
  **outside** any open structure element.

---

## Decision

1. **Replace pdfmake with PDFKit-direct (0.18.0)** for the PDF export.

2. **Extract the PDF/UA authoring concerns into a reusable, ICCC-agnostic wrapper** at
   `src/lib/pdf-ua/`. The wrapper:
   - has **zero** ICCC-specific code — no brand colours, no report strings, no layout;
   - encapsulates the two PDFKit bug workarounds (Findings 1 and 2) so consumers never
     touch them;
   - runs in **both Node.js** (for the veraPDF tests) **and the browser** (via Vite + Node
     polyfills), with the same code path — the bytes are identical;
   - is designed to be lifted into a standalone npm package later (a Tim Dixon house utility),
     so it takes font paths as options rather than hardcoding them, and depends only on
     `pdfkit` and `blob-stream`.

3. **Keep all ICCC-specific layout in `src/export/pdf.js`.** That module is rewritten to call
   the wrapper for document creation and tagged primitives, and to call `doc.table()` /
   `doc` layout methods directly for everything the wrapper deliberately does not abstract.
   `src/export/pdf.js` remains the single place that knows about the brand header, the
   disclaimer block, the summary table, and per-image sections. The `AnalysedEntry[]` export
   contract (ADR 004) is untouched.

4. **For tables, the wrapper does NOT provide an `addTable` helper.** Callers use
   PDFKit's own `doc.table()` directly. Rationale: `doc.table()` already produces correct
   TH/`Scope`/`Headers` tagging (Finding 2), it is a rich, stable, well-documented API, and
   wrapping it would mean re-modelling its entire options surface (column widths, cell styling,
   borders, row spanning) for no accessibility gain. A thin pass-through wrapper would be pure
   liability — it could only lag or distort the underlying API. The wrapper's responsibility
   ends at the things PDFKit gets *wrong* by default; tables are not one of them. This decision
   is recorded explicitly so a future maintainer does not "helpfully" add `addTable` and
   reintroduce a leaky abstraction. The wrapper's JSDoc states this for `doc.table()` consumers.

5. **veraPDF validation runs in CI** as Vitest tests (a wrapper-level minimal-PDF test and an
   ICCC-report integration test), so any regression in tagging is caught automatically from
   merge onward.

### Wrapper public API (the contract Sean builds to)

| Export | Wraps / enforces |
| --- | --- |
| `createDocument(options)` | New `PDFDocument` with `tagged: true`, `lang`, `displayTitle`, embedded Roboto, **and the Finding 1 CIDSet/XMP workaround applied**. Returns a ready-to-author doc. |
| `addHeading(doc, level, text, options)` | `doc.struct('H1'…'H6')` + text, level clamped to 1–6. |
| `addParagraph(doc, text, options)` | `doc.struct('P')` + text. |
| `addFigure(doc, imageData, altText, options)` | `doc.struct('Figure', { alt })` wrapping `doc.image()`. **Throws if `altText` is missing/empty** — PDF/UA requires `/Alt`. |
| `artifact(doc, drawFn)` | `doc.markContent('Artifact'); drawFn(doc); doc.endMarkedContent();` — for all decorative drawing (Finding's artifact rule). Must be called **outside** any open structure element. |
| `toBlob(doc)` | `doc.end()` piped through `blob-stream` → `Promise<Blob>` for browser download. |
| `toBuffer(doc)` | `doc.end()` collected → `Promise<Buffer>` for Node/tests. |
| *(tables)* | **No wrapper export.** Callers use `doc.table({ data, … })` with `{ type:'TH', scope:'column' }` header cells directly. |

---

## Alternatives considered

1. **Keep pdfmake, post-process the PDF to add tags.** Rejected. Re-tagging an untagged PDF
   reliably is a research problem, not a feature; the structure and reading order are lost in
   pdfmake's output and cannot be reconstructed faithfully.

2. **Use a different high-level library (e.g. a React-PDF / headless-typesetting stack).**
   Rejected. None in the JS ecosystem offer verified PDF/UA-1 output, and each adds a far
   larger dependency surface than PDFKit. PDFKit is small, mature, MIT-licensed, and — once the
   two workarounds are applied — demonstrably passes veraPDF.

3. **Use PDFKit's `subset: 'PDF/UA'` as documented.** Rejected: it produces the malformed
   CIDSet (Finding 1) and fails veraPDF in 0.18.0.

4. **Author tables with the low-level `struct()` API for full control.** Rejected: it drops
   `Scope`/`Headers` (Finding 2) and fails veraPDF. `doc.table()` is the only correct path.

5. **Put the PDFKit workarounds inline in `src/export/pdf.js` (no wrapper).** Rejected. The
   workarounds are generic and reusable across Tim Dixon projects; burying them in ICCC-specific
   layout code makes them un-portable and easy to break when the layout changes. The layered
   architecture (ADR 002) also argues for isolating a swappable concern behind a clean boundary.

---

## Consequences

### Positive

- The PDF export is **formally PDF/UA-1 compliant**, verified by veraPDF, closing
  ACC-ICCC-005 / D8. The accessibility tool now ships an accessible artefact.
- The **wrapper is portable**: zero ICCC coupling, font paths injected, dependencies limited to
  `pdfkit` + `blob-stream`. It can be extracted to a shared package with no rewrite.
- **CI catches tagging regressions** automatically (veraPDF in Vitest), so the compliance claim
  stays true over time.
- The two PDFKit bug workarounds live in **one documented place**; consumers can author tagged
  PDFs without knowing they exist.

### Negative / costs

- Estimated **8–12 working days** to build: the wrapper, the full rewrite of `src/export/pdf.js`
  to reproduce the current visual output exactly, the Vite polyfill configuration, and the two
  veraPDF tests. (pdfmake gave layout primitives — columns, unbreakable stacks, automatic
  pagination — for free; with PDFKit the ICCC layout owns more of that work.)
- **New dependencies:** `pdfkit` (prod), `blob-stream` (prod), `vite-plugin-node-polyfills`
  (dev) to polyfill `buffer`/`stream`/`zlib`/`util`/`process` for browser use. Bundle size and
  the polyfill surface grow modestly.
- **Pinned to the workarounds:** if a future PDFKit release fixes the CIDSet bug or the
  `struct()` Scope bug, the wrapper should be revisited to drop the workaround; until then we are
  coupled to the current behaviour. Mitigated by the workarounds being isolated and the CI test
  flagging any change in output validity.
- `doc.table()` is used directly by callers, so the ICCC layout code is coupled to PDFKit's
  table API surface (not to the wrapper). This is an accepted, explicit trade (Decision 4).

### Follow-ups (not blocking this decision)

- Remove pdfmake from `package.json` only **after** this lands and is confirmed working
  (the pending version-bump PRs reference it). Tracked separately.
- Tagged **link** elements are out of scope for the first version (links rendered as plain text);
  a Phase 2 enhancement.

---

## References

- ISO 14289-1 (PDF/UA-1)
- veraPDF (`--flavour ua1`)
- Smoke test: `/tmp/pdfkit-smoke/smoke.js` (reference only — not copied into `src/`)
- Brief: `.claude/work/013-iccc-pdf-ua/brief.md`
- ADR 002 (layered project structure), ADR 004 (export contract — contract retained)
