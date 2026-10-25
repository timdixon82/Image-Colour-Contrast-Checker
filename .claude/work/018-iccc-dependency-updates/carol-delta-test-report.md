# Carol delta test report: PR 71, head 1c75b46 (commits 57ba211, 1c75b46)

Verdict: PASS. No rework required. Two advisories below (not blockers).

Method: production build (npm run build) of release/combined-fixes (1c75b46) and of main (git archive, built in scratch), served by a plain Node static server, Playwright Chromium, axe-core, image 2.png, every pair row expanded. Free disk stayed about 22 GB. Unit tests: 29 of 29 pass. No commits, no branch switches; release-combined untouched.

## 1. axe-core, color-contrast-enhanced and all tags: PASS
Tags: wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, wcag2aaa, best-practice, plus color-contrast-enhanced.

| Theme | Branch contrast-enhanced violations | Main |
|---|---|---|
| light | 0 | 144 |
| dark | 0 | 34 |
| muted-light | 0 | 99 |
| muted-dark | 0 | 34 |

- Main failures were status pills (light, muted-light, 5.85 to 6.53:1) and the group-label th in dark and muted-dark (5.94 and 6.83:1). All gone.
- Only other violation, same four themes, same on main: link-in-text-block (84 on branch, 102 on main; the per-link count follows the number of pairs). Not new.
- Incomplete (needs review, same set on main): aria-prohibited-attr 48, color-contrast 107, color-contrast-enhanced 101 (text over image regions), identical-links-same-purpose 2, label-content-name-mismatch 84, th-has-data-cells 14.
- Note: the branch finds 14 pairs in this image, main finds 17 (OCR/runtime update, previously reported); counts differ for that reason only.

## 2. Independent contrast ratios: PASS (minimum 7.01:1)
Computed by me from the values in src/styles.css (not from the brief). Ratios: text on --bg / --bg-card / --neutral-bg / own pill background.

| Theme | pass | fail | warn |
|---|---|---|---|
| light | 7.80 / 8.44 / 7.27 / 7.04 | 8.27 / 8.96 / 7.71 / 7.01 | 9.15 / 9.91 / 8.53 / 8.16 |
| dark | 10.48 / 8.94 / 7.58 / 7.92 | 9.74 / 8.30 / 7.04 / 8.31 | 9.71 / 8.28 / 7.02 / 7.20 |
| muted-light | 7.55 / 8.64 / 7.15 / 7.16 | 8.09 / 9.26 / 7.67 / 7.04 | 9.26 / 10.59 / 8.77 / 8.50 |
| muted-dark | 9.82 / 8.35 / 7.33 / 8.33 | 9.41 / 7.99 / 7.02 / 9.01 | 9.39 / 7.98 / 7.01 / 8.47 |

Also --fg-muted (now used for the dark group labels) on bg / card / neutral: light 7.54/8.17/7.03, dark 9.93/8.47/7.18, muted-light 7.70/8.81/7.30, muted-dark 9.42/8.00/7.03.
Tightest: light fail on pill 7.01; muted-dark warn on neutral 7.01; dark warn on neutral 7.02; muted-dark fail on neutral 7.02; muted-dark and light fg-muted on neutral 7.03. All pass but with almost no headroom; any further tweak must be rechecked.
CLAUDE.md token table matches styles.css for all 12 values. No old status hex values remain in src/styles.css or index.html.

