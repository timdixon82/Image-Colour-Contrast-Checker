# Test Pass: ICCC Setup PR 6

Date: 2026-05-23
Author: Carol (tester and release manager)
Pull request: timdixon82/Image-Colour-Contrast-Checker PR 6
Branch: chore/project-setup (HEAD 6fe48ab)
Base: main
Commits under test: 2c900d3, ce0fc20, 84aaecc, f0d25b5, 6fe48ab

---

## Summary verdict

Rework required. One functional finding and two WCAG 2.2 AAA contrast findings are pre-existing gaps in the application surface. Zero regressions introduced by Sean. The Pa11y ignore list in `pa11y.json` is intentionally empty at this stage (per the comment Sean wrote into the file). The rework is: scope the ignore list to the three WCAG codes identified below, add a pre-existing-failures section to `docs/accessibility.md` and `todo.md`, and push. Pattern mirrors LLBS's three rework commits.

---

## 1. Functional pass

### 1.1 Linters

All three linters verified locally at HEAD 6fe48ab.

- `npm run lint:html`: exit 0. HTMLHint scanned 2 files, no errors.
- `npm run lint:css`: exit 0. Stylelint, no output.
- `npm run lint:js`: exit 0. ESLint, no output.

Result: pass.

### 1.2 actionlint

Sonja confirmed exit 0 locally (noted in the work-folder log as deferred item D3 now resolved by direct observation). The workflow files follow the same structure as the LLBS workflow files, which passed actionlint in CI.

Result: pass.

### 1.3 release-please configuration

`release-please-config.json` parses as valid JSON. Configuration:

- `release-type: simple`.
- `include-v-in-tag: true`.
- `changelog-path: CHANGELOG.md`.
- Extra files: `VERSION` (generic type) and `package.json` (json type, jsonpath `$.version`).

`.release-please-manifest.json` parses as valid JSON. Records `".": "0.2.12"`, matching `VERSION` and `package.json`.

Result: pass.

### 1.4 Vite build in CI workflow

`accessibility.yml` includes a `npm run build` step before serving. The Vite build CI check passed (confirmed: `gh pr checks 6` shows "Vite build: pass").

Result: pass.

### 1.5 CI check status

Pulled from `gh pr checks 6 --repo timdixon82/Image-Colour-Contrast-Checker` on 2026-05-23:

| Check | Result |
| --- | --- |
| Analyse JavaScript (CodeQL) | pass |
| CodeQL | pass |
| Dependency review | pass |
| Lint HTML, CSS, and JavaScript | pass |
| Pa11y and axe at WCAG 2.2 AAA | fail |
| Semgrep | pass |
| Trivy | pass |
| Vite build | pass |

Seven of eight checks pass. Pa11y fails as expected. No unexpected failures.

---

## 2. Accessibility pass

### 2.1 Pa11y failure log analysis

Pa11y ran against `http://localhost:8080/index.html` with `--standard WCAG2AAA`. It exited with code 2 (errors found). The CI step for `index.html` failed, so the subsequent `privacy.html` step did not run (GitHub Actions stops the job on a failed step). The axe-core steps likewise did not run.

Findings from the Pa11y log for `index.html` — 15 error instances, two unique WCAG codes:

**Finding 1: WCAG2AAA.Principle4.Guideline4_1.4_1_2.H91.InputFile.Name**

Selector: `#file-input`
Element: `<input id="file-input" type="file" accept="image/*" multiple="" hidden="">`
Message: "This fileinput element does not have a name available to an accessibility API. Valid names are: label element, title, aria-label, aria-labelledby."
Instances: 1.

**Finding 2: WCAG2AAA.Principle1.Guideline1_4.1_4_6.G17.Fail**

Affected selectors and elements:

| Selector | Element description | Ratio |
| --- | --- | --- |
| `#model-banner > span:nth-child(2)` | `.model-banner-text` span ("OCR failed to load: Evaluating ...") | 6.74:1 |
| `#app-footer` | footer element | 6.98:1 |
| `#app-footer > a:nth-child(2)` | "Open source on GitHub" link | 6.98:1 |
| `#app-footer > a:nth-child(4)` | "MIT Licence" link | 6.98:1 |
| `#app-footer > a:nth-child(6)` | "Third-party licences" link | 6.98:1 |
| `#app-footer > a:nth-child(8)` | "Privacy" link | 6.98:1 |
| `#app-footer > a:nth-child(10)` | "Contact / feedback" link | 6.98:1 |
| `#app-footer > a:nth-child(12)` | "© Tim Dixon" link | 6.98:1 |
| `#app-footer > span:nth-child(1)` through `span:nth-child(11)` (five separator spans) | `.sep` aria-hidden separators | 6.98:1 |

Total instances of G17.Fail: 14.

### 2.2 Classification of findings

Both findings are confirmed pre-existing on `main`:

**Finding 1 (H91.InputFile.Name):** `git show main:index.html` confirms the `<input id="file-input" type="file" accept="image/*" multiple hidden>` element was present on `main` with no accessible name. Sean's commits introduced no change to this element. Regression: no. Classification: pre-existing AAA gap.

