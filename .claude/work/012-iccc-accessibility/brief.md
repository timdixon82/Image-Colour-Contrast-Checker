# Brief: 012-iccc-accessibility

**Status: Closed** — all three issues resolved and merged before 2026-06-08 session.

## Summary

Close the three deferred accessibility issues left by the setup build: the hidden file-input accessible name gap (ACC-ICCC-001), the `--fg-muted` contrast shortfall in light mode (ACC-ICCC-002 and ACC-ICCC-003). Both Pa11y ignore entries are removed once fixed. This is the planned accessibility phase.

## Mockup mode

D — no mockup required (CSS token and one HTML attribute).

## Scope

- ACC-ICCC-001 (D1): add `aria-label` to `#file-input` in `index.html`
- ACC-ICCC-002 (D5): darken `--fg-muted` in the light-mode `:root` block in `src/styles.css` to achieve ≥ 7:1 on `--bg` (`#f4f6f8`), on the footer background, and on the model-banner background
- ACC-ICCC-003 (D6): same token fix closes these automatically
- Remove both ignore entries from `pa11y.json` once the fixes are confirmed
- Update `docs/accessibility.md` to mark ACC-ICCC-001, ACC-ICCC-002, ACC-ICCC-003 as resolved
- Update `todo.md` to mark D1, D5, D6 as done
- Bump `package.json` version (behavioural change: accessibility conformance change)

## Out of scope

- ACC-ICCC-005 / D8: pdfmake untagged PDF — separate stream, Jacob researching options
- D2: CSS code-style Stylelint rules
- D3: actionlint verification
- Any new features or refactoring beyond the three named fixes

## Risk and rollback

Low risk. Changes are:
- One HTML attribute addition (no logic)
- One CSS custom-property value change (no layout impact)
- Two lines removed from `pa11y.json`

Rollback: revert the branch commits. The Pa11y ignore entries can be reinstated if needed.

## Definition of done

- Pa11y exits clean against `index.html` with an empty `ignore` array (both codes removed)
- Pa11y exits clean against `privacy.html`
- axe-core reports no `color-contrast-enhanced` violations on `--fg-muted` selectors in either page
- All three linters (ESLint, Stylelint, HTMLHint) exit 0
- Vite build passes
- `docs/accessibility.md` updated: ACC-ICCC-001, ACC-ICCC-002, ACC-ICCC-003 marked resolved
- `todo.md` updated: D1, D5, D6 marked done
- `package.json` version bumped
- CI all green on the pull request

## Approved GitHub actions

Pre-approved for this brief:
- [x] Create a branch — permitted to create one feature branch for this work
- [x] Commit to a branch — permitted to commit to the feature branch (not main)
- [x] Push a branch other than main — permitted to push the feature branch
- [x] Open a pull request — permitted to open one PR for this work
- [ ] Comment on a pull request or issue — not pre-approved
- [ ] Create an issue — not pre-approved

Merging to main is never pre-approved; it always pauses for Tim's express approval.
