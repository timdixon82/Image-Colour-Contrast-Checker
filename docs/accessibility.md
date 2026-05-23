# Accessibility

This page records the WCAG 2.2 AAA conformance posture for Image Colour Contrast Checker, including pre-existing and newly found failures that have been deferred to a later phase.

The tool targets WCAG 2.2 AAA for its own interface. The legal baseline is the UK Equality Act, the European Accessibility Act, the Americans with Disabilities Act, and Section 508. All are satisfied by AAA conformance.

## Pre-existing AAA failures, deferred to the accessibility phase

These failures were present before the vestibular feature branch and are not regressions. Each entry names the WCAG criterion, the scope, the measured ratio or technical reason, and the deferred backlog item.

### ACC-ICCC-001 — File input has no accessible name (WCAG 4.1.2 Level A)

The `<input type="file" id="file-input">` element has no visible label and no `aria-label`. The element is hidden and triggered by a visible button, which is the standard pattern, but the hidden input still needs an accessible name for assistive technology that enumerates form fields.

- Selector: `#file-input`
- Deferred backlog: D1 in todo.md
- Resolution: Add `aria-label="Upload images for analysis"` to the file input.

### ACC-ICCC-002 — Footer and model-banner text contrast below 7:1 in light mode (WCAG 1.4.6 AAA)

Two light-mode text areas use `--fg-muted` (#454c58) on surfaces that give a ratio of approximately 6.98:1 (footer) and 6.74:1 (model-banner). Both pass WCAG AA (4.5:1) but fail AAA (7:1).

- Selectors: `.app-footer`, `.dz-loading-desc`
- Measured: 6.98:1 and 6.74:1 on their respective surfaces
- Deferred backlog: D5 in todo.md
- Resolution: Darken `--fg-muted` in light mode to reach 7:1 on both surfaces, or adjust surfaces.

### ACC-ICCC-003 — axe colour-contrast-enhanced on privacy-notice and privacy-page items (WCAG 1.4.6 AAA)

The same root cause as ACC-ICCC-002: `--fg-muted` on surfaces in the landing privacy notice and on the privacy page.

- Selectors: `.privacy-notice`, `.privacy-page-intro`, footer links on privacy.html
- Deferred backlog: D6 in todo.md
- Note: fixing ACC-ICCC-002 will also close ACC-ICCC-003.

### ACC-ICCC-005 — pdfmake does not produce a tagged PDF; images have no structural alt text (WCAG 4.1.2 Level A, PDF/UA context)

The PDF export uses the pdfmake library (version 0.2.x). pdfmake does not generate a tagged PDF conforming to ISO 14289 (PDF/UA). Screen readers that process the PDF will read content in reading order but will not announce images as image elements, because the PDF lacks a structural accessibility tree.

Every image in the exported PDF (preview, swatch, colour-blindness simulations, cropped region) will be treated as an untagged artefact. Mitigating factors are in place: every image has a visible text caption or an adjacent descriptive sentence, so the semantic content is available to sighted readers. The PDF is a supplementary export format; the primary accessible experience is the interactive web report.

This is a known limitation of the pdfmake library and is not a regression in this branch. The only complete fix is a migration to a different PDF library that supports PDF/UA tagging, or adopting a future version of pdfmake if tagging support is added upstream.

- WCAG criterion: 4.1.2 Name, Role, Value, Level A (as applied to PDF/UA)
- Library: pdfmake 0.2.x
- Deferred backlog: D8 in todo.md
- Resolution path: migrate to a PDF/UA-compliant library when available.
