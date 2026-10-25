# Brief: 019-iccc-swatch-text-misdetection

## Summary

Some colour pairs are reported from areas that are not text. Tim's screenshot: the pair `#6C8ABE` on `#6983B3` (contrast 1.09:1) for the text "762.03 MWh". The two swatch colours are both from the smooth gradient behind the text, not from the text itself. Triage type: bug fix.

Preamble fields:

- Status: `active`
- Branch: `fix/swatch-text-misdetection`
- Mockup mode: not applicable
- Priority: 1
- Blockers: None

## Likely cause (Sonja's reading of the code, to be verified)

In `src/core/contrast.js`, `worstStripContrast` cuts each OCR box into strips and keeps the strip with the lowest contrast. `regionContrast` then splits each strip's luminance into two clusters (k-means) and treats the smaller cluster as text. Two weaknesses:

1. A wide box such as "762.03 MWh" spans a gap of plain gradient between the words. Strips there contain no text, but k-means still splits the gradient into two nearby shades. Because these give the lowest contrast, the "worst strip" rule picks them.
2. The near-uniform guard only rejects strips where the cluster centres differ by less than 0.02 in luminance. A gradient can exceed that.

## Requirements

- Reproduce with a test using a synthetic image (gradient background, text on one side, gap in the middle).
- Make the strip choice ignore strips without real text: for example require the two clusters to be spatially mixed (edges, not a smooth ramp), and require a plausible text-pixel share.
- Do not hide real low-contrast text: existing tests must still pass, and the fix must not turn real failures into passes.

## Routing plan

Jacob reviews the approach because it changes core analysis behaviour (architecture-sensitive, `core/` rules apply). Sean builds with tests. Carol tests with Tim's image and a regression set. Sonja reviews and takes it to Tim.

## Out of scope

- Replacing OCR engine or changing bounding-box output.
- UI changes.

## Risk and rollback

Risk: the fix hides genuine low-contrast text, or changes results for existing images. Rollback: revert the merge commit; the change is confined to `core/contrast.js` and its tests.

## Definition of done

- [ ] Failing test reproduces the bug, then passes
- [ ] Tim's image no longer reports gradient-only colours for "762.03 MWh"
- [ ] Existing tests and lint green; CI green
- [ ] Carol signs off function and accessibility
- [ ] Tim approves the merge

## Approved GitHub actions

- [x] Create a branch
- [x] Commit to a branch
- [x] Push a branch other than the main branch
- [x] Open a pull request
- [x] Comment on a pull request or an issue
- [x] Create an issue

## Not pre-approved

- Merging to the main branch. This always needs Tim's express approval at the time.
