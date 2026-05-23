# ADR 007: Bundled runtime dependencies with vendored model files copied at install time

Status: accepted (backfilled 2026-05-23).

## Context

ICCC has three runtime dependencies (`@gutenye/ocr-browser`, `onnxruntime-web`, `pdfmake`) and two development dependencies (`@gutenye/ocr-models`, `vite`). The PaddleOCR model files and the ONNX Runtime Web (ORT) WASM binaries together weigh about 28 MB. Committing them to the repository would bloat git history on every model update.

## Decision

Declare runtime dependencies in `package.json` with caret-pinned versions; lock exact versions in `package-lock.json`. Declare `@gutenye/ocr-models` as a devDependency. At install time the `postinstall` script (`scripts/copy-models.mjs`) copies the model files and the ORT WASM binaries from `node_modules/` into `public/models/` and `public/ort/`. Both destination folders are gitignored. The `predev` and `prebuild` scripts run the same copy step to keep the working directory consistent. Vite bundles `@gutenye/ocr-browser` and `pdfmake` into the JavaScript output and serves the copied model and runtime files as static assets.

## Alternatives considered

- Commit the model files to the repository. Rejected: git handles large binary files poorly, and npm already serves the models through a devDependency.
- Download the models at runtime from a Content Delivery Network (CDN). Rejected: adds a runtime dependency on a third party, breaks offline use after a cold start, and discloses the visitor's Internet Protocol (IP) address to a CDN on every visit.

## Consequences

The repository stays small. The deployed `dist/` folder carries the models and the runtime as static files. The lockfile is the integrity check at install time, and the build is deterministic. A small standards gap remains: the Browser AI Application stack page at `docs/stacks/browser-ai-application.md` in the global wiki asks for a `models.json` manifest recording each model's identity, source, licence, size, and integrity hash. ICCC currently spreads this information across `scripts/copy-models.mjs`, `package.json`, `README.md`, and `ARCHITECTURE.md`. A project decision was recorded in the setup build: a bundled-from-devDependency model set does not need a separate `models.json` manifest because the lockfile and the copy script together serve the same purpose. That exception is recorded here.
