# Accessibility: Image Colour Contrast Checker

ICCC targets Web Content Accessibility Guidelines (WCAG) 2.2 at AAA conformance for its own interface. The team's full WCAG 2.2 AAA interpretation, the testing protocol, and the exception pattern are in the global wiki at `docs/accessibility.md` in the team root. This page records the project-specific accessibility posture, the known exceptions, and the current audit status.

## Conformance target

WCAG 2.2, Level AAA.

The target applies to both pages ICCC serves: `index.html` (the tool) and `privacy.html` (the privacy statement).

## Inherited standards

Read the global wiki at `docs/accessibility.md` (team root) for:

- The full WCAG 2.2 AAA criterion-by-criterion interpretation.
- The legal baseline (UK equality law, European Accessibility Act, ADA, Section 508).
- The testing protocol and screen-reader pairing requirements.
- The exception pattern and how to record exceptions.

## Project-specific posture

### Colour contrast

All body text colour pairs meet or exceed the 7:1 ratio required by WCAG 2.2 criterion 1.4.6 (Contrast, Enhanced). The verified pairs for both light mode and dark mode are documented in `DESIGN_GUIDELINES.md` at the repository root. Status indicator colours (pass, fail, warn) use solid-background pill styles in both themes so contrast is independent of the surface behind them.

### Keyboard operation

The tool is fully operable without a pointing device. The drop zone carries `tabindex="0"` and `role="button"` so it is reachable and activatable by keyboard. The file picker button, the theme toggle, and all action-bar buttons are reachable by Tab and activatable by Enter or Space.

### Screen reader operation

The preloader dialog uses `role="dialog"` and `aria-modal="true"`. The `<main>` element carries the `inert` attribute while the preloader is active, preventing screen reader focus from reaching the application content before it is ready. The preloader status region carries `aria-live="polite"` and `aria-atomic="true"` so progress updates are announced without interrupting the user. The processing queue carries `aria-live="polite"` so stage changes are announced as each file progresses.

### Reduced-motion

All animations and transitions check `@media (prefers-reduced-motion: reduce)`. Under that preference, animation durations are collapsed to 0.01 ms.

### Page language

Both HTML entry points carry `<html lang="en-GB">`.

### Skip link

A skip link reading "Skip to main content" is the first focusable element in `<body>` and links to `#app`, meeting WCAG 2.4.1 (Bypass Blocks).

## Pre-existing AAA failures, deferred to the accessibility phase

Carol's baseline audit (2026-05-23) identified two WCAG 2.2 AAA failures via Pa11y and two further groups of failures via axe-core that were present on `main` before the setup build. None was a regression from the setup build. All three deferred groups (ACC-ICCC-001, ACC-ICCC-002, ACC-ICCC-003) were closed in the accessibility-phase pull request. The Pa11y ignore entries for ACC-ICCC-001 and ACC-ICCC-002 have been removed from `pa11y.json`.

### ACC-ICCC-001: File-input accessible name gap — RESOLVED

WCAG 2.2 criterion: 4.1.2 (Name, Role, Value).

Selector: `#file-input`.

Element: `<input id="file-input" type="file" accept="image/*" multiple hidden>`.

Failing value: no accessible name was present.

**Resolved in PR fix/accessibility-phase.** Added `aria-label="Upload images for analysis"` to the `#file-input` element in `index.html`. The Pa11y ignore entry `WCAG2AAA.Principle4.Guideline4_1.4_1_2.H91.InputFile.Name` has been removed from `pa11y.json`.

### ACC-ICCC-002: Footer and model-banner text contrast shortfall — RESOLVED

WCAG 2.2 criterion: 1.4.6 (Contrast, Enhanced). AAA threshold: 7:1 for normal-weight body text.

Affected selectors: `#app-footer` and all child links and separator spans; `#model-banner > span:nth-child(2)`.

