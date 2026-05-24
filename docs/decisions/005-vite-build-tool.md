# ADR 005: Vite as build tool, two HTML entry points, no UI framework, manual version bumping until release-please

Status: accepted; release-please migration deferred to the setup build (backfilled 2026-05-23).

## Context

ICCC has two distinct pages (the tool at `index.html` and the privacy statement at `privacy.html`), a non-trivial JavaScript module graph of around fifteen source files, and large static assets that must be served as separate files. The repository needs a build tool that bundles JavaScript without inlining the ONNX Runtime Web (ORT) WASM files, supports multiple entry points, and provides a development server with the required cross-origin isolation headers.

## Decision

Use Vite 5.4 as the build tool. Configure two entry points (`index.html`, `privacy.html`) under `build.rollupOptions.input`. Exclude `onnxruntime-web` from `optimizeDeps` so its pre-bundled WASM assets remain separate files. Set `build.assetsInlineLimit: 0` so nothing is inlined as a data URI. Emit workers as ECMAScript (ES) modules. Set the development server's `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers so `crossOriginIsolated` is true locally. Build target is `es2022`. Bump `package.json` version by hand on every behavioural change, until release-please is added.

## Alternatives considered

- A no-build setup (the SWOT-Builder approach). Rejected: the bundle size of `@gutenye/ocr-browser` and `onnxruntime-web` makes in-browser compilation impractical, and Vite's tree-shaking and asset graph are needed.
- Webpack or Rollup directly. Rejected: more configuration, no advantage at this project's size, and Vite's developer experience is better.

## Consequences

The build is fast and the developer loop is tight. The cost is a build step: the repository is not the deployed code; `vite build` produces a `dist/` folder that GitHub Pages serves. The version-bump-by-hand process works but is fragile; the setup build replaces it with release-please, after which this ADR is superseded for the release-process part only.
