# Carol test report: PR 80 (fix/swatch-remaining-ribbons, commit 3379693)

Verdict: **FAIL** (narrow; the 1x-and-above behaviour is good, the failures are at reduced scale and in one wide-box fixture)

I held this to the bar I used for PR 75: the branch must never create a new non-text pair and must never report real text lower than main reports it. It does both, in a small number of variants. The headline fix for the 24.69% / 63.33 kWh box works for roughly half of the 0.6x to 0.9x variants in real OCR, and not at all for the rest. The kwh_grid ribbon fix is confirmed. All CI checks and local gates pass. If Tim decides the sub-1x cases are out of scope, the remaining defects (items 1 and 2 below) are still the ones I would ask Sean to look at first.

## What is better than main (confirmed in real OCR)

- kwh_grid ribbon, 1.25x to 3x: main reports the ribbon (`#939AF1` on `#5E5D9A` 2.32 at 1.25x to 1.75x, `#5D5A95` on `#393C48` 1.73 to 1.77 at 2x and above). The branch reports the real "kWh GRID" text, `#3F4778` to `#444C81` on `#838BED` to `#858DF1`, 2.45 to 2.89. 14 variants improved (5 in the 162 sweep, 9 in my extra kwh_grid sweep, 1x to 2.75x), none worse at 1.5x to 3x with the crops I used.
- 24.69% / 63.33 kWh box on Tim's full screenshot, sub-1x scales 0.6 to 0.9 (46 unique variants; main reports the card-against-gap non-text pair in 39 of them):
  - 8 variants now report the real navy-on-indigo pair, 1.64 to 1.72 (0.78x c0-0, c12-2, c5-0, c9-4; 0.85x c0-0, c5-0; 0.9x c0-3, c12-2). The real 1x value is 1.65.
  - 13 variants now report a real text pair from the neighbouring "GRID" pill (`#4A5285` on `#9197EB` 2.76, or similar, 2.16 to 2.89) instead of the non-text gap pair. That is real text, but it is not the faintest text, so the true 1.6 is still missed.
  - 18 variants are unchanged and still report the non-text gap pair (`#7B80D9` on `#3E415E` 2.77 to 3.19). This includes 0.75x c0-3, c3-7, c9-4; 0.8x c0-3, c3-7, c9-4 and every 0.6x, 0.65x and 0.7x variant but one. At 0.6x, main and branch both report a text pair (2.36 to 2.56).
  - So Sean's claim that the band retry fixes 0.75x to 0.8x is only partly true with real OCR boxes. His own note records why: the retry does not run when some strips (for example "24.69%") look like text.
