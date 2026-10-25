# Brief: 017-iccc-vad-link-colours

## Summary

Make every "Vestibular Accessible Design Checker" link pass the pair's colours, using the format `https://vadchecker.com/tool/?txt=ffffff&bg=122222` (hex without the hash; `txt` is the text colour, `bg` is the background). Applies to the web report, the PDF export and the Markdown export. Triage type: small feature.

Preamble fields:

- Status: `active`
- Branch: `feat/vad-link-colours`
- Mockup mode: not applicable (no layout change)
- Priority: 1
- Blockers: None

## Requirements

- Replace the constant `VESTIBULAR_CHECKER_URL` in `src/export/strings.js` with a function that takes `fgHex` and `bgHex` and returns the full URL. Strip the `#`, lower-case, validate 6 hex digits.
- Use it in `src/ui/report-view.js` (`vestibularLink`), `src/export/pdf.js` (line ~408) and `src/export/markdown.js` (line ~128), passing the pair's `fgHex` and `bgHex`.
- Keep all copy in `strings.js` only. Keep the new-window announcement and accessible label.
- Add a unit test for the URL builder, bump `package.json` version.
- Tim's example ended with a stray closing bracket; treated as a typo.

## Routing plan

Sean builds on a branch. Carol tests function and accessibility. Sonja reviews and takes it to Tim. Conformance check: no architecture or security escalation needed (links only, constant values from the app's own colour sampling).

## Out of scope

- Changing the link text or the brand label (unless Tim asks).
- Any change to analysis logic.

## Risk and rollback

Risk: the target site could ignore or mishandle the parameters; a malformed hex could produce a broken link. Rollback: revert the merge commit; the change is confined to one branch and a pull request.

## Definition of done

- [ ] Web, PDF and Markdown links all carry `txt` and `bg` for their own pair
- [ ] Unit test passes; lint, build and CI green
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
