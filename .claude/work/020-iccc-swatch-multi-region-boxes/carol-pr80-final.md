# Carol final re-test: PR 80 (fix/swatch-remaining-ribbons, head f44cfa6)

Verdict: **PASS WITH NOTES**

Head confirmed with `gh pr view 80`: f44cfa69b63c63c7fa562828b35c23533e659673. Main confirmed with `git fetch`: origin/main 848a225.

Every named case that Sean lists as fixed is now equal to main in real Chrome with real PaddleOCR. Every gain he lists is kept. Two things are not clean:

1. **The "595.07" trade-off is wider than the two cases Sean names, and it flips a pass to a fail.** With the resamplers lanczos3, cubic and mitchell (sharp), a fine sweep from 0.86x to 0.96x gives 9 distinct variants where the "595.07" group reads 2.73 to 2.96 on the branch against 3.09 to 3.36 on main. The real value at 1x is 3.22. Main shows AA Pass (3:1 large text). The branch shows AA Fail. Details below. This is the trade-off Sean disclosed, found at more pixel variants. My bilinear resampler produces none of them, and none at 1.14x to 1.26x.
2. The wide 24.69% box is fixed in only some reduced-scale variants (same as before).

Neither is a regression I would block on. Tim decides whether a pass-to-fail flip on one label at 0.91x to 0.93x with non-bilinear resizing is acceptable.

## Setup

- Main: worktree `main-probe` at 848a225, rebuilt.
- Branch: new detached worktree `.claude/worktrees/carol-p80f` at f44cfa6, `node_modules` symlinked to `swatch-ribbons` (identical package-lock.json, checked with cmp), rebuilt.
- Real Chrome (`/Applications/Google Chrome.app`), real PaddleOCR through `#file-input`, cross-origin isolated, each build served from its own `dist`. Each variant: Reset, upload, wait for cards, read every result row (pair hexes, AA ratio, status, example text). Main and branch received the same PNG bytes.
- Variants: bilinear (my resampler), and lanczos3, mitchell, cubic (sharp). 0 errors or timeouts in any run.
- Judging: each pair is read as text on its own local background. The reference for a label is its 1x value, where both builds agree. A branch row is "worse" when it sits further from that 1x value than main's row for the same label by more than 0.05. A "flip" is main AA Pass and the branch AA Fail for the same label.
- Scripts and raw results: `/private/tmp/claude-501/-Users-timdixon-Code-Github-Image-Colour-Contrast-Checker/a3aa06bc-59ce-4f35-9ca0-069af5a6c215/scratchpad/r2/` (`res-mainF*.json`, `res-branchF*.json`, `worseF.mjs`, `worseFin.mjs`, `worseFin2.mjs`, `diffF.mjs`, `named2.mjs`, `c2469.mjs`, `fin1-diff.txt`). The local-only images and their variants are in that scratchpad only.

## Results by set

| set | variants (each build) | identical | differ | worse than main |
|---|---|---|---|---|
| 1. 019 fixture sweep (9 fixtures, 1x to 3x, 3 crops) | 162 | 161 | 1 | 0 |
| 2a. Tim screenshots 3, 4, 5 at 0.6x to 3x, 4 crops (bilinear) | 84 | 83 | 1 | 0 |
| 2b. Extra: screenshot 5 at 0.65x to 0.9x, 6 crops; screenshots 3 and 4; kwh_grid and energy_card_gap 0.75x to 3x | 152 | 133 | 19 | 0 |
| 3a. Local images 5 to 11 (1x, crops, 0.5x, 0.75x, 1.5x) | 35 | 35 | 0 | 0 |
| 3b. Local images 5 to 11 at 0.6x, 0.8x, 2x, 3x | 27 | 27 | 0 | 0 |
| 4. New: screenshot 5 (0.6x to 3x, 9 crops), screenshots 3 and 4, kwh_grid, kwh_grid2, energy_card_gap, local images 5 to 11 (0.6x to 3x, 2 crops), each in bilinear and lanczos3 | 451 | 421 | 30 | 2 (595.07 flips) |
| 5. New: screenshot 5 fine sweep 0.86x to 0.96x and 1.14x to 1.26x, 5 crops, lanczos3, mitchell, cubic | 346 | 306 | 40 | 9 (595.07 flips; includes the 2 above, same pixels) |

Total 1,247 variants per build (about 4,600 result rows each). Screenshots 3 and 4: identical to main in every variant. Local images 5 to 11: identical to main in all 209 variants I ran (bilinear and lanczos, 0.5x to 3x, crops). Every pair they report is real text on its own background, same as main.