## 3. Visual and meaning: PASS
Screenshots (report view and first expanded row, all four themes): /private/tmp/claude-501/-Users-timdixon-Code-Github-Image-Colour-Contrast-Checker/a3aa06bc-59ce-4f35-9ca0-069af5a6c215/scratchpad/shots/ (light, dark, muted-light, muted-dark; -report.png and -expanded.png).
- Every pill carries a text label (Pass, Fail, AA Fail, AAA Fail); status does not rely on colour. Row detail check names, values and "what it means" text all present.
- Pass (green) and Fail (red/pink) remain clearly different in hue and in label in every theme; warn is an amber pill, distinct from both.
- Light and muted-light: slightly darker green and red text on pale pink/green pills; nothing looks off.
- Dark: soft pink Fail on dark maroon pill, light green Pass on dark green pill; group labels (WCAG COMPLIANCE, ADVANCED CHECKS) now a pale blue-grey instead of orange, same size and weight, still read as section labels.
- Muted-dark: Fail pink (#ECBEBE) is noticeably lighter and paler than before (#E6A9A9), nearer to a blush than a red. It is still clearly pink against the Pass green and has the "Fail" label, but it has less red character; a design call for Tim, not a defect.
- Layout, header, bottom action bar, thumbnails and clip boxes unchanged and intact.

## 4. privacy.html: PASS
- Accuracy against the facts: report links to WebAIM (fcolor and bcolor in the address) and VADChecker (txt and bg) carry only the two colours; all open target=_blank with rel="noopener noreferrer", so no referring address is sent (browsers also default to a strict referrer policy). Nothing is sent until click. During load and analysis, no external request was made in my run (GoatCounter does not count on localhost; its script is first-party count.js), so the GoatCounter page view could not be observed here. The text matches the code.
- Wording: reads clearly, plain; "by itself" is the right qualifier. The two corrected sentences are consistent with the new section. The section says PDF and Markdown links behave the same, confirmed (VADChecker links present in exports).
- Observation, not a defect: the report also has info links to w3.org, apcacontrast.com and vestibular.org, and the footer to github.com and timdixon.net. They carry no image data or colours; the new section scopes itself to the two colour-bearing links, which is accurate. timdixon.net links use rel="noopener" only (no noreferrer), which is the owner's own site.
- Headings: H1, H2 "Privacy Statement", then ten H3s including the new "Links to other tools"; no skipped levels.
- Links: GoatCounter, GitHub, Tim Dixon, Back to the tool, plus skip link; all work.
- axe (all tags above, best-practice): 0 violations and 0 incomplete in light, dark, muted-light, muted-dark.
- Keyboard only: Tab order is skip link, four theme buttons, GoatCounter, GitHub, Tim Dixon, Back to the tool, then wraps. Focus ring is a 3 px solid outline with 3 px offset on links.

## 5. Report, exports, VADChecker, console: PASS
- Report renders; all rows expand and collapse; PDF downloads (3.57 MB) and Markdown downloads (6.1 MB); 14 VADChecker links with correct txt and bg parameters (main has none, as the feature is in the combined release).
- Console: identical set to main in all four themes: CSP frame-ancestors ignored in meta, goatcounter skipped on localhost, ONNX data: wasm connect/fetch messages and WebGPU adapter fallback in headless. No new errors. No failed requests.

## 6. The 136 th discrepancy: RESOLVED
Count of th without any scope attribute, all rows expanded: main 0 of 216, branch 0 of 180. Sean is right.
The earlier figure of 136 was my mistake: it counted th whose scope is not "col" (scope="row" 102 plus scope="rowgroup" 34 on main, which is exactly 136). Those are correct scopes, not missing ones. Branch: col 68, rowgroup 28, row 84 (112 not col). The total differs (216 vs 180) only because main finds 17 pairs and the branch finds 14 in this image.

## Advisories (non-blocking)
1. src/export/pdf.js still hardcodes the old muted-light fail colour #8A2A2A on #F0DCDC (line 107) and in the vestibular colour map (line 291). That is 6.53:1, below 7:1 in the PDF, and now differs from the web token #822727. The task did not cover the PDF, so I did not test the PDF contrast; recommend aligning in a follow-up.
2. docs/design-system/mockups/014-four-themes.html retains the old token values (reference mockup only).

<!-- TASK -->
- [ ] Align PDF fail/pass/warn colours in src/export/pdf.js (lines 107, 291) with the AAA tokens and verify 7:1 in the PDF `priority:low` `owner:sean` `from:carol-delta-test-pr71`
<!-- /TASK -->
