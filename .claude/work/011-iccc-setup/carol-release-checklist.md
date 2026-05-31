# Release Checklist: ICCC Setup PR 6

Date: 2026-05-23
Author: Carol (tester and release manager)
Pull request: timdixon82/Image-Colour-Contrast-Checker PR 6
Branch: chore/project-setup (HEAD c022dee after ACC-ICCC-004 fix)
Base: main
Proposed release version: 0.2.12 (team-adoption release; release-please will tag on merge to main)

---

## Rework verification (2026-05-23, HEAD 7ada45c)

Sean applied four commits on top of 6fe48ab. All three blockers from the initial test pass are resolved.

- 713766b: `ci: scope Pa11y to the setup PR's accepted-deferred WCAG codes` — resolves blocker 1.
- 3726bde: `docs: record pre-existing AAA failures as deferred backlog` — resolves blockers 2 and 3 (ACC-ICCC-001 and ACC-ICCC-002 in `docs/accessibility.md`).
- 66819f1: `docs: add deferred AAA items to todo` — resolves blockers 2 and 3 (D4 and D5 in `todo.md`).
- 7ada45c: `docs: extend deferred backlog with axe-core findings` — adds ACC-ICCC-003 (D6) and ACC-ICCC-004 (D7) to both files.

CI pull (2026-05-23, all 8 checks):

| Check | Result |
| --- | --- |
| Analyse JavaScript (CodeQL) | pass |
| CodeQL | pass |
| Dependency review | pass |
| Lint HTML, CSS, and JavaScript | pass |
| Pa11y and axe at WCAG 2.2 AAA | pass |
| Semgrep | pass |
| Trivy | pass |
| Vite build | pass |

All 8 green.

---

## ACC-ICCC-004 fix verification (2026-05-23, HEAD c022dee)

Sean applied one further commit on top of 7ada45c to resolve ACC-ICCC-004 before merge.

- c022dee: `fix(a11y): set preloader-header tagline colour for AA in light mode (ACC-ICCC-004)` — closes ACC-ICCC-004 / D7.

### CSS fix (item 1 of 3)

Verified at `/Users/timdixon/Library/Mobile Documents/com~apple~CloudDocs/AgentTeam/Inputs/Image-Colour-Contrast-Checker/src/styles.css`, lines 163 to 168. The combined selector reads:

```
.app-header .tagline,
.preloader-header .tagline {
  color: #63D2FF;          /* Sky Blue on Navy — 10.64:1 AAA */
  margin: 0;
  font-size: 0.875rem;
}
```

The only change from the previous state is the addition of `.preloader-header .tagline` to the selector list. No other properties were changed. Confirmed correct.

### Backlog removal (item 2 of 3)

- `docs/accessibility.md`: ACC-ICCC-004 and D7 are absent from the deferred backlog. The "Known baseline audit status" paragraph notes ACC-ICCC-004 as closed in the setup-build pull request, citing the selector addition and the 10.64:1 ratio. Confirmed correct.
- `todo.md`: D7 and ACC-ICCC-004 are absent from the deferred backlog. A grep for both terms returned no output. Confirmed correct.

### Theme validation (item 3 of 3)

The preloader header uses `class="preloader-header"` and is always navy (`#061528`) regardless of theme, matching the `.app-header` background. The fix sets `color: #63D2FF` (sky blue) directly on `.preloader-header .tagline`, bypassing any `--fg` custom property. Because the colour is an explicit value, neither light mode nor dark mode can override it through the theme cascade. Both themes therefore receive sky blue on navy at 10.64:1, which passes WCAG 2.2 AAA (7:1 threshold) and AA (4.5:1 threshold). Confirmed clean in both themes by code inspection.

CI pull post-fix (2026-05-23, HEAD c022dee, all 8 checks):

| Check | Result |
| --- | --- |
| Analyse JavaScript (CodeQL) | pass |
| CodeQL | pass |
| Dependency review | pass |
| Lint HTML, CSS, and JavaScript | pass |
| Pa11y and axe at WCAG 2.2 AAA | pass |
| Semgrep | pass |
| Trivy | pass |
| Vite build | pass |

All 8 green. Semgrep passed on the post-rerun; the earlier transient GitHub Actions checkout-auth failure was unrelated to the code and is now resolved.

---

## Status at HEAD c022dee (after ACC-ICCC-004 fix): ready for the merge gate

---

## 1. Continuous integration

- [x] HTML lint (`npm run lint:html`): exits 0. Verified locally on HEAD 6fe48ab; no change in rework.
- [x] CSS lint (`npm run lint:css`): exits 0. Verified locally on HEAD 6fe48ab; no change in rework.
- [x] JavaScript lint (`npm run lint:js`): exits 0. Verified locally on HEAD 6fe48ab; no change in rework.
- [x] Vite build: passes in CI.
- [x] CodeQL (Analyse JavaScript): passes in CI.
- [x] Dependency review: passes in CI.
- [x] Semgrep: passes in CI (post-rerun; transient checkout-auth failure on earlier run was unrelated to the code).
- [x] Trivy: passes in CI.
- [x] Pa11y and axe at WCAG 2.2 AAA: **passes in CI at HEAD c022dee.** Ignore list scoped to exactly two pre-existing AAA codes. No Level A suppression. Comment block cites `docs/accessibility.md` and `todo.md` and names the accessibility-phase pull request as the place to remove the ignores. Resolved at commit 713766b.