## Named cases (same pixels for both builds; judged as real text)

| case | main | branch | 1x | verdict |
|---|---|---|---|---|
| "595.07" 0.85x c12-2, bilinear | 3.15 | 3.15 | 3.22 | equal to main |
| "595.07" 0.85x c12-2, lanczos | 3.35 | 3.35 | 3.22 | equal to main |
| "595.07" / shared GRID 0.92x c5-0, bilinear | 2.99 | 2.99 | 3.22 | equal to main |
| same, lanczos | 3.02 | 3.02 | 3.22 | equal to main |
| "1.05 800.39" 0.92x c5-0, c12-2, bilinear | 2.60, 2.63 | 2.60, 2.63 | 2.57 | equal to main |
| "1.05 800.39" 0.92x c5-0, c12-2, lanczos | 2.69, 2.72 | 2.69, 2.72 | 2.57 | equal to main |
| "1.05 800.39" 0.8x c9-4, bilinear and lanczos | 2.47, 2.63 | 2.47, 2.63 | 2.57 | equal to main |
| "17:02" and "Energy Statistics" 1.5x c5-3, tim-image-5 and screenshot 5, bilinear / lanczos | 6.13 / 6.3 | 6.13 / 6.3 | 7.25 (Sean) | equal to main. Sean quotes 6.40 with his pixels. |
| kwh_grid "kWh GRID" 2x c0-0, bilinear | 1.76 (ribbon) | 2.89 (real text) | 2.86 | gain kept |
| same, lanczos | 1.74 | 3.03 | 2.86 | gain kept |
| kwh_grid 3x c0-3, bilinear | 1.77 | 2.82 | 2.86 | gain kept |
| kwh_grid 2.25x c5-3, 2.75x c0-0, c3-0, 2x c0-2 | 1.70 to 1.77 | 2.73 to 2.89 | 2.86 | gains kept |
| kwh_grid 3x c0-0 (bilinear, lanczos), 2.5x c0-0 | 2.72 to 3.00 | same | 2.86 | already right on main |
| 24.69% / 63.33 kWh box at 0.78x to 0.95x, e.g. 0.85x c0-0 bilinear and lanczos | 2.70 (card against gap, non-text) | 1.89 (navy on indigo, real text) | 1.65 | fixed. Branch reads 1.8 to 1.95, a little above the real 1.65 and still AA Fail. |
| same box at 0.6x, 0.7x, 0.8x c0-0 | 2.56 to 2.85 | same | 1.65 | not fixed, same as main |
| "MWh kWh" yellow on green (non-text ribbon, 3.3 to 3.65) at 0.65x to 0.95x | reported | not reported; the group reads the real dark text on teal (2.4 to 2.7, 1x 2.57) | 2.57 | fine |

24.69% box over reduced-scale variants of screenshot 5 and tim-image-5 (316 rows with that label, duplicates across sets): 25 changed from the non-text pair to the real faint text, 0 got worse, the rest unchanged or already real.

## Trade-off cases (the two Sean names)

| case | main | branch | 1x | what I see |
|---|---|---|---|---|
| "595.07" 0.93x c1-1, lanczos | 3.29 Pass | 2.87 Fail | 3.22 | reproduced. The group is now "595.07", "kWh GRID". |
| "595.07" 1.2x c11-6 | 2.99 (bilinear), 2.98 (lanczos) | same | 3.22 | not reproduced with my pixels. No change in any of the 1.14x to 1.26x variants. |

## Boxes where the branch is worse than main, and flips

All of them are the "595.07" group, which shares one pair with the neighbouring "kWh GRID" box. The branch now reads the real "kWh GRID" text (2.7 to 2.9, 1x 2.86), and the group takes the lowest strip. For the "kWh GRID" label the branch is better (main read the ribbon at about 1.9). For the "595.07" label it is worse. Real text on its own background in every case.

| variant (screenshot 5) | main | branch | 1x | flip |
|---|---|---|---|---|
| 0.93x c1-1, lanczos3 | 3.29 | 2.87 | 3.22 | Pass to Fail |
| 0.93x c5-0, lanczos3 | 3.30 | 2.86 | 3.22 | Pass to Fail |
| 0.91x c12-2, lanczos3 | 3.36 | 2.96 | 3.22 | Pass to Fail |
| 0.91x c1-1, cubic | 3.16 | 2.86 | 3.22 | Pass to Fail |
| 0.91x c12-2, cubic | 3.26 | 2.91 | 3.22 | Pass to Fail |
| 0.93x c1-1, cubic | 3.25 | 2.82 | 3.22 | Pass to Fail |
| 0.93x c5-0, cubic | 3.30 | 2.82 | 3.22 | Pass to Fail |
| 0.91x c1-1, mitchell | 3.09 | 2.79 | 3.22 | Pass to Fail |
| 0.93x c5-0, mitchell | 3.13 | 2.73 | 3.22 | Pass to Fail |

