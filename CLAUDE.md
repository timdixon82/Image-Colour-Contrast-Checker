# Image Colour Contrast Checker: Project Memory

Drops images into the browser, finds text with OCR, measures WCAG 2.2 contrast for each colour pair, and produces a pass or fail accessibility report. Everything runs client-side: no server, no uploads. Live at `https://image-colour-contrast-checker.timdixon.net`, which is also `SITE_URL` in `src/export/strings.js`.

Before changing code, read `docs/architecture-guide.md`. It holds the module map, the data types, the pipeline, the per-folder rules, the brand tokens and contrast values, how to add an export format, and the service worker.

## Rules that are easy to break

- Keep the layers apart. `src/core/` has no DOM or browser APIs and never imports from `render/`, `ui/`, `export/` or `adapters/`.
- `AnalysedEntry[]` (defined in `src/core/schema.js`) is the only input to the export modules. Check `schema.js` before creating a new data shape.
- All user-facing copy lives in `src/export/strings.js`. Never hardcode it in `pdf.js`, `markdown.js` or `report-view.js`.
- Build the six display checks only with `pairChecks()` in `src/export/checks.js`; never rebuild the list in a renderer.
- `main.js` is orchestration only. Logic that grows there belongs in `core/` or `ui/`.
- Support all four themes (Light, Dark, Muted Light, Muted Dark). Never hardcode hex values: use the tokens in `src/styles.css`.
- A new status colour must reach 7:1 on `--bg-card`, `--neutral-bg` and `--bg` in all four themes. `src/theme-contrast.test.js` guards this.
- Do not remove or weaken the skip link, focus ring, 44 pixel targets, table scope and scroll wrappers, or the `aria-live` regions.
- Every behavioural change bumps `version` in `package.json`; commit it with `package-lock.json`.
- One service worker does both cross-origin isolation and model caching. Edit `scripts/sw.template.js`, never the generated `public/sw.js`.
