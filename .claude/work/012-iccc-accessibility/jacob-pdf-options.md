# PDF/UA Options Report — ICCC

_Author: Jacob (architect) · Date: 2026-05-31 · Re: ACC-ICCC-005 / D8_

## Summary recommendation (BLUF)

No browser-side JavaScript PDF library today produces fully ISO 14289 (PDF/UA) compliant output with a complete tag tree and image alt text out of the box. The closest viable path is **PDFKit's tagged-PDF API surface, reached through pdfmake 0.3.x or a thin direct-PDFKit layer** — PDFKit added a real structure-tree / marked-content / alt-text API, and pdfmake 0.3.x rebases onto a newer PDFKit. However, pdfmake's high-level document-definition format does **not yet expose** that tagging API, so a drop-in pdfmake 0.3.x upgrade alone will **not** make our export tagged. My recommendation is a **staged approach**: (1) ship the cheap, high-value wins now (PDF metadata: `/Lang`, title, `/DisplayDocTitle`, `Tagged` mark where supported) on whatever pdfmake version we land on; (2) treat true PDF/UA tagging as a separate, larger piece of work, and prototype it against **PDFKit directly** (or pdfmake 0.3.x only if it surfaces the tag API by the time we start). Do **not** migrate to jsPDF or PDF-lib for accessibility reasons — neither is closer to PDF/UA than where we already are, and both cost a full rewrite.

## Option assessments

### pdfmake 0.2.x (current)
- **Tagged PDF / PDF/UA:** no. 0.2.x is built on an older PDFKit fork that predates PDFKit's structure-tree API. No tags, no alt text. This is exactly the ACC-ICCC-005 gap.
- **Image data URL support:** yes (already in use in `src/export/pdf.js`).
- **Approx bundle size:** large — pdfmake + embedded vfs fonts is the heaviest single dependency in the bundle (hundreds of kb; the embedded Roboto vfs is the bulk of it).
- **Maintenance status:** active but slow-moving.
- **Migration effort:** n/a (baseline).
- **Notes:** Can still gain *partial* accessibility cheaply — set document `info` (title), and `/Lang`. It cannot emit a tag tree.

### pdfmake 0.3.x (Dependabot PR 8)
- **Tagged PDF / PDF/UA:** **partial / not via the public API.** 0.3.x is a significant rebase, including onto a newer PDFKit that *does* contain tagging primitives. But pdfmake's own document-definition DSL (`content: [...]`, `table`, `image`, etc.) does **not** map those nodes to structure elements. So upgrading to 0.3.x does not, by itself, produce a tagged PDF. It is a prerequisite, not the solution.
- **Image data URL support:** yes (unchanged contract).
- **Approx bundle size:** comparable to 0.2.x, possibly slightly different font/vfs handling; not a regression and not a meaningful improvement for our purposes.
- **Maintenance status:** active; 0.3.x is the current major line.
- **Migration effort from pdfmake 0.2.x:** **low.** Same DSL; the Dependabot PR is mostly a version bump. Our `src/export/pdf.js` document definition should port with minor adjustments (font registration / vfs import path are the usual breakage points between 0.2 and 0.3).
- **Notes:** Worth taking the 0.3.x bump on its own merits (maintenance, security), but **decouple it from the accessibility claim.** Landing PR 8 should not be described as resolving ACC-ICCC-005.

### PDFKit (direct)
- **Tagged PDF / PDF/UA:** **partial → the best available.** PDFKit has an explicit accessibility API: `PDFStructureElement`, `doc.struct(...)`, `markContent`, document-level `tagged: true`, `/Lang`, `displayTitle`, and `alt` text on images via structure elements. This is real marked-content + structure-tree support and is the foundation everything else (including pdfmake) sits on. It is the only browser-capable option with a documented path to a navigable tag tree with image alt text.
- **Image data URL support:** yes — accepts base64/data buffers.
- **Approx bundle size:** similar order to pdfmake (pdfmake *is* PDFKit plus a layout engine); using PDFKit directly drops the pdfmake layout DSL but you re-add font/vfs weight yourself, so net bundle is roughly a wash or slightly lighter.
- **Maintenance status:** active; it is the upstream of pdfmake.
- **Migration effort from pdfmake:** **high.** PDFKit is imperative (you draw/flow content and cursor management yourself); pdfmake is declarative. Our current `pdf.js` document definition would be rewritten as imperative layout code. This is the real cost of true tagging.
- **Notes:** Tagging in PDFKit is correct but **manual and verbose** — every heading, paragraph, table, and image must be wrapped in the right structure element with the right role, and you must build/attach the structure tree explicitly. PDF/UA conformance is achievable but is *engineering effort and testing*, not a flag. Full PDF/UA (Matterhorn checks) realistically needs validation against a checker (e.g. PAC / veraPDF).