- 9 distinct variants in 797 non-1x screenshot-5 variants I ran. Scales 0.91x and 0.93x only; none at 0.86x to 0.9x, 0.92x, 0.94x to 0.96x, 1.14x to 1.26x, or in any bilinear variant. Both the flip and its cause are a pass/fail line at 3:1 for text that the app sizes as large. The AAA result is Fail in both builds.
- No other box is worse. The "1.05 mwh 1.54 mwh" box reads the white digits on the branch (6.4 to 7.6) where main read the teal house icon (5.6 to 6.0, not text). Both Pass. Higher and the icon is not text, so not worse. My automatic script lists these 13 rows as "worse" only because the 1x reference is the icon reading.
- No flip from Fail to Pass was needed to be flagged as a problem: the branch's other changes (24.69% non-text pair 2.7 to real faint 1.9, kWh GRID ribbon 1.7 to real 2.8) stay AA Fail, AA Fail with ratio nearer the real text.
- Base sets (1 to 3b, 450 variants): 0 worse, 0 flips.

## Gates

- `npm test` on f44cfa6: 12 test files, 343 tests pass. Main (848a225) has 197 tests (from my last run). No decrease.
- `npm run lint` (css and js): clean.
- `npm run build`: passes, existing chunk-size warning only.
- `gh pr checks 80`: Pa11y and axe at WCAG 2.2 AAA, Playwright tests, build, dependency-review, lint, semgrep, trivy: all pass. The run I spot-checked is on head f44cfa6.
- No HTML, CSS, template or UI change in the diff. No new axe, Pa11y or screen-reader surface. No specialist dispatch needed. No Tad or Simon draft, so no citation check. Test coverage: no new interactive UI surface.

## Files in the PR diff (8)

| file | status |
|---|---|
| `.claude/work/020-iccc-swatch-multi-region-boxes/sean-notes.md` | modified (notes) |
| `src/core/__fixtures__/box-sweep.js` | modified (helper) |
| `src/core/__fixtures__/energy_card_gap.png` | **added**, 47,514 bytes, sha256 starts b791438b, a 540 x 85 crop |
| `src/core/__fixtures__/real-ocr-boxes.json` | **added**, data file (box coordinates) |
| `src/core/contrast.js` | modified (logic) |
| `src/core/contrast.realboxes.test.js` | added (test) |
| `src/core/contrast.sweep.test.js` | modified (test) |
| `src/core/contrast.test.js` | modified (test) |

No image or data file other than `energy_card_gap.png` and `real-ocr-boxes.json` is added. `energy_card_gap.png` is the same file I reported earlier (hash unchanged, added in the first PR commit). No local image from `/Users/timdixon/Code/local-test-images/` is in the diff; a grep of the full diff for "tim-image" and "local-test" returns 0 lines. I did not copy any local image into a repository or write about them in GitHub text. My scaled copies are in the scratchpad only.

## Housekeeping

Created one new detached worktree, `carol-p80f` (f44cfa6). `main-probe` rebuilt only. No source edited, nothing merged, no branch created or deleted. The earlier worktree `carol-p80` (a43f58c) is untouched and can be removed by Sonja or Tim.

## Recommendation to Sonja

Ready for the merge gate on test grounds, with these notes for Tim:
- Say plainly: at 0.91x and 0.93x with lanczos, cubic or mitchell resizing, the "595.07" label can flip from AA Pass (3:1) to AA Fail (2.7 to 2.96, real 3.22). This is the trade-off Sean disclosed, and it occurs in 9 of the 797 fine variants I ran. If Tim does not accept any pass-to-fail flip, send it back to Sean with the 9 variants listed above.
- The 24.69% box is fixed only at some reduced scales (0.78x to 0.95x in my pixels).

<!-- TASK -->
- [ ] Optional: stop the "595.07" group lowering to the neighbouring "kWh GRID" real-text reading (3.3 to 2.8) at 0.91x and 0.93x with lanczos, cubic or mitchell resizing; add the 9 variants listed in carol-pr80-final.md to the real-box test `priority:low` `owner:sean` `from:carol-pr80-final`
<!-- /TASK -->
