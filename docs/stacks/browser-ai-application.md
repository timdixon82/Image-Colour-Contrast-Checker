# Stack Note: Browser AI Application (ICCC)

ICCC uses the Browser AI Application stack. All standards for this stack are in the global wiki at `docs/stacks/browser-ai-application.md` in the team root. This page records only the points where ICCC's shape differs from the global stack page, and confirms which previously SWOT-specific-tagged sections are now confirmed as generalisable based on ICCC's evidence.

## Confirmed generalisable sections

ICCC is the second project on the Browser AI Application stack. Jacob's architecture review (`.claude/work/011-iccc-setup/jacob-architecture-review.md`, section 1) confirmed that several SWOT-specific-tagged sections now have a second data point:

- **Framework choice.** ICCC uses no framework (plain DOM code). SWOT-Builder uses React. Both are valid; the stack page's list of acceptable shapes is confirmed as correct. The "SWOT-specific, may not generalise" tag on framework choice can be retired.
- **Build step.** ICCC has an offline build step (Vite). SWOT-Builder has no build step. The stack page's "build step or no build step" choice is confirmed as real. The corresponding tag can be retired.
- **Model catalogue.** ICCC has a fixed, single model set declared as a build-time dependency. SWOT-Builder has a user-selectable catalogue. The stack page's model-catalogue pattern should be extended to name both shapes; ICCC's "bundled devDependency" pattern is a valid alternative to the user-download-consent pattern. See ADR 007.
- **Service worker.** ICCC ships a hand-written service worker for cross-origin isolation and model caching. SWOT-Builder has no service worker. This is a cross-cutting pattern documented in `docs/patterns/cross-origin-isolation-service-worker.md` in this project wiki.

## ICCC deviations from the global stack page

### `models.json` manifest

The global stack page requires a `models.json` manifest at the repository root recording each model's identity, source, licence, size, and integrity hash. ICCC does not have a `models.json` file. The project-wiki exception is recorded in ADR 007: for a bundled-from-devDependency model set, the lockfile and the install-time copy script together serve the same purpose, and a separate manifest is not warranted.

### GoatCounter analytics

The global stack page requires Tim's explicit sign-off for any analytics service. ICCC has analytics; sign-off is recorded in ADR 009. ICCC uses its own `iccc.goatcounter.com` counter rather than the team's shared `timdixon82.goatcounter.com` counter; the opt-out rationale is also in ADR 009.

### No linter manifests yet

The global stack page (and `docs/decisions/006-adopted-static-project-standards.md`) requires pinned linter manifests (ESLint, Stylelint, HTMLHint) in `devDependencies`. ICCC does not yet have them. This is a setup-build item in `todo.md`.
