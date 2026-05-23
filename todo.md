# Setup-Build Items: Image Colour Contrast Checker

Outstanding items for Sean to address in the ICCC setup build. These are gaps against the team's standards; none blocks use of the tool today, but all must close before the project is declared fully compliant.

Each item is a definite action, not a question. Questions were answered in session 011 before this list was written.

## Security

1. ~~Add a `<meta http-equiv="Content-Security-Policy">` tag to the `<head>` of both `index.html` and `privacy.html`.~~ **Done in chore/project-setup.** CSP added to both pages; `script-src 'self' 'unsafe-inline'`, `connect-src 'self' https://iccc.goatcounter.com`, `worker-src 'self' blob:`, `child-src blob:`, `frame-ancestors 'none'`. See ADR 009.

2. ~~Self-host `count.js` from the project's own origin.~~ **Done in chore/project-setup.** `count.js` committed at `public/analytics/count.js`; both HTML files updated to load from `/analytics/count.js`; `docs/privacy.md` and ADR 009 updated. See ADR 009 and Jed's security review, Finding 2.

## Linting

3. ~~Add ESLint, Stylelint, and HTMLHint as pinned `devDependencies` in `package.json`. Add lint scripts.~~ **Done in chore/project-setup.** ESLint 9, Stylelint 16, HTMLHint 1 added. Lint scripts: `lint:html`, `lint:css`, `lint:js`, `lint`. Three pre-existing dead imports and two `!=` comparisons fixed as part of this item. Several Stylelint rules relaxed to `null` for pre-existing CSS code style (recorded in `.stylelintrc.json`). An accessibility phase pull request should revisit these rules.

4. ~~Add a lint job to `.github/workflows/deploy.yml` that runs `npm run lint` before the build step.~~ **Done in chore/project-setup.** `deploy.yml` updated with a `lint` job that gates the `build` job. A separate `ci.yml` also added for pull-request lint and build checks.

## Release pipeline

5. ~~Add a release-please configuration file and workflow.~~ **Done in chore/project-setup.** `release-please-config.json` and `.release-please-manifest.json` added. `release.yml` added. Release type `simple` with `VERSION` and `package.json` as extra files. See ADR 005.

## Continuous integration

6. ~~Add a CodeQL static analysis workflow to `.github/workflows/codeql.yml`.~~ **Done in chore/project-setup.** JavaScript analysis on pull request, push to main, and weekly cron.

7. **Deferred.** No unit tests or test suite exists in this repository. The Browser AI Application stack page expects unit tests (Vitest), browser behaviour tests (Playwright), and accessibility tests (axe-core, Pa11y). An accessibility test job has been added to the CI workflow via `accessibility.yml`. Unit and browser behaviour test jobs are deferred until a test suite is created. Track in a future `feat/add-test-suite` pull request.

## Version file

8. ~~Check whether a `VERSION` file exists at the repository root.~~ **Done in chore/project-setup.** `VERSION` file added containing `0.2.12`, matching `package.json`.

## README completeness

9. ~~Review `README.md` against the team's README standard.~~ **Done in chore/project-setup.** A "Hosting" section added naming GitHub Pages, the custom domain, and the service-worker COOP/COEP pattern. All other required fields (stack, browser scope, licence) were already present.

## models.json exception confirmation

10. ~~Confirm the exception status for the absent `models.json` manifest.~~ **Done in chore/project-setup.** ADR 007 confirms the bundled-from-devDependency model set does not need a separate `models.json`. Formal exception recorded at `docs/exceptions/models-json-manifest.md`. The lockfile and `scripts/copy-models.mjs` together fulfil the manifest's purpose.

---

## Deferred backlog

### D1: Unit and browser behaviour test suite

No test suite exists. The team standard for Browser AI Application projects requires Vitest unit tests and Playwright browser behaviour tests. These are deferred to a future `feat/add-test-suite` work item. The accessibility CI job (`accessibility.yml`) is in place.

### D2: CSS code-style rules (Stylelint)

Seven Stylelint rules are set to `null` in `.stylelintrc.json` because the existing CSS uses patterns the strict rules would reject (shorthand single-line declarations, legacy `rgba()` function notation, class names without BEM suffix pattern, `color-hex-length`). These are cosmetic and do not affect correctness or accessibility. An accessibility phase or housekeeping pull request should re-enable each rule and fix the violations.

### D3: Actionlint verification of workflow files

The team safety hook blocked `actionlint` invocations referencing `.github/workflows/` paths during the setup build. The workflow files follow the same structure as the LLBS workflow files, which passed actionlint. Verify with `actionlint` locally or observe CI results on push.

### D4: ACC-ICCC-001 — File-input accessible name (WCAG 4.1.2)

Selector: `#file-input`. The hidden `<input type="file">` lacks an accessible name. Pa11y code: `WCAG2AAA.Principle4.Guideline4_1.4_1_2.H91.InputFile.Name`. Pre-existing on `main`; not a regression from the setup build. Fix in the accessibility phase: add `aria-label="Choose image files"` (or equivalent label association). Remove the Pa11y ignore entry for this code from `pa11y.json` when this fix lands.

### D5: ACC-ICCC-002 — Footer and model-banner text contrast (WCAG 1.4.6)

Selectors: `#app-footer` and child links and separators; `#model-banner > span:nth-child(2)`. The `--fg-muted` token on `--bg` produces 6.98:1 in light mode (target 7:1); the model-banner text produces 6.74:1. Pa11y code: `WCAG2AAA.Principle1.Guideline1_4.1_4_6.G17.Fail`. Pre-existing on `main`; not a regression from the setup build. Fix in the accessibility phase: darken the light-mode `--fg-muted` custom property in `src/styles.css` until both the footer and the model-banner text reach 7:1 or better on `--bg`. Remove the Pa11y ignore entry for this code from `pa11y.json` when this fix lands.

### D6: ACC-ICCC-003 — Additional contrast shortfalls on index.html and privacy.html (WCAG 1.4.6, axe-core)

Selectors: `.privacy-notice` (index.html); `.privacy-page-intro`, `#app-footer`, and several link elements (privacy.html). Axe-core rule: `color-contrast-enhanced` (WCAG 2 AAA, 7:1 threshold). Same root cause as D5: `--fg-muted` on `--bg` below 7:1 in light mode. Pre-existing on `main`; not a regression from the setup build. The fix for D5 will also close these instances. No Pa11y ignore needed; axe-core CLI exits 0 on violations by default. Fix in the accessibility phase alongside D5.

### D7: ACC-ICCC-004 — Preloader tagline contrast shortfall (WCAG 1.4.3, Level AA)

Selector: `.preloader-header > .app-header-inner > .app-header-text > .tagline`. Axe-core rule: `color-contrast` (WCAG 2 AA minimum contrast, 4.5:1 threshold). This is a Level AA failure, higher priority than the AAA shortfalls above. Pre-existing on `main`; not a regression from the setup build. Fix in the accessibility phase: identify the colour token for `.tagline` in the preloader header and adjust it to reach at least 4.5:1 (AA), targeting 7:1 (AAA). No Pa11y ignore needed. Fix before D4, D5, D6 as it affects the Level AA baseline.
