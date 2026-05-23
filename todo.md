# Setup-Build Items: Image Colour Contrast Checker

Outstanding items for Sean to address in the ICCC setup build. These are gaps against the team's standards; none blocks use of the tool today, but all must close before the project is declared fully compliant.

Each item is a definite action, not a question. Questions were answered in session 011 before this list was written.

## Security

1. Add a `<meta http-equiv="Content-Security-Policy">` tag to the `<head>` of both `index.html` and `privacy.html`. The policy must allow `'self'` for scripts, styles, fonts, workers, and images; `blob:` and `data:` for images and workers; and `iccc.goatcounter.com` in `connect-src`. Once `count.js` is self-hosted (item 2), `gc.zgo.at` does not need to appear in the policy. Jed's recommended policy in the security review (`.claude/work/011-iccc-setup/jed-security-review.md`, section 4, Finding 1) is the starting point; review the WASM worker and blob origins carefully. See ADR 009.

2. Self-host `count.js` from the project's own origin. Download the current `count.js` from `https://gc.zgo.at/count.js` and commit it to `assets/analytics/count.js` (or the equivalent path in the Vite asset structure). Update both `index.html` and `privacy.html` to load the local copy, not the `gc.zgo.at` URL. Add a note in `docs/privacy.md` and `docs/decisions/009-goatcounter-analytics.md` confirming that self-hosting is in place. The quarterly review cadence for upstream `count.js` is already recorded in the global GoatCounter analytics pattern (`docs/patterns/goatcounter-analytics.md`, team root). See ADR 009 and Jed's security review, Finding 2.

## Linting

3. Add ESLint, Stylelint, and HTMLHint as pinned `devDependencies` in `package.json`. Add lint scripts (`lint:js`, `lint:css`, `lint:html`, `lint`) to `package.json`. Commit an updated `package-lock.json`. This closes the gap against decision record 006 standard 4 and the Browser AI Application stack linting requirement.

4. Add a lint job to `.github/workflows/deploy.yml` that runs `npm run lint` before the build step. CI must never install linters with `npx --yes`.

## Release pipeline

5. Add a release-please configuration file and workflow. The workflow reads Conventional Commits and opens release pull requests that update `package.json` version and the changelog. Once this is in place, manual version bumping (the current process) is superseded. See ADR 005.

## Continuous integration

6. Add a CodeQL static analysis workflow to `.github/workflows/codeql.yml`, matching the shape used by other adopted projects on the team.

7. Add unit and accessibility test jobs to the CI workflow once the test suite exists. The Browser AI Application stack page at `docs/stacks/browser-ai-application.md` (team root) describes the expected test layers (unit, browser behaviour, accessibility, AI integration). The accessibility test job runs axe-core and Pa11y against the served pages, configured for WCAG 2.2 AAA.

## Version file

8. Check whether a `VERSION` file exists at the repository root. The Browser AI Application stack page records `VERSION` as a required file holding the current semantic-version string on one line. If it is absent, add it with the current version from `package.json`.

## README completeness

9. Review `README.md` against the team's README standard (global `docs/coding-standards.md`). Confirm it names the stack, the hosting platform, the custom domain, the browser compatibility scope, and the licence. Add any missing sections.

## models.json exception confirmation

10. The Browser AI Application stack page asks for a `models.json` manifest. ICCC's project decision (ADR 007) records that the bundled-from-devDependency model set does not require a separate manifest. Confirm that ADR 007 is clearly worded on this point and that no future reviewer will interpret the absence of `models.json` as an oversight.
