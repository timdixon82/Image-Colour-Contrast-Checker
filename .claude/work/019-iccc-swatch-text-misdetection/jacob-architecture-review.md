# Architecture review: 019 swatch text misdetection

Reviewer: Jacob. Scope: `src/core/contrast.js`, `src/core/analyse.js`. No source edited.

## 1. Root cause (hypothesis confirmed, with one refinement)

- `worstStripContrast` cuts the box into strips about `0.6 * h` wide and returns the strip with the lowest contrast. It does not check that a strip contains text.
- `regionContrast` always forces a two-way k-means split. On a smooth ramp, k-means puts the centres at roughly the 25th and 75th percentile, so they differ by about half of the strip's luminance range. The "text" is just the minority half of the ramp (n0 <= n1 picks whichever half is smaller by a pixel or two).
- Check on Tim's numbers: #6983B3 is about 0.225 luminance and #6C8ABE about 0.251. The gap is about 0.026, which is above the 0.02 near-uniform guard, so it passes. The ratio is 1.09:1, which matches.
- Refinement: the 0.02 guard is not the real fault. Any threshold fails here, because a steeper ramp always separates more. The missing piece is a test that the two clusters form text-like structure rather than a monotone ramp or a single boundary.
- The "take the minimum" rule makes this worse: one text-free strip anywhere in a wide box wins over every real text strip. Gradient strips between words always have the lowest contrast.
- There are no existing tests for `contrast.js` or `analyse.js`. The only tests are `src/export/pdf.test.js` and `src/lib/pdf-ua/pdf-ua.test.js` (vitest, `npm test`). So "existing tests still pass" is no protection here. Sean must write characterisation tests first.

## 2. Recommended fix (all in `core/contrast.js`, pure, no new imports)

Add an internal helper `isTextLike(lums, rw, rh, cDark, cLight)` and use it in strip selection. Keep `regionContrast`'s public signature.

Primary test, "interleaving" on the k-means label map:
- Let `sep = cLight - cDark` and `mid = (cDark + cLight) / 2`.
- Label each pixel with hysteresis (Schmitt trigger): dark below `mid - 0.15*sep`, light above `mid + 0.15*sep`, otherwise keep the previous label in scan order. This stops JPEG noise on a ramp from creating fake transitions.
- Per row, count label changes. Do the same per column.
- A row or column is "stroke-like" if it has 2 or more changes (bg, stroke, bg). A ramp or a single hard boundary (cyan block edge) gives at most 1 change per row.
- A strip is text-like if at least 20% of its rows or at least 20% of its columns are stroke-like (starting value to tune: 0.15 to 0.30), and the minority share is at least 2%.
- A share test alone does not work, because a ramp splits about 50/50.

Alternative if the above misfires on tiny text: total-variation ratio. Divide the mean absolute sum of neighbour steps along a row by the p95-p5 range. A monotone ramp gives about 1, and a glyph gives 2 or more. Use only steps of at least 0.3*sep to ignore noise. Prefer the label-run test because it reuses the existing clustering and has fewer constants.

Selection rule in `worstStripContrast`:
1. Collect strip results, tagging each with `textLike`.
2. Take the minimum contrast over text-like strips only.
3. If no strip is text-like, fall back to the whole-box `regionContrast`, then to the legacy minimum over all strips. This fallback is deliberate: it never turns a real failure into silence. The remaining false positives are only boxes with no text at all (OCR hallucinations), which is the lesser evil.

Risk of hiding real low-contrast text (faint grey on white):
- Every threshold is relative to `sep`, so faint text is judged by its own shape, not its absolute contrast. Do not add an absolute contrast floor.
- Remaining risk: very faint text under heavy noise, where noise exceeds about 15% of `sep`. Strips may then be marked not text-like. The fallback in step 3 and the whole-box test cover this. The failure mode is "reported as before", not "dropped".
- A strip that only clips a letter edge (one change per row) will be excluded. This is acceptable because neighbouring strips on the same word are included. If all are excluded, the fallback applies.
- Do not change the 0.02 near-uniform guard or the 2 px expansion. Both affect existing results and are not causal.

## 3. Tests for Sean (new `src/core/contrast.test.js`; plain `{width, height, data: Uint8ClampedArray}` objects work as ImageData in Node)

Write in this order. Run the first group against current code to lock in behaviour, then add the failing repro.
1. Characterisation (must pass before and after): black text bars on white gives about 21:1; mid-grey #777 on white gives about 4.5:1; faint #BBB on white (about 1.9:1) still returns a FAIL-level contrast, not null; uniform fill returns null.
2. Repro (fails today): background ramp from cyan-ish to purple-ish (about 0.22 to 0.30 luminance), two text blobs (white glyph-like strokes, 2 px wide, 8 px pitch) at the left and right ends, and a roughly 60 px text-free gap. A single `worstStripContrast` call over the full width must report contrast above 2 and fg/bg colours that are not both ramp colours. Assert the fg hex is near white, not a ramp shade.
3. Gradient only, no text: `worstStripContrast` falls back and does not throw (documents the deliberate fallback).
4. Hard edge: two flat blocks with one vertical boundary and no text. Assert `isTextLike` is false for the strip on the boundary (export the helper or test via a strip that straddles it).
5. Low-contrast text on a ramp: faint strokes (about 1.5:1) on a gentle ramp. It must still fail (contrast below 3), proving real text is not hidden.
6. Noise: case 2 plus or minus 3 levels of noise per channel. Result unchanged within tolerance.
7. `analyseImage` integration: one wide OCR box over case 2 gives a single pair, and `verdict` is not driven by the gap colours.

## 4. Impact on other modules

- `analyse.js`: no change needed. It calls `worstStripContrast` and gets the same `RegionResult` shape.
- `schema.js`, `export/*`, `ui/*`, `main.js`: none. `buildColourPairs` merging is unaffected, though fewer spurious near-identical pairs will appear, so fewer entries in reports.
- If the tag is attached to `RegionResult`, keep it internal (do not add to `ColourPair`). If it is, document it in the typedef in `contrast.js`, not in `schema.js`.
- Performance: one extra pass over `rw * rh` per strip. Negligible.
- Behaviour changes, so bump `package.json` to 0.4.20 per CLAUDE.md. Update the "Current version" line in CLAUDE.md.
- Carol's regression set should include Tim's screenshot, plus at least one image with genuine faint-grey-on-white text and one with text on a photo gradient.
