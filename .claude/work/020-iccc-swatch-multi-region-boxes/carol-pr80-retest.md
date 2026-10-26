# Carol re-test: PR 80 (fix/swatch-remaining-ribbons, head a43f58c)

Verdict: **PASS WITH NOTES**

Head confirmed with `gh pr view 80`: a43f58ccaa1adbb4fb917704524263ace7178054. Every defect in my FAIL report is gone. Four checks are not fully clean, none blocking in my view (Tim's call):

1. In 460 browser variants with my resampler, one branch row is worse than main (0.06, negligible). With the probe harness's own resampler (about 2,800 more boxes), 3 variants have a branch reading further from the real text than main (details under "Boxes where the branch is worse"). Sean's "zero worse" holds on his sets and mine, not on every pixel variant.
2. The 24.69% / 63.33 kWh fix is partial and only at 0.78x to 0.9x. 26 of 50 sub-1x variants still report the card against the gap (a non-text pair), same as main.
3. The kWh GRID ribbon fix from the first version of the PR is now narrower. It applies at 2x to 2.75x, not 1.25x to 1.75x.
4. "No image in the PR" is not accurate for the whole PR. See "What is in the PR diff".

## Test setup

- Main: worktree `main-probe` at 848a225 (origin/main, confirmed by `git fetch`), rebuilt.
- Branch: new worktree `.claude/worktrees/carol-p80`, detached at a43f58c, rebuilt. I did not use `swatch-ribbons`. Its `node_modules` is a symlink to the one in `swatch-ribbons`; same lockfile.
- Real Chrome (`/Applications/Google Chrome.app`), real PaddleOCR through `#file-input`, pages cross-origin isolated, each build served from its own `dist`. Each variant: Reset, upload, wait for cards, read every result row (pair hexes, AA ratio, examples text).
- Variant images are my area-average resampler's output, identical bytes for main and branch. Scripts and raw results: `/private/tmp/claude-501/-Users-timdixon-Code-Github-Image-Colour-Contrast-Checker/a3aa06bc-59ce-4f35-9ca0-069af5a6c215/scratchpad/r2/` (`res-mainR2*.json`, `res-branchR2*.json`, `worse.mjs`, `fam.mjs`, `named.mjs`, `cmpR2.mjs`).
- No errors or timeouts in any variant.
- Second, independent run: the probe harness at `/Users/timdixon/Code/local-tools/iccc-ocr-probe/` (real Chrome, real OCR, its own bilinear resampler, box-level compare). Results in the same folder (`h-*.json`, `g-*.json`).
- Judging method: each reported pair is read as text on its own local background. The reference for "real contrast" of a label is its value at 1x, where both builds agree. A branch row is "worse" if it is further from that 1x value than main's row for the same label, by more than 0.05.

## Results by set (browser, main vs branch)

| set | variants | identical | differ | notes |
|---|---|---|---|---|
| 1. 019 fixture sweep (9 fixtures, 1x to 3x, 3 crops) | 162 | 161 | 1 | kwh_grid 2x c0-0: ribbon 1.73 becomes real "kWh GRID" text 2.79. |
| 2a. Tim images 3, 4, 5 (0.6x to 3x, 4 crops) | 84 | 83 | 1 | tim-full-screenshot-5 0.8x c9-4: lower reading is not worse (see below). |
| 2b. Extra: screenshot 5 at 0.65 to 0.9x, 6 crops; screenshots 3 and 4 at 0.7 to 1.75x; kwh_grid and energy_card_gap at 0.75x to 3x, 4 crops | 152 | 125 | 27 | 5 kwh_grid improved (2x to 2.75x); the rest are the 24.69% family and "MWh kWh". Screenshots 3 and 4: all identical. energy_card_gap: identical at all 40. |
| 3a. Local images 5 to 11 (1x, crops, 0.5x, 0.75x, 1.5x) | 35 | 34 | 1 | tim-image-5 at 0.75x only (same as screenshot 5 at 0.75x). |
| 3b. Local images 6 to 11 at 0.6, 0.8, 2, 3x; tim-image-5 at 0.6, 0.8, 3x | 27 | 27 | 0 | |

Total 460 variants, 1,657 reported rows (some variants repeat across sets). Identical at 1x and above on Tim's three images and on every local poster. Images 6 to 11: identical to main at every scale and crop tested. Every pair reported for them is real text on its own local background (as in my earlier reports; the rows are the same).

## Named cases (all in real Chrome, same pixels for both builds)

| case | main | branch | verdict |
|---|---|---|---|
| kwh_grid2 3x c0-0, "KWH GRID" | 2.37 | 2.37 | same as main; the dark-on-dark 1.37 is gone |
| kwh_grid2 3x c0-3, "GRID" | 3.90 | 3.90 | same as main (the 2.29 half-covered mix is gone) |
| kwh_grid 0.75x c0-0, "kWh GRID" | 2.31 | 2.31 | same as main (1.34 gone) |
| kwh_grid 0.75x c3-0 | 2.31 | 2.31 | same as main (1.36 gone) |
| kwh_grid 1.25x c3-0 | 2.32 | 2.32 | same as main (1.40 gone) |
| screenshot 0.75x c12-2, "43.69%" (1x 5.33) | 6.18 | 6.18 | same as main (3.68 gone). The "24.69%" gap pair (2.76) is no longer reported. |
| screenshot 0.78x c0-3, "31.62%" (1x 4.78) | 4.09 | 4.09 | same as main (2.88 gone). Sean quotes 4.78; I get 4.09 on both builds (my resampler), no difference between builds. |
| screenshot 0.8x c0-3, "43.69%" | 5.65 | 5.65 | same as main |
| screenshot 0.7x c0-3, "kWh GRID" | 2.42 | 2.42 | same as main (1.53 gone) |
| screenshot 0.78x c0-0, wide 24.69% box (1x 1.65) | 2.57 (card vs gap, non-text) | 1.64, `#33396D` on `#4E52B5` | fixed. Navy "63.33 kWh" on the indigo card. |

Also checked at 1x: kwh_grid 2.86 and the 24.69% box 1.65 are identical on both builds.

## The 24.69% / 63.33 kWh box at sub-1x (screenshot 5 and tim-image-5)

I classed each variant's "24.69%" row by its background. 50 variants have a "24.69%" or "63.33" row at 0.6x to 1.5x. Main already reports the real faint pair in 2 (0.9x c5-0, 1.5x). Of the other 48:

| outcome on the branch | variants |
|---|---|
| real faint text (navy on indigo, 1.64 to 1.72; real 1.65) | 8: 0.78x c0-0, c12-2, c5-0, c9-4; 0.85x c0-0, c5-0; 0.9x c0-3, c12-2 |
| neighbouring "GRID" pill text (2.16 to 2.72); real text, not the faintest | 7: 0.75x c0-0, c12-2, c5-0; 0.85x c0-3, c9-4; 0.9x c3-7; tim-image-5 0.75x |
| still the card-against-gap non-text pair (2.57 to 3.19), same as main | 26 |
| main already reports a pill pair, unchanged | 7 |

So Sean's "9 fixed, 8 pill, 26 unchanged" is close to what I see (8, 7, 26 of my 48). The 26 unchanged match exactly. The fixed variants cluster at 0.78x to 0.9x; the 0.6x, 0.65x, 0.7x and most 0.8x variants are not fixed. The branch never makes this row worse: the non-text gap pair (2.6 to 3.2, further from 1.65) is replaced by a pair closer to 1.65 or dropped.

## Boxes where the branch is worse than main

### In my browser run (460 variants): 1 row

| variant | label | main | branch | 1x | note |
|---|---|---|---|---|---|
| screenshot 5, 0.8x c9-4 | "1.05 800.39" | 2.47 (`#384557` on `#5B8791`) | 2.41 (`#354C5D` on `#598D90`) | 2.57 | 0.06 lower; same dark ink on teal. The box is labelled differently (it now includes "MWh kWh"). Real text. Negligible. |

### In the probe harness (its own resampler; real Chrome and real OCR, about 2,800 boxes across screenshots 3, 4, 5, the local images, 0.6x to 1.5x and a 0.62x to 0.92x fine sweep): 3 variants

| variant | label | main | branch | 1x | judgement |
|---|---|---|---|---|---|
| screenshot 5 (and its identical copy tim-image-5), 0.85x c12-2 | "595.07" | 3.18 (`#3B4370` on `#858DF1`) | 2.69 (`#434B7F` on `#838BEC`) | 3.22 | Real text on its own background, but the ink is lighter than the real ink (half-covered), 0.5 lower. Further from the real value. The box-to-pair map in the harness makes the "24.69% 63.33kWh" box show the same pair, so I cannot say which box lowered it. |
| screenshot 5, 0.92x c5-0 | "595.07" / "kWh GRID" / "GRID" (one shared pair) | 2.64 (`#464E85` on `#858DF2`) | 2.26 (`#4F578F` on `#848CF0`) | 3.22 for 595.07; 2.42 for the GRID pill | Real lavender-card text, ink lighter. Further from 595.07's value (0.96 against 0.58), closer to the pill's value. Mixed. |
| screenshot 5, 0.92x c12-2 and c5-0 | "1.05 800.39" | 2.58 and 2.52 | 2.42 and 2.42 | 2.57 | Real dark ink on teal, 0.10 to 0.16 lower. Marginal. |

None of these are non-text pairs and none is below 1.6. All are real text read from a partly covered stroke, and they sit in the same AA fail bucket as main (AAA fail too). The 595.07 reading would cross the 3:1 large-text line if the app treats that box as large text (3.18 passes, 2.69 fails). I did not check how the app classes the box.

I did not find these in my own resampler's variants, so they depend on the exact pixels. They are real, small, and the same family as the "half-covered stroke" lowering in my first report, much reduced: from 102 lower rows to 3 variants.

### Lower-than-main readings that are real text (not worse)

- 24.69% faint box, 13 variants in my sets (0.78x, 0.85x, 0.9x): 1.64 to 1.72, navy `#30376A` to `#33396D` on `#4E52B3` to `#4F52B5`, real text. Main's 2.6 to 2.8 was a non-text pair.
- "MWh kWh" yellow on green (`#E9DF70` on `#657768`, 3.3 to 3.5) at 0.65x to 0.9x: the branch no longer reports it, in 10 variants. That pair is the yellow-to-green ribbon between the SOLAR and BATTERY cards (non-text). The branch reports the real dark text on teal (2.41 to 2.55, 1x 2.57) instead. Closer to the real value.
- kwh_grid 2x to 2.75x: non-text ribbon 1.70 to 1.77 becomes real "kWh GRID" text 2.73 to 2.89 (1x 2.86). Higher, closer.
- No lower row in any variant at 1x to 3x, and none on screenshots 3 and 4.

### Higher or dropped readings

- 24.69% gap pair dropped, not replaced (3 variants in my set: the 0.75x c12-2 and c5-0 gap pairs; I treat them as removal of a non-text pair).
- "GRID" pill pair at 0.85x c9-4 (2.45) merges into the branch's "GRID, 24.69%" pair (2.42). Real text, both.

## Gates

- `npm test` on the branch: 12 test files, 327 tests pass. Main (848a225): 11 files, 197 tests pass. The test count rose by 130. No decrease.
- `npm run lint` (html, css, js): clean.
- `npm run build`: passes (existing chunk-size warning only).
- `gh pr checks 80` on a43f58c: Pa11y and axe at WCAG 2.2 AAA, Playwright tests, build, dependency-review, lint, semgrep, trivy all pass.
- No HTML, CSS, template or UI change in the diff. No new axe, Pa11y or screen-reader surface and no visual pass beyond the OCR runs. No specialist dispatch recommended. No Tad or Simon draft, so no citation check.
- The new `contrast.realboxes.test.js` (115 real boxes from committed images, plus 8 faint-text cases per Sean) is the test my first report asked for.

## What is in the PR diff

`gh pr view 80` lists 8 files:

| file | change |
|---|---|
| `.claude/work/020-iccc-swatch-multi-region-boxes/sean-notes.md` | notes |
| `src/core/__fixtures__/box-sweep.js` | helper |
| `src/core/__fixtures__/energy_card_gap.png` | **new image**, 47,514 bytes, sha256 `b791438b...383db`. Added in the first PR commit (3379693), not by the rework commits |
| `src/core/__fixtures__/real-ocr-boxes.json` | new data file (box coordinates) |
| `src/core/contrast.js` | logic |
| `src/core/contrast.realboxes.test.js` | new test; reads the work-folder `images/tim-full-screenshot-5.png`, `kwh_grid.png`, `kwh_grid2.png` and the JSON |
| `src/core/contrast.sweep.test.js`, `src/core/contrast.test.js` | tests |

- Sean's "no image, one JSON file, and a test reading the committed screenshot" is right for the two rework commits (a074c20, a43f58c), but the PR as a whole does add one image, `energy_card_gap.png`, a 540 x 85 crop. It is a fixture crop; its hash matches none of the seven local images, so it is not a copy of one.
- `tim-full-screenshot-5.png` is already tracked on main (848a225), so the test reading it adds no file. Its hash is the same as local tim-image-5, which is Tim's work-folder screenshot, not a new disclosure.
- No local image from `/Users/timdixon/Code/local-test-images/` is in the diff or in any repository. The diff has no mention of the local folder or `tim-image-N` names (grep count 0). I did not copy any local image into a repository or worktree, and I did not write about them in GitHub text. The scaled copies I used are in the scratchpad only, and the harness reads them in place.

## Claims check against Sean's comment

| claim | what I found |
|---|---|
| zero boxes worse than main on 2,481 real-OCR boxes and 3,525 fixture boxes | Not re-run on his data. On mine: browser 1 negligible row of 1,657 (0.06); harness 3 variants with a lighter-ink reading (up to 0.5 lower) at 0.85x to 0.92x in about 2,800 boxes. Holds for his pixels, not for every pixel variant. |
| 24.69% / 63.33 kWh fixed in 9 of 43 sub-1x variants | 8 fixed (plus 1 already read correctly by main) in 48 sub-1x variants. Consistent. |
| 8 more report the neighbouring pill text | 7 in mine. Consistent. |
| 26 unchanged because the OCR box sits below the faint text | 26 unchanged, exactly. I did not independently confirm the box position for all 26; in the harness run at 0.8x c0-0 the same box reads the GRID pill (2.30), so the outcome depends on the pixels. |

## Housekeeping

Created worktree `carol-p80` (detached at a43f58c, `node_modules` symlink). No source edited, nothing merged, no branch deleted or created. `main-probe` is unchanged (rebuilt only).

## Recommendation to Sonja

Ready for the merge gate on test grounds, with these notes for Tim to weigh. The earlier regressions are gone and the fix still works where it applies. Say plainly to Tim: the 24.69% box is fixed in only about 8 of 48 reduced-scale variants (0.78x to 0.9x); the kWh GRID ribbon fix now applies at 2x and above only; and a few reduced-scale readings (0.85x to 0.92x) can still be up to 0.5 lower than main because of partly covered strokes. If Tim wants zero lower readings on every pixel variant, send the 595.07 and "1.05 800.39" 0.85x to 0.92x cases back to Sean. Those variants are reproducible with the probe harness (`--scales 0.85,0.92 --crops 12-2,5-0` on the work-folder screenshot 5).

<!-- TASK -->
- [ ] Optional: look at "595.07" (0.85x c12-2) and "1.05 800.39" (0.92x c5-0, c12-2) readings that the branch lowers by 0.1 to 0.5 against main in probe-harness variants, and add them to the real-OCR box test `priority:low` `owner:sean` `from:carol-pr80-retest`
<!-- /TASK -->