**Resolved in PR fix/accessibility-phase.** Confirmed that `--fg-muted` (#454c58) already achieves 7.98:1 on `--bg` (#f4f6f8) and 7.71:1 on `--neutral-bg` (#f0f2f5) — both above the 7:1 AAA threshold. The comment in `src/styles.css` was corrected to reference the actual surfaces rather than white. The Pa11y ignore entry `WCAG2AAA.Principle1.Guideline1_4.1_4_6.G17.Fail` has been removed from `pa11y.json`.

### ACC-ICCC-003: Additional contrast shortfalls found by axe-core (WCAG 1.4.6 and 1.4.3) — RESOLVED

Tool: axe-core 4.11.4.

Selectors on `index.html`: `.privacy-notice` (rule: `color-contrast-enhanced`, WCAG 2 AAA, axe tag `wcag2aaa`).

Selectors on `privacy.html`: `.privacy-page-intro`, `#app-footer`, `a[target="_blank"][rel="noopener noreferrer"]:nth-child(2)`, `a[target="_blank"][rel="noopener noreferrer"]:nth-child(4)`, `a[target="_blank"][rel="noopener noreferrer"]:nth-child(6)`, `a[href$="privacy.html"]`, `a[rel="noopener"]` (rule: `color-contrast-enhanced`, WCAG 2 AAA, 7 occurrences).

**Resolved in PR fix/accessibility-phase.** Same root cause as ACC-ICCC-002. The fix for ACC-ICCC-002 (confirming and documenting that `--fg-muted` #454c58 achieves 7:1+ on all relevant light-mode surfaces) closes these instances.

## Known baseline audit status

Carol's baseline audit was completed on 2026-05-23 (HEAD 6fe48ab). Pa11y found two pre-existing AAA codes (ACC-ICCC-001, ACC-ICCC-002). After the rework Pa11y scoped ignore list was applied (commit 713766b), axe-core ran and found two further pre-existing groups of contrast shortfalls (ACC-ICCC-003, ACC-ICCC-004). All four groups were pre-existing on `main` and were not regressions.

- **ACC-ICCC-001** — CLOSED in PR fix/accessibility-phase. `aria-label="Upload images for analysis"` added to `#file-input`. Pa11y ignore entry removed.
- **ACC-ICCC-002** — CLOSED in PR fix/accessibility-phase. Confirmed `--fg-muted` (#454c58) meets 7:1 AAA on all light-mode surfaces; CSS comment corrected. Pa11y ignore entry removed.
- **ACC-ICCC-003** — CLOSED in PR fix/accessibility-phase. Same root cause as ACC-ICCC-002; resolved by the same fix.
- **ACC-ICCC-004** — CLOSED in the setup-build pull request (chore/project-setup): the `.preloader-header .tagline` selector was added to the existing `.app-header .tagline` rule in `src/styles.css`, setting `color: #63D2FF` (sky blue) and reaching 10.64:1 AAA on the always-navy preloader header in both light and dark themes.

The Pa11y `ignore` array in `pa11y.json` is now empty. The Pa11y and axe-core CI job passes with no suppressed codes.

## CI accessibility check setup

The accessibility CI workflow (`.github/workflows/accessibility.yml`) builds the Vite application, serves `dist/` on port 8080, and runs Pa11y and axe-core against `index.html` and `privacy.html`.

### Accessibility tools

Pa11y, `@axe-core/cli`, and `wait-on` are pinned in `.github/accessibility-tools/package.json`. Dependabot tracks this manifest and proposes version bumps automatically. CI installs them with `npm ci` from the committed `package-lock.json` in that directory.

### ChromeDriver strategy (CDN-based exact version match)

The workflow uses the team-standard CDN-based ChromeDriver approach:

1. Pa11y: `pa11y.ci.json` is generated at CI time using `jq`, overriding `chromeLaunchConfig.executablePath` to the runner's system Chrome path. `pa11y.ci.json` must not be committed; it is excluded in `.gitignore`.
2. axe-core: the workflow probes the Chrome binary for its full four-part version, then downloads the exactly matching ChromeDriver from the Chrome for Testing CDN (`storage.googleapis.com/chrome-for-testing-public`). The path is written to `GITHUB_ENV` and passed to axe via `--chromedriver-path`.

This approach replaced `browser-driver-manager` on 2026-05-31 to align with the team template.

### Reverting to browser-driver-manager

If the CDN approach fails (for example, if GitHub Actions removes the Chrome binary from its expected path), revert by replacing the "Install matching ChromeDriver for axe-core" step and the "Build CI pa11y config" step in `accessibility.yml` with:

```yaml
- name: Install matching Chrome and ChromeDriver
  run: npm install -g browser-driver-manager@2.0.1 && npx browser-driver-manager install chrome
```

Also remove `--chromedriver-path "$CHROMEDRIVER_PATH"` and the surrounding conditional from both axe steps, and revert to `npm install -g pa11y@9.1.1 @axe-core/cli@4.11.3 wait-on@8.0.1` in place of the `npm ci` in `.github/accessibility-tools/`.

### ACC-ICCC-005 — pdfmake does not produce a tagged PDF; images have no structural alt text (WCAG 4.1.2 Level A, PDF/UA context)

The PDF export uses the pdfmake library (version 0.2.x). pdfmake does not generate a tagged PDF conforming to ISO 14289 (PDF/UA). Screen readers that process the PDF will read content in reading order but will not announce images as image elements, because the PDF lacks a structural accessibility tree.

Every image in the exported PDF (preview, swatch, colour-blindness simulations, cropped region) will be treated as an untagged artefact. Mitigating factors are in place: every image has a visible text caption or an adjacent descriptive sentence, so the semantic content is available to sighted readers. The PDF is a supplementary export format; the primary accessible experience is the interactive web report.

This is a known limitation of the pdfmake library and is not a regression in this branch. The only complete fix is a migration to a different PDF library that supports PDF/UA tagging, or adopting a future version of pdfmake if tagging support is added upstream.

- WCAG criterion: 4.1.2 Name, Role, Value, Level A (as applied to PDF/UA)
- Library: pdfmake 0.2.x
- Deferred backlog: D8 in todo.md
- Resolution path: migrate to a PDF/UA-compliant library when available.

## Exceptions

Exceptions for this project are held in `docs/exceptions/`. At the time of project wiki scaffolding:

- `docs/exceptions/github-pages-headers.md` records the standing exception for the GitHub Pages security-header gap (CSP `frame-ancestors` and `Permissions-Policy` cannot be sent as HTTP headers on this host).

No WCAG 2.2 AAA exceptions have been formally accepted at this stage. Any Carol-raised findings that cannot be closed immediately will be added here with Tim's sign-off.
