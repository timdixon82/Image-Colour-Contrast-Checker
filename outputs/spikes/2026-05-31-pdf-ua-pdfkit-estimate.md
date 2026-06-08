# Spike: PDF/UA-1 rewrite estimate — PDFKit direct
Date: 2026-05-31

## BLUF

PDFKit 0.18.0 has a working tagged-PDF / PDF/UA API (`tagged: true`, `subset: 'PDF/UA'`,
`doc.struct`, `markStructureContent`, image `alt` + `bbox` via `Figure` elements). The API
is comprehensive and its official `kitchen-sink-accessible.js` example was fixed to be fully
PAC-clean in March 2026 (PR #1707, merged 2026-03-21). However, issue #1633 — which reported
multiple veraPDF failures against that same example — **remains open** as of 2026-05-31,
meaning veraPDF-clean output has not been independently confirmed on the current `main` or
published 0.18.0 package. Browser/Vite usage still requires Node shims (`buffer`, `stream`,
`zlib`, `util`, `process`); these are well-trodden but add setup overhead. The tagging API
adds substantial per-element boilerplate compared to an untagged PDFKit document. For this
project — branded header, disclaimer block, summary table, N per-image sections each with
preview image, CVD simulation images, and a per-pair check table — a full tagged rewrite is
an **L** effort of roughly **8–12 working days**, with meaningful residual risk that veraPDF
will surface Matterhorn failures that require further iteration.

---

## PDFKit browser compatibility

PDFKit markets itself as "Node and browser" but still requires five Node built-in polyfills:
`buffer`, `stream` (readable-stream), `zlib` (browserify-zlib), `util`, `process`. The
official webpack example bundles all five. Real-world Vite projects do the same via
`vite-plugin-node-polyfills` (with `buffer`, `stream`, `zlib`, `util`, `process` included)
plus `resolve.alias` overrides for `stream` and `zlib`, and `optimizeDeps.include: ['pdfkit',
'blob-stream']`. The Buffer dependency is actively being removed incrementally (PR #1717,
merged 2026-04-22, covers EXIF only; the broader codebase still depends on `Buffer`). Font
loading requires either the virtual-fs shim from PDFKit's examples or base64-encoding fonts at
build time. Output must be piped through `blob-stream` to produce a `Blob` for download.

**Verdict: works, needs shims.** Not blocked, but vite.config.js changes and `blob-stream`
are required. Estimated setup: half a day.

---

## PDFKit tagged-PDF completeness

PDFKit's tagging API covers everything this project needs:

- `tagged: true`, `subset: 'PDF/UA'`, `pdfVersion: '1.5'`, `displayTitle: true` — document flags
- `doc.struct('H1'|'H2'|'P'|'Sect'|'Table'|'TR'|'TH'|'TD'|'Figure', …)` — full ISO 32000 tag set
- `Figure` with `alt: "…"` and `bbox: [l, t, r, b]` — required for PDF/UA image alt text
- `doc.addStructure` / `structElem.add` / closure shorthand — three authoring styles
- All non-structure content must be explicitly marked as `Artifact`; decorative layout items
  (rules, fill boxes, page margins) need `markContent('Artifact', { type: 'Layout' })` calls
- Built-in AFM fonts (Helvetica, Courier) **cannot be embedded** and produce non-compliant
  output; embedded TrueType/OpenType fonts are required — this project would need to bundle
  Roboto or another OFL font (~150–400 kB per variant)
- Tables need `THead`/`TBody`/`TH`/`TD` structure; `TH` cells need scope attributes not
  natively emitted by PDFKit (must be added via attribute objects)
- Color space operators (`fillColor`, `strokeColor`) must precede path construction or
  veraPDF raises a CS-operator violation (ISO 32000-2 Fig. 9)

**veraPDF Matterhorn compliance evidence:** Issue #1633 (opened May 2026) attaches a
veraPDF validation report against the official `kitchen-sink-accessible.pdf` showing multiple
failures. PR #1707 (merged March 2026) fixed the PAC errors (bbox, Placement attribute, Link
wrapping), but #1633 is **still open** — meaning veraPDF residual failures were reported
*after* the PR merged, against either the same file or the regenerated one. No public
confirmation that a PDFKit document produced from the 0.18.0 API passes veraPDF clean has been
found. The gap between "PAC passes" and "veraPDF Matterhorn passes" is real and unresolved.

