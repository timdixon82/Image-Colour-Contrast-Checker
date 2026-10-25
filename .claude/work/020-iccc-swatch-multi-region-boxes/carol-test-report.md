# Carol test report: 020 swatch multi-region boxes (PR 75)

Verdict: **FAIL** (do not merge as is)

The branch fixes the failure Tim reported for case 2, and it fixes one case-1 failure that I could reproduce on main. But in the real app it also makes the pair worse than main on the 019 regression images. In 9 variants it reports two backgrounds with no text in them, which is the failure Tim reported. In 4 more it hides lower-contrast real text. Unit tests, lint, build and axe are all green. The unit tests do not catch these because they use one fixed box per fixture, and the real OCR box moves by a few pixels.

## Method

- Main (0.6.0, origin/main e27d51e) and branch (7cebdf0) were built in separate worktrees under `.claude/worktrees/` (`main-060`, `swatch-multi`). Both were served by a plain static Node server. The service worker and cross-origin isolation were active, and I confirmed `crossOriginIsolated` is true.
- A real Chrome, driven from Playwright, uploaded each PNG through `#file-input`. The pair was read from the report row (swatch text, examples, and the WCAG AA value in the detail panel). The pipeline is the real PaddleOCR one.
- I tested three sets:
  - Set A, 32 images: Tim's two images (with the red outline) and the 019 fixtures, at 1x/2x (and 3x for Tim's images and the btn/pct crops).
  - Set B, 64 images: the outline-free full screenshots (`btn2026_full`, `pct2469b_full`) at 8 scales (0.6 to 4, bilinear) times 4 crop offsets. This is my proxy for "the original was a larger or differently cropped screenshot", because the OCR box moves.
  - Set C, 162 images: every 019 and 020 fixture crop at 6 scales times 3 crop offsets.
- Scratch scripts and raw JSON results are in `/private/tmp/claude-501/-Users-timdixon-Code-Github-Image-Colour-Contrast-Checker/a3aa06bc-59ce-4f35-9ca0-069af5a6c215/scratchpad/`. The key files are `res-mainsweep2.json`, `res-branchsweep2.json` and `sweep2.txt`.

## Tim's case 1 (buttons, "2026 > Lifeti... v")

- On main, the real app never reported the chevron, arrow or a button-versus-page pair on any of the 6 variants in Set A (outline and no outline, 1x/2x/3x).
- It also reported the right pair on 31 of the 32 Set B variants. Typical result: "2026 Lifet..." white on dark grey, ratio 7 to 9. This agrees with Sean's finding that it is not reproducible.
- With Tim's outline left on (`tim3`), the background reads `#624045`/`#5D3F44`, which is red-tinted by the outline. Main and branch give the same pair, 7.89, 8.24 and 8.18 at 1x/2x/3x. This is an artefact of the outline, not the pair logic.
- **I did reproduce it once on main.** `btn2026_full` at 2.5x with 5 px cropped off the left (`btn2026_k2.5_c5-0`, Set C) gives `#828387` on `#2F3239` at 3.39. That is the grey chevron against the gap or button, which is not text. The branch gives `#F0F0F1` on `#47494F` at 7.90, which is the real text. So the branch does fix a real case-1 failure, but it is rare: 1 of about 100 variants.

## Tim's case 2 (cards, "24.69%" and "63.33 kWh")

- Real text on its own background is white-ish dark navy `#303769` on indigo `#4E52B3`, at about 1.70. The "63.33 kWh" text really is that faint (I sampled it: `#262F51` on `#4F53B7`).
- On main, 5 of the 32 Set B variants report a ribbon edge against the dark gap, which is Tim's failure:

| variant | main (fg on bg, ratio) | branch (fg on bg, ratio) |
|---|---|---|
| pct k0.6 c0-6 | `#475574` on `#3A3D48`, 1.45 | `#343A71` on `#4E51B2`, 1.58 |
| pct k0.8 c0-6 | `#495778` on `#3A3D48`, 1.50 | `#32396D` on `#4E52B3`, 1.64 |
| pct k1.5 c0-0 | `#515983` on `#383B46`, 1.65 | `#30376A` on `#4E52B3`, 1.69 |
| pct k1.5 c9-0 | `#4B5A7C` on `#3A3D48`, 1.57 | `#303769` on `#4E52B4`, 1.70 |
| pct k2.5 c9-0 | `#4C5B7C` on `#3A3D48`, 1.59 | `#303769` on `#4E51B2`, 1.68 |

- The branch fixes all five. In the other 27 variants the two builds are identical and correct.
- Tim's original at 1x (`tim4`, outline on) only finds "24.69%": `#684168` on `#858DF0`, 2.78, identical on both builds. The foreground is contaminated by the red outline, and the 63.33 text is not found at that size. At 3x it reads "24.69% 63.33KW" at 1.70, which is correct on both builds.

## Cases where the branch is worse than main

All are 019 fixture crops, run through the real OCR in Set C. In each row, "main" is the real text and "branch" is what the branch reports.

