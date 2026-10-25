# Brief: 020-iccc-swatch-multi-region-boxes

## Summary

Follow-up to 019 after release 0.6.0. Tim reports "much improved", but two screen-grab cases still take the two lowest-contrast colours in the OCR box instead of the real text and its own background. Triage type: bug fix.

Preamble fields:

- Status: `active`
- Branch: `fix/swatch-multi-region-boxes`
- Mockup mode: not applicable
- Priority: 1
- Blockers: None

## The two cases (images in `images/`)

1. `tim-screenshot-3.png`: one wide OCR box (red outline) spans "2026", a grey chevron, "Lifeti..." and a down-arrow, across two dark rounded buttons with a gap between them. The box mixes two button backgrounds, the gap, and a non-text chevron and arrow.
2. `tim-screenshot-4.png`: one very wide, short OCR box spans "24.69%" on the left (dark text on a blue/purple gradient card) and "63.33 kWh" on the right (light text on a dark panel). The box mixes two different backgrounds and a gradient edge.

Common factor: a single OCR box covers several separate text items on different backgrounds. The 019 strip logic picks one strip but may still choose a strip whose clusters are background A versus background B, or a thin icon, rather than text versus its own background.

## Requirements

- Reproduce both with real PNG crops (as in 019, `src/core/__fixtures__`) and tests that fail on current main.
- Make the pair for a box come from actual text against its own local background. Consider splitting a wide box into horizontal segments at gaps and background changes, and analysing each segment, then choosing the worst genuine text segment. Ignore chevron and arrow glyphs (small, non-text marks) where possible.
- Keep all 019 tests (762.03 MWh, kWh GRID, 24.69% 63.33 kWh crops) passing. Do not hide real low-contrast text.
- Core rules apply: no DOM in `src/core`.
- Report any case where the answer is still ambiguous rather than guessing.

## Routing plan

Jacob reviews the approach (core analysis behaviour). Sean builds with tests. Carol tests in a real browser with Tim's two images plus the 019 regression set. Sonja reviews and takes it to Tim.

## Out of scope

- Changing OCR engine or bounding boxes.
- UI changes.
- Colour theme work (issue 72).

## Risk and rollback

Risk: splitting boxes hides genuine low-contrast text or changes results for existing images; the rare steep-ramp bold-text flip from 019 could worsen. Rollback: revert the merge commit; change confined to `src/core/contrast.js` and tests.

## Definition of done

- [ ] Failing tests reproduce both cases, then pass
- [ ] 019 regression set still passes
- [ ] Lint, tests, build and CI green
- [ ] Carol signs off in a real browser
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
