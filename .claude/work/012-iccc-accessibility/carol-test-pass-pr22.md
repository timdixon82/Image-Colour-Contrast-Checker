# Carol — Test Pass and Release Checklist: PR 22
# fix(a11y): close ACC-ICCC-001, ACC-ICCC-002, ACC-ICCC-003 — accessibility phase

**Date:** 2026-05-31
**Branch:** `fix/accessibility-phase`
**Head commit:** 692cf51
**Target:** `main` (patch release 0.4.0 → 0.4.1)
**Tester:** Carol

---

## Verdict

**PASS. This PR is clear to merge.**

No functional issues. No accessibility regressions. Visual comment is accurate. All CI checks pass with an empty ignore array. Version and documentation are consistent. Release is ready.

---

## 1. Functional Tests

### 1.1 Scope of changed files

The diff touches seven files: `VERSION`, `docs/accessibility.md`, `index.html`, `pa11y.json`, `package.json`, `src/styles.css`, `todo.md`. No logic files were touched.

Confirmed by diffing `origin/main...origin/fix/accessibility-phase` against the following paths — each produced **no diff output** (completely unchanged):

- `src/export/pdf.js`
- `src/export/markdown.js`
- `src/export/checks.js`
- `src/ui/report-view.js`
- `src/main.js`

The export pipeline, report rendering, and orchestration are entirely unaffected. No functional regression is possible from these changes.

### 1.2 `#file-input` handling unchanged

`src/main.js` references `#file-input` only at line 35 (`getElementById`) and line 319 (passed as `inputEl` to `initDropzone`). Neither reference has changed. The `aria-label` attribute is an HTML attribute on the element — it does not affect the DOM API, JavaScript event listeners, or the programmatic `inputEl.click()` calls inside `src/ui/dropzone.js`. File-input handling is confirmed unchanged.

### 1.3 `pa11y.json` ignore array

The `ignore` array is now `[]`. Both previously-suppressed codes have been removed:
- `WCAG2AAA.Principle4.Guideline4_1.4_1_2.H91.InputFile.Name` — removed, underlying cause fixed.
- `WCAG2AAA.Principle1.Guideline1_4.1_4_6.G17.Fail` — removed, underlying cause confirmed non-existent.

The `_comment` block has been updated to accurately describe the current state and records both fix resolutions. The `chromeLaunchConfig` block is unchanged. The file is valid JSON.

**Result: PASS**

---

## 2. Accessibility Tests

### 2.1 ACC-ICCC-001 — File-input accessible name (WCAG 4.1.2 Level A)

**Requirement:** `#file-input` must have an accessible name.

**Implementation reviewed (`index.html`, line 141):**

```
<input id="file-input" type="file" accept="image/*" multiple hidden aria-label="Upload images for analysis" />
```

The `aria-label` value "Upload images for analysis" is descriptive and clearly communicates the purpose. The attribute is correctly placed on the `<input>` element itself.

**Button relationship:** The visible trigger is `<button type="button" id="choose-files">Choose files</button>`. In `src/ui/dropzone.js` line 20, clicking this button calls `inputEl.click()` programmatically. The input is `hidden` (CSS `display: none`), so it never receives direct user focus — screen readers will not land on it during normal tab navigation. The `aria-label` satisfies the WCAG 4.1.2 requirement that the element have an accessible name available to the accessibility API, which was the specific Pa11y failure. The user-facing interaction is mediated through the labelled button and the `role="button"` dropzone.

**Assessment:** The fix is correct and sufficient for the stated failure. The accessible name is present and meaningful. The button remains the interaction surface for sighted and keyboard users.

**CI confirmation:** Pa11y exits clean with the empty ignore array (CI check "Pa11y and axe at WCAG 2.2 AAA" completed SUCCESS at 2026-05-31T22:00:58Z).

**Result: PASS**

### 2.2 ACC-ICCC-002 / ACC-ICCC-003 — `--fg-muted` contrast (WCAG 1.4.6 AAA)

**Requirement:** `--fg-muted` must achieve ≥ 7:1 on all surfaces where it appears.

**CSS value (`src/styles.css`, line 11):** `#454c58` — unchanged from `main`.

