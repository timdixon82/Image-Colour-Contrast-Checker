# Jacob review: 020 multi-region OCR boxes

I could not execute code in this dispatch. The failure causes below come from reading `src/core/contrast.js`, `analyse.js` and the two images. Treat them as strong hypotheses and confirm with step 0.

## BLUF

Add a segmentation stage in front of the existing strip logic. The strip logic cannot be fixed by tuning `isTextLike` alone. Its structure is the problem.

1. Split the box into horizontal segments wherever the local background changes by a hard step.
2. Inside each segment, drop isolated non-text marks (chevron, arrow) by size and isolation.
3. Run the existing `worstStripContrast` on each remaining segment, clipped to that segment.
4. Report the lowest result across segments.

This stays in `src/core/contrast.js` and keeps `analyse.js` untouched. `analyseImage` still calls one function per box.

## Why each case still fails

Shared mechanism. `worstStripContrast` evaluates ~`0.6h` wide strips independently and returns the minimum over strips that pass `isTextLike`. Two weaknesses follow:

- A strip that straddles a background boundary has three colours (A, B, ink) but `kmeans2` only has two centres. Ink merges into one background, so the "pair" becomes A versus B, or A versus a boundary sliver. `isTextLike` can accept it, because a boundary plus a rounded corner or gradient gives crossings on both axes, one solid colour, and a full-height run.
- `measureRegion` expands every strip by 2 px (`x-2 .. x+w+2`). At a boundary this pulls the neighbouring background into the strip even when the strip itself is clean.
- The result is a minimum over strips, so one false accept wins. The 019 rules reduced false accepts but a single one still wins.

Case 1 (`tim-screenshot-3.png`, buttons, h about 33 px, w about 360 px, about 20 strips):
- The grey chevron is a thin, one-colour stroke with a vertical run of about 0.4h. It satisfies every `isTextLike` rule (crossings both axes, no core, MIN_RUN met). Grey on a dark button is also the lowest-contrast thing in the box, so it wins as the "minimum". This is a shape rule that cannot tell icon from glyph.
- The strips over the gap between the two buttons mix button, page background and button. Boundary plus rounded corners can pass, giving background A versus background B.
- The down-arrow is bright, so it is unlikely to win. It is still worth filtering for consistency.

Case 2 (`tim-screenshot-4.png`, h about 26 px, w about 540 px, aspect about 20:1, about 36 strips):
- The box spans the blue/purple card, the dark curve/gap, and the dark panel. Strips on the card edges, the curve edge, and the card-to-panel boundary have the same three-colour problem.
- "24.69%" is dark ink on a gradient. The 019 steep-ramp bold-text flip risk lives here: the minority cluster can be the ramp, not the glyph.
- "63.33 kWh" is genuinely faint (the 019 fixture floor is 1.62). That is real and must stay reportable. Tim's complaint is the pair shown, not that it fails.

## Algorithm

Step 0 (diagnostic, before coding): for both crops, dump per-strip `{x, contrast, fgHex, bgHex, textLike}`. Confirm the winning strip is a boundary strip (case 2, gap in case 1) or the chevron strip (case 1). If it differs, revise before building.

Step 1, background profile. For each column of the box, take the per-channel median over the rows. This is robust to thin strokes. For bold text near 50% ink coverage use the median of only the top and bottom 25% of rows. Work on RGB, not luminance, so a hue-only change still counts.

Step 2, split. Compare the mean of 4 columns on the left against 4 columns on the right at every x. Call it a hard step when the RGB distance is at least 24 (0..255 scale) and the profile stays on the new side for at least 4 columns. Take the local maximum as the split, and ignore slow ramps (a gradient changes less than 24 over 8 px). Merge any segment narrower than `1.5h` into its nearer neighbour so a glyph is never cut. Cap at 6 segments.

Step 3, clip. Add an optional clip rectangle to `measureRegion`. Segment strips use a 2 px inset from each internal split and keep the existing outward 2 px only at the box's outer edges. This stops the neighbour background re-entering through the anti-alias margin.

Step 4, icon filter per segment. Label ink with the same hysteresis labels `isTextLike` already makes, then do 4-connected labelling (pure array code, no DOM). Drop a component as an icon only when all of these hold:
- its height is under `0.5` of the tallest component in the segment;
- its width is at least `0.25h`, which excludes dots, commas and full stops;
- its nearest neighbour is at least `0.5h` away, which excludes hyphens and "..." inside words.
If the segment has no component with height at least `0.5h`, or fewer than the minimum ink, treat the segment as non-text and skip it. Ink that is removed is masked back to the background before strip scoring.

Step 5, choose. Run `worstStripContrast` per surviving segment, clipped. Take the lowest `contrast` across segments. Do not average, and do not prefer high-contrast segments.

