# Brief: 016-iccc-template-sync-security

## Summary

Sync the project from team template 1.6.3 to 1.7.0 (already run — `.github/workflows/*` and `.claude/template-version` changed on the working tree, uncommitted), review the synced GitHub Actions workflows for correctness, and fix the open Dependabot alerts: 6 alerts in this repo (critical vitest, high adm-zip, high vite, medium vite/launch-editor, low esbuild, low elliptic).

Preamble fields:

- Status: `active`
- Branch: `chore/template-sync-and-security`
- Mockup mode: (not applicable — infrastructure/dependency work, no UI change)
- Priority: 1
- Blockers: None

## Requirements

No new product requirements. Source of truth: GitHub Dependabot alerts (`gh api repos/timdixon82/Image-Colour-Contrast-Checker/dependabot/alerts`) and the template sync diff already produced by `scripts/sync-from-template.sh`.

## Routing plan

Sean fixes dependencies (`npm audit fix` for the main `package.json`, plus an `overrides` entry or `chromedriver` bump for `adm-zip` in `.github/accessibility-tools`) and reviews the synced workflow YAML for correctness on a branch. Jed reviews the security-sensitive dependency changes and the workflow changes (this is a security-flagged fix, so it escalates to Jed rather than going straight to Carol, per the conformance check). Carol runs functional and accessibility tests and confirms release readiness. Sonja reviews, takes it to Tim, and merges only on his approval.

## Out of scope

- Fixing the `adm-zip`/chromedriver vulnerability in any other repository. It is present in at least 18 of Tim's repos because it comes from the shared `.github/accessibility-tools` scaffold in the team template. That is a template-level fix requiring a team-root session and `sync-all-projects.sh`; Sonja will hand Tim a ready-to-paste prompt for that separately.
- `npm audit fix --force`, which would pull in breaking major-version changes. Only the non-force fix is in scope.
- Any UI or product feature change.
- Upgrading Node/CI runner versions beyond what the template sync already specifies.

## Risk and rollback

Risk: an automated dependency bump could change build output or break a workflow step (e.g. a Vite major-version behaviour change) without being caught by CI.

Rollback: the change is confined to a feature branch (`chore/template-sync-and-security`) and only reaches `main` via PR and Tim's explicit merge approval; reverting the merge commit fully restores the prior state.

## Definition of done

- [ ] `.github/workflows/*` match the synced 1.7.0 template versions and pass CI on the branch
- [ ] `.claude/template-version` reads 1.7.0
- [ ] `npm audit` on the root project reports 0 critical and 0 high vulnerabilities
- [ ] The `adm-zip` alert in `.github/accessibility-tools/package-lock.json` is resolved (via override or dependency bump) for this repo
- [ ] Jed has reviewed the dependency and workflow changes with no unresolved security findings
- [ ] Carol's functional and accessibility passes are green and release-readiness is confirmed
- [ ] Tim has approved the merge to main

## Approved GitHub actions

- [x] Create a branch
- [x] Commit to a branch
- [x] Push a branch other than the main branch
- [x] Open a pull request
- [x] Comment on a pull request or an issue
- [x] Create an issue

## Not pre-approved

- Merging to the main branch. This always needs Tim's express approval at the time.
- Publishing to a blog or a social media account.

## Never allowed

The hard deny-list from `CLAUDE.md`. These are refused outright, whatever a brief says: force-push, branch deletion, history rewrite, repository deletion, repository visibility change, branch-protection edits, collaborator changes, release deletion, and disabling secret or code scanning.
