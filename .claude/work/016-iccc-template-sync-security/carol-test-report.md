# Carol test report — 016-iccc-template-sync-security (PR #42)

**BLUF: FAIL — release not ready.** Local build/tests/functional smoke pass cleanly, but the PR is based on a stale `main` and has never run CI. Merged as-is it would revert an already-shipped CVE fix and downgrade several dependencies past their currently-released (and more recent) versions on `main`. This must be rebased before it can go further.

---

## 1. Functional pass

- Checked out `chore/template-sync-and-security` (head `395a3f3`), `npm install`, `npm run build`, `npm run test`.
- **Build**: succeeds. Only pre-existing warnings (unbundled `count.js`/`sw.js` scripts, `new URL()` dynamic-resolution notice, chunk-size warning for the ONNX/PaddleOCR bundles) — nothing new introduced by the vite/vitest/esbuild bumps.
- **Tests**: `vitest run` → 2 files, 6 tests, all pass (PDF/UA veraPDF compliance suite). Identical count to current `main` (verified in a throwaway worktree at `main` tip — also 6 tests, 2 files) — no coverage regression, and this PR adds no new interactive UI surface, so the "new surface needs a test" clause is not triggered.
- **Browser smoke test** (Playwright, headless, against `vite preview` on the built `dist/`): dropped `.playwright-mcp/test-image.png` into the dropzone. OCR pipeline ran, CVD simulation panels rendered (deuteranopia/protanopia/tritanopia/achromatopsia), report reached "Analysis complete", Download PDF / Download Markdown links appeared and were reported ready. End-to-end pipeline works on the bumped toolchain.
- Console noise during the smoke test: a CSP `connect-src` violation on a `data:` URL tied to goatcounter analytics blocking a WASM connect — this is pre-existing preview-mode/CSP behaviour unrelated to the vite/vitest/esbuild version bumps in this PR (not caused by this diff; not blocking).

## 2. Accessibility pass (lighter — no UI touched)