- At 1x and above (2x, 2.5x, 3x, Tim's three images, crops): identical to main in every variant. The energy_card_gap fixture, tested at 0.75x to 3x with 4 crops (40 variants), is identical on both builds and reports the real pair, 1.54 to 1.66. (Real OCR boxes on that tight crop never reach the gap, so it cannot reproduce case B in a browser; the unit test covers it.)

## Where the branch is worse than main

### 1. New non-text pair, lower than main's (4 variants, all on the kwh_grid fixtures)

The OCR box spans "kWh ... GRID" across the whole width, with the dark chart gap in the middle. Main reports a non-text ribbon pair at 2.3. The branch reports a dark-grey-on-dark-grey pair at 1.3 to 1.4. Neither is the text (real text is about 2.86), but the branch's number is lower and further away.

| variant | main | branch |
|---|---|---|
| kwh_grid2_k3_c0-0 (162 sweep) | `#9399F0` on `#5C5B97` 2.37 | `#424F64` on `#363A45` 1.37 |
| kwh_grid_k0.75_c0-0 | `#939AF1` on `#5E5D9B` 2.31 | `#434E65` on `#373B45` 1.34 |
| kwh_grid_k0.75_c3-0 | `#939AF1` on `#5E5D9B` 2.31 | `#434E65` on `#373A45` 1.36 |
| kwh_grid_k1.25_c3-0 | `#939AF1` on `#5E5D9A` 2.32 | `#445068` on `#373A45` 1.40 |

I scanned every branch row below 1.45 that main does not report, across all five sets: these four are the only ones. They look like the band retry reaching the dark gap (the same family it was added to fix). Sean's fixture sweeps did not catch them because they use fixture boxes, not real OCR boxes.

### 2. Real text reported lower because a real text strip is dropped (3 variants on the fixtures, plus the energy screenshot below)

- kwh_grid2_k3_c0-3, "GRID": main `#41496D` on `#A2A8EC` 3.90, branch `#656C9B` on `#A4AAED` 2.29. The 1x value is 3.51. The branch ink is a half-covered anti-aliased mix, not the real ink colour. This is an artefact, and the branch hides the real value.
- kwh_grid2_k3_c5-0, "GRID": main 3.92, branch 3.68 (closer to the 1x value 3.51, so neutral to better).

### 3. Lower values on text rows of the energy screenshot at 0.65x to 0.9x

How I judged "is the lower value the real text contrast": I took the same label at 1x, where both builds give the same value, and compared which build is closer. At sub-1x the reference is approximate, because down-scaling does soften thin strokes. I also compared the ink colour: the branch's lower value usually comes from a lighter ink than the real one, which means a half-covered stroke, not the real ink.

Over 152 extra variants (Tim's full screenshot at 0.65x to 0.9x, 6 crops each, plus others) there are 102 text rows where the branch is lower than main with the same label. With a 1x reference available for 88 of them:

- main closer to the 1x value: 66
- branch closer: 22
- no reference: 14

Largest and most consistent:

| label | 1x value | main at 0.65x to 0.9x | branch |
|---|---|---|---|
| "43.69%" (olive on yellow) | 5.33 | 4.5 to 6.4 | 3.7 to 4.9 (for example 0.75x c12-2: main 6.18, branch 3.68) |
| "kWh / 31.62%" | 4.16 | 3.98 to 4.50 | 2.88 to 4.16 (0.78x c0-3: 4.09 to 2.88) |
| "1.05 800.39 MWh kWh" | 2.57 | 2.3 to 2.76 | 2.07 to 2.52 |
| "kWh GRID" (0.7x) | none | 2.38 to 2.42 | 1.50 to 1.53 |

For "43.69%" the branch ink is `#6D6D50`, the 1x ink is `#545649`, and main's `#595B4D` is nearer. So for these rows the lower value is not the real text contrast; it is a partial-coverage strip. At 0.75x c12-2 the branch flips "43.69%" from a pass (main 6.18, 1x 5.33) to an AA fail (3.68). It errs on the side of caution, but it is a false fail. In 22 rows the branch is closer, which shows that the change also corrects over-reports: for example "Flow" in tim-image-9 (crop 5/3), main 4.92, branch 3.94, 1x 3.84, so there the lower value is the real contrast.

I could not reproduce Sean's exact "kWh 3.13 to 2.70, MWh 5.39 to 4.79" pairs by label; the 0.8x rows above are the nearest (for example "kWh / 31.62%" 4.37 to 3.58 and "595.07" 3.39 to 3.18).

At 1x, 1.5x, 2x, 2.5x and 3x on the energy screenshots, there are zero lower rows.

## Test sets and results

Main: worktree `main-060` at e66143e (origin/main, includes PR 75). Branch: worktree `swatch-ribbons` at 3379693, rebuilt. Both `dist` folders served by a plain Node server, real Chrome (`/Applications/Google Chrome.app`), real PaddleOCR via `#file-input`, `crossOriginIsolated` true. The pair is the swatch background/foreground and the WCAG AA ratio from each report row. Scripts and raw results: scratchpad `/private/tmp/claude-501/-Users-timdixon-Code-Github-Image-Colour-Contrast-Checker/a3aa06bc-59ce-4f35-9ca0-069af5a6c215/scratchpad/` (`res-mainP80*.json`, `res-branchP80*.json`, `cmp80.mjs`, `rowcmp3.mjs`, `box24b.mjs`). No errors or timeouts in any set.

| set | variants | identical | differ |
|---|---|---|---|
| 1. 019 fixture sweep (9 fixtures, 1x to 3x, 3 crops) | 162 | 154 | 8: 5 improved (kwh_grid 1.25x to 2x), 3 worse (kwh_grid2 3x, see 1 and 2) |
| 2a. Tim images 3, 4, 5 (0.6x to 3x, 4 crops) | 84 | 80 | 4, all 0.8x on tim-full-screenshot-5: the 24.69% box moves from the non-text pair to the GRID pill text pair, with lower text rows (see 3) |
| 2b. Extra: tim-full-screenshot-5 at 0.65, 0.7, 0.75, 0.78, 0.8, 0.85, 0.9x with 6 crops; tim-screenshot-3 and 4 at 0.7, 0.75, 0.9, 1.25, 1.75x; kwh_grid and energy_card_gap at 0.75x to 3x with 4 crops | 152 | 98 | 54: see sections above. tim-screenshot-3 and 4: all identical |
| 3a. Local images 5 to 11 at 1x, crop 5/3, and scales 0.5, 0.75, 1.5 (tim-image-5: 1, 1.5, 2, 0.75) | 35 | 33 | 2: tim-image-5 at 0.75x (same family as the energy screenshot: 24.69% box 2.77 to 2.46 on the GRID pill, lower text rows, "43.69%" 6.00 to 4.49), and tim-image-9 crop 5/3 "Flow" 4.92 to 3.94 (branch is the real value) |
| 3b. Local images 6 to 11 at 0.6, 0.8, 2, 3x; tim-image-5 at 0.6, 0.8, 3x | 27 | 26 | 1: tim-image-5 at 0.8x (same as the energy screenshot at 0.8x) |

For images 6 to 11 (posters), the branch is identical to main at every scale tested (1x, crops, 0.5x to 3x). Every pair reported there is real text on its own local background, as in my PR 75 report. The only differing local images are tim-image-5 (byte-identical to Tim's work-folder full screenshot, so the same findings) and the "Flow" label.

## Gates

- `npm test` on the branch: 10 files, 182 tests passed. Main (e66143e): 10 files, 177. The count rose by 5.
- `npm run lint` (css and js): clean.
- `npm run build`: passes (only the existing chunk-size warning).
- `gh pr checks 80`: Pa11y and axe at WCAG 2.2 AAA, Playwright tests, build, dependency-review, lint, semgrep and trivy all pass.
- No UI, HTML, CSS or template change in the diff (core logic, tests, one fixture, one notes file), so no new axe, Pa11y or screen-reader surface and no visual pass beyond the OCR runs above. No specialist dispatch recommended. No Tad or Simon draft, so no citation check.
- Test gap: Sean's tests use fixture boxes. None uses a wide "kWh ... GRID" box with the gap in the middle, which is where item 1 arises.

## Images in the diff

`gh pr view 80` lists 5 files: `.claude/work/020-.../sean-notes.md`, `src/core/__fixtures__/energy_card_gap.png`, `src/core/contrast.js`, `src/core/contrast.sweep.test.js`, `src/core/contrast.test.js`. One new image: `energy_card_gap.png` (540 x 85, 47,514 bytes, sha256 `b791438ba6614fd344632033ed982c8962351fa3d1e6d13ee30c637d1d2383db`). Its hash matches none of `tim-image-5` to `tim-image-11` or the three work-folder screenshots, so it is a crop, not a copy of any whole image. No `tim-image-N` file is tracked in the repository, and the diff contains no text mentioning the local images folder. I did not copy any local image into a repository or worktree; scaled copies were written only to the scratchpad. I did not mention the local images in any GitHub text, and this report is in the work folder, not on GitHub.

## Housekeeping

`main-060` was moved from e27d51e to origin/main (e66143e), and its `node_modules` symlink pointed to the now-empty `swatch-multi/node_modules`; I repointed it to `swatch-ribbons/node_modules`. No source edited, nothing merged, no branch deleted.

## Recommendation to Sonja

Send back to Sean, not to the merge gate yet. Ask for: (1) the 4 variants where the band retry or `dropLoneLines` now reports a dark-grey-on-dark-grey pair at 1.3 to 1.4 (kwh_grid at 0.75x and 1.25x with a 3 px left trim; kwh_grid2 at 3x), with a real-OCR-style box test (wide box, gap in the middle); (2) a look at why "43.69%", "kWh / 31.62%" and "1.05 800.39" read lower at 0.65x to 0.9x (a text strip is being dropped, and the pair comes from a half-covered stroke); (3) either extend the retry to boxes with some text-like strips or say plainly to Tim that the 24.69% / 63.33 kWh box is only fixed in about half of the sub-1x variants. If Tim prefers to accept this as a net improvement, the case for that is: nothing changes at 1x to 3x on his three images except the kwh_grid improvement, and all differences are at reduced scale. That is Tim's decision to make with these numbers.

<!-- TASK -->
- [ ] Rework PR 80: no new dark-on-dark non-text pair (1.3 to 1.4) in wide kWh/GRID boxes; keep real text strips at 0.65x to 0.9x ("43.69%", "31.62%", "1.05 800.39"); add a wide-box real-OCR-shaped test `priority:high` `owner:sean` `from:carol-pr80`
<!-- /TASK -->
