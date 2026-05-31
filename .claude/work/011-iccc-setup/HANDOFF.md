# HANDOFF: 011-iccc-setup

**Status: CLOSED**
Closed: 2026-05-31 by Tim Dixon (express instruction)

---

## What was done

Work folder 011 covered the full adoption of the Image-Colour-Contrast-Checker repository into the agent team, plus the vestibular-feature build.

### Backfill (2026-05-23)
- **Tad** — business-analysis review (`tad-requirements.md`)
- **Jacob** — architecture review (`jacob-architecture-review.md`)
- **Jed** — security and privacy review (`jed-security-review.md`, `jed-return-iccc-security.md`)
- **Carol** — baseline WCAG 2.2 AAA audit (findings recorded in `docs/accessibility.md` under "Known baseline audit status"; `carol-test-pass.md` covers the setup PR)

### Project setup — PR 6 (merged 2026-05-23)
- Project wiki scaffolded: 9 ADRs, 7 main wiki pages, patterns, exceptions
- Self-hosted GoatCounter analytics (`public/analytics/count.js`), CSP meta tag
- Linter manifest (ESLint 9, Stylelint 16, HTMLHint 1)
- CI, CodeQL, accessibility (Pa11y + axe), security (Semgrep, Trivy), and release workflows
- Dependabot configuration and release-please configuration

### Vestibular feature — PR 7 (merged 2026-05-31)
- Vestibular saturation check, APCA contrast, CVD simulation, cognitive verdict
- Four Tim-requested UX changes: footer link removed, Tas the Artist link added, report visual language aligned, contrast summary split into WCAG and Advanced lines
- Jacob and Jed reviewed feature branch in parallel; all findings resolved
- Carol signed off release checklist for PR 7 (2026-05-24) — "pass with conditions"; one condition (screen-reader evidence gate) suspended per `CLAUDE.md`
- Sonja conformance check complete (`sonja-conformance-check.md`)

### Dependency and cleanup PRs (merged 2026-05-31)
- PR 8: pdfmake 0.2 → 0.3
- PR 9: Vite 5 → 8 (Rolldown, Latin-1 fix)
- PR 10: ESLint 9 → 10
- PR 11: stylelint-config-standard 38 → 40 + stylelint v17
- PR 12: globals 16 → 17
- PR 17: template onboarding reconciliation
- PR 19: External Checkers column and layout alignment
- PR 20: Template sync 1.3.0 → 1.4.2

### Release state at close
- v0.3.0 released 2026-05-31
- v0.4.0 released 2026-05-31 (manually tagged after release-please conflict; tag and GitHub release both correct)
- All CI checks green on main
- Live site: https://image-colour-contrast-checker.timdixon.net

---

## Deferred items (tracked — not blocking)

These are recorded in `docs/accessibility.md` and the Pa11y ignore list in `pa11y.json`. A future accessibility-phase PR removes the ignores and closes each item.

| ID | Issue | WCAG criterion |
|----|-------|----------------|
| ACC-ICCC-001 | File-input has no accessible name | 4.1.2 (AA) |
| ACC-ICCC-002 | Footer and model-banner `--fg-muted` below 7:1 in light mode | 1.4.6 (AAA) |
| ACC-ICCC-003 | Same `--fg-muted` shortfall on privacy.html (axe-core) | 1.4.6 / 1.4.3 |
| ACC-ICCC-005 | pdfmake produces untagged PDF; no structural alt text | 4.1.2 (AA, PDF/UA) |

There are also three deferred build items from the setup phase:
- D1: Vitest + Playwright test suite
- D2: CSS code-style rules (Stylelint)
- D3: actionlint CI verification

---

## Definition of Done — final state

- [x] Tad's `tad-requirements.md`
- [x] Jacob's `jacob-architecture-review.md`
- [x] Jed's `jed-security-review.md`
- [x] Carol's baseline audit (in `docs/accessibility.md`)
- [x] Project wiki scaffolded
- [ ] Team `docs/projects.md` entry — not verified; needs a team-root session check
- [x] Feature branch reviewed and merged
- [x] Carol release checklist signed off (PR 7, 2026-05-24)

---

## Next steps (if resumed)

1. Accessibility phase: fix ACC-ICCC-001, 002, 003, 005; remove Pa11y ignores.
2. Test suite: add Vitest unit tests and Playwright end-to-end tests (D1).
3. Team `docs/projects.md`: verify the ICCC entry at the team root.
