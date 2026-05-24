# To Do: Image Colour Contrast Checker

This file tracks outstanding and deferred work items. The setup-build items (items 1 to 10) were completed in PR 6 (chore/project-setup). The deferred backlog records items that are not blocking current releases.

## Setup-build items (completed in PR 6)

1. ~~Add a `<meta http-equiv="Content-Security-Policy">` tag to the `<head>` of both `index.html` and `privacy.html`.~~ **Done in chore/project-setup.** CSP added to both pages; `script-src 'self' 'unsafe-inline'`, `connect-src 'self' https://iccc.goatcounter.com`, `worker-src 'self' blob:`, `child-src blob:`, `frame-ancestors 'none'`. See ADR 009.

2. ~~Self-host `count.js` from the project's own origin.~~ **Done in chore/project-setup.** `count.js` committed at `public/analytics/count.js`; both HTML files updated to load from `/analytics/count.js`; `docs/privacy.md` and ADR 009 updated. See ADR 009 and Jed's security review, Finding 2.

3. ~~Add ESLint, Stylelint, and HTMLHint as pinned `devDependencies` in `package.json`. Add lint scripts.~~ **Done in chore/project-setup.** ESLint 9, Stylelint 16, HTMLHint 1 added. Lint scripts: `lint:html`, `lint:css`, `lint:js`, `lint`. Three pre-existing dead imports and two `!=` comparisons fixed as part of this item. Several Stylelint rules relaxed to `null` for pre-existing CSS code style (recorded in `.stylelintrc.json`). An accessibility phase pull request should revisit these rules.

4. ~~Add a lint job to `.github/workflows/deploy.yml` that runs `npm run lint` before the build step.~~ **Done in chore/project-setup.** `deploy.yml` updated with a `lint` job that gates the `build` job. A separate `ci.yml` also added for pull-request lint and build checks.

5. ~~Add a release-please configuration file and workflow.~~ **Done in chore/project-setup.** `release-please-config.json` and `.release-please-manifest.json` added. `release.yml` added. Release type `simple` with `VERSION` and `package.json` as extra files. See ADR 005.

6. ~~Add a CodeQL static analysis workflow to `.github/workflows/codeql.yml`.~~ **Done in chore/project-setup.** JavaScript analysis on pull request, push to main, and weekly cron.

7. **Deferred.** No unit tests or test suite exists in this repository. The Browser AI Application stack page expects unit tests (Vitest), browser behaviour tests (Playwright), and accessibility tests (axe-core, Pa11y). An accessibility test job has been added to the CI workflow via `accessibility.yml`. Unit and browser behaviour test jobs are deferred until a test suite is created. Track in a future `feat/add-test-suite` pull request.

8. ~~Check whether a `VERSION` file exists at the repository root.~~ **Done in chore/project-setup.** `VERSION` file added containing `0.2.12`, matching `package.json`.

9. ~~Review `README.md` against the team's README standard.~~ **Done in chore/project-setup.** A "Hosting" section added naming GitHub Pages, the custom domain, and the service-worker COOP/COEP pattern. All other required fields (stack, browser scope, licence) were already present.

10. ~~Confirm the exception status for the absent `models.json` manifest.~~ **Done in chore/project-setup.** ADR 007 confirms the bundled-from-devDependency model set does not need a separate `models.json`. Formal exception recorded at `docs/exceptions/models-json-manifest.md`. The lockfile and `scripts/copy-models.mjs` together fulfil the manifest's purpose.

---

## Deferred backlog

### D1 — File input accessible name (ACC-ICCC-001, WCAG 4.1.2 Level A)

Add `aria-label="Upload images for analysis"` to `#file-input`. The hidden input is triggered by a visible button but still needs an accessible name. Pa11y code: `WCAG2AAA.Principle4.Guideline4_1.4_1_2.H91.InputFile.Name`. Pre-existing on `main`; not a regression from the setup build. Fix in the accessibility phase. Remove the Pa11y ignore entry for this code from `pa11y.json` when this fix lands. See `docs/accessibility.md` ACC-ICCC-001.

### D2 — CSS code-style rules (Stylelint)

Seven Stylelint rules are set to `null` in `.stylelintrc.json` because the existing CSS uses patterns the strict rules would reject (shorthand single-line declarations, legacy `rgba()` function notation, class names without BEM suffix pattern, `color-hex-length`). These are cosmetic and do not affect correctness or accessibility. An accessibility phase or housekeeping pull request should re-enable each rule and fix the violations.

### D3 — Actionlint verification of workflow files

The team safety hook blocked `actionlint` invocations referencing `.github/workflows/` paths during the setup build. The workflow files follow the same structure as the LLBS workflow files, which passed actionlint. Verify with `actionlint` locally or observe CI results on push.

### D5 — Footer and model-banner contrast in light mode (ACC-ICCC-002, WCAG 1.4.6 AAA)

`--fg-muted` (#454c58) gives 6.98:1 on the footer surface and 6.74:1 on the model-banner surface. Both fail the 7:1 AAA threshold. Pa11y code: `WCAG2AAA.Principle1.Guideline1_4.1_4_6.G17.Fail`. Pre-existing on `main`; not a regression from the setup build. Fix in the accessibility phase: darken the light-mode `--fg-muted` custom property in `src/styles.css` until both the footer and the model-banner text reach 7:1 or better on `--bg`. Remove the Pa11y ignore entry for this code from `pa11y.json` when this fix lands. See `docs/accessibility.md` ACC-ICCC-002.

### D6 — Privacy notice and privacy page contrast (ACC-ICCC-003, WCAG 1.4.6 AAA)

Same root cause as D5: `--fg-muted` on `--bg` below 7:1 in light mode. Selectors: `.privacy-notice` (index.html); `.privacy-page-intro`, `#app-footer`, and several link elements (privacy.html). Pre-existing on `main`; not a regression from the setup build. The fix for D5 will also close these instances. No Pa11y ignore needed; axe-core CLI exits 0 on violations by default. Fix in the accessibility phase alongside D5. See `docs/accessibility.md` ACC-ICCC-003.

### D8 — pdfmake untagged PDF (ACC-ICCC-005, WCAG 4.1.2 Level A, PDF/UA context)

pdfmake does not produce a tagged PDF conforming to ISO 14289 (PDF/UA). Images in the exported PDF lack structural alt text and will not be announced semantically by PDF-reading screen readers. The web report is the primary accessible experience.

Resolution path: migrate to a PDF/UA-compliant library when one is available, or adopt a future pdfmake version if tagging support is added upstream.

See `docs/accessibility.md` ACC-ICCC-005.