**Independent contrast verification using the WCAG 2.2 relative luminance formula:**

| Surface | Surface hex | Ratio | Meets 7:1 AAA? |
|---|---|---|---|
| `--bg` | `#f4f6f8` | 7.9846:1 | Yes |
| `--neutral-bg` | `#f0f2f5` | 7.7127:1 | Yes |
| White (`--bg-card`) | `#ffffff` | 8.6500:1 | Yes |

All three surfaces meet the 7:1 AAA threshold with margin.

**Resolution of the discrepancy:** The original baseline documentation recorded 6.98:1 on `--bg`. This was incorrect. The actual WCAG-formula ratio for `#454c58` on `#f4f6f8` is 7.98:1. Sean's investigation finding is confirmed by independent calculation. The Pa11y failure that triggered the original 6.98:1 figure was likely computed against `--bg-card` (`#ffffff`, ratio 8.65:1 — also passing) or against a slightly different surface value, or was a tool measurement artefact. The CSS custom-property value `#454c58` has never needed changing to meet AAA.

**Comment in `src/styles.css` line 11:** Updated from `/* 8.7:1 on white, 7.7:1 on panel — AAA */` to `/* 7.98:1 on --bg (#f4f6f8), 7.71:1 on --neutral-bg — AAA */`. The new comment accurately names the actual surfaces and matches the independently verified ratios (7.9846:1 rounds to 7.98:1; 7.7127:1 rounds to 7.71:1). The comment is correct.

**Pa11y and axe-core CI:** The "Pa11y and axe at WCAG 2.2 AAA" check passes with an empty ignore array, confirming neither tool now reports a failure on `--fg-muted` selectors.

**Result: PASS**

### 2.3 Screen-reader evidence gate

Per `CLAUDE.md`, the screen-reader evidence gate is suspended. Not blocking.

### 2.4 Existing accessibility provisions unchanged

None of the following were touched:
- Skip-to-content link
- Global `:focus-visible` ring
- 44 px touch targets
- `scope="col"` on `<th>` elements
- `table-scroll` wrappers
- `aria-live` regions

**Result: PASS — no regressions**

---

## 3. Visual Checks

### 3.1 CSS value change

No CSS custom-property value was changed. `--fg-muted` remains `#454c58`. There is no visual change.

### 3.2 Comment accuracy

The updated comment `/* 7.98:1 on --bg (#f4f6f8), 7.71:1 on --neutral-bg — AAA */` is accurate per independent calculation. The previous comment referenced "white" as the surface, which was misleading — `--fg-muted` does not appear on a pure-white background in normal usage. The new comment references the actual surfaces (`--bg` and `--neutral-bg`), making it more informative.

### 3.3 Brand conformance

No visual output changed. No brand palette values were modified. Brand conformance is unaffected.

**Result: PASS**

---

## 4. Documentation and Version Checks

### 4.1 `docs/accessibility.md`

- ACC-ICCC-001: Marked `— RESOLVED`. Resolution text names the fix (`aria-label="Upload images for analysis"`) and confirms Pa11y ignore entry removed. Correct.
- ACC-ICCC-002: Marked `— RESOLVED`. Resolution text states confirmed ratio (7.98:1 on `--bg`, 7.71:1 on `--neutral-bg`), confirms CSS comment corrected, confirms Pa11y ignore entry removed. Correct.
- ACC-ICCC-003: Marked `— RESOLVED`. Correctly identified as same root cause as ACC-ICCC-002, closed by the same fix. Correct.
- "Known baseline audit status" section updated with a clear closure summary for all four ACC-ICCC issues and the statement: "The Pa11y `ignore` array in `pa11y.json` is now empty." Correct.

### 4.2 `todo.md`

- D1: Struck through with "Done" note. Fix details match `index.html` and `pa11y.json`. Correct.
- D5: Struck through with "Done" note. Confirmed ratio values match independent calculation. Correct.
- D6: Struck through with "Done" note. Correctly cross-referenced to D5 fix. Correct.

### 4.3 Version bump

- `package.json` version: `0.4.0` → `0.4.1`. Correct patch bump.
- `VERSION` file: `0.2.12` → `0.4.1`. Consistent with `package.json`.

