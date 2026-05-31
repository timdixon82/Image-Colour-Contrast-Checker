# Work Folder Log: 011-iccc-setup

This log is chronological and append-only. Each entry starts with a heading in the form `## [YYYY-MM-DD] <operation> | <subject>`.

## [2026-05-23] open | Opened work folder and cloned the repository locally

Sonja opened work folder `011-iccc-setup` and cloned `timdixon82/Image-Colour-Contrast-Checker` to `Inputs/Image-Colour-Contrast-Checker/` (gitignored). The clone is the backfill agents' source of truth.

The HANDOFF backlog reorder Tim made on 2026-05-22 puts ICCC backfill as the next item after the design-system organisation. Tim's autonomous-execution window remains in force.

## [2026-05-23] decision | Backfill round one dispatch

Two subagents dispatched in parallel, with Jed and Carol following later when the other dispatches free up the slot:

- Tad: business-analysis review (`tad-requirements.md`).
- Jacob: architecture review (`jacob-architecture-review.md`).

Sean is busy on the dashboard build (work folder 010). Carol holds for the dashboard test pass. Jed dispatches after Tad or Jacob returns to keep the load even.
- [2026-05-23 01:37:19] subagent completed
- [2026-05-23 01:41:50] subagent completed
- [2026-05-23 08:47:36] subagent completed
- [2026-05-23 09:39:46] subagent completed
- [2026-05-23 09:40:57] subagent completed
- [2026-05-23 11:30:05] subagent completed

## [2026-05-23] hold | ICCC placed on hold while team progresses other work

Tim's instruction on session resume: "let's put ICCC on hold for now and progress everything else." `.current` repointed from `011-iccc-setup` to `005-llbs-setup`. Active dispatches: Sean on LLBS HTML lint, Tad on the Braille-Reference wiki, Tad on the timdixon82.github.io wiki, all in parallel. ICCC resumes when Tim lifts the hold; resume point is the remaining six ADRs and the main wiki pages for the ICCC project wiki, then Sean for the ICCC setup build, then Carol.

## [2026-05-23] feat | Four user-experience changes Tim requested on the feature branch

Tim asked for four user-experience changes on `claude/vestibular-checker-extension-O5NPm`: remove the "What do the checks mean" footer link; add a link promoting the tas-the-artist Vestibular Accessible Design Checker for single-pair checking; align the report's visual language to the page; and split the contrast-results summary into separate WCAG and Advanced lines. Sean implemented the four changes in three commits on top of `d7817e9`:

- `93e3e13` `feat(footer): remove "What the checks mean" link from the footer` — removed the `#check-glossary` link entry from `src/main.js`.
- `d4da018` `feat(report): split contrast summary into WCAG and Advanced lines; add pair-check link` — added `wcagLine()` and `advancedLine()` in `src/export/checks.js`; updated `src/ui/report-view.js` to render two `<p>` elements in an `aria-live="polite"` group; added the tas-the-artist link with visually-hidden "(opens in new window)" warning; updated `src/export/pdf.js` and `src/export/markdown.js` so all three output formats stay in sync; bumped `package.json` to v0.2.22.
- `b088ea8` `feat(styles): align report layout with page visual language` — updated `src/styles.css`: results-header h2 gets `font-weight: 800`, the orange accent bar, and a border-bottom separator; image-card h4 sub-headings become small-caps accent-colour labels; duplicate rule declarations removed.

Branch not pushed; the existing feature branch stays open for Tim to review live, then Tim's express approval is the merge gate. Vite dev server was killed at Tim's instruction once Sean finished; Sonja restarts it when reporting "all done".

## [2026-05-23] commit | ICCC project wiki scaffolded on new chore/project-setup branch

