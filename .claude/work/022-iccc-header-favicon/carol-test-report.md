# Carol test report: PR 78 (feat/header-favicon)

Verdict: PASS WITH NOTES. Function, axe AAA, reflow and keyboard checks pass. The contrast of the mark's tile against the header surface in dark and muted-dark confirms Sean's numbers and is a decision for Tim (below).

Method: built the branch (vite) and served dist with python http.server; Chrome headless via puppeteer; axe-core 4.11.4 with wcag2a, 2aa, 2aaa, 22aa, 22aaa tags in 4 themes on both pages (data-theme set on the root element). Baseline for layout comparison: main (e66143e) built the same way.

## Results
- Image position: index.html and privacy.html, 40x40 at left of h1, vertically centred, all four themes. Pass.
- Alt: `alt=""`. Accessibility tree for the banner lists only the heading "Image Colour Contrast Checker"; the image is not exposed. Pass.
- Layout shift: width and height attributes plus a 2.5rem CSS box reserve the space. Measured CLS at 320px: index 0.074 (main 0.157), privacy 0.008 (main 0). No increase on index; privacy 0.008 is negligible (well under 0.1). At 1280 the header height is 146.5px in all themes.
- 320px (also 400% zoom of 1280): header wraps cleanly, mark beside a two-line title, tagline and theme picker below, no horizontal scroll on either page.
- 200% zoom (640 CSS px): title on one line beside the mark on index; two lines on privacy; no overflow.
- Text-only zoom (root font-size 200%): the mark scales to 80px (rem-based) and sits left of the title. At 320px the title column narrows to 188px and wraps one word per line, header 633px tall (main 571px). Index shows 389px horizontal scroll width at 320 in this mode; main shows the same 389px, so it is pre-existing and not caused by this PR. Privacy has no overflow.
- Keyboard tab order unchanged: index: skip link, theme select, glossary summary, Choose files, footer links. Privacy: skip link, four theme buttons, footer links. The image adds no stop.
- axe AAA, 4 themes x 2 pages: 0 violations in all 8 runs.
- Lint, build and CI: `npm test` 188 passed in the worktree. gh pr checks 78: all 7 pass (Pa11y and axe, Playwright, build, dependency-review, lint, semgrep, trivy).
- New test file src/header-favicon.test.js added; test count rises.
- Images added to any commit: none. Files changed: index.html, privacy.html, src/styles.css, src/header-favicon.test.js. favicon.svg is unchanged.

## Non-text contrast of the tile (verified in the rendered page)
Tile fill #061528 against computed header background:
- light: #FFFFFF, 18.33:1
- muted-light: #FFFFFF, 18.33:1
- dark: #11233E, 1.16:1
- muted-dark: #1E3147, 1.38:1
Sean's numbers confirmed. Inside the mark: orange #FF7C00 on the tile is 7.10:1, white on the tile is 18.33:1, so both blocks pass 3:1 in every theme.

How it looks (screenshots reviewed):
- Light and muted-light: a crisp dark navy rounded square on white, two clear blocks, orange left and white right. Edge fully visible. Reads well beside the dark title.
- Dark: the tile is only slightly darker than the navy header, so the rounded outline is barely perceptible and the square mostly dissolves. The orange and white blocks look like two free-floating bars on the header and are clearly legible. The tile edge is not distinguishable by someone with low vision.
- Muted-dark: same behaviour, a little more visible at 1.38:1 against the slate-blue header, edge still faint. Blocks clear.

Assessment: the 3:1 criterion (WCAG 1.4.11) applies to graphics needed to understand content. The mark is decorative (alt empty) and the information (title) is in text, so this is not a conformance failure, but it does not meet the brief's own "report if below 3:1" bar. The brief says report only; decision is Tim's. Options for Tim: accept as is (the blocks carry the mark), or add a lighter ring or a theme-specific tile treatment in dark themes.

## Notes
- Image src is the absolute path /favicon.svg: fine on the root-served custom domain, would break under a subpath deployment.
- No package.json version bump in the diff; CLAUDE.md says behavioural changes bump it. Release step or Sean to confirm.
- Theme selector in my screenshots reads "Dark" because I forced themes via the data-theme attribute; tokens applied correctly.
- Not tested: real screen readers (VoiceOver, JAWS, NVDA); accessibility tree checked only. No specialist dispatch needed.

