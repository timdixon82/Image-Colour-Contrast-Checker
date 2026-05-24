# Coding Standards: Image Colour Contrast Checker

ICCC inherits all stack-independent standards from the global wiki at `docs/coding-standards.md` in the team root, and all Browser AI Application stack standards from `docs/stacks/browser-ai-application.md` in the global wiki. This page records only the project-specific notes and any ICCC deviation from those standards.

## Inherited standards

All of the following apply to ICCC without change. Read the linked source for the full detail.

- Stack-independent standards (naming, user interface, accessibility, security): [global coding-standards.md](../../docs/coding-standards.md) (team root).
- Browser AI Application stack standards (linting, layout, testing, accessibility hooks, security defaults, dependency policy, build and release): [global stacks/browser-ai-application.md](../../docs/stacks/browser-ai-application.md) (team root).

## Project-specific notes

### Layered dependency direction

The `src/` directory is split into `core/`, `adapters/`, `render/`, `export/`, and `ui/`. The dependency direction is strict:

- `core/` may not import from any other layer.
- `adapters/` may import from `core/` only.
- `render/` may not import from `ui/`, `export/`, or `adapters/`.
- `export/` may import from `core/` and `render/` only.
- `ui/` may import from `render/`, `export/`, and `core/` only.
- `main.js` orchestrates; it may import from any layer but contains no business logic.

See `CLAUDE.md` at the repository root for the full module map, and ADR 002 for the rationale.

### DOM writes

Use `document.createElement` and `.textContent` for all user-derived content. The `innerHTML` property may only be used for compile-time constants or for values that have passed through the `escapeHtml` helper (`src/ui/report-view.js`). This rule eliminates cross-site scripting (XSS) risk by construction. See ADR 001 and Jed's security review in `.claude/work/011-iccc-setup/jed-security-review.md`.

### Export contract

Both `pdf.js` and `markdown.js` accept `AnalysedEntry[]` (defined in `src/core/schema.js`) and nothing else. All user-facing copy shared between exports is defined in `src/export/strings.js`. Neither exporter hardcodes copy that appears in the other. See ADR 004.

### Version bumping

Every commit that changes observable behaviour must bump `package.json` version, with `package-lock.json` committed in the same change. Once release-please is added (a setup-build item in `todo.md`), the bump moves into the release pull request. See ADR 005.

### ONNX Runtime Web exclusion from Vite optimisation

`onnxruntime-web` is excluded from Vite's `optimizeDeps` list in `vite.config.js`. Do not remove this exclusion. ORT ships pre-bundled WASM assets that must remain separate files; Vite's dependency optimisation would otherwise inline them and break the runtime. See ADR 005 and ADR 007.

### Service worker cache versioning

When the PaddleOCR model files or the ORT WASM binaries change (after an `npm update` of `@gutenye/ocr-models` or `onnxruntime-web`), bump the `MODEL_CACHE` constant in `public/sw.js` to retire the old cache. See ADR 008.

## Standards gaps (setup-build items for Sean)

The following items are required by the inherited standards but are not yet in place. They are tracked in `todo.md` at the repository root.

- Linter manifests (ESLint, Stylelint, HTMLHint) pinned in `devDependencies`.
- Content Security Policy meta tag in `index.html` and `privacy.html`.
- Release-please workflow and configuration.
- CodeQL or equivalent static analysis workflow.
- Lint and test jobs in the CI workflow.

These gaps do not block adoption or use of the project, but they must close before the project can be declared fully compliant with the team's standards.
