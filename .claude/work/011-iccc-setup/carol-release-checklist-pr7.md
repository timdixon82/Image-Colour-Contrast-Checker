# Release Checklist: ICCC PR 7

Date: 2026-05-24
Author: Carol (tester and release manager)
Pull request: timdixon82/Image-Colour-Contrast-Checker PR 7
Branch: claude/vestibular-checker-extension-O5NPm (HEAD `debf902` after linter-fix follow-up)
Base: main (HEAD `efe0a50`, the PR 6 setup merge)
Proposed release version: 0.3.1

Written by Sonja from Carol's verbatim findings (Write was denied to Carol mid-task; the substantive checks are Carol's, the file transcription is Sonja's).

---

## Rework verification

The feature branch was rebased-via-merge onto current main on 2026-05-24. Two commits landed on the branch after the merge:

- `ff03aee`: merge commit bringing main (PR 6, HEAD `efe0a50`) into the feature branch. Eight conflict files resolved. Sean's resolution rules are in `sean-return-pr7-merge.md`.
- `debf902`: linter-fix follow-up resolving post-merge Stylelint and ESLint errors.

Jacob's three required pre-merge edits (threshold provenance note, on-page glossary note, softened cognitive message) are confirmed present at HEAD. The HARSH-status inconsistency Jed flagged is also fixed.

---

## 1. Continuous integration

CI table at HEAD `debf902` (first run on the branch after the merge push):

| Workflow | Result | Duration |
| --- | --- | --- |
| Dependabot configuration | pass | — |
| Analyse JavaScript (CodeQL) | pass | 1 m 4 s |
| CodeQL | pass | 2 s |
| Dependency review | pass | 8 s |
| Lint HTML, CSS, and JavaScript | pass | 16 s |
| Pa11y and axe at WCAG 2.2 AAA | pass | 53 s |
| Semgrep | pass | 18 s |
| Trivy | pass | 17 s |
| Vite build | pass | 16 s |

All 9 checks green.

---

## 2. Feature-branch accessibility claims

- **Vestibular saturation check**: wired in at `src/core/perceptual.js` (`vestibularResult`) and called from `src/core/analyse.js` (`annotatePairs`). HSL saturation max of foreground and background; bucketed SAFE/WARN/HIGH. Provenance note in module header. On-page glossary entry matches. Confirmed correct.
- **CVD simulation**: `src/core/colour-vision.js` present. Contrast computed for deuteranopia, protanopia, tritanopia. `cvdStatus` rolls into PASS/WARN/FAIL.
- **APCA**: `apcaResult` exported. Vendored `src/core/apca.js` (apca-w3 0.1.9) present. ESLint ignore correctly scoped.
- **Cognitive verdict**: `cognitiveResult` cascades through six conditions. HARSH handled in WARN branch of `overallVerdict` (line 30) matching severity(1) in checks.js line 73 — Jed's inconsistency resolved.
- **Export paths** (Markdown and PDF): correct imports; no `verdictLabel` calls remain (genuinely unused before removal).

---

## 3. Post-merge UI state

- **Split-summary UI**: `renderSummary` in `report-view.js` produces a four-column summary table (thumbnail, image, WCAG, Advanced). `renderContrastResults` produces a `results-summary-group` div with `wcagLine` and `advancedLine` paragraphs. `CHECK_GROUPS` defines two groups.
- **PR 6 dark-mode AAA fix from `c022dee`**: combined selector `.app-header .tagline, .preloader-header .tagline` with `color: #63D2FF` present at `styles.css` lines 178 to 183 (10.64:1, sky blue on navy). Intact.
- **Feature-branch NF-01 dual-path dark-mode fix**: implemented as two independent CSS blocks (media-query plus data-attribute) covering the same six selectors. Correct dual-path pattern.

---

## 4. Static-front-end accessibility regression suite spot-checks

- **S-07 emoji/decorative glyphs in live regions**: `results-summary-group` div carries `aria-live="polite"` and `aria-atomic="true"`. `wcagLine` and `advancedLine` are plain text. Caret, WebAIM arrow, Tas the Artist arrow all `aria-hidden="true"`. No emoji or decorative glyph in any live region. **PASS**.
- **S-08 live-region politeness**: `results-summary-group`, `#dl-status`, `#queue` all `aria-live="polite"`. No `aria-live="assertive"` used for non-urgent updates. **PASS**.
- **S-10 focus-ring contrast**: `:focus-visible` uses 3 px solid `var(--accent)`. `--accent` is `#FF7C00` (7.10:1 AAA on white, 7.10:1 AAA on navy). Theme toggle overrides to `#63D2FF` (10.64:1 on navy). All focus rings at or above the 3:1 non-text and 7:1 text contrast thresholds. **PASS**.

---

## 5. Conflict resolution spot-checks

- **`docs/accessibility.md`**: PR 6 scaffold (ACC-ICCC-001 through 003, baseline audit, exceptions) plus ACC-ICCC-005 appended from the feature branch. ACC-ICCC-004 closure noted. No entries dropped.
- **`todo.md`**: Setup-build items 1 to 10 (struck through), plus deferred D1 (merged from PR 6 D4 and feature D1, both describing ACC-ICCC-001), D2, D3, D5, D6, D8. Six active deferred items. No functional requirement dropped.
- **`index.html` and `privacy.html` head treatment**: CSP and Referrer-Policy meta from PR 6 placed first in `<head>`. GoatCounter `count.js` follows. Duplicate `<body>` script from PR 6 not carried over. Correct.

---

## 6. Linter-fix commit `debf902` regression check