## Re-test after dark-theme ring (2026-10-25)

Verdict: FAIL on one CI check only; the rendered behaviour passes. Semgrep is red on PR 78 at c3e0428 (blocking finding javascript.lang.security.audit.detect-non-literal-regexp in src/header-favicon.test.js line 47: `new RegExp` built from the `theme` argument). The input is a hard-coded theme name in a test, so the real risk is nil, but the check is required and blocking, so the PR cannot merge as is. Route to Sean: build the pattern without a dynamic RegExp (for example find the rule block with string methods, or use literal regexes per theme) or add a justified nosemgrep comment. All other checks pass (Pa11y and axe, Playwright, build, dependency-review, lint, trivy). I did not edit source.

Method: worktree .claude/worktrees/header-favicon at c3e0428; `npm test`, `npm run lint`, `npm run build` run there; built dist served locally; Chrome headless via puppeteer; axe-core 4.11.4 (wcag2a, 2aa, 2aaa, 21a, 21aa, 22aa, 22aaa) in 4 themes on index.html and privacy.html at 1280px. Main (e66143e) build used as the layout baseline.

- npm test: 11 files, 197 tests pass (188 before). Lint: html, css, js all clean. Build: succeeds (only the existing chunk-size warning).
- Ring renders: dark and muted-dark computed outline is `solid 1px`, border-radius 7.52px (0.47rem), on both pages. Light and muted-light: outline none, radius 0, as before (unchanged).
- Colours and measured contrast (ring colour against computed header background, then against tile #061528): dark ring rgb(163,195,218): 8.53 on header #11233E, 9.93 on tile. Muted-dark ring rgb(170,207,222): 8.00 on header #1E3147, 11.08 on tile. Both match Sean's numbers and clear 3:1 comfortably (also above 7:1). The tile-versus-header gap that I flagged earlier (1.16 and 1.38) is now closed by the ring.
- Logo size: 40 x 40 px in all four themes on both pages; header height 146.5px at 1280 in every theme, same as before the ring. The outline adds no box size.
- Layout shift at 320px, dark theme, five runs each: PR 78 index 0.070 to 0.075 (earlier 0.074; main 0.163 to 0.164), privacy 0.000 to 0.008 (earlier 0.008; main 0.000 to 0.083). No change from the earlier numbers, no layout shift introduced by the ring. At 1280 CLS is under 0.003 in every theme.
- By eye (screenshots): dark and muted-dark now show a thin, pale blue-grey hairline with softly rounded corners around the dark navy tile, so the square reads as a distinct rounded tile beside the heading, with the orange bar left and white bar right inside it. It is fine and unobtrusive, not heavy. Light and muted-light look as before: dark navy rounded tile on white, no ring.
- axe AAA, 4 themes x 2 pages (8 runs): 0 violations in every run.
- 320px: no horizontal scroll (scrollWidth 320) in dark and muted-dark on both pages; logo stays 40px; header wraps (243.6px index, 235.6px privacy). 200% zoom (640 CSS px at DPR 2): no overflow, logo 40px, header 137.9px index, 179.6px privacy.
- Forced colours (Chrome emulation, forced-colors: active, tested on both pages): dark and muted-dark keep the 1px outline, and it resolves to the system text colour (white on the emulated black canvas), so a crisp white rounded frame surrounds the tile with the orange and white bars visible inside; the title is white. Sensible, and better than before. Light themes in forced colours show no ring (unchanged): the near-black tile sits on the black canvas with only its orange and white bars clearly visible. Not a regression; same decorative-mark situation as I noted before, and the logo is decorative with alt="".

Notes carried over: no package.json version bump in the diff; image src is an absolute /favicon.svg. Not tested: real screen readers or real Windows High Contrast (emulation only).
Images added to any commit: none (files changed: index.html, privacy.html, src/styles.css, src/header-favicon.test.js, src/theme-contrast.test.js).
