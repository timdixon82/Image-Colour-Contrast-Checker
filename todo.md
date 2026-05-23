# To Do

This file tracks deferred and planned work items for Image Colour Contrast Checker.

## Deferred backlog

These items are documented defects or improvements that are not blocking current releases. Each entry states what to fix, the criterion or reason, and any linked record.

### D1 — File input accessible name (ACC-ICCC-001, WCAG 4.1.2 Level A)

Add `aria-label="Upload images for analysis"` to `#file-input`. The hidden input is triggered by a visible button but still needs an accessible name. See `docs/accessibility.md` ACC-ICCC-001.

### D5 — Footer and model-banner contrast in light mode (ACC-ICCC-002, WCAG 1.4.6 AAA)

`--fg-muted` (#454c58) gives 6.98:1 on the footer surface and 6.74:1 on the model-banner surface. Both fail the 7:1 AAA threshold. When fixed, remove the corresponding Pa11y ignore entry for `WCAG2AAA.Principle1.Guideline1_4.1_4_6.G17.Fail`. See `docs/accessibility.md` ACC-ICCC-002.

### D6 — Privacy notice and privacy page contrast (ACC-ICCC-003, WCAG 1.4.6 AAA)

Same root cause as D5. The fix for D5 is expected to resolve D6 as well. See `docs/accessibility.md` ACC-ICCC-003.

### D8 — pdfmake untagged PDF (ACC-ICCC-005, WCAG 4.1.2 Level A, PDF/UA context)

pdfmake does not produce a tagged PDF conforming to ISO 14289 (PDF/UA). Images in the exported PDF lack structural alt text and will not be announced semantically by PDF-reading screen readers. The web report is the primary accessible experience.

Resolution path: migrate to a PDF/UA-compliant library when one is available, or adopt a future pdfmake version if tagging support is added upstream.

See `docs/accessibility.md` ACC-ICCC-005.