---

## 2. Workflow file validation

- [x] `ci.yml`: structurally valid; Sonja confirmed actionlint exits 0 locally (D3 resolved).
- [x] `accessibility.yml`: structurally valid; Pa11y and axe-core on both `index.html` and `privacy.html`; `pa11y.json` loaded for no-sandbox config.
- [x] `security.yml`: structurally valid; Semgrep, Trivy, and dependency-review.
- [x] `codeql.yml`: structurally valid; correct for a public repository.
- [x] `release.yml`: structurally valid; release-please config and manifest paths correct.
- [x] `dependabot.yml`: present; Dependabot configured.
- [x] actionlint: Sonja confirmed exit 0 locally. Consistent with LLBS precedent (identical workflow structure).

---

## 3. JSON configuration files

- [x] `release-please-config.json`: valid JSON. `release-type: simple`. `include-v-in-tag: true`. `changelog-path: CHANGELOG.md`. Extra files: `VERSION` (generic) and `package.json` (json, `$.version`).
- [x] `.release-please-manifest.json`: valid JSON. Records `".": "0.2.12"`, matching the `VERSION` file and `package.json`.

---

## 4. Functional testing

- [x] All three linters exit 0 (verified locally and by CI "Lint HTML, CSS, and JavaScript: pass").
- [x] CSP meta tag present in `index.html`: `default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' https://iccc.goatcounter.com; img-src 'self' blob: data:; worker-src 'self' blob:; child-src blob:; frame-ancestors 'none'`. Placed first in `<head>` after `<meta charset>`.
- [x] CSP meta tag present in `privacy.html`: identical policy.
- [x] Referrer-Policy meta tag (`strict-origin-when-cross-origin`) present in both pages.
- [x] Self-hosted analytics: `public/analytics/count.js` present. `index.html` and `privacy.html` load it from `/analytics/count.js` with `data-goatcounter="https://iccc.goatcounter.com/count"`. Matches ADR 009.
- [x] `VERSION` file: present, contains `0.2.12`, matching `package.json`.
- [x] `docs/exceptions/github-pages-headers.md`: present; correctly points to the global-wiki standing exception.
- [x] Skip link present in `index.html`.
- [x] `lang="en-GB"` on `<html>` in both pages.

---

## 5. Accessibility testing

- [x] Pa11y WCAG 2.2 AAA on `index.html`: passes in CI at HEAD c022dee. Scoped ignore list for two pre-existing codes. Resolved at commit 713766b.
- [x] Pa11y WCAG 2.2 AAA on `privacy.html`: passes in CI at HEAD c022dee (job ran to completion after index.html passed). Resolved at commit 713766b.
- [x] axe-core on `index.html` at WCAG 2.2 AAA: runs and exits 0. Pre-existing violations documented as ACC-ICCC-003; not suppressed. ACC-ICCC-004 closed by commit c022dee.
- [x] axe-core on `privacy.html` at WCAG 2.2 AAA: runs and exits 0. Pre-existing violations documented as ACC-ICCC-003; not suppressed.
- [ ] VoiceOver pass (Tim-side gate): required before first release tag. Not blocking setup merge.
- [ ] JAWS pass (Tim-side gate): required before first release tag. Not blocking setup merge.
- [ ] NVDA pass (Tim-side gate): if available to Tim or a designated tester. Not blocking setup merge.

---

## 6. Accessibility exceptions and deferred items

- [x] Standing GitHub Pages security-header exception: the global-wiki exception covers ICCC. `docs/exceptions/github-pages-headers.md` is the project-level pointer. Conditions met: no external scripts or styles from third-party origins; all assets self-hosted. ICCC qualifies.
- [x] Pre-existing AAA gap ACC-ICCC-001 (file-input accessible name, WCAG 4.1.2): formally recorded in `docs/accessibility.md` and as D4 in `todo.md`. Selector `#file-input`. Proposed fix and Pa11y ignore removal instruction present. Resolved at commits 3726bde and 66819f1.
- [x] Pre-existing AAA gap ACC-ICCC-002 (footer and model-banner text contrast, WCAG 1.4.6): formally recorded in `docs/accessibility.md` and as D5 in `todo.md`. Footer `--fg-muted` on `--bg` at 6.98:1; model-banner text at 6.74:1. Proposed fix and Pa11y ignore removal instruction present. Resolved at commits 3726bde and 66819f1.
- [x] Pre-existing AAA gap ACC-ICCC-003 (additional contrast shortfalls, axe-core `color-contrast-enhanced`, WCAG 1.4.6): formally recorded in `docs/accessibility.md` and as D6 in `todo.md`. Same root cause as ACC-ICCC-002; fix for D5 will close D6. Resolved at commit 7ada45c.
- [x] Pre-existing AA gap ACC-ICCC-004 (preloader tagline contrast, axe-core `color-contrast`, WCAG 1.4.3, Level AA): **FIXED in commit c022dee.** `.preloader-header .tagline` added to the `.app-header .tagline` selector in `src/styles.css`; `color: #63D2FF` (sky blue on always-navy `#061528`) gives 10.64:1 — passes both AA (4.5:1) and AAA (7:1) in both light and dark themes. ACC-ICCC-004 removed from `docs/accessibility.md` deferred backlog and D7 removed from `todo.md`. Verified by Carol at commit c022dee.
- [x] Pa11y ignore list scoping: `pa11y.json` contains exactly two codes (`H91.InputFile.Name` and `G17.Fail`). No Level A codes suppressed. Comment block cites `docs/accessibility.md` and `todo.md` and names the accessibility-phase pull request. Verified at commit 713766b.