Note: `VERSION` shows the full project version (not an independent counter), so the alignment with `package.json` is correct.

**Result: PASS**

---

## 5. CI Status (as of 2026-05-31T22:01:19Z)

All 8 checks on `origin/fix/accessibility-phase` completed with conclusion `SUCCESS`:

| Check | Workflow | Status |
|---|---|---|
| Pa11y and axe at WCAG 2.2 AAA | Accessibility | SUCCESS |
| Lint HTML, CSS, and JavaScript | CI | SUCCESS |
| Vite build | CI | SUCCESS |
| Analyse JavaScript | CodeQL | SUCCESS |
| CodeQL | CodeQL | SUCCESS |
| Semgrep | Security | SUCCESS |
| Trivy | Security | SUCCESS |
| Dependency review | Security | SUCCESS |

The accessibility CI job passes with the empty `ignore` array. This is the most important confirmation: both formerly-suppressed Pa11y codes are gone and Pa11y exits clean without suppression.

---

## 6. Release Checklist — Patch Release 0.4.0 → 0.4.1

### 6.1 CI

- [x] CI workflow (Lint + Vite build) — SUCCESS on PR branch
- [x] Accessibility workflow (Pa11y + axe at WCAG 2.2 AAA) — SUCCESS, empty ignore array
- [x] Security workflow (Semgrep, Trivy, Dependency review) — all SUCCESS
- [x] CodeQL static analysis — SUCCESS

### 6.2 Functional, accessibility, and visual sign-off

- [x] Functional testing complete — no logic files changed, pipeline unaffected (see section 1)
- [x] Accessibility testing complete — ACC-ICCC-001, ACC-ICCC-002, ACC-ICCC-003 confirmed closed (see section 2)
- [x] Visual testing complete — no CSS value changes, comment accuracy verified (see section 3)

### 6.3 Architecture and security conformance

- [x] No new DOM APIs in `core/` files
- [x] No cross-layer import violations introduced
- [x] No new server-side calls or data uploads (tool remains fully client-side)
- [x] No changes to `src/export/`, `src/render/`, or `src/core/` — export pipeline and module boundaries intact
- [x] No changes to service worker (`public/sw.js`) — COOP/COEP headers and model caching unaffected
- [x] Security CI (Semgrep, Trivy, Dependency review) all clean

### 6.4 Version number and changelog

- [x] `package.json` version: `0.4.1`
- [x] `VERSION` file: `0.4.1`
- [ ] `CHANGELOG.md` 0.4.1 entry: not yet present — this is expected; release-please generates the CHANGELOG entry at merge time via the release PR. The commit message `fix(a11y): close ACC-ICCC-001, ACC-ICCC-002, ACC-ICCC-003 — accessibility phase` uses conventional-commit `fix:` prefix and will trigger a patch-release entry automatically.

The absence of a CHANGELOG entry does not block this PR. It is generated post-merge by the release workflow, not by the feature branch author.

### 6.5 Work folder GitHub-actions log

The work folder `012-iccc-accessibility/log.md` records the opening of the work folder and the subagent completions. The CI run URLs are captured in the PR check results at GitHub. The log is not closed yet — that is Sonja's step after merge.

### 6.6 `--fg-muted` contrast discrepancy — resolution record

The baseline documentation (Carol's audit 2026-05-23) recorded `--fg-muted` as 6.98:1 on `--bg`, failing 7:1 AAA. Sean's investigation found the actual ratio to be 7.98:1, and the Pa11y CI job now passes clean without suppression. Independent WCAG-formula calculation in this test pass confirms 7.9846:1 — above 7:1 AAA. The original 6.98:1 figure in the baseline documentation was incorrect. No CSS value change was needed or made.

**Resolution recorded:** The discrepancy originated in the baseline audit measurement. It does not represent a current failure or a risk. The Pa11y clean-pass with empty ignores is the definitive evidence. The CSS comment has been corrected to reflect the actual surfaces and verified ratios. Issue closed.

---

## 7. Release Readiness

**Ready to merge.** All required checks pass. Accessibility conformance is met with no suppressions. Version is correct. Documentation is accurate. No issues block this release.

Sonja should proceed to the merge gate and seek Tim's approval to merge `fix/accessibility-phase` into `main`.
