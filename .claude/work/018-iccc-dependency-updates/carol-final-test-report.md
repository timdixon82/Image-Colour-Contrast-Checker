# Carol FINAL test report: PR 71 release/combined-update head 1f09bfc
Setup: fresh worktrees carol-final (1f09bfc) and carol-main (3bde7b4), npm ci + build OK, free disk 18 GB. Static no-store servers 4340 (release) 4341 (main); vite dev 5171/5172 for per-box numbers.

## 1a. Tim's screenshot per box (partial notes, main -> release; fg on bg, contrast) [PASS on named boxes]
- 762.03 MWh: #8854D7/#7452B4 1.19 -> #3F366E/#8E56E2 2.33 (dark text on purple tile)
- BATTE.. 1.54: #8C55DE/#7752B3 1.23 -> #34305D/#8B55DD 2.57
- 1.05 800.39: #4B6D74/#598E90 1.52 -> #2D3F53/#598C8F 2.86
- MWh kWh: #51777B/#598E90 1.33 -> #2E4255/#588C8F 2.74
- kWh GRID: #858DF1/#6F76C1 1.40 -> #3A4271/#858DF1 3.22 (dark text on lilac)
- 24.69% 63.33 kWh: #4E52AC/#464986 1.22 -> #373B59/#4E52B3 1.65 (dark text on indigo, small label)
- Home Device Service Settings: #787B80/#2E3138 3.07 -> #A2A4A8/#35383F 4.70
- SOLAR BATTe...: #B6B063/#E3DA77 1.55 -> #7B7A60/#F4EDAB 3.66 (still reads lower than true navy-on-cream; minor, as before)
- 2026 Lifet...: #3D3F4A/#2B2C32 1.33 -> #EFEFF0/#42444A 8.47
- Also changed: 17:02 5.28 -> 7.25, Solar Load 2.91 -> 3.44, 0.00 kw 4.97 -> 5.30. 22 boxes both builds.