---

## 7. Analytics and privacy

- [x] ICCC uses its own GoatCounter site (`iccc.goatcounter.com`). This opt-out from the team default is documented in ADR 009 (`docs/decisions/009-goatcounter-analytics.md`). The CSP `connect-src` directive is scoped to `https://iccc.goatcounter.com`, not a team-wide wildcard.
- [x] `docs/privacy.md` (and `privacy.html`) correctly document the GoatCounter analytics posture: no cookies, no personal data stored, aggregate anonymous data only.

---

## 8. Security and compliance

- [x] No hardcoded credentials or API keys in any file.
- [x] CodeQL: pass.
- [x] Semgrep: pass (post-rerun).
- [x] Trivy: pass.
- [x] Dependency review: pass.
- [x] Dependabot configured.
- [x] Standing GitHub Pages security-header exception covers this project.
- [x] Self-hosted assets: all scripts, styles, fonts, and analytics served from the same origin. No third-party script loads.

---

## 9. Version and changelog

- [x] `VERSION`: `0.2.12`.
- [x] `.release-please-manifest.json`: records `"0.2.12"` for the root package.
- [x] `CHANGELOG.md`: contains a clearly marked "Team era" or similar section recording the adoption changes. (Presence verified; Sean's setup commits use `chore` and `ci` prefixes, which under the `simple` release type do not trigger a version bump. The version stays at 0.2.12 on merge.)

---

## 10. Pull request body accuracy

PR 6 at https://github.com/timdixon82/Image-Colour-Contrast-Checker/pull/6 was opened by Sean. All rework commits, including c022dee, appear on the PR automatically.

---

## 11. Architecture-and-security conformance check

To be completed by Sonja before the merge gate. Sonja verifies:

- ICCC meets the standing standards for Browser AI Application projects.
- The GitHub Pages security-header standing exception applies correctly and all conditions are met.
- The CSP policy on both pages is appropriate for the pages' actual resource loads (ONNX/WASM workers, GoatCounter connect-src, service-worker blob scope).
- Self-hosted analytics (`count.js`) is committed at the correct path and the GoatCounter endpoint matches ADR 009.

---

## 12. GitHub-actions log completeness

The work folder's `github-actions-log.md` covers all git and GitHub operations. Sean's four rework commits (713766b, 3726bde, 66819f1, 7ada45c) and the passing CI run at HEAD 7ada45c are recorded in the work-folder log. The ACC-ICCC-004 fix commit (c022dee) and the passing all-8-green CI run at HEAD c022dee should be added to the work-folder log by Sonja.

---

## 13. Merge gate summary

### Blocking items

None.

### Non-blocking deferred items (required before first release tag)

- VoiceOver manual pass (Tim-side).
- JAWS manual pass (Tim-side).
- NVDA manual pass (if available).
- Fix ACC-ICCC-001, ACC-ICCC-002, and ACC-ICCC-003 in the accessibility phase (D4, D5, D6 in `todo.md`).

### Confirmed clean

- All three linters exit 0.
- Vite build passes in CI.
- CodeQL, Semgrep (post-rerun), Trivy, and dependency-review all pass.
- Pa11y and axe at WCAG 2.2 AAA pass at HEAD c022dee.
- Pa11y ignore list narrowly scoped to two pre-existing AAA codes; no Level A suppression.
- ACC-ICCC-001 through ACC-ICCC-003 formally recorded with WCAG codes, selectors, and proposed fixes.
- ACC-ICCC-004 fixed in commit c022dee: `.preloader-header .tagline` reaches 10.64:1 AAA in both themes.
- D7 removed from `todo.md`; ACC-ICCC-004 noted as closed in `docs/accessibility.md`.
- CSP meta tag present and correct in both pages.
- Self-hosted `count.js` at `public/analytics/count.js`; `data-goatcounter` points to `https://iccc.goatcounter.com/count`.
- ADR 009 documents the GoatCounter opt-out.
- `docs/exceptions/github-pages-headers.md` is the correct project pointer to the standing exception.
- Release-please configuration valid; version 0.2.12 recorded.
- No regressions introduced by any of Sean's commits.

---

## 14. Verdict

Ready for the merge gate.

Sonja to run the architecture-and-security conformance check (item 11), then present PR 6 to Tim for express merge approval. All 8 CI checks pass at HEAD c022dee.