**Finding 2 (G17.Fail — footer and model-banner contrast):** `git diff main HEAD -- src/styles.css` confirms no colour value changes were made. The `--fg-muted` token used in the footer, and the model-banner text style, are unchanged between `main` and HEAD. Sean's CSS changes were whitespace, modern syntax equivalents (e.g., `rgba()` to `rgb()` notation), and a `@media max-width` to `width <=` rewrite. None affect contrast ratios. Regression: no. Classification: pre-existing AAA gap.

**No regressions.** All 15 Pa11y errors are pre-existing AAA gaps in the application surface surfaced because CI now runs the team standard at AAA for the first time.

### 2.3 Unique WCAG codes for the ignore list

Two codes account for all 15 failures:

1. `WCAG2AAA.Principle4.Guideline4_1.4_1_2.H91.InputFile.Name` — file-input accessible-name gap.
2. `WCAG2AAA.Principle1.Guideline1_4.1_4_6.G17.Fail` — text contrast below 7:1 in the footer and model-banner.

These two codes, scoped in `pa11y.json`, will silence all current failures without suppressing any Level A checks.

Note: the `G17.Fail` code covers the footer (6.98:1) and the model-banner text (6.74:1). Both are in the same code group. A single ignore entry covers both locations.

### 2.4 CSP meta tag check

`index.html` line 5: `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' https://iccc.goatcounter.com; img-src 'self' blob: data:; worker-src 'self' blob:; child-src blob:; frame-ancestors 'none';">` — present.

`privacy.html` line 5: same CSP meta tag — present.

Both pages carry the CSP meta tag per ADR 003 and Jed's finding F-01.

### 2.5 Self-hosted analytics check

`public/analytics/count.js` is present (confirmed by `ls`).

`index.html` lines 157-158: `<script data-goatcounter="https://iccc.goatcounter.com/count" async src="/analytics/count.js">` — correct endpoint and correct local path.

`privacy.html` lines 158-159: same pattern — correct.

GoatCounter endpoint: `https://iccc.goatcounter.com/count` — matches ADR 009 (ICCC uses its own GoatCounter site, not the team default).

### 2.6 GitHub Pages security-header exception

`docs/exceptions/github-pages-headers.md` is present in the ICCC repository. It correctly points to the global wiki at `docs/exceptions/github-pages-security-headers.md` (team root) and identifies ICCC's hosting on GitHub Pages with custom domain `image-colour-contrast-checker.timdixon.net` as qualifying for the standing exception. Content is accurate.

---

## 3. Visual pass

Sean's commits introduce no visual changes to the application surface beyond the accessibility and adoption work (CSP meta tag, self-hosted analytics, linter fixes). The CSS diff shows only syntax modernisation: `rgba()` to `rgb()` notation, `#ffffff` to `#fff` shorthands, `@media max-width` to `width <=`. No colour values changed. The brand palette in `CLAUDE.md` (navy, orange, blue, white) is unchanged. Visual pass: no regressions.

---

## 4. Rework brief

Sean: three commits, matching the LLBS pattern.

**Commit 1 — scope the Pa11y ignore list.**

Update `pa11y.json` to add an `ignore` array with these two codes:

```json
"ignore": [
  "WCAG2AAA.Principle4.Guideline4_1.4_1_2.H91.InputFile.Name",
  "WCAG2AAA.Principle1.Guideline1_4.1_4_6.G17.Fail"
]
```

Add a `_comment` extension to the existing comment array (or replace it) to cite `docs/accessibility.md` and `todo.md` as the deferred-backlog records, and to note that the ignore codes must be removed in the accessibility-phase pull request.

**Commit 2 — record the deferred backlog in `docs/accessibility.md`.**

Add a "Pre-existing AAA failures, deferred to the accessibility phase" section with:

- Finding A: File-input accessible name gap. Selector `#file-input`. WCAG 2.2 criterion 4.1.2 (Name, Role, Value). The `<input type="file">` is hidden from visual presentation and triggered programmatically via a button, but lacks a label or `aria-label` for the accessibility API. Fix in the accessibility phase: add `aria-label="Choose image files"` (or equivalent) and ensure the trigger button and the input are correctly associated.
- Finding B: Footer text and model-banner text contrast shortfall. Multiple selectors in `#app-footer` and `.model-banner`. WCAG 2.2 criterion 1.4.6 (Contrast, Enhanced). Footer text and links use `--fg-muted` on `--bg`, producing 6.98:1 in light mode (target: 7:1). Model-banner text produces 6.74:1. Fix in the accessibility phase: adjust `--fg-muted` in the light-mode root token block to a value that achieves at least 7:1 on `--bg`, or darken the model-banner text token.

**Commit 3 — record the deferred backlog in `todo.md`.**

Add an accessibility subsection under "Deferred backlog" with the same two items, WCAG criterion codes named, selectors named, and a note that the Pa11y ignores in `pa11y.json` must be removed when these items are fixed.

After the three commits, Pa11y CI should pass with the scoped ignore list. The axe-core steps should also run and should pass (axe-core operates at WCAG 2.2 AAA but uses different rule mapping; the contrast shortfalls may or may not surface separately in axe, but the file-input finding is a structural issue that axe will likely flag; however, axe's AAA rules are less comprehensive than Pa11y for some criteria).

Note: if axe-core flags additional findings not covered by the Pa11y ignore list, a fourth commit may be needed. Sean should check the axe-core output after Pa11y passes.
