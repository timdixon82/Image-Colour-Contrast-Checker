# Brief: 015-iccc-theme-picker-mobile

## Summary
Fix the theme picker in the header: shorten the label from "Colour theme" to "Theme", and resolve the header layout on mobile so the tagline text uses the full available width rather than wrapping prematurely. The theme selector is currently a `<select>` (introduced in v0.4.20). Build on a branch; Carol tests before any merge.

## Mockup mode
D — no mockup required.

## Out of scope
- Changes to the theme logic or token set
- Changes to other header content
- Any changes to export modules or the analysis pipeline

## Risk and rollback
Low. CSS and HTML only. Rollback: revert the branch commit.

## Definition of done
- Label reads "Theme" (not "Colour theme")
- On all viewport widths from 320 px up, the tagline text fills the available line width without premature wrapping caused by the theme picker
- Header lays out cleanly at 320 px, 375 px, 480 px, 640 px, and 1024 px
- No WCAG regressions — label remains programmatically associated with the select
- Carol signs off functional and accessibility passes
- Tim approves before merge

## GitHub actions pre-approved
- [x] Create a branch
- [x] Commit to a branch
- [x] Push a branch (not main)
- [x] Open a pull request
- [x] Comment on a pull request or issue
- [x] Create an issue

## Status: CLOSED
