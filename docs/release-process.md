# Release Process: Image Colour Contrast Checker

This page covers branching, pull requests, and the merge gate for ICCC. The global wiki at `docs/release-process.md` in the team root holds the team's full release procedure, including the release-please workflow and the semantic-version convention. This page records only ICCC-specific notes and the current state of the release process.

## Branching model

ICCC follows the team's standard branching model:

- `main` is the production branch. Every push to `main` triggers the GitHub Pages deployment workflow (`.github/workflows/deploy.yml`) and publishes to the live site at `https://image-colour-contrast-checker.timdixon.net`.
- Feature, fix, and setup branches are created from `main` and merged back to `main` via pull request.
- Only Sonja merges to `main`, and only with Tim's express approval given at the time.

## Pull request requirements

Before a pull request can merge:

1. The build must succeed: `npm ci` then `npm run build` must complete without error.
2. All linting must pass (once linters are added; see `todo.md`).
3. All automated tests must pass (once tests are added; see `todo.md`).
4. At least one review from the team (Sonja's sign-off is required; Carol's sign-off is required for any change that touches HTML, CSS, or user-facing copy).

## Versioning

Releases follow Semantic Versioning 2.0.0 (SemVer). The current version is the `version` field in `package.json`. Every commit that changes observable behaviour must bump `package.json` version and commit `package-lock.json` in the same change.

Once release-please is added (a setup-build item in `todo.md`), the version bump moves into the release pull request that release-please opens automatically from Conventional Commits. At that point the manual bump process is superseded. See ADR 005.

## Current state of the release pipeline

The deployment pipeline is in place and working:

- `.github/workflows/deploy.yml` builds with Vite and deploys `dist/` to GitHub Pages on every push to `main`.

The following are not yet in place. They are tracked in `todo.md`:

- A lint job in the CI workflow.
- A test job in the CI workflow.
- A release-please workflow and configuration file.
- A CodeQL static analysis workflow.

Until these are added, the merge gate is manual: Sonja confirms the build succeeds and Carol confirms no accessibility regression before any pull request merges.

## Deployment

ICCC is deployed to GitHub Pages via the custom domain `image-colour-contrast-checker.timdixon.net`. Deployment is automatic on merge to `main`. There is no manual deployment step.

## Rollback

A rollback is a revert commit to `main`, opened as a pull request and merged in the normal way. The GitHub Pages deployment runs on the revert commit and restores the previous version. Force-push to `main` is on the team's hard deny-list and is never used for rollback.