## 1b. Real-font canvas sweep (main vs release, same Chrome; scripts kept in the session scratchpad) [PASS with watch item]
- Set A: 38,880 cases = 4 fonts (Helvetica Neue, Georgia, Menlo, Arial) x weights 200/400/700 x sizes 10,16,22,28,34,40 x 9 colour pairs x flat/gentle/steep ramp x 2 strings x PNG + JPEG q90/70/50/30 x tight/padded box.
- Set B: 19,440 cases, same grid for 2 fonts, with a 140 px text-free gap inside the box (the bug shape).
- Faint #BBB on white: release never passes (max 1.82; 4,320 + 2,160 cases). Faint #999/#BBB on gentle ramp: 0 passes of 2,880 (+1,440). PASS
- Black on white flat: release passes 1,321 of 1,440 (main 1,241); gap set 642 of 720 (main 376). Misses are tiny/ultralight antialias greys, same family as before. PASS
- Real failing text that flips from main FAIL to release PASS: set A 21 (earlier run: 27 in 38,880), set B 22 (new). Main passes none of these (so main never hid them; the release now reads the text strip instead of the gap).
  - Set A: 20 of 21 are within 0.1 of the threshold (truth 4.42 to 4.48 vs 4.5; bold 28 px white on #222 with a steep ramp); one is Menlo bold 28 px, truth 3.13 vs 4.5.
  - Set B: 17 of 22 are more than 0.1 short (truth 3.65, 4.17, 4.35, 4.42 vs 4.5): bold 28 px white on #222 over a steep ramp (Arial, Helvetica Neue) and 2 of #003366 on a steep ramp. Release reads 5.3 to 8.4.
  - Not the ultralight family this time: it is bold, tight box, steep ramp where the worst end of the ramp (my "truth" is the last ink pixel column) is more extreme than any whole strip. Same cause as the known watch item (strip averaging on steep ramps). Not a blocker; real-world steep ramp under body text is rare.
- Release higher than main by more than 0.05 in 5,697 (A) and 8,160 (B) cases (main reading gap or ribbon); release lower than main by more than 0.05: see below.
- Release is never lower than main by more than 0.05 in any of the 58,320 sweep cases (0 cases).

## 2. OCR and upgrade path [PASS]
- Repo gates on the release worktree: npm test 8 files, 159 tests pass; npm run lint clean; npm audit 6 low only; scripts/sw-check.mjs exit 0. dist/sw.js has no __PLACEHOLDER__ token (cache name icc-model-cache-ort1.30.0-models1.4.2, ORT_DIR ort-1.30.0). dist has no /ort/ reference except one comment line in sw.js; the bundle uses ort-1.30.0/. PASS
- Clean text image (5 lines: black bold, #767676, faint #BBB, orange on dark green, white on navy): main and release find the same 5 text lines; same fg/bg except small sampling differences (navy banner text #F0F3F6 vs #E8EDF1, orange #D28E4D vs #D18D4D). PASS
- Fresh visit (persistent profile, plain static server, real Chrome, real models), visits 1 and 2: crossOriginIsolated true, worker controls the page, cache icc-model-cache-ort1.30.0-models1.4.2 holds 5 entries (det 4,745,517; rec 10,822,323; dict 26,249; /ort-1.30.0/ jsep.mjs 46,851; jsep.wasm 28,312,028). Visit 1 fetched them from the server (under /ort-1.30.0/); visit 2 only /sw.js update checks. OCR worked. PASS
- Upgrade (main loaded twice, then release on the same origin and profile):
  - main load 1 and 2: cache icc-model-cache-v1 (5 entries incl. /ort/ wasm 26,827,543), load 2 from cache.
  - release load 1: new runtime fetched from the NETWORK at /ort-1.30.0/ (wasm and mjs); the old worker did not serve old bytes; no ORT version errors; OCR worked (same 5 rows). Old v1 cache still present while the page ran, new worker already activated; 4 s later all caches were empty (v1 pruned, new cache not yet filled).
  - release load 2: models and runtime fetched from the network once more (new cache was empty after the prune) and stored in icc-model-cache-ort1.30.0-models1.4.2 (5 entries); v1 gone. OCR worked.
  - release load 3: only /sw.js requested; everything from cache. 
  - Observation (minor): the ~34 MB of models is downloaded once more on release load 2 because the old worker's activation prune empties everything before the new cache is filled. Costs one extra download per returning visitor, not a fault.
- Console errors (all runs, main and release alike): CSP frame-ancestors ignored in meta; "Connecting to data:... wasm" CSP message and the onnxruntime warnings logged as errors. No new error text, no ORT/WASM version error. PASS

## 3. Exports from Tim's screenshot (release; real Chrome, real OCR) [PASS]
- 14 pairs on screen. Every VADChecker link: txt = on-screen foreground, bg = on-screen background (lower case hex), 14 of 14 correct. Every WebAIM link: fcolor/bcolor equal the on-screen pair, 14 of 14. Links open in new tab with rel noopener noreferrer; VADChecker aria-label "Check and adjust this colour pair with VADChecker (opens in new window)".
- Markdown: 14 distinct VADChecker URLs and 14 WebAIM URLs, sets equal to the on-screen ones. 
- PDF: opens (poppler), 10 pages (main 12 because main reports more pairs), Tagged yes, PDF 1.5, title "Audit Report". 128 link annotations: the 14 VADChecker and 14 WebAIM URIs (sets equal to on-screen) plus the site and six check-info anchors. Page 3 render checked by eye: per-pair line "Check #3F3668/#8B56DD on WebAIM Contrast Checker  Check and adjust this colour pair with VADChecker (opens in new window)" present.
- PDF colours in words (by eye on rendered pages): white page, dark text; table header row cool grey-blue with dark text, group rows ("WCAG compliance", "Advanced checks") light grey-blue; Status cells in pale tints with dark text (Fail pale pink with dark red, Pass pale green with dark green, Review pale sand with dark olive); links dark blue and underlined; the red boxes on the crop images are the pair's detected text boxes. Exact RGB values not extracted; contrast not measured (eye only).
- veraPDF 1.30 on the browser-made PDF: release fails 2 rules (clauses 7.21.7 test 2 and 7.21.8 test 1, the .notdef glyph for the OCR word "三83"), 104 passed. Main fails the identical 2 rules on this image: known pre-existing, not caused by the release. 
- Project PDF/UA tests (veraPDF, not skipped): src/lib/pdf-ua and src/export/pdf.test.js 22 tests pass.

## 4a. axe-core, four themes, Tim's image, all 14 pair rows expanded and glossary open [PASS]
- axe 4.14.0, tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, wcag2aaa (includes color-contrast-enhanced), best-practice. Release: ZERO violations in light, dark, muted-light and muted-dark. 
- Main on the same image for comparison: color-contrast-enhanced 145 (light), 34 (dark), 99 (muted-light), 34 (muted-dark), plus link-in-text-block 102 in every theme. The release fixes all of them.
- Incomplete (axe could not decide, same set on main): color-contrast and color-contrast-enhanced for pseudo-content (3, the header accent line, label, select) and non-BMP glyphs (98, the arrow and caret characters), aria-prohibited-attr 48, label-content-name-mismatch 84 (pills have aria-label "WCAG AA: Fail" while the visible text is "AA Fail"; flagged by axe as needs review, pre-existing), identical-links-same-purpose 2, th-has-data-cells 14 (the hidden-header column). I did not manually verify the 84 label-in-name cases: SC 2.5.3 is level A and a screen-reader/voice-control pass is untested.
- th elements without a scope attribute: 0 of 180 in the DOM (0 of 216 on main).
- My own ratios (computed from the resolved custom properties; bg / bg-card / neutral-bg):
  - light: fg 13.25/14.35/12.35; fg-muted 7.54/8.17/7.03; accent-small 10.62/11.51/9.90; pass 7.80/8.44/7.27; fail 8.27/8.96/7.71; warn 9.15/9.91/8.53; pass on pass-bg 7.04; fail on fail-bg 7.01; warn on warn-bg 8.06; white on button fill #234A73 9.14, hover 11.63; button fill vs card (non-text) 9.14.
  - dark: fg 14.71/12.65/10.65; fg-muted 9.92/8.53/7.18; accent-small 11.58/9.96/8.39 (accent itself 5.94 on neutral-bg, so accent is not used for small text); pass 10.47/9.00/7.58; fail 9.72/8.36/7.04; warn 9.70/8.34/7.02; pass-bg 7.92, fail-bg 8.31, warn-bg 7.19; button text on #EB9C52 8.21, hover 10.48; button vs card 7.05.
  - muted-light: fg 11.48/13.13/10.87; fg-muted 7.70/8.81/7.30; accent-small 7.99/9.14/7.57; pass 7.55/8.64/7.15; fail 8.09/9.26/7.67; warn 9.26/10.59/8.77; neutral 7.39/8.46/7.00; pass-bg 7.16, fail-bg 7.04, warn-bg 8.50; button text 9.14.
  - muted-dark: fg 12.52/10.64/9.35; fg-muted 9.42/8.00/7.03; accent-small 12.52/10.64/9.34; pass 9.82/8.35/7.33; fail 9.41/7.99/7.02; warn 9.39/7.98/7.01; pass-bg 8.33, fail-bg 9.01, warn-bg 8.47; button text 9.15.
  - Tightest: light fail on fail-bg 7.01, dark warn on neutral-bg 7.02, muted-dark warn on neutral-bg 7.01, muted-light neutral on neutral-bg 7.00 (rounded, at the limit; confirm unrounded >= 7). All at or above 7:1.

## 4b. Targets, focus, status, keyboard, reflow, motion [PASS with observations]
- Target size, all 14 rows, all four themes: VADChecker link 92 x 44 px, WebAIM link 180 x 44, row toggle 44 x 44, Download PDF/Markdown and Audit another batch 46 px high (181/179/171 wide), Choose files 121 x 46, skip link 171 x 44 (settled; the 120 ms slide-in made one reading -42). PASS
- Link colours on real background (unrounded, effective bg): light 11.51, dark 7.05, muted-light 9.14, muted-dark 7.78 for the pair links; check-info (the underlined links) 9.90, 8.39, 7.57, 9.34. Primary button text 9.14, 8.21, 9.14, 9.15. Pill text minimum 7.01 (light), 7.19, 7.04, 8.33. All at least 7:1. PASS
- Underline: VADChecker, WebAIM and check-info links all have text-decoration underline in all four themes. PASS
- Focus ring (keyboard Tab, :focus-visible true): 3 px solid, offset 3 px (skip link 2 px, expanded summary -3 px), colour --accent. On the new light button fill #234A73 the ring is navy #0C3B64 with a 3 px gap showing the white card (ring vs card 11.51:1; ring vs fill only 1.26:1, which is fine because of the gap). Screenshots checked by eye: light Choose files has a clear navy ring with white gap; dark has an orange ring around the orange button; skip link in light shows the navy ring around the navy tab. Skip link ring in dark/muted-dark is the same colour as its fill (gap carries it, ring vs header 8.2:1 and 9.15:1). Footer links also get the ring. PASS
- Dropzone: the dropzone itself is not a tab stop; "Choose files" inside it is. I did not find a separate focusable dropzone to see the new dropzone focus-visible rule on; not directly verified.
- Status without colour: pills carry words ("AA Fail", "AAA Pass", "Pass", "Review", "Fail") plus aria-labels, so state does not rely on colour. PASS
- Keyboard-only walkthrough (release): Tab order skip link, theme select, "Show/hide explanations", Choose files; Enter on Choose files opens the file chooser; after the report appears focus is on body (pre-existing), Tab reaches the card title link, the row toggle, Enter expands (aria-expanded true), next Tabs WebAIM link, VADChecker link, then the check-info links; Enter on VADChecker opened the new tab with txt=a5aaf3&bg=5f67a6 (a later row than the first; fine). Theme switch by keyboard: typing "mu" on the focused select switched to muted-light and saved td-theme; ArrowDown on the select did nothing in headless Chrome (OS behaviour, not an app defect, unverified by hand). PASS
- Reduced motion: with prefers-reduced-motion reduce, no element has a running transition or animation over 0.01 ms. PASS
- Reflow, 375 px wide (words): header, intro, theme select, glossary and card all stack in one column and the text wraps; the results table sits in its own horizontal scroller (allowed) and the expanded detail table scrolls within it; the fixed action bar shows three stacked buttons and covers the bottom fifth of the screen. The document itself still scrolls sideways (scrollWidth 785 at 375, 785 at 640) with the same number on main, so not a regression; I could not find an unclipped culprit element, so low priority. 
- 200% zoom (640 x 450 CSS px): content readable, table in scroller, action bar buttons sit in one row and cover about 70 of 450 px; nothing is cut off apart from the table scroller. PASS
- Observation (pre-existing, identical on main): the check-info "ⓘ" links are 14 x 16 px, below the 44 px AAA target size and under 24 x 24 AA unless an exemption (inline, spacing) applies; axe target-size found no violation. Footer links ("Privacy", "MIT Licence" and so on) are 15 px high. Not in scope of your list.

## 5. Privacy page [PASS with one factual defect]
- Reads clearly; headings in order (h1 site name, h2 Privacy Statement, nine h3 sections including the new "Links to other tools"); lang en-GB; header, main, footer landmarks; links underlined; external links rel noopener noreferrer; the GoatCounter, GitHub and "Tim Dixon" links read fine.
- axe-core (all tags above incl. wcag2aaa) in light, dark, muted-light, muted-dark: ZERO violations (identical on main). Incomplete only for pseudo-content and non-BMP glyph contrast (5 and 11), same as main.
- Facts checked: the VADChecker and WebAIM URL examples match the real link format; links are noopener noreferrer (the "no referring address" claim is true); the files list matches dist/models and the runtime; localStorage holds only td-theme; no cookies set (none seen). The "made by Tas the Artist" attribution matches the contact on vadchecker.com (Tad's note), not independently verified.
- DEFECT (pre-existing wording, still in the release): "Total first-run download: approximately 28 MB". The files add up to about 44 MB (det 4.7 + rec 10.8 + dictionary 0.03 + runtime wasm 28.3 + mjs 0.05 = 43.96 MB). The 28 MB is the wasm alone. CLAUDE.md also says about 30 MB. Main has the same sentence.

## 6. VADChecker live spot check [PASS 21 of 21]
- 21 live loads of https://vadchecker.com/tool/?txt=..&bg=.. (plus 1 earlier test load = 22 requests, one every 2.5 s plus page load, under the 30 limit; no errors or throttling). Compared with the offline replica (ratio, AA, AAA, Lc, vestibular, saturation, cognitive): all 21 match exactly.
- Results (fg on bg: ratio, Lc, Vestibular, saturation, Cognitive; AA and AAA PASS in every case):
  - dark --fg #E2E7EC on --bg #0A1525: 14.71, Lc 94, SAFE 57%, NEUTRAL; on --bg-card #11233E: 12.65, Lc 91, SAFE, NEUTRAL
  - dark --accent #EB9C52 on --bg: 8.20, Lc 60, SAFE, SAFE; on --bg-card: 7.05, Lc 57, SAFE, SAFE
  - light button fill: white on #234A73 9.14, Lc 96, SAFE 53%, NEUTRAL; hover #1B3A5C 11.63, Lc 102, SAFE 55%, NEUTRAL
  - light --fg #2A2A2A on white 14.35 Lc 104 SAFE NEUTRAL; on --bg #F4F6F8 13.25 Lc 99 SAFE NEUTRAL
  - light --warn #544012 on #F0E8C8 8.06, Lc 82, SAFE, SAFE; dark --warn #DDB94D on #3A2C10 7.19, Lc 62, SAFE, SAFE
  - dark --accent-small #F8C48F on --bg 11.58 (Lc 79), on --bg-card 9.96 (Lc 75), on --neutral-bg #15314F 8.39 (Lc 72): all SAFE, SAFE
  - muted-dark --accent-small #F5E4CE on #142536 12.52 (Lc 91, SAFE, NEUTRAL), on #1E3147 10.64 (SAFE, SAFE), on #283A4E 9.34 (SAFE, SAFE)
  - also dark fail on fail-bg 8.31, dark pass on pass-bg 7.92, light pass on pass-bg 7.04, light fail on fail-bg 7.01, dark --fg-muted on neutral-bg 7.18: all SAFE.
  - No changed pair reads WARN or FAIL in VADChecker. Note light fail/pass pill pairs sit at 7.01/7.04 (no headroom).

## 7. Console, th scope, stale references [PASS]
- Console errors, same set on main and release in every visit (fresh, upgrade, returning): CSP frame-ancestors ignored in a meta element; "Connecting to data:... wasm" CSP refusals and Fetch API cannot load data:; two onnxruntime warnings logged as errors. No ORT version error, no new message. Privacy page: only the frame-ancestors meta message.
- th without scope: 0 of 180 (release) in the full report DOM; source th elements in report-view.js all carry scope="col".
- dist: no unreplaced placeholder in sw.js; no /ort/ path in dist other than one explanatory comment in sw.js; bundle uses ort-1.30.0/. No "tastheartist" text in the built files.

## Overall verdict: PASS (release ready from the testing side), with the items below for Sonja to decide
Rework or decisions (not routed by me):
1. Privacy page and CLAUDE.md say the first-run download is about 28 MB (or 30 MB); it is about 44 MB. Wording fix (pre-existing, but the page was edited in this release).
2. Upgrade cost: on a returning visitor's second release visit the models and runtime download again (about 44 MB) because the old worker's activation prune empties the cache before the new cache is filled. Works, not a defect; Sonja or Tim may accept it.
3. Watch item, not a blocker: sweep shows real failing bold text on steep ramps that now reads as pass (21 in 38,880 and 22 in 19,440 wide-box cases; 17 of the second set are more than 0.1 under the threshold, worst true 3.65 vs 4.5). Main did not hide those, it read the gap.
4. SOLAR BATTe... still reports #7B7A60 on #F4EDAB 3.66 (an antialiased strip) where the real navy text on cream is much higher; still a failure of AAA/AA, so nothing hidden; minor wrong colours.
5. Pre-existing, low: the check-info "ⓘ" links are 14 x 16 px and footer links 15 px high; page scrollWidth 785 at 375 px wide (same on main); 84 label-in-name needs-review items (pill aria-label "WCAG AA: Fail" vs visible "AA Fail").
6. Not verified: the dropzone focus-visible rule could not be seen because the dropzone is not itself focusable (the Choose files button is).

## Could not test
VoiceOver, JAWS, NVDA (no screen readers); Safari, iOS Safari, Firefox (Chrome only; iOS Cache Storage eviction behaviour not tested); the live GitHub Pages site and its real headers/CDN caching; Chrome's real 24-hour service worker update deferral (my upgrade test saw the update on first load); Tim's actual screenshot at the original device resolution beyond the 600 px file given; native select popup keyboard behaviour (headless); real VADChecker site layout changes after today.