- `accessibility.yml` (freshly synced) reads correctly for this repo's archetype: builds with `npm ci` + `npm run build --if-present`, serves `dist/` (since `hashFiles('dist/**')` is non-empty), waits on `localhost:8080`, then runs Pa11y (`--standard WCAG2AAA`) and axe-core (`wcag2a,wcag2aa,wcag2aaa,wcag22aa,wcag22aaa`, `--exit` so violations fail the job) against `index.html`. Chrome/ChromeDriver pinning via `browser-actions/setup-chrome` and the `--chrome-path`/`--chromedriver-path` flags are present and consistent. No UI changed in this PR, so no new AAA sweep is warranted — this is a config-correctness check only, and the config is correct for this project.
- However: **this workflow has never actually executed on this PR** — see CI-status finding below. "Reads correctly on paper" is as far as this check can go without a real run.
- No new axe-core/Pa11y findings to triage (nothing ran), so no accessibility-specialist dispatch is needed at this time.

## 3. Visual pass

Not applicable — PR touches only `package.json`/`package-lock.json`, `.github/workflows/*`, `.github/accessibility-tools/*`, and `.claude/template-version`. No HTML/CSS/template/static-asset changes.

## 4. Citation checks

Not applicable — this PR is not a Tad or Simon draft.

## 5. Critical finding: PR is stale against `main` and has never run CI

- `gh pr view 42` / `gh api .../pulls/42`: `"mergeable": false, "mergeable_state": "dirty"`. GitHub reports an actual merge conflict, not just a rebase-needed state.
- `gh api .../commits/395a3f3.../check-runs` and `/status` both return **zero** entries. `gh run list --branch chore/template-sync-and-security` returns nothing. **No workflow has ever run against this PR's head commit.** DoD item 1 ("pass CI on the branch") is not met — there is nothing to point to.
- Root cause: the branch was cut from `main` at `36fe20b` (template sync to 1.6.3), but `main` has since moved to `aca1fcf` via five merged PRs, two of which land squarely in this PR's diff surface:
  - **PR #40 "Bring CI up to the static-app archetype"** already re-synced `ci.yml`, `lint.yml`, `security.yml`, `codeql.yml`, and the `accessibility.yml` serving logic on `main` directly (not via `.claude/template-version`, so `main` is still nominally "1.6.3" but its workflows are already hand-adapted past what this branch's 1.6.3→1.7.0 sync produces). Diffing this branch against current `main` shows workflow diffs are not a clean superset — `.github/workflows/` differs from `main` by 289 insertions / 48 deletions across all 7 files, i.e. genuinely conflicting versions, not just "behind".
  - **PR #39 "fix: bump protobufjs to resolve CVE-2026-48712"** added `"overrides": {"protobufjs": "^7.6.1"}` to root `package.json` on `main`. This branch's `package.json` has **no such override** — merging this PR as-is would silently drop that CVE fix.
  - **A `release-please` release (#23) already shipped version 0.5.0** to `main`. This branch's `package.json` still reads `0.4.22` (Sean's patch bump from `0.4.19`) — merging as-is would be a **version regression** (0.5.0 → 0.4.22), and would also downgrade `onnxruntime-web` (1.27.0→1.26.0), `pdfkit` (0.19.1→0.18.0), `pdfmake` (0.3.11→0.3.9), `eslint`, `globals`, `stylelint`, and `vite` (8.1.3→8.1.5, mixed) back toward the exact versions this PR itself is trying to move away from.
  - Confirmed on `main`'s current tip via a throwaway worktree: `npm audit` on `main` right now still reports 1 critical, 1 high, 7 low (i.e. the same Dependabot alerts this PR is meant to fix are still live on `main` today) — so the underlying security motivation for this PR is real and current, it's just that the fix needs to be rebased, not abandoned.
- Jed's security review (`.claude/work/016-iccc-template-sync-security/jed-security-review.md`) approved the diff as it stood against the branch's own base — it did not (and had no way to, from a diff review) catch that `main` has since diverged underneath the PR. This is a merge-freshness problem, not a defect in Sean's or Jed's work.

## Release checklist

| Item | Status |
|---|---|
| CI (build/test workflow) green on the PR | **Not met — zero check runs exist on the PR head commit.** |
| Accessibility check green on the PR | **Not met — same reason; workflow never executed.** |
| Security check green on the PR | **Not met — same reason.** |
| Functional / accessibility / visual testing signed off | Functional: pass (local). Accessibility: config-correct but unexecuted. Visual: N/A. |
| Architecture-and-security conformance check | Done (Jed, approved against the branch's original base — see caveat above). |
| Version number and changelog ready | **Not met — `package.json` at 0.4.22 is behind the already-released 0.5.0 on `main`; merging now is a version regression.** |
| Work folder's GitHub-actions log complete | **Not met — no such log exists because no run has ever happened.** |
| Test coverage not decreased | Met — 6/6 tests both branches, no new interactive UI surface introduced. |

## What's blocking release

1. Rebase (or recreate) `chore/template-sync-and-security` on current `main` (`aca1fcf`), resolving the conflicts in `.github/workflows/*` and `package.json` — reconcile against `main`'s already-adapted CI-archetype workflows (PR #40) and keep the `protobufjs` override (PR #39) and the 0.5.0 version base.
2. After rebase, push and let CI/Accessibility/Security workflows actually run once on the PR head; confirm green.
3. Re-bump `package.json` version forward from 0.5.0 (not 0.4.19), per the versioning rule in `CLAUDE.md`.
4. Once green, re-run this test pass quickly to confirm the rebased head still builds/tests/smokes clean (expected to be a formality given the underlying change is the same audit-fix + adm-zip override + workflow sync).

Sean is best placed to do the rebase since he has the context on both the dependency fixes and the workflow review; Jed's approval of the substance of the changes still stands and shouldn't need re-review unless the rebase changes the dependency resolution materially.
