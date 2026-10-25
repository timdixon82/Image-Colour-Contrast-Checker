# Sean notes: 020 step 0 findings and what was built

## Step 0: crops and per-strip dump

Crops are the inside of Tim's red outline (no outline pixels), tested with the usual 2 px inset:
`btn2026.png` 360x31 (case 1), `pct2469b.png` 538x24 (case 2). `btn2026_full.png` and `pct2469b_full.png` are the whole screenshots with the outline painted over, used to try a grid of boxes around the outline (625 boxes before size limits; the OCR box is not known to the pixel).

### Jacob's hypotheses, checked

Case 1 (buttons): NOT confirmed. On main the winner is "2026" white on grey, 9.29, at every scale tried (0.5x to 2.75x) and in every box in the grid (about 600 boxes). The chevron strips (x 148, 164) score 3.58 and 3.96 but are `textLike=false`, so they never compete. The gap strips are also rejected. Case 1 does not fail on main from this screenshot. Its tests are guards.

Case 2 (cards): partly confirmed. In the crop the winner is correct: "63.33 kWh" dark navy on indigo, 1.83 (24.69% scores 3.3 to 3.9). But in 196 boxes of the grid main reports a ribbon edge over the dark gap, `#4E5E83` on `#3A3D48` (1.67 to 1.73), as the pair. The cause is not a boundary strip with three colours: it is one (sometimes two) strip over a thin shallow ribbon line that passes `isTextLike` where the line is locally steep, and 1.7 is lower than the real 1.83 so it wins the minimum. Its neighbouring strips hold the same two colours, fail `isTextLike`, and in the two-strip case have ink and background swapped.

### Decision: Jacob's segmentation was prototyped and dropped

I built the segmentation stage (column background profile, hard-step splits, mark filter). On the real crop it made things worse: the top/bottom-band median profile reads bold digits as background, giving spurious splits, and ribbon curves are tall enough to count as text-sized marks, so ribbon pairs (#363A49 on #51538F, 1.61) won in all 625 boxes. Since case 1 needs no fix and case 2 has a narrower cause, I replaced it with a strip-neighbour rule in `worstStripContrast` (`continuesLine`): a text-like strip is dropped when every coloured neighbour either fails the shape test with the same pair, or has the pair swapped. A strip with no coloured neighbour (a lone glyph) is kept. No new module, `RegionResult` unchanged.

## Numbers (box inset 2 px in the crop, main vs this branch)

| fixture | floor | main | branch |
|---|---|---|---|
| mwh762 | 2.3 | 2.33 | 2.33 |
| batte154 | 2.3 | 2.54 | 2.54 |
| mwh_kwh | 2.5 | 2.74 | 2.74 |
| kwh_grid | 2.9 | 3.01 | 3.01 |
| s105_80039 | 2.7 | 2.79 | 2.79 |
| kwh_grid2 | 3.0 | 3.22 | 3.22 |
| pct2469 | 1.62 | 1.65 | 1.65 |
| btn2026 (new) | 7 | 9.29 | 9.29 |
| pct2469b (new) | 1.7 | 1.83 | 1.83 |

Grid of 144 boxes per fixture (shifted and trimmed), main vs branch: no box got lower on any 019 fixture; 15, 6, 8, 19 and 27 got higher on batte154, kwh_grid, kwh_grid2, pct2469 and pct2469b (ribbon strips removed). On btn2026 5 of 144 boxes moved down by 0.02 to 0.17 (10.69 to 10.52) because a genuine text strip next to same-pair neighbours was dropped; the result is still white text on its own button.

## Ambiguities

- 24.69% (3.3 to 3.9) and 63.33 kWh (1.65 to 1.83) are not near-equal; the faint one is the lowest and is reported, as intended.
- Residual: the rule can drop a real text strip whose neighbours are same-pair partial glyphs (seen five times on btn2026, harmless there). If every text-like strip is dropped the code falls back to the whole box, as before.
- Not solved: a near-vertical thin line; a thin line passing the shape test on 3 or more adjacent strips with identical orientation.
- A grey chevron could be meaningful content with its own non-text contrast requirement (WCAG 1.4.11). Out of scope here; a question for Tim.

## Rework after the real-browser test (Carol, PR 75)

The first strip rule (`continuesLine` alone) fixed Tim's cases but was worse than main on the 019 fixtures in shifted or scaled boxes: it dropped genuine text strips whose neighbours were same-pair partial glyphs, so the pair came from boundary strips (card against ribbon) or from a brighter word.

New tests: `src/core/contrast.sweep.test.js` with `__fixtures__/box-sweep.js` (crop x scale x box offset, no browser). Each 019 fixture must never be worse than `worstStripContrast(..., { dropRibbonLines: false })` (the pre-020 behaviour) in any variant; Tim's two full screenshots must report real text at 8 scales x 4 crops.

Rule now: a text-like strip is dropped only if (1) at least two strips within three of it are "thin bright lines" (ink lighter than background, covering at most 25 % of the strip) with the same pair either way round, none vouched for by a real text strip (text-like, not thin bright, same orientation, not itself a line slice), and (2) `continuesLine` still holds.

Tried and rejected on the way: the same-pair rule alone (the first rule: 738 of 3240 boxes worse than main on kwh_grid2, 194 on batte154, 240 on pct2469); requiring only darker ink (misses Tim's dark-gap strips in tall boxes); counting one thin strip as enough (a pill edge next to "GRID" dropped the GRID strip, 5 boxes).

Sweep over 3240 boxes per fixture (9 fixtures), old rule vs new rule vs main, in the scratch results reported on the PR. Trade-offs: fewer ribbon fixes on the 019 set than the first rule (kwh_grid 33 to 0, mwh_kwh 6 to 0, s105 7 to 0, pct2469 31 to 20); none worse than main.