Step 6, never hide failures:
- If no segment yields a result, fall back to the current whole-box behaviour (`worstStripContrast` unchanged), exactly as today.
- If a segment is skipped as non-text but its own best result is below the chosen result, record it internally (`skippedLowerCount`). Do not change `RegionResult`; expose it only through a debug return or a test hook, and surface it to Sonja as "ambiguous".

## Thresholds to try (tune on the fixtures, log results)

| Parameter | Start | Range |
|---|---|---|
| Step distance (RGB) | 24 | 16 to 40 |
| Step persistence (columns) | 4 | 3 to 6 |
| Min segment width | 1.5h | 1h to 2h |
| Icon height ratio | 0.5 | 0.4 to 0.6 |
| Icon min width | 0.25h | 0.2h to 0.4h |
| Icon isolation gap | 0.5h | 0.25h to 0.7h |
| Segment cap | 6 | 4 to 8 |

Case 1 note: the chevron is about 0.42h and the digits about 0.67h, so a ratio near 0.5 is tight. If it sits on the edge, use the ratio against the median component height rather than the tallest.

## Layering and 019 compatibility

- All code stays in `src/core/contrast.js` with plain typed arrays. No DOM, no imports from `render/ui/export/adapters`. Meets the core rule.
- `schema.js` untouched. `RegionResult` shape unchanged. `main.js` and `analyse.js` unchanged. If the file grows too much, move segmentation into a new `src/core/segment.js` that `contrast.js` imports, rather than into `analyse.js`.
- Version bump in `package.json` for the behaviour change.
- 019 safety: a box with a single background produces zero splits and no icon drops, so it takes exactly the old path. The fixtures mwh762 (teal and purple panels), kwh_grid, kwh_grid2 and mwh_kwh are the ones at risk, because they do contain panels. Their floors in `contrast.real.test.js` (2.3, 2.5, 2.9, 3.0) are lower bounds. Splitting can only change them if a strip winner was a boundary strip, in which case a higher number is the desired change. A drop below a floor means the splitter removed real text: stop and look.
- pct2469 floor is 1.62 and the test also requires one colour to have luminance below 0.1. That is the same box as case 2 in spirit. The expected winner after the fix is "63.33 kWh" at about 1.6 to 1.7, so keep the floor. Do not raise it above the measured value of the real faint text.
- Known 019 risk, the steep-ramp bold-text flip: segmentation does not fix it and can make it appear on narrower segments. Test it; do not claim it solved.

## Risks

1. A false split inside real text on a patterned background (such as a photo) fragments a word. Mitigation: the persistence and minimum-width merge rules.
2. The icon filter removes faint real text that is short (a lone "%" or "-", a one-letter box). Mitigation: the width and isolation conditions, and the fallback to the whole-box path when nothing survives.
3. Median column profile is wrong for text filling more than half of the box height. Using top/bottom row bands mitigates this.
4. Gradient cards with a steep edge may split at the edge when no real boundary exists. Mitigation: test the pct2469 and mwh762 crops.
5. Cost: the extra passes are linear in box pixels. Boxes are small, so this is acceptable.

## Testing with real PNG crops (Sean)

Use the existing fixture pattern: `src/core/__fixtures__`, `decode-png.js`, `contrast.real.test.js`.

1. Crop each image to the OCR box, using the red outline as the extent, with a 2 px margin like `kwh_grid2` and `pct2469`. Remove the red outline from the crop or crop just inside it. A crop with the outline left in would be sampled as ink and ruin the test.
2. Case 1 crop: assert the result is not the chevron colour pair and not the page-versus-button pair. Assert the result pair is "2026" or "Lifeti..." ink against its button background, with `fgHex` near the white text colour. Record the measured contrast and set the floor from it, with a small margin. Measure first; do not guess a number.
3. Case 2 crop: assert the pair is one of the two text items against its own local background (dark text on the card, or faint light text on the panel). Assert the card-to-panel pair is never reported. State the expected winner after Step 0 measurement.
4. Both new tests must fail on main (run them before the change and record the failing output).
5. Unit tests with synthetic data for the new helpers: a split at a hard step, no split on a ramp of the same total range, a chevron-sized stroke dropped, dots and hyphens kept, a single-background box unchanged.
6. Run the full 019 set and compare numbers before and after in a table. Any floor that moves down is a red flag.
7. Carol checks the swatch in a real browser with Tim's two images plus the 019 set.

## Ambiguities to report instead of guessing

- If the chevron and the digits are close in height in the real crop, say so and show the numbers.
- If "63.33 kWh" and "24.69%" give near-equal contrast, report both; do not pick one silently.
- A grey icon could in principle be meaningful content (an icon with its own contrast requirement). WCAG non-text contrast is out of scope here; mention it to Tim as a separate question.
