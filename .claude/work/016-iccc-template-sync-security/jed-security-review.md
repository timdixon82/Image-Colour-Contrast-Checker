# Jed's security review — PR #42 (chore/template-sync-and-security)

**BLUF: Approve.** No blocking findings. One non-blocking observation about CodeQL's trigger, which is an upstream template decision (correctly and verbatim synced by Sean), not something introduced or introducible by this PR. No exceptions to record in `exceptions/`.

## Scope reviewed

PR https://github.com/timdixon82/Image-Colour-Contrast-Checker/pull/42 — template sync 1.6.3 → 1.7.0 (workflow files), `npm audit fix` at repo root, `adm-zip` override in `.github/accessibility-tools`. Reviewed the full PR diff (`gh pr diff 42`), all seven workflow files, `package.json`/`package-lock.json`, and `.github/accessibility-tools/package.json`/`package-lock.json`.

## 1. Dependency version bumps — no new exposure

- **vite 8.0.14 → 8.1.5**: resolves GHSA-fx2h-pf6j-xcff and the launch-editor advisory. 8.1.5 is the current stable release; no new advisories found for it.
- **vitest 3.2.4 → 3.2.7**: resolves the critical vitest advisory that motivated this fix. No new advisories found against 3.2.7.
- **esbuild 0.27.7 → 0.28.1** (transitive, via vite): 0.28.1 is the first esbuild release fixing two upstream advisories (GHSA-gv7w-rqvm-qjhr, GHSA-g7r4-m6w7-qqqr) and is the current non-vulnerable line. No regression.
- **adm-zip 0.5.17 → 0.6.0** (via `overrides` in `.github/accessibility-tools/package.json`): resolves GHSA-xcpc-8h2w-3j85 (high). Verified the override applies cleanly (`chromedriver` still resolves at 149.0.1) and the sub-manifest's own `npm audit` reports 0 vulnerabilities, consistent with Sean's log. All `resolved` URLs in both updated lockfiles point to `registry.npmjs.org` — no dependency confusion / non-registry source substitution.

No package version in this diff introduces a new or regressed vulnerability.

## 2. Synced GitHub Actions workflows — posture preserved, one observation

Checked all seven files (`accessibility.yml`, `ci.yml`, `codeql.yml`, `deploy.yml`, `lint.yml`, `security.yml`, `playwright.yml`) against the current team template source (`/Users/timdixon/Code/AgentTeam/templates/.github/workflows/`). Findings:

- `security.yml` (Semgrep, Trivy, dependency-review) still triggers on `pull_request` — unchanged, still gates every PR. The only change is a `concurrency` group (cancel-in-progress, correctness improvement, no weakening) and a `hashFiles('package.json') != '' || hashFiles('composer.json') != ''` guard on the `dependency-review-action` step. That guard is a project-generic addition for manifest-less static-content projects; this repo has `package.json` at the root, so the condition is always true here and the dependency-review step still runs on every PR. No weakening for this repo.
- **`codeql.yml` trigger changed from `on: pull_request` to `on: push: branches: [main]` (plus the existing weekly schedule).** This means CodeQL results for a change now land only after merge to `main` (or on the weekly run), not before merge on the PR itself — a real reduction in pre-merge SAST coverage relative to the previous template version. However: (a) this is byte-for-byte what ships in the current team template (`AgentTeam/templates/.github/workflows/codeql.yml`), i.e. Sean synced it verbatim and made no local weakening; (b) Semgrep and Trivy in `security.yml` still run pre-merge and cover a meaningful slice of the same ground; (c) this specific PR's own changes (workflow YAML, dependency bumps, JSON manifests) are not the kind of JavaScript logic changes CodeQL's `javascript` query pack would flag. This is not a defect in this PR and not a blocker, but it is a genuine, repo-wide reduction in pre-merge CodeQL coverage introduced by the upstream template, worth Tim's awareness. Recording as a follow-up rather than blocking this PR — see task below.
- All actions remain pinned to full commit SHAs with version-tag comments (`actions/checkout@de0fac2...`, `github/codeql-action/init@7211b7c...`, `actions/dependency-review-action@a1d282b...`, etc.). No SHA was swapped for a mutable tag anywhere in the diff.
- `permissions:` blocks are unchanged/minimal (`contents: read`, plus `security-events: write` and `actions: read` only on `codeql.yml`, which needs them to upload SARIF). No workflow gained broader permissions.
- `deploy.yml`'s new bundled/unbundled `rsync` logic is a genuine hardening: it replaces a deny-list exclude pattern with a fail-safe allow-list (`--include=... --exclude='*'`), so an unlisted file is no longer published by default. This repo uses the BUNDLED path (`dist/` exists from `npm run build`), so the allow-list rsync branch is dead code for this project today but is a correct, non-regressive change if the project ever lost its build script.
- `lint.yml` and `accessibility.yml` changes are archetype-detection additions (`hashFiles`/`.github/ci-archetype` gating) with no security-relevant permission or secret changes.
- `playwright.yml` is new but entirely commented out except a placeholder echo step; `permissions: contents: read`; no live steps to review yet.

No secrets, no widened permissions, no un-pinned actions, no new untrusted-input handling introduced anywhere in the workflow diff.

## 3. Leaving the six low-severity `elliptic` findings unfixed — acceptable

Traced the dependency chain: `elliptic` (6.6.1) is pulled in by `browserify-sign` and `create-ecdh`, both pulled in by `crypto-browserify`, which is a dependency of `vite-plugin-node-polyfills` (`^0.28.0`) — a **devDependency** in this project's root `package.json`, not a runtime dependency.

Confirmed this codebase does not exercise that path:
- `vite-plugin-node-polyfills` only polyfills Node built-ins that are actually imported by application code being bundled; nothing in `src/` imports `crypto`, `browserify-sign`, or `create-ecdh`.
- Grepped the built `dist/assets/*.js` output for `elliptic`, `createECDH`, `browserify-sign` — none present. The polyfill shim is not tree-shaken into the shipped bundle at all.
- This project's own `CLAUDE.md` confirms the architecture: "Everything runs client-side — no server, no uploads," and there is no authentication, signing, or key-management code anywhere in `core/`, `adapters/`, or `ui/` that would call into an elliptic-curve crypto path.

Leaving these six low-severity findings unfixed (rather than taking the `--force` breaking downgrade of `vite-plugin-node-polyfills`) is the correct risk call: the vulnerable code is dev-tooling-only, unreachable from the shipped product, and the only fix path is a breaking change out of proportion to a low-severity, non-exercised finding. No exception needs recording in the wiki `exceptions/` folder for this — it's a dependency that never reaches production, not a live risk being accepted.

## 4. General diff review

- Version bump (`package.json` 0.4.19 → 0.4.22) is present and consistent with this project's versioning convention for a security/maintenance change.
- No hand-edits to generated `package-lock.json` files beyond what `npm audit fix`/`npm install` would produce (checked: only affected packages' entries changed; no unrelated or unexplained dependency churn).
- Work-folder docs (`brief.md`, `log.md`) committed alongside are documentation only, no code/behaviour change, nothing security-relevant.
- No PII, secrets, or credentials appear anywhere in the diff (workflow YAML, package manifests, lockfiles, or work-folder docs).

## Conditions / follow-ups

None blocking. One task recorded below for Sonja/Tim's awareness (template-level, not this-PR-level).