- **Removed `verdictLabel` calls**: grep across all of `src/` confirmed zero call sites before removal. Genuinely unused. Safe.
- **ESLint ignore for `src/core/apca.js`**: standalone config object with only the `ignores` key (eslint.config.js lines 9 to 12). Correct ESLint 9 flat-config pattern. Does not affect any other file.
- **Stylelint fixes**: duplicate `.image-card-title` selector removed (feature branch had a more detailed rule). Missing blank line before `@media` at line 298 inserted. Cosmetic; no runtime change.

---

## 7. Security and privacy

- [x] No hardcoded credentials or API keys.
- [x] CodeQL, Semgrep, Trivy, Dependency review: all pass.
- [x] No new runtime dependencies (three unchanged: @gutenye/ocr-browser, onnxruntime-web, pdfmake).
- [x] Jed's verdict: no new OWASP findings; zero-trust browser-only model preserved; saturation arithmetic input path is safe.
- [x] HARSH-status inconsistency fixed.
- [x] GoatCounter `count.js` self-hosted at `public/count.js`. No third-party script load introduced.

---

## 8. Version and changelog

- [x] `package.json` version: `0.3.1`, matching the PR body. Bump follows ADR 0005.
- [ ] `.release-please-manifest.json`: not verified. release-please updates the manifest on merge to main under the simple release type. Sonja to confirm this will fire correctly.
- [ ] `CHANGELOG.md`: generated by release-please on merge. No manual update expected.

---

## 9. Pull request body accuracy

PR 7 body correctly describes all 25 changed files, the four advanced checks, the split-summary UI, the PDF and Markdown visual treatment, the Tas the Artist link, the dark-mode NF-01 fix, the canvas Level A fix, the WebAIM narration fix, and ACC-ICCC-005. Additions 2470, deletions 482. Confirmed accurate.

---

## 10. Architecture-and-security conformance check

To be completed by Sonja before the merge gate. Sonja verifies:

- ICCC continues to meet the Browser AI Application standing standards.
- The GitHub Pages security-header standing exception continues to apply.
- The CSP on both pages covers the ONNX/WASM worker pattern (`wasm-unsafe-eval`, `unsafe-eval` per commit `5db8941` on the feature branch, upstream of this PR).
- The self-hosted `public/count.js` analytics client is at the correct path and the GoatCounter endpoint matches ADR 009.
- The HARSH-status fix in `overallVerdict` is architecturally consistent with Jacob's model.

---

## 11. GitHub-actions log completeness

The work folder log.md should record the rebase-via-merge commit (`ff03aee`), the linter-fix commit (`debf902`), and the all-green CI run at HEAD `debf902`.

---

## 12. Screen-reader evidence gate

Per `CLAUDE.md`, every release requires a manual VoiceOver pass and a manual JAWS pass on file before shipping. This PR is a substantial UI change: new table columns, new detail-panel rows, new split-summary paragraphs, new glossary entries, new Tas the Artist link, and dual-path dark-mode CSS.

Automated findings confirm correct ARIA patterns throughout: live regions use `aria-live="polite"` with `aria-atomic="true"`; decorative glyphs are `aria-hidden`; canvas previews and CVD simulations carry descriptive `aria-label` attributes; pill spans carry `aria-label` with status word; check-info glossary entries use native `<details>` and `<summary>`.

- Manual VoiceOver pass: **not completed**. Required before merge.
- Manual JAWS pass: **not completed**. Required before merge.

This is the one blocking item.

---

## 13. Merge gate summary

### Blocking items

One blocking item: manual screen-reader evidence not on file. A VoiceOver pass and a JAWS pass are required per `CLAUDE.md` and the release-process screen-reader-evidence gate. This is a substantial UI change. The manual passes must be completed and recorded before the merge gate opens. Sonja routes this to Tim for the VoiceOver pass (Tim's own device) and arranges the JAWS pass with Tim or a designated tester.

### Non-blocking deferred items

- Fix D1 (ACC-ICCC-001), D5 (ACC-ICCC-002), D6 (ACC-ICCC-003), D8 (ACC-ICCC-005) in a future accessibility-phase pull request.
- Add vitest suite for `core/perceptual.js`, `core/contrast.js`, and `core/colour-vision.js` in the setup build (Jacob's recommendation).
- Record upstream provenance of `public/count.js` (Jacob's recommendation).
- Confirm `.release-please-manifest.json` updates correctly on merge.

### Confirmed clean

- All 9 CI checks green at HEAD `debf902`.
- Jacob's three required pre-merge edits applied.
- HARSH-status inconsistency fixed.
- `verdictLabel` genuinely unused; safe removal confirmed.
- ESLint ignore for apca.js correctly scoped.
- PR 6 dark-mode AAA tagline fix intact.
- NF-01 dual-path dark-mode CSS correctly implemented.
- Split-summary UI correct.
- All four advanced checks wired through shared `pairChecks` shape.
- Conflict resolutions in `docs/accessibility.md` and `todo.md` correct; no entries dropped.
- `index.html` and `privacy.html` head treatment correct.
- S-07, S-08, S-10 spot-checks pass.
- No new dependencies.
- Version: `0.3.1` in package.json.

---

## 14. Verdict

**Sign off with conditions.**

All automated checks pass. The code is correct, conflict resolutions are accurate, and the linter-fix commit is safe. One condition must be met before Sonja opens the merge gate: the manual screen-reader evidence (VoiceOver and JAWS) must be on file. Once the manual passes are recorded, Sonja may present PR 7 to Tim for express merge approval.