| variant | main | branch | judgement |
|---|---|---|---|
| mwh762 k1 c0-3 | `#3D356C` on `#8B55DD` 2.31 ("MWh" navy on purple) | `#7EDDDB` on `#6A74AF` 2.80 | **branch wrong**: cyan card colour against ribbon, no text in the pair |
| mwh762 k1.25 c0-3, k1.5 c0-3, k2.5 c0-0, k2.5 c0-3 | 2.15 to 2.21 real text | the same cyan on `#6A74AF`, 2.80 to 2.82 | **branch wrong**, same failure |
| mwh_kwh k1.25 c0-0, k1.25 c5-0, k1.5 c5-0, k1 c5-0 | `#344A5C` on `#588A8E` 2.39 to 2.53 (real text) | `#E7DD70` on `#70846C` 2.88 to 2.90 | **branch wrong**: yellow card against ribbon green, no text |
| batte154 k2 c0-0, k2 c0-3, k2.5 c0-0 | "1.54" navy on purple, 2.40 to 2.42 | `#516A7E` on `#B0DEED` 3.91 (and 3.38, 3.69) | branch hides the real lowest-contrast text: reports BATTE... on its pill, 1.5 higher |
| batte154 (Set A, 2x) | 2.42 | 3.91 | same as above |
| kwh_grid k1 c0-0 and Set A 1x | "kWh" `#3F4777` on `#838AEC` 2.86 | GRID `#444B6F` on `#AAAFEF` 4.06 | branch hides the real lower-contrast "kWh" text |
| kwh_grid2 (6 variants) | GRID 3.45 to 3.66 | GRID 3.73 to 4.00 | minor (+0.1 to +0.4); the pair is still text on its own pill; I cannot tell which strip is more accurate |
| pct2469 k1.25/1.5/2 c0-3, pct2469b k2 c0-3 | 2.67 to 3.08 | 2.94 to 3.26 | minor (+0.2 to +0.3), same text and background |

The first two rows (mwh762 and mwh_kwh, 9 variants of 18 for those fixtures) are the serious ones. They report a swatch built from two background colours, the same symptom Tim reported, and they hide a real 2.2 to 2.5 pair. This is a new failure that main did not have. The batte154 and kwh_grid rows (4 variants) hide real low-contrast text, which breaks the brief's "do not hide real low-contrast text".

Totals for Set C, 162 variants: identical 138, branch changed 24. Of those, 9 are non-text pairs (new failure), 4 hide real text, and 11 are minor increases.

## Not fixed on either build

- `kwh_grid` at 2x, `kwh_grid.png` (Set A): main and branch both report the ribbon `#5C5994` on `#393C48`, 1.73. That is non-text on both, and it is the same family as Tim's failure.

## Likely cause (for Sean)

`continuesLine` drops a text-like strip when its neighbours have the same pair, or a swapped pair. On bold digits and heavy letters, a genuine text strip next to partial-glyph strips with the same colours gets dropped. Then the pair comes from the strips that are left, which can be boundary strips between two backgrounds (card colour against ribbon). Sean's notes already list "the rule can drop a real text strip whose neighbours are same-pair partial glyphs"; it is not harmless on mwh762 and mwh_kwh when the box is shifted. Sean's 144-box grid check measured raw "got lower" cases, but that does not catch a pair that moved to a different, non-text pair with a higher ratio. The check needs to test what the pair is made of, not just whether the ratio went down.

## Function and accessibility (branch)

- `npm test`: 9 files, 167 tests passed (main: 8 files, 159). No test count drop.
- `npm run lint`: html, css and js pass.
- `npm run build`: passes.
- axe-core (wcag2a, aa, 2.1, 2.2 aa, aaa and best-practice) on the report page with a row expanded, in all four themes (light, dark, muted-light, muted-dark): no violations, on main and on branch. One transient dark-theme `color-contrast` hit appeared when I ran axe 300 ms after switching theme, while the CSS transition was mid-way; it did not reappear after settling, on either build.
- No UI change in the diff. I did not run VoiceOver, JAWS or NVDA, since there is nothing new for them to test.
- The browser console shows a CSP error from a `data:` WASM fetch followed by a fallback to the ort wasm files and a working OCR run. That appears on both builds and is not in this diff.

## Recommendation to Sonja

Return to Sean for rework. Minimum ask:

1. Add tests that fail on this branch: mwh762 and mwh_kwh with the top trimmed by 3 px, and batte154 at 2x, asserting the pair contains dark text on its own background and is at or below main's ratio.
2. Make the strip rule not drop real text strips (or fall back to main's choice) so that the 019 results match main in these variants. Keep the five pct2469b fixes and the btn2026 k2.5 c5-0 fix.
3. Re-test with a multi-offset sweep, not a single box. My sweep scripts above can be reused.

Ambiguity for Tim, not blocking: a grey chevron may itself need 3:1 non-text contrast (WCAG 1.4.11). Sean noted this already.

No architecture or accessibility blockers. Citation checks do not apply (no Tad or Simon draft).

<!-- TASK -->
- [ ] Rework strip rule in worstStripContrast: branch reports non-text pairs on mwh762 and mwh_kwh when box is shifted, and hides real text on batte154 2x and kwh_grid 1x; add shifted-box regression tests `priority:high` `owner:sean` `from:carol-020-swatch`
<!-- /TASK -->
<!-- TASK -->
- [ ] Investigate kwh_grid at 2x: both main and branch report ribbon pair 1.73 as non-text `priority:medium` `owner:sean` `from:carol-020-swatch`
<!-- /TASK -->