### jsPDF (± jspdf-autotable)
- **Tagged PDF / PDF/UA:** **no.** jsPDF has no structure-tree / tagged-PDF API. It can set `/Lang` and document properties, and there has been long-standing community demand for tagging, but there is no production accessibility/tag-tree feature. `jspdf-autotable` does not add one. The `.html()` path goes through html2canvas and produces a *rasterised image of the page* — actively worse for accessibility (no real text, no tags).
- **Image data URL support:** yes.
- **Approx bundle size:** lighter than pdfmake for the core, but autotable + any font work narrows the gap; not a deciding factor here.
- **Maintenance status:** active.
- **Migration effort from pdfmake:** **high** (full rewrite to jsPDF's imperative API) — for **no accessibility gain**. Not worth it.
- **Notes:** Rule out for this objective.

### pdf-lib
- **Tagged PDF / PDF/UA:** **no.** pdf-lib is a low-level PDF object library (create/modify pages, draw text/images, manipulate the object graph). It has *no* high-level tagging API; you would have to hand-author the entire structure tree, marked-content operators, and `/StructTreeRoot` / `/ParentTree` plumbing at the raw PDF-object level. Technically possible, practically a research project. The long-running pdf-lib accessibility issue remains open/unresolved.
- **Image data URL support:** yes (embed PNG/JPEG bytes).
- **Approx bundle size:** moderate; no embedded fonts (you supply them), so can be lighter — but you then own font embedding.
- **Maintenance status:** original `pdf-lib` is **effectively stalled**; community has migrated to forks.
- **Migration effort from pdfmake:** **very high** — you lose all layout/flow and would build it plus tagging from scratch.
- **Notes:** Wrong abstraction level for generating a multi-page laid-out report from data.

### @cantoo/pdf-lib (maintained fork)
- **Tagged PDF / PDF/UA:** **no high-level support.** The Cantoo fork is the actively-maintained continuation of pdf-lib and adds fixes/features (better font/subset handling, form fields, etc.), but it is **not** an accessibility/PDF-UA fork — it does not provide a turnkey tag tree or image-alt API. Same fundamental limitation as pdf-lib: tagging would be hand-rolled at the object level.
- **Image data URL support:** yes.
- **Approx bundle size:** similar to pdf-lib.
- **Maintenance status:** **active** — this is the fork to use *if* you ever use pdf-lib for anything.
- **Migration effort from pdfmake:** very high (same as pdf-lib).
- **Notes:** Note for the record so we don't chase it as an accessibility answer — it isn't one. It is the right pick only if a future task needs low-level PDF *editing*, not generation.

## Recommendation

**Staged, two-track plan.**

**Track 1 — cheap accessibility wins now (low effort, ship with the 0.3.x bump):**
1. Accept the Dependabot pdfmake 0.3.x upgrade (PR 8) on its own maintenance merits. Verify the `src/export/pdf.js` document definition still renders identically (watch font/vfs import changes between 0.2 → 0.3).
2. On whatever version we land on, set: document `info.title`, document `info.language` / `/Lang` = `en`, and the "display document title" preference. These improve assistive-tech behaviour materially and cost almost nothing.
3. **Do not** mark ACC-ICCC-005 / D8 as resolved by this. Re-scope ACC-ICCC-005 to "metadata + language done; full PDF/UA tag tree outstanding."

**Track 2 — true PDF/UA tagging (separate, larger task, prototype-first):**
- Prototype against **PDFKit's tagged-PDF API** (`doc.struct`, `markContent`, `tagged: true`, image `alt`). This is the only realistic browser path to a navigable tag tree with image alt text.
- Decide the integration shape: either (a) drive PDFKit directly with a new imperative renderer that consumes `AnalysedEntry[]` (keeps our existing `AnalysedEntry` contract — see `src/core/schema.js` — intact; only `pdf.js` internals change), or (b) revisit pdfmake 0.3.x *if and when* it exposes the underlying PDFKit tag API through its DSL (check at task start; today it does not).
- Budget for validation: run output through a PDF/UA checker (PAC, or veraPDF) — "tagged" is not the same as "conformant," and Matterhorn checks must pass.
- The `AnalysedEntry` contract stays the source of truth, so this remains a single-module change (`src/export/pdf.js` + dependency swap); the rest of the pipeline is unaffected. Markdown export is unaffected.

This keeps the architecture boundary clean: the export layer's contract (`AnalysedEntry[]` in, file out) does not change regardless of which engine we pick, so the decision is reversible and isolated.

## Open questions for Tim

1. **Acceptable interim state?** Are you OK shipping Track 1 (language + metadata, *not* a full tag tree) now and tracking full PDF/UA as a separate, larger piece of work — rather than blocking the 0.3.x bump on full compliance?
2. **Appetite for the PDFKit rewrite.** True PDF/UA means rewriting `src/export/pdf.js` from pdfmake's declarative DSL to PDFKit's imperative tagging API — a medium-to-high effort task with its own testing/validation burden. Is that effort approved in principle before I write the ADR, or do you want a spike/estimate first?
3. **Conformance bar.** Is the target "tagged PDF that screen readers can navigate, images announced with alt text" (pragmatic), or formal **PDF/UA-1 (ISO 14289-1) conformance verified by veraPDF/PAC** (stricter, more work)? This changes the size of Track 2 significantly.
4. **Bundle budget.** None of the candidates meaningfully shrink the bundle; PDFKit-direct is roughly a wash with pdfmake. If reducing the pdfmake/PDFKit font-vfs weight is also a goal, that's a separate optimisation — flag if you want it folded in.
