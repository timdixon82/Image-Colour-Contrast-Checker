# Carol test report: PR 67 (feat/vad-link-colours, commit f137e39)

Tested in the worktree with the Vite dev server and Playwright (generated 900x400 PNG with two colour pairs). Unit tests 10/10 pass, lint clean.

Overall verdict: PASS with two notes for Sonja/Tim (no blocking rework).

## 1. Function: PASS
- Web report, pair 1 (displayed bg #1A2624, fg #E99B52): href `https://vadchecker.com/tool/?txt=e99b52&bg=1a2624`. Matches.
- Web report, pair 2 (displayed bg #FEFEFE, fg #1A476D): href `https://vadchecker.com/tool/?txt=1a476d&bg=fefefe`. Matches.
- Markdown export: `[VADChecker](...)` per pair with the same two URLs.
- PDF export: link annotations (/URI) contain the same two URLs, each twice (once per pair, doubled by pdfmake annotation); inspected from the generated blob.
- No tastheartist reference remains in src or index.html.
- Unit test for the builder covers hash strip, lower-casing, invalid fallback.

## 2. Accessibility: PASS (with notes)
- Link text "VADChecker" plus aria-hidden arrow; accessible name "Check and adjust this colour pair with VADChecker (opens in new window)". target=_blank, rel=noopener noreferrer. PASS.
- Focus ring: 3px solid, 3px offset, :focus-visible true in all four themes. PASS.
- Contrast of link text on its surface: light 11.51, dark 7.004, muted-light 9.14, muted-dark 7.78. All at least 7:1. PASS (dark is only just over).
- Target size: link is inline, 92x16 px (list item 23 px high); not 44 px. This is identical to the existing WebAIM link beside it and was not touched by this PR, so not a regression, but it does not meet the 44 px item in the request. FAIL against that bar, pre-existing; recommend a follow-up. Note the shorter label makes the target narrower (92 px vs the old longer text).
- Pa11y/axe and screen reader passes (VoiceOver, JAWS, NVDA) not run; only the DOM/accessible-name checks above.

## 3. Console and unchanged report: PASS
- Console errors seen: CSP `frame-ancestors` ignored in meta tag, onnxruntime warnings logged as errors, a wasm data: URL fetch message. None are in files this PR touches; not caused by it.
- Diff touches only strings.js, report-view.js, pdf.js, markdown.js and a new test. No analysis or other report changes seen.

## Notes for Sonja
1. Scope: the brief lists changing link text as out of scope, but the PR changes the visible text from "Vestibular Accessible Design Checker" to "VADChecker", the aria-label, and the PDF link label. The request refers to a "VADChecker" link so this is probably intended; confirm with Tim.
2. Version: package.json is still 0.5.1 (same as base). The brief and CLAUDE.md require a bump; release-please may handle it, confirm.
