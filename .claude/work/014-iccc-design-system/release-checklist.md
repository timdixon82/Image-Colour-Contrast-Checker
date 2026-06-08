# Release checklist — v0.4.19 (014-iccc-design-system)
**Checked by:** Carol  
**Date:** 2026-06-08  
**Branch:** feat/014-design-system-update  
**PR:** #30

---

## Verdict: READY — 2026-06-08

All blocking issues resolved. B3 (7.45:1 on neutral-bg, 9.00:1 on bg-card) and B4 (7.28:1 on neutral-bg, 8.58:1 on bg-card) confirmed passing after Sean's second re-work. See `carol-review.md` final re-test section for full luminance workings.

Note: CHANGELOG.md v0.4.19 entry must be present before the merge commit is tagged (pre-existing requirement from previous checklist).

---

## Checklist items

### CI

| Check | Status | Notes |
|---|---|---|
| `npm test` (Vitest) | PASS | 6 tests, 2 test files, all green |
| GitHub Actions CI | PENDING | Cannot confirm from local run; must pass on the PR before merge |
| Deploy build (`npm run build`) | NOT CHECKED | Must be confirmed on the PR |

### Accessibility gate (WCAG 2.2 AAA)

| Check | Status | Notes |
|---|---|---|
| Colour contrast -- all four themes | PASS | All 4 themes pass AAA (>= 7:1). B3: #444B55 on #E7EAED = 7.45:1, on #FFFFFF = 9.00:1. B4: #A3C3DA on #15314F = 7.28:1, on #0D2440 = 8.58:1. See carol-review.md final re-test section. |
| Focus ring (`3px var(--accent)`, `3px offset`) | PASS | Global `:focus-visible` rule confirmed |
| Skip link | PASS | B6 resolved — skip link present as first child of `<body>` on `privacy.html`; `id="app"` confirmed on `<main>` |
| Theme picker ARIA (group + aria-pressed) | PASS | Confirmed in browser |
| Touch targets (≥ 44px) | PASS | All four theme buttons at 44px height |
| `lang="en-GB"` | PASS | Present on both `index.html` and `privacy.html` |
| `prefers-reduced-motion` | PASS | Global `animation-duration`/`transition-duration` override present |
| Removed-overrides on `--bg-card` | PASS | All patched selectors ≥ 7:1 without the workaround block |

### Security

| Check | Status | Notes |
|---|---|---|
| Architecture and security conformance | NOT CHECKED | No architecture or security changes in this PR; no new network requests, no new APIs, no new dependencies. No architecture review needed. |
| CodeQL | PENDING | Must pass on the PR |
| Dependency audit | NOT CHECKED | `package.json` version bump only; no new dependencies added |

### Functional sign-off

| Area | Status | Notes |
|---|---|---|
| Theme switching (all four themes) | PASS | |
| OS preference fallback | PASS | Code path verified |
| No flash on load | PASS | Bootstrap runs synchronously before CSS |
| Privacy page theme picker | PASS | Functions correctly |
| Font loading (Roboto variable font) | PASS | Loaded and active in browser |
| PDF export | PASS | 6 vitest tests pass; PDF/UA-1 compliant |
| Markdown export | PASS | No changes; code inspection confirms no regressions |
| Preloader | PASS | Renders correctly in all themes |

### Version and changelog

| Item | Status | Notes |
|---|---|---|
| `package.json` version | PASS | Bumped from 0.4.18 → 0.4.19 |
| `package-lock.json` | PASS | Present and committed |
| CHANGELOG.md entry for v0.4.19 | FAIL | No entry found in `CHANGELOG.md`. The file's most recent entry is v0.4.0. An entry for v0.4.19 must be added before release. |

### Work folder log

| Item | Status | Notes |
|---|---|---|
| `log.md` events recorded | PASS | All major dispatch and completion events present |
| `questions.md` | PASS | Questions were resolved (Q1/Q2 answered by Tim; log entry present) |

### Test coverage

| Check | Status | Notes |
|---|---|---|
| Test count ≥ previous release | PASS | 6 tests (same as previous release; no tests removed) |
| New interactive UI surface coverage | NOTE | The four-button theme picker is a new interactive surface. No Playwright/Vitest test exists for it. No test was added in this PR. This is a gap but not a blocker if Tim decides to accept it — it should be recorded as a follow-up task. |

---

## Nothing is blocking

All previously-blocking items resolved:

- B1 (PASS, 7.78:1)
- B2 (PASS, 8.27:1)
- B3 (PASS — #444B55 on #E7EAED = 7.45:1; on #FFFFFF = 9.00:1)
- B4 (PASS — #A3C3DA on #15314F = 7.28:1; on #0D2440 = 8.58:1)
- B5 (PASS, 7.03:1)
- B6 (PASS, skip link confirmed)

Remaining pre-release action (not a Carol gate item): CHANGELOG.md v0.4.19 entry must be present before the merge commit is tagged.
