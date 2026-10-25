# 021 ICCC tooling security alerts

## Summary
GitHub reports 44 open Dependabot alerts on main (22 high, 17 moderate, 5 low; the API labels moderate as medium). 43 sit in the two CI tooling lockfiles (.github/lint-tools, .github/accessibility-tools); 1 sits in the root lockfile (elliptic, low, no patch, dev-only, not in dist). None is in code shipped to users. Plan: refresh both tooling lockfiles in one pull request, bump Pa11y to the next major to clear the extract-zip and js-yaml alerts, and dismiss the two or three alerts that have no fix. See jed-review.md.

## Out of scope
- Any change to src/, the root runtime dependencies, or the deployed site.
- Replacing Pa11y, axe, html-validate or stylelint with other tools.
- Dismissing alerts before the fix pull request merges and Dependabot re-scans.

## Risk and rollback
- Risk is CI breakage only (lint and accessibility workflows). No user-facing risk.
- Pa11y 10 needs Node 22.13+ and moves to Puppeteer 25 (new Chrome): scan results could shift.
- Rollback: revert the pull request; lockfiles are the only files changed.

## Definition of done
- Lockfiles regenerated with npm in each tooling folder; npm audit for each folder shows only the agreed residual alerts.
- Lint and Accessibility workflows green on the pull request, with the same pass/fail verdict as on main.
- Remaining no-fix alerts dismissed with a recorded reason (Tim approves; logged in the wiki exceptions folder if the wiki is in use).
- Open alert count re-checked after merge.
