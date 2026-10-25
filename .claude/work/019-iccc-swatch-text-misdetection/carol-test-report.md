# Carol test report: 019 swatch text misdetection (PR 68, fix/swatch-text-misdetection)

Verdict: FAIL on the main acceptance criterion. Tim's image still reports a gradient-only pair for the "762.03 MWh" box on the PR branch. Everything else passes.

Method: git worktrees of PR head (b4f44a7) and main (3bde7b4) under .claude/worktrees/, `npm ci` in each, vite dev servers, Playwright driving Chromium headless. Models loaded locally from public/models, so the real OCR ran (no offline problem). Free disk stayed about 20 GB.

## 1. Tim's screenshot (/private/tmp/.../images/2.png): FAIL

Note: on main my run gave #8854D7 on #7452B4 (1.19) for the same box, not exactly Tim's #6C8ABE/#6983B3. The OCR boxes or resize differ slightly from Tim's run, but the symptom is the same: a gradient-only pair for a wide box.

"762.03 MWh" (OCR box 59,677,458x32):
- main: #8854D7 on #7452B4, 1.19 (purple ribbon shades only)
- PR: #688EB1 on #80A3BE, 1.30 (blue ribbon shades only)
- Result: still a gradient-only pair. The fix did not remove the bug on this image. The specific pair #6C8ABE/#6983B3 is not reported, but only because the winning strip moved.

Cause, found by dumping per-strip results on the PR code: `isTextLike` returns true for several gradient-only strips in this box, for example #688EB1/#80A3BE 1.30 and #5E769A/#7087B3 1.28 (the ribbon edges, antialiasing and semi-transparent overlaps look like strokes to the label-change test). Real text strips in the same box score 5.6 to 6.2 (teal side) and 2.3 to 2.4 (purple side) but lose to the 1.30 gradient strip because the rule is still "lowest contrast among text-like strips". Only strips the test marks "-" were removed.

Other boxes, main then PR (fg on bg, contrast):
- "BATTE.. 1.54": #8854D7/#7452B4 1.19 (shared with 762.03 row) then #5E769A on #7087B3 1.28. Still gradient.
- "1.05 800.39": #51777B on #598E90 1.33 (merged elsewhere) then #4B6D74 on #598E90 1.52. Still a gradient/dark-on-teal strip, text strips are 2.9 to 3.0.
- "MWh kWh": #51777B/#598E90 1.33 then #928D57 on #B1AB63 1.44. Still gradient, real text about 3 to 5.
- "kWh GRID": #858DF1/#6F76C1 1.40 then #4E5F7F on #393C46 1.71. Still gradient.
- "24.69% 63.33 kWh": #4E52AC on #464986 1.22 on both. Unchanged (the 63.33 kWh label is small and low contrast, partly genuine).
- "SOLAR BATTe...": #B6B063 on #E3DA77 1.55 then #92EFF6 on #527B80 3.53. Improved (yellow gap strip dropped).
- "Home Device Service Settings": #737782 on #2E3138 2.91 then #A2A4A8 on #35383F 4.70. Changed upward. The grey labels are visibly about this range, plausible, not hidden failure. Needs Tim's eye.
- "2026 Lifeti...": #3D3F4A on #2B2C32 1.33 then merged with "Solar Load" at #7E7F83 on #303239 3.20. Improved (earlier pair was dark panel edge, not text).
- Unchanged: 64.17%, GRID, 33.21%, LOAD, 595.07, kWh/31.62%, 0.00 kW, 17:02, 43.69%, Energy Statistics.
- Pair count: main 17, PR 19.

## 2. Regression images: PASS (no change)

Synthetic 900x1000 canvas, five panels, identical results on main and PR:
- Faint grey #BBB on white: #C0C0C0 on #FEFEFE, 1.80, fail on both. PASS.
- Black on white: #1F1F1F on #FFFFFF, 16.48, pass on both. PASS.
- White text over photo-like noisy gradient: #FCFDFC on #ACCAAB 1.75 on both (sensible, text is bright on mid green). PASS.
- Faint #BEBEBE on a gentle grey ramp: 1.39, fail on both. PASS.
- Dark text, gap, dark text over a teal to purple ramp: 3.04 on both. This synthetic gap case did not reproduce the bug even on main, so it does not prove the fix.

Extra hidden-text sweep, calling main and PR `worstStripContrast` directly on 576 generated tight-box cases (6 font sizes 10 to 40 px, normal and bold, 8 fg/bg pairs from 1.9:1 faint grey to light-on-dark, flat and ramp backgrounds, three strings including thin punctuation). Result: zero differences above 0.05. No sign that tight-box real low-contrast text is hidden or changed.

## 3. Whole report, exports, console, accessibility: PASS

- Report renders on the PR: 19 result rows, thumbnails, colour-blindness simulations, expandable detail with five checks and "where this appears" crops.
- Markdown export downloads (6.6 MB, details blocks with swatches present). PDF export downloads (4.0 MB, valid %PDF header).
- Console: only errors seen are identical on main and PR and unrelated: CSP `frame-ancestors` ignored in a meta element, and dev-server CSP blocking an onnxruntime data: wasm fetch (plus onnxruntime node-assignment warnings). No new errors.
- axe-core (wcag2a, 2aa, 21aa, 22aa, best-practice) on the PR with report loaded: zero violations. Skip link, buttons, aria-expanded toggles unchanged. The PR diff touches only src/core/contrast.js and src/core/contrast.test.js, so no UI or markup change.
- `npm test` on PR: 3 files, 18 tests pass. `npm run lint` clean.
- Not run: VoiceOver, JAWS, NVDA (no UI change in this PR).

## Hidden real low-contrast text?

Not shown in my tests. The fallback chain (whole box, then lowest strip) means failures are not silenced. The remaining flaw is the opposite one: the filter is too permissive on real gradient ribbons, so false low-contrast pairs still appear. Risk of hiding real text is low but only the synthetic and tight-box cases were tested, not real thin fonts under heavy JPEG noise.

## Rework needed (for Sonja to route)

1. Sean: the fix does not meet "Tim's image no longer reports gradient-only colours for 762.03 MWh". The stroke-crossing test (`isTextLike`, BAND 0.15, LINE_CHANGES 2, LINE_SHARE 0.20) marks real ribbon strips as text. Add a repro from this real image (crop of box 59,677,458x32 from /private/tmp/claude-501/-Users-timdixon-Code-Github-Image-Colour-Contrast-Checker/a3aa06bc-59ce-4f35-9ca0-069af5a6c215/images/2.png, resized by decodeAndResize) and tighten the test. Ideas for Jacob/Sean: require sharp steps (step size relative to separation, not hysteresis crossings alone), require the minority cluster to be thin and compact (stroke width), require stroke-like share across both axes, or stop using "lowest strip" and prefer a robust statistic across text-like strips (for example the strip contrast most strips agree with). Re-test with the dump method used here.
2. The synthetic repro in contrast.test.js passes but does not model real ribbons (semi-transparent curved overlaps, antialiased edges). Jacob's review item 4 and 7 style cases should include real-image crops.

No commits, merges or pushes made.