---

## Effort estimate

Current `pdf.js` section inventory:

| Section | Tagged complexity |
|---|---|
| Branded header block (navy table, white/orange/blue text, tagline) | Medium — decorative table must be Artifact; text inside needs H1 structure |
| Disclaimer block (amber fill, near-black text) | Low — single P with artifact fill |
| Summary table (filename + pill column) | Medium — Table/THead/TBody/TH/TD; pill cells are decoration (Artifact) |
| Per-image heading + preview image | Medium — H2 + Figure with alt text + bbox for each preview |
| Result line (pill + detail text) | Low — P with artifact pill cell |
| CVD simulation block (2×2 image grid, labels) | High — four Figure elements with alt text + bbox; layout table is Artifact |
| Contrast results H3 + summary lines | Low — H3 + P |
| Per-pair block: swatch image + badge text | High — Figure alt text for each swatch; badge inline spans need Span structure |
| Per-pair check table | High — Table/THead/TBody/TH/TD × N rows × N colour pairs; group rows need special handling |
| Per-pair clip image | Medium — Figure with alt text + bbox |
| Footer text + links | Low — P + Link structure |

Key multiplier: this project can have multiple images per report, and each image can have
multiple colour pairs, each with a multi-row check table. The tagging boilerplate is
per-element, not per-document. Every image in a multi-image report must be independently
tagged.

Additional time costs:
- Font bundling (Roboto TTF subset) and virtual-fs setup: 0.5 days
- Vite config shims and blob-stream integration: 0.5 days
- veraPDF iteration — expect 2–4 rounds of fixing Matterhorn failures: 2–3 days
- Regression test that the existing visual output is preserved: 1 day

**T-shirt size: L**

**Working-days range: 8–12 days**

The lower bound assumes veraPDF passes after one or two iterations. The upper bound
reflects that issue #1633 is unresolved and Matterhorn failures can be subtle and numerous.

---

## Alternatives checked

- **pdfmake 0.3.x (current)** — no tagged-PDF DSL; accessibility is blocked at the library
  level. Not a path to PDF/UA.
- **@react-pdf/renderer** — uses a fork of PDFKit (`@react-pdf/pdfkit`) that diverges from
  upstream; no PDF/UA tagging support.
- **pdf-lib** — no tagged PDF support; pure layout/editing library.
- **jsPDF** — no tagged PDF support beyond experimental flags; not veraPDF-grade.
- **Puppeteer/headless Chrome** — server-side only; violates the client-side constraint.
- **No new browser-native PDF/UA library identified** — as of May 2026, PDFKit remains the
  only maintained, browser-compatible JS library with an explicit PDF/UA tagging API.

---

## Recommended next step

**Needs further investigation before committing to build.**

Specifically: produce a minimal PDFKit 0.18.0 document in a Vite project containing one
heading, one table (with TH/TD), and one image with alt text, then run it through veraPDF with
the PDF/UA-1 profile. If it passes clean, the risk estimate drops significantly and the work
is firmly in the 8-day range. If it fails, the gap must be characterised before committing
to the full rewrite. This validation spike can be done in 2–4 hours.

Additionally: issue #1633 (veraPDF failures against the official example) should be monitored.
A maintainer comment or close event confirming veraPDF-clean output on 0.18.0 would materially
increase confidence.

---

## Confidence

**Medium.**

The tagging API is well-documented and the PAC compliance story is positive. What is unknown
is whether PDFKit 0.18.0 produces veraPDF Matterhorn-clean output without further workarounds
— and that is the specific bar Tim requires. The residual open issue (#1633) is the single
largest uncertainty. A 2-hour veraPDF smoke test on the official example would move this to
High confidence (or confirm it is blocked).