With Tim's full lift of the ICCC hold (Q56B), Tad finished the project wiki: six new ADRs (004 through 009 in Jacob's order — export contract, Vite, no-UI-framework, bundled runtime dependencies, service-worker cross-origin isolation, GoatCounter opt-out) on top of the three Tad wrote earlier (001 client-side-only, 002 layered structure, 003 PaddleOCR/ONNX Runtime Web). Seven main wiki pages (index, log, glossary, coding standards, accessibility, release process, privacy). A one-paragraph pointer at `docs/exceptions/github-pages-headers.md` covers the standing GitHub Pages security-header exception (ICCC qualifies; it is on GitHub Pages with custom domain `image-colour-contrast-checker.timdixon.net`). A new project-level pattern at `docs/patterns/cross-origin-isolation-service-worker.md` records the COOP/COEP service-worker approach, flagged as a cross-cutting candidate for the global wiki. ICCC opts out of the GoatCounter default and uses its own `iccc.goatcounter.com` site, recorded as ADR 009. Sonja created branch `chore/project-setup` from `main`, staged the 20 files (Tad's three earlier ADRs included), and committed at `2c900d3`. Branch not pushed. Next: dispatch Sean for the ten setup-build items in `todo.md`.

## [2026-05-23] dispatch | Sean on ICCC setup build

Sonja dispatched Sean in the background to complete the ten setup-build items on `chore/project-setup`. The list, in `todo.md` priority order: CSP meta tag, self-hosted `count.js`, pinned linter manifest, CI lint job, release-please configuration, CodeQL workflow, test jobs, VERSION file check, README completeness check, and models.json exception confirmation.

## [2026-05-23] build | Sean completed ICCC setup build

Sean completed all ten todo.md items on `chore/project-setup`. Four commits on top of Tad's wiki scaffold at 2c900d3:

- ce0fc20 chore: adopt ICCC to the team standard (VERSION, README Hosting section, models.json exception file, todo.md deferred backlog)
- 84aaecc chore: self-host analytics and add CSP meta tag (Jed's two security findings closed; count.js committed at public/analytics/count.js; CSP meta tag with correct directives for ONNX/WASM workers and GoatCounter connect-src)
- f0d25b5 chore: pin linters in a development manifest (ESLint 9, Stylelint 16, HTMLHint 1; three dead imports removed; != tightened to !==; deprecated word-break fixed)
- 6fe48ab ci: add CI, security, accessibility, CodeQL, and release workflows (five workflows plus dependabot.yml, release-please config, pa11y.json)

All three linters exit 0. Vite build passes. Branch pushed. PR opened at https://github.com/timdixon82/Image-Colour-Contrast-Checker/pull/6.

Deferred: test suite (Vitest + Playwright), CSS code-style rules, actionlint verification (blocked by safety hook). Recorded in todo.md D1-D3.

## [2026-05-23] rework | ICCC Pa11y backlog recorded and ignore list scoped

Sean applied three planned commits and one additional fourth commit following the axe-core output inspection.

Commit 1 — `713766b` `ci: scope Pa11y to the setup PR's accepted-deferred WCAG codes`. Updated `pa11y.json` to add an `ignore` array with exactly two entries: `WCAG2AAA.Principle4.Guideline4_1.4_1_2.H91.InputFile.Name` (ACC-ICCC-001) and `WCAG2AAA.Principle1.Guideline1_4.1_4_6.G17.Fail` (ACC-ICCC-002). Comment block updated to cite the deferred-backlog records in `docs/accessibility.md` and `todo.md`, and to instruct that both ignore entries must be removed in the accessibility-phase pull request. No Level A codes suppressed.

Commit 2 — `3726bde` `docs: record pre-existing AAA failures as deferred backlog`. Added a "Pre-existing AAA failures, deferred to the accessibility phase" section to `docs/accessibility.md` with full entries for ACC-ICCC-001 (file-input accessible name, WCAG 4.1.2) and ACC-ICCC-002 (footer and model-banner text contrast, WCAG 1.4.6, 6.98:1 and 6.74:1 in light mode).

Commit 3 — `66819f1` `docs: add deferred AAA items to todo`. Appended D4 and D5 to the deferred-backlog section of `todo.md` with WCAG codes, selectors, and the instruction to remove the Pa11y ignores when fixes land.

Push after commit 3. All CI checks passed: Pa11y and axe at WCAG 2.2 AAA: pass (50 s). All 8 checks green.

Commit 4 — `7ada45c` `docs: extend deferred backlog with axe-core findings`. After inspecting the axe-core CI output from the passing run, Sean found two additional groups of pre-existing findings not covered by the Pa11y codes: ACC-ICCC-003 (axe `color-contrast-enhanced` on `.privacy-notice` in index.html and `.privacy-page-intro` plus footer/links in privacy.html — same root cause as ACC-ICCC-002, the D5 fix will also close these) and ACC-ICCC-004 (axe `color-contrast` at Level AA on `.preloader-header .tagline` — this is a Level AA shortfall, higher priority than the AAA items). Both added as D6 and D7 in `todo.md` and as ACC-ICCC-003 and ACC-ICCC-004 in `docs/accessibility.md`. No Pa11y ignores added. No Level A codes suppressed. Pushed.

CI outcome after all four commits: all 8 checks pass. Pa11y exits clean (no issues found on index.html or privacy.html). Axe-core reports violations to stdout but exits 0. The four deferred findings are documented and the Pa11y ignore list is narrowly scoped to the two pre-existing codes confirmed by Carol's audit.

## [2026-05-23] fix | ACC-ICCC-004 closed: preloader-header tagline colour fixed for light-mode AA

Sean extended the existing `.app-header .tagline` rule in `src/styles.css` to also cover `.preloader-header .tagline`, setting `color: #63D2FF` (sky blue, 10.64:1 AAA on navy) in both themes. The light-mode inherited value of `--fg: #1a1a1a` on the always-navy preloader header gave approximately 3.2:1, failing the 4.5:1 AA threshold. The fix brings both selectors to 10.64:1 AAA in light and dark mode alike. No Pa11y ignore list changes were needed (ACC-ICCC-004 was an axe-core `color-contrast` finding, not a Pa11y code). The two existing Pa11y ignores (ACC-ICCC-001 and ACC-ICCC-002) remain in place.

Commit `c022dee` `fix(a11y): set preloader-header tagline colour for AA in light mode (ACC-ICCC-004)` pushed to `chore/project-setup`. ACC-ICCC-004 removed from `docs/accessibility.md` and D7 removed from `todo.md`. All three linters (Stylelint, HTMLHint, ESLint) exit 0 after the change. CI triggered on PR 6; axe-core `color-contrast` finding on `.preloader-header .tagline` expected to disappear.

## [2026-05-23] merge | PR 6 merged to main

ICCC PR 6 (`chore/project-setup`) merged to main on 2026-05-23. All 8 CI checks passed. The setup build is complete. Work continues on the open vestibular feature branch (PR 7).

## [2026-05-23] review | Jacob and Jed reviewed the vestibular feature branch

Jacob and Jed reviewed `claude/vestibular-checker-extension-O5NPm` in parallel. Jacob confirmed the change set is architecturally sound: small, focused, correct dependency direction, consistent with the `pairChecks` data contract. Jacob required three pre-merge edits: (1) threshold provenance note in `perceptual.js`, (2) on-page glossary entry, and (3) softened cognitive message. Jed passed with no blocking findings; one pre-existing HARSH-status inconsistency flagged for Sean to fix.

Tim also requested four UX changes on the feature branch (2026-05-23): remove the footer glossary link, add the Tas the Artist link, align report visual language to page, and split contrast results into WCAG and Advanced lines. Sean implemented all four in three commits.

## [2026-05-24] build | Sean merged main into feature branch; PR 7 CI green

Sean merged PR 6 main into the feature branch (merge commit `ff03aee`), resolved eight conflict files, and fixed post-merge linter errors (commit `debf902`). All 9 CI checks green at HEAD `debf902`. Carol's release checklist signed off "with conditions" — only condition was the screen-reader evidence gate, which is suspended per CLAUDE.md. Full checklist at `carol-release-checklist-pr7.md`.

## [2026-05-28] conformance | Sonja conformance check complete

Sonja ran the architecture-and-security conformance check for PR 7. All five items pass: Browser AI Application standards, GitHub Pages security-header exception, CSP ONNX/WASM coverage, self-hosted count.js and GoatCounter endpoint (ADR 009), and HARSH-status architectural consistency. Full check at `sonja-conformance-check.md`.

Merge gate status: all clear. Tim has indicated he is not merging at this time. PR 7 remains open at https://github.com/timdixon82/Image-Colour-Contrast-Checker/pull/7, ready for Tim's express merge approval whenever he chooses to proceed.

## [2026-05-30] sonja | NOTE for next pickup — Pages deploy is failing (live site stale)

Found during the cross-repo Pages audit (Q245A). The Image-Colour-Contrast-Checker repo (timdixon82/Image-Colour-Contrast-Checker, live at image-colour-contrast-checker.timdixon.net) has a FAILING "Deploy to GitHub Pages" workflow. Its last successful Pages deploy was e4ee2b0 (2026-05-21); the last push to main is efe0a50 (2026-05-24), whose deploy run FAILED — so the live site is stale and missing the latest commits.

Root cause (run 26359758587): `.github/workflows/deploy.yml` references `actions/configure-pages@983d7736d9b0ae728b81ab479565c72886d7745` — a 39-character (shortened) commit SHA. GitHub no longer resolves shortened SHAs and requires the full 40-character SHA `983d7736d9b0ae728b81ab479565c72886d7745b`. Likely a Dependabot pin that lost its last character.

Fix when we pick this up: correct the SHA to the full 40 characters (or repin via Dependabot), push, confirm the deploy run succeeds and the live site updates. Low effort, isolated to deploy.yml.

Tim's instruction (2026-05-30): leave ICCC alone for now; noted here for the next session. NOT touched tonight.
- [2026-05-30 10:57:19] subagent completed
- [2026-05-30 10:58:01] subagent completed
- [2026-05-30 11:00:10] subagent completed
- [2026-05-30 12:07:41] subagent completed
- [2026-05-30 12:14:29] subagent completed
- [2026-05-31 13:02:36] subagent completed
- [2026-05-31 13:10:22] subagent completed
- [2026-05-31 13:59:48] subagent completed
- [2026-05-31 14:06:27] subagent completed
- [2026-05-31 18:30:01] subagent completed

## [2026-05-31] cleanup | Repo consistency pass — all stale and failing items resolved

Tim's instruction: "lets progress to get the repo all clean and consistent."

**Completed:**
- Pages deploy: already fixed by earlier template sync (last two deploy runs green). Log note from 2026-05-30 superseded.
- PR 16 (add-next-q.sh): closed as superseded — script already on main via template sync ce5b778.
- Uncommitted log.md: committed to main (94def3f).
- PR 7 (vestibular feature v0.3.1): merged to main on Tim's approval. One merge conflict in `docs/accessibility.md` resolved — vestibular's ACC-ICCC-005 (pdfmake PDF tagging) combined with main's CI accessibility setup section. All 8 CI checks passed (including Semgrep after adding nosemgrep suppress for `unsafe-formatstring` false positive in `src/main.js` line 105 — `console.error` with `entry.filename` template literal is not an attacker-controlled format string).
- PR 10 (ESLint 9→10): merged to main on Tim's approval. All 9 checks green.
- PR 12 (globals 16→17): merged to main on Tim's approval. All 9 checks green.
- `src/styles.css` `.sr-only` pattern: replaced deprecated `clip: rect(0 0 0 0)` with `clip-path: inset(50%)` — surfaced by stylelint-config-standard v40's new `property-no-deprecated` rule. Committed to main (4d88a7b).

**Fixed on dep PR branches (now all CI-green, awaiting Tim's merge approval):**
- PR 8 (pdfmake 0.2→0.3): same nosemgrep fix applied. All 8 checks green.
- PR 9 (vite 5→8): Rolldown (Vite 8's new bundler) rejected `js-clipper/clipper.js` due to a Latin-1 byte (0xb9 at position 165105). Fixed with a pre-enforce Vite plugin that re-reads the file as latin1. Build and all linters pass.
- PR 11 (stylelint 38→40): stylelint-config-standard v40 requires stylelint v17 (peer dep conflict). Bumped stylelint from ^16.19.1 to ^17.12.0. Also fixed the `clip-path` CSS issue. All 8 checks green.

**Pending Tim's merge approval:**
- PR 8 (pdfmake 0.2→0.3) — 8/8 green
- PR 9 (vite 5→8) — 9/9 green
- PR 11 (stylelint 38→40 + v17) — 8/8 green
- PR 15 (release v0.3.0, release-please) — auto-generated, awaiting Tim's yes

**Stale local branches** (chore/add-claude-config, chore/add-next-q-script, chore/template-onboarding, claude/vestibular-checker-extension-O5NPm): safety hook blocked `git branch -d` as "branch deletion". These are cosmetic — remote branches are already merged/closed.
