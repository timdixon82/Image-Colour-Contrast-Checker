# Image-Colour-Contrast-Checker Architecture Review and Decision Records

Author: Jacob, architect.
Date: 2026-05-23.
Repository: timdixon82/Image-Colour-Contrast-Checker, branch main, version 0.2.12.
Status: backfill review of an adopted project. The code exists and is in production; this review records the architecture that is in place and judges it.

## Purpose of this document

The team adopted Image-Colour-Contrast-Checker (ICCC) on 2026-05-23 as work folder 011. Tad runs the requirements backfill, Jed the security review, and Carol the baseline accessibility audit in parallel. This document backfills the architecture review. It describes ICCC as built, judges each significant choice, and records the choices as Architecture Decision Records (ADRs) so any later change has a baseline to conform to.

The repository carries its own `ARCHITECTURE.md`, `CLAUDE.md`, and `DESIGN_GUIDELINES.md`. They are detailed and largely accurate. This review reads them as primary evidence, cross-checks them against the source, and lifts the design choices into the team's ADR shape so they sit alongside the SWOT-Builder ADRs in the same form.

Where ICCC and SWOT-Builder share a design choice, I record it here in ICCC's terms and cross-reference SWOT-Builder rather than restate the rationale. Where ICCC differs, the difference is the point of the review.

## What ICCC is

ICCC is a browser application that audits Web Content Accessibility Guidelines (WCAG) 2.2 colour-contrast for images. A person drops one or more screenshots into the page; the application runs Optical Character Recognition (OCR) to locate text regions, samples each text region's foreground and background colours, computes the WCAG contrast ratio for each pair, and produces a pass-or-fail report against both the AA and AAA contrast thresholds. The report can be downloaded as a Portable Document Format (PDF) file or as a Markdown file with the images embedded.

The whole pipeline runs in the visitor's browser. No image, no detection, no contrast figure ever leaves the device. The application is hosted on GitHub Pages and is reached at both `image-colour-contrast-checker.timdixon.net` (the canonical domain in the production code) and the GitHub Pages default URL.

## Summary judgement

The architecture is mature, careful, and well-suited to its goal. ICCC is the team's most ambitious browser application by some distance: it ships a real machine-learning pipeline (PaddleOCR PP-OCRv4 on ONNX Runtime Web), it pulls in roughly 28 megabytes of model and runtime assets, it runs multi-threaded WebAssembly (WASM) with WebGPU acceleration where available, and it does all of this while keeping the image data on the device. The layering is strict (`core/`, `adapters/`, `render/`, `export/`, `ui/`), the dependency direction is clean, and the project has resisted the temptation to install a user-interface framework.

I am recording nine decisions as ADRs. Seven I judge sound and record as accepted. Two I judge sound in intent but carrying a real risk that later work should address: the GoatCounter analytics snippet (a third-party script with no Subresource Integrity hash and no privacy decision record), and the unpinned `coi-serviceworker` upstream code that lives in the bundled service worker. Neither blocks adoption.

The stack is a Browser AI Application. The team already has a stack page at `docs/stacks/browser-ai-application.md`, written from SWOT-Builder, and ICCC is the second project on that stack. Where ICCC's shape differs from SWOT-Builder's, this review names the difference and proposes whether the stack page should generalise to cover it.

## Review by area

### 1. The stack

ICCC is a Browser AI Application. The defining characteristics from `docs/stacks/browser-ai-application.md` all hold:

- A static front-end of HyperText Markup Language, Cascading Style Sheets, and JavaScript runs entirely in the browser.
- A machine-learning model runs on the device. There is no server of the team's own.
- The user's data never leaves the device. The privacy promise is load-bearing.

Where ICCC sits inside the stack:

- **Framework choice.** No user-interface framework. ICCC is plain JavaScript with `document.createElement`. The stack page lists this as one of the acceptable shapes alongside React-with-build and Svelte-with-build, so ICCC is in scope of the stack as written.
- **Build step.** ICCC uses Vite as an offline bundler. The repository is not the deployed code; `vite build` produces a `dist/` folder that GitHub Pages serves. This is the other branch of the stack page's build-or-no-build choice, opposite to SWOT-Builder.
- **AI runtime.** Not the browser's built-in AI Application Programming Interface and not WebLLM. ICCC uses PaddleOCR PP-OCRv4 packaged for the browser by `@gutenye/ocr-browser`, executed by ONNX Runtime Web (ORT) on either WebGPU (desktop browsers with `navigator.gpu`) or multi-threaded WebAssembly (everything else, plus iOS and iPadOS regardless of WebGPU availability).
- **Model catalogue.** A single, fixed model set, not user-selectable. The PP-OCRv4 detection model, the recognition model, and the character key file are vendored from `@gutenye/ocr-models` (a devDependency) at install time by `scripts/copy-models.mjs`. The OCR Runtime Web WASM binaries are vendored from `onnxruntime-web` by the same script.

The stack match is clean. ICCC fits the Browser AI Application stack without an exception. No new stack page is needed.

The differences from SWOT-Builder are the parts the stack page's tags already anticipate as needing generalisation, and ICCC is now the second project's evidence that the stack reviser can use to retire the "SWOT-specific, may not generalise" tags:

- ICCC has an offline build step (Vite). SWOT-Builder has no build step. The stack page already records both as acceptable; ICCC confirms the offline-build branch is real.
- ICCC has no user-interface framework. SWOT-Builder uses React. The stack page already lists no-framework as acceptable; ICCC confirms this branch too.
- ICCC's model catalogue is fixed and bundled at install time. SWOT-Builder's catalogue is user-selectable with explicit download consent. The stack page's "model download consent" rule still applies (user-driven downloads must ask before starting), but ICCC adds a new pattern the stack page does not currently name: a single fixed model set declared as a build-time dependency and copied into the site by a `postinstall`/`prebuild` script. This is worth adding to the stack page as a second valid model-catalogue pattern.
- ICCC has a hand-written service worker that does both cross-origin isolation and persistent model caching. SWOT-Builder has no service worker at all. This is a stack-relevant pattern (cross-origin isolation, `SharedArrayBuffer`, Cache Storage durability on iOS Safari) and is the largest cross-cutting flag in this review.
- ICCC carries a privacy-friendly analytics script (GoatCounter). The stack page currently reads "No analytics, no telemetry, no third-party fonts" as a Generalisable rule and notes that "A privacy-respecting analytics service is acceptable only with Tim's explicit sign-off, recorded in the project wiki." ICCC has the GoatCounter snippet but no sign-off record in any project wiki, because ICCC has no project wiki yet. This is a question for Tim (Q-number unset) and a gap the team's wider analytics rollout will close.

### 2. The build and deploy setup

**`package.json`.** The manifest declares ICCC as a private, type-module project at version 0.2.12. The scripts are:

- `dev`: `vite`.
- `build`: `vite build`.
- `preview`: `vite preview --host`.
- `postinstall`, `predev`, `prebuild`: each runs `node scripts/copy-models.mjs`.

Three runtime dependencies (`@gutenye/ocr-browser`, `onnxruntime-web`, `pdfmake`) and two development dependencies (`@gutenye/ocr-models`, `vite`) are declared. Versions are caret-pinned in `package.json` and exact-pinned in `package-lock.json`. The lockfile is committed.

Assessment. The manifest is correct and matches the team's standards for a Browser AI Application with an offline build step. Two points to flag:

- **Linter pinning.** `docs/decisions/006-adopted-static-project-standards.md` standard 4 requires every adopted static front-end project to carry pinned linter manifests (HTMLHint, Stylelint, ESLint) in `devDependencies`. ICCC has none of these. The repository has no linting on continuous integration. This is the most important standards gap the review surfaces, and it carries over to Sean's setup build as a definite item. The Browser AI Application stack inherits the linter rule from the static stack.
- **No release-please.** The static stack and the Browser AI Application stack both default to release-please for versioned releases. ICCC currently bumps `package.json` by hand on every behavioural change (see the `CLAUDE.md` note "Every commit that changes behaviour must bump `package.json` → `version`"). This is a manual process where a release-please workflow would be the team default. Sean addresses this in the setup build.

**`vite.config.js`.** A small, focused configuration:

- `base: './'`. The application is served from a non-root path under the timdixon.net custom domain (`image-colour-contrast-checker.timdixon.net` is the root, but the relative base keeps the build portable to any subpath).
- `optimizeDeps.exclude: ['onnxruntime-web']`. ORT ships pre-bundled WebAssembly assets that must remain separate files; Vite's dependency optimisation would otherwise inline them and break the runtime.
- `worker.format: 'es'`. Workers are emitted as ECMAScript modules, consistent with the rest of the bundle.
- `build.target: 'es2022'`. The expected target for a modern browser application.
- `build.assetsInlineLimit: 0`. Nothing is inlined as a data URL; every asset is emitted as a real file. Important because the ORT WASM and model files must be fetched as separate resources for the streaming preloader to report progress.
- `build.rollupOptions.input`: two HyperText Markup Language entry points, `index.html` and `privacy.html`.
- `server.headers`: in the dev server only, sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` so `crossOriginIsolated` is true and multi-threaded WASM works locally.

Assessment. The configuration is tight and shows understanding of the stack's constraints. ORT's WASM exclusion is the kind of edit a team commonly misses, and it is correct here. The choice to set the cross-origin isolation headers in development through Vite, and in production through the service worker rather than through GitHub Pages headers, is the only practical answer on this host; the trade is recorded in ADR 0008 below.

**`scripts/copy-models.mjs`.** A 47-line Node.js script that, on every `npm install`, `npm run dev`, and `npm run build`, copies the PP-OCRv4 ONNX models and the character key file from `node_modules/@gutenye/ocr-models/assets/` into `public/models/`, and copies the ORT WASM, MJS, and JS files from `node_modules/onnxruntime-web/dist/` into `public/ort/`. The destination directories are created if missing. The destination directories are gitignored.

Assessment. The pattern is sound. The model and runtime files are heavy (about 28 megabytes) and committing them to the repository would bloat git history; copying at install time keeps the repository small while making the files available to Vite as static assets. The script is robust against missing source files (it warns rather than failing) and is idempotent.

A small architectural observation: `scripts/copy-models.mjs` is effectively the project's `models.json` manifest in script form. The stack page (`docs/stacks/browser-ai-application.md`) calls for a real `models.json` file recording each model, its identity, source, licence, size, and Subresource Integrity hash. ICCC has none. The information is present in code (model paths) and in `ARCHITECTURE.md` (sizes, licences) but is not in the canonical `models.json` shape the stack page requires. This is a small standards gap, recorded in ADR 0006 and as a question for Tim about whether to write `models.json` retrospectively.

**CI: `.github/workflows/deploy.yml`.** A 49-line GitHub Pages deploy workflow that runs on push to `main` and on `workflow_dispatch`. The build job runs on `ubuntu-latest`, checks out the repository, sets up Node.js 20 with npm caching, runs `npm ci`, runs `npm run build` (which transitively runs `prebuild` and `copy-models.mjs`), configures Pages, and uploads the `dist/` folder as a Pages artefact. The deploy job consumes the artefact and publishes to the `github-pages` environment.

Assessment. The workflow is the canonical GitHub Pages flow and is correct. Gaps against the team standards:

- **No lint job.** Tied to the linter-pinning gap above; once ESLint, Stylelint, and HTMLHint are added to `devDependencies`, a lint step runs ahead of build.
- **No test job.** ICCC has no unit tests, no browser tests, and no accessibility tests committed to the repository. The stack page expects all three. This is Carol's territory more than Jacob's, but the architectural consequence is that the deploy workflow has no quality gate other than "the build did not throw."
- **No release workflow.** Per the static and Browser AI Application stacks, release-please opens release pull requests and tags releases on merge. ICCC has neither a release-please configuration file nor a release workflow.
- **No CodeQL or other static analysis.** Standard on the team's adopted projects. Jed will flag this in security; the architectural shape simply requires a `.github/workflows/codeql.yml` to be added in the setup build.

None of these gaps is a defect. They are the standard backfill items the team applies to every adopted project. Sean addresses them in the setup build; the architecture does not need to change.

### 3. The data flow and where privacy lives

This is the most important area for a project whose entire pitch is "your images never leave your device." I walked the pipeline end to end against the source.

**Ingress.** A user picks files through `<input type="file" accept="image/*" multiple>` or drops them onto the `<div id="dropzone">`. `src/ui/dropzone.js` filters non-image MIME types and passes the resulting `File` objects to `handleFiles()` in `src/main.js`. The file objects are still on the device at this point; no upload occurs. There is no `<form>` and no `action` attribute anywhere on the page that would post the file to a server.

**Decode and resize.** `src/core/image.js` is the first processing step. `decodeAndResize()` calls `createImageBitmap(file, { colorSpaceConversion: 'none' })`, which decodes the file in place. The bitmap is then drawn onto a bounded canvas whose long edge is between 800 and 1400 pixels, with `colorSpace: 'srgb'` on the canvas context. The smaller imageData is what the rest of the pipeline reads. The full-resolution pixel buffer is never materialised; this was a real bug on iOS Safari with 12 megapixel and larger phone photos and is fixed by this design.

**OCR.** `src/main.js` lazily imports `src/adapters/paddle-ocr.js` on first use (the OCR stack is about 10 megabytes of JavaScript and is excluded from the initial bundle). The adapter calls `getOcr()` from `@gutenye/ocr-browser`, which instantiates a PaddleOCR PP-OCRv4 pipeline pointed at the local model files in `public/models/`. Execution providers are chosen by `hasWebGpu()`: WebGPU plus a WASM fallback on desktop browsers with `navigator.gpu`, WASM only on iOS or iPadOS and on any browser without WebGPU. Detection runs on a blob URL minted from the resized canvas; no network request goes to a third-party origin. The OCR result is mapped to the team's `OcrWord[]` shape (`{ text, score, bbox }`).

**Analysis.** `src/core/analyse.js` filters low-confidence and degenerate OCR detections, then for each remaining detection calls `worstStripContrast()` in `src/core/contrast.js`. The strip routine splits the OCR bounding box into vertical strips roughly a character wide, runs a two-cluster k-means on the per-pixel luminance of each strip, treats the minority cluster as text and the majority as background, computes the WCAG contrast ratio of the two cluster centroids, and keeps the worst strip's ratio. The detections are then merged into unique colour pairs (Euclidean Red-Green-Blue distance under 25 collapses similar pairs), worst-contrast-first. The result is a `ReportData` object held only in JavaScript memory.

**Rendering.** `src/ui/report-view.js` builds a Document Object Model card per image. All Document Object Model nodes are created with `document.createElement` and text content; there is no `innerHTML` for any user-derived value, which removes a whole class of injection risk. Canvas drawing happens in `src/render/canvas.js` and the canvases are kept around for export. `renderImageCard()` populates `entry.previewDataUrl` and `entry.pairAssets` as a deliberate side effect, so the export modules can run without redrawing.

**Egress (the privacy bit).** I traced every place data could leave the device.

1. **Image data.** The image bytes never leave the page context. They are read into an `ImageBitmap`, drawn onto a canvas, and discarded when the canvas is garbage-collected. The only `URL.createObjectURL` is for a blob handed to the OCR engine, and it is revoked in a `finally` block. No `fetch`, no `XMLHttpRequest`, no `navigator.sendBeacon`, no WebSocket, no Server-Sent Events, no `postMessage` to a parent frame carries image data. Confirmed by reading `src/main.js`, `src/adapters/paddle-ocr.js`, `src/core/*`, `src/export/*`, and `src/ui/*`.
2. **OCR detections and contrast results.** Same as image data. They are held in JavaScript memory, rendered to the Document Object Model, and embedded into the PDF or Markdown export, both of which are downloaded locally.
3. **Exports.** Both export paths are local. `src/export/markdown.js` builds a string with embedded base64 image data and triggers a blob download. `src/export/pdf.js` lazy-loads `pdfmake` and builds a document client-side. Neither posts anything anywhere.
4. **Model and runtime downloads.** `src/preloader.js` fetches the PP-OCRv4 detection model, the recognition model, the character key file, and the ORT WASM binaries. Each fetch is to a same-origin path under `models/` or `ort/`. The service worker caches them in Cache Storage so subsequent visits are silent. These downloads carry no image data; they are inbound only.
5. **GoatCounter analytics.** This is the only outbound third-party network request. The snippet at the foot of `index.html` and `privacy.html` is `<script data-goatcounter="https://iccc.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>`. It loads `count.js` from `gc.zgo.at` and pings `iccc.goatcounter.com/count` on each page view with the page path, the referrer, a coarse browser and screen-size profile, and an approximation of the visitor's country derived briefly from the Internet Protocol address. No image data, no OCR result, no contrast figure. The privacy statement at `privacy.html` describes this accurately.

**Privacy verdict.** The privacy promise (no image data leaves the device) is true in the code as written. The only outbound third-party request is GoatCounter, and it carries page-view metadata, not user content. This is consistent with the privacy statement and with the on-page badges. The risk is not in the data flow as built; it is in the supply chain (the GoatCounter script tag has no Subresource Integrity hash) and in the governance gap (the team's Browser AI Application stack page says analytics is acceptable only with Tim's explicit sign-off in the project wiki, and ICCC has no project wiki yet, so no sign-off has been recorded). Both are addressed in ADR 0009 below.

### 4. The service worker pattern and cross-origin isolation

This is the most novel architectural feature of ICCC compared to anything else the team has reviewed, and it deserves its own area.

**Why the service worker exists.** Multi-threaded WebAssembly needs `SharedArrayBuffer`, which a browser only exposes when the page is "cross-origin isolated." A page is cross-origin isolated when it is served with two headers: `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. GitHub Pages cannot send custom HyperText Transfer Protocol response headers (per `docs/decisions/006-adopted-static-project-standards.md`). The only practical way to set those headers on GitHub Pages is the `coi-serviceworker` technique: a service worker that intercepts every page request, re-emits the response, and adds the two headers.

**What ICCC's service worker does.** `public/sw.js` is a hand-written service worker that does two jobs in one file (because a single scope can have only one controlling service worker):

1. **Cross-origin isolation.** It implements the `coi-serviceworker` v0.1.7 logic by Guido Zuidhof (MIT licensed), kept behaviourally identical. The page-context half registers the worker on every load; the worker-context half intercepts every fetch and re-emits the response with the cross-origin isolation headers.
2. **Model caching.** For any request whose path matches `/models/` or `/ort/`, the worker serves a cache-first response from the `icc-model-cache-v1` Cache Storage. Cache Storage is durable on iOS Safari where the standard HyperText Transfer Protocol cache evicts large files aggressively. This is the difference between a 28 megabyte re-download every visit and a one-time cost.

**Why this is good.** The pattern solves a real problem (multi-threaded WASM on GitHub Pages) with a single, focused file. The two jobs are correctly combined into one worker because only one worker can control a scope. The Cache Storage versioning (`MODEL_CACHE = 'icc-model-cache-v1'`) means a bump to the model files retires the old cache cleanly. The worker is correctly registered through `<script src="sw.js">` in `index.html` so the worker script and the registration logic share a file.

**Why this carries risk.** The cross-origin isolation half of the worker is `coi-serviceworker` v0.1.7 by an upstream author, vendored inline with no version manifest, no Subresource Integrity check, and no upgrade story. The comment in `sw.js` records the upstream attribution and the licence but not a path back to the upstream source for future audits. If a security advisory ever appears against `coi-serviceworker`, the team has to track it manually. This is small but real, and is the second-most-important non-cosmetic issue in this review.

**Cross-cutting note.** The cross-origin isolation service-worker pattern is a candidate for the team's `docs/patterns/` folder. It will apply to any future Browser AI Application that needs `SharedArrayBuffer` on GitHub Pages, which is most of them. I record this as a cross-cutting flag for Sonja at the end of the review.

### 5. Named architecture decisions, captured as ADRs

I record nine ADRs below. They follow the SWOT-Builder ADR shape and continue ICCC's own numbering (ICCC has no project wiki yet, so I start at 0001). When Sonja scaffolds the project wiki, these go into `docs/decisions/` inside the ICCC repository.

### 6. The GoatCounter analytics setup, in detail

The brief specifically asks for a description of how GoatCounter is wired in ICCC, because the team plans to roll the same approach out to every project.

**What ships.** Two HyperText Markup Language files, `index.html` and `privacy.html`, each carry the same snippet at the end of the `<body>`:

```
<script data-goatcounter="https://iccc.goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>
```

The snippet is loaded `async` so it does not block rendering or interaction. It is the very last script in the body. The `data-goatcounter` attribute names the counter at `iccc.goatcounter.com`, which is GoatCounter's hosted service.

**What GoatCounter is.** A privacy-friendly analytics service (open source, hosted on `goatcounter.com`) that counts page views without setting cookies, without cross-site tracking, and without storing the visitor's Internet Protocol address. It derives an approximate country from the address at request time and discards the address. The privacy statement at `privacy.html` describes this accurately.

**What it sends.** On each page view, the script makes one outbound request to `https://iccc.goatcounter.com/count` with the page path, the document title, the referrer, the screen size, the language, and a coarse browser identifier. No cookie is set. The endpoint returns a one-by-one transparent pixel. The visitor's Internet Protocol address is seen by GoatCounter's server, used to derive a country code, and not stored.

**What is in the privacy statement.** `privacy.html` names GoatCounter, says it sets no cookies and collects no personal data, lists the page-level fields it records, says the Internet Protocol address is used briefly and not stored, and notes that `count.js` is loaded from `gc.zgo.at` and is the only third-party script. This is a strong, honest privacy disclosure for a free public tool.

**Gaps the team should close before lifting this as the canonical pattern.**

1. **No Subresource Integrity hash on `count.js`.** The Browser AI Application stack page requires every `<script>` and `<link>` from a Content Delivery Network to carry a Subresource Integrity hash and a `crossorigin="anonymous"` attribute. The GoatCounter snippet has neither. The team needs to decide whether to pin a hash (which then needs a known cadence to refresh against upstream changes), or to self-host `count.js` from the project's own origin (which removes the supply-chain risk entirely and is what the stack page calls for on third-party libraries).
2. **No Content Security Policy.** ICCC ships no `<meta http-equiv="Content-Security-Policy">` tag. Once one is added (it must be added; the stack page and the static stack both require it), the policy must allow-list `gc.zgo.at` in `script-src` and `iccc.goatcounter.com` in `connect-src` for analytics to keep working. Worth raising now so the policy is written with the analytics in mind.
3. **No project-wiki sign-off.** The stack page reads "A privacy-respecting analytics service is acceptable only with Tim's explicit sign-off, recorded in the project wiki." ICCC has analytics but no sign-off record because it has no project wiki. The setup build closes this by writing a project ADR ("Analytics: GoatCounter") that records Tim's sign-off, the privacy disclosure, and the supply-chain protections (Subresource Integrity or self-hosting).
4. **`per-project counter` versus `team-wide counter`.** ICCC uses a per-project GoatCounter (`iccc.goatcounter.com`). The wider rollout will need to decide whether each project keeps its own counter (a clean per-project boundary, but a counter to register for each new project), or whether projects share a single counter with the page path distinguishing them (one account, but data from every project sits in the same place). Worth asking now so the canonical pattern records the choice.

**What to lift as canonical.** The pattern, once cleaned up, is good and is reusable. The canonical pattern for `docs/patterns/goatcounter-analytics.md` (Sonja decides whether to write it) is:

- A per-project GoatCounter counter is registered at `<project-slug>.goatcounter.com`.
- The privacy statement names GoatCounter, lists the fields it records, says no cookies are set and the visitor's Internet Protocol address is used briefly and not stored, and links to the GoatCounter site.
- The `count.js` script is self-hosted from the project's own origin (not loaded from `gc.zgo.at`), or it is loaded from `gc.zgo.at` with a Subresource Integrity hash that is reviewed monthly.
- A Content Security Policy allow-lists the GoatCounter counter origin in `connect-src` and, if `count.js` is not self-hosted, allow-lists `gc.zgo.at` in `script-src`.
- A project-wiki ADR records the analytics decision, with Tim's sign-off attached. This is the team's standing requirement for any analytics service on a Browser AI Application.

I record the ICCC-as-built shape as ADR 0009 (accepted-with-risk, with the supply-chain and sign-off work required before adoption). I flag the canonical pattern for the global wiki at the end of the review.

## Conformance baseline for later work

The setup build and any later change should conform to the ADRs below. The points most likely to be touched:

- The `core/` layer must stay pure. No Document Object Model, no browser-only Application Programming Interfaces, no `import` from `render/`, `ui/`, `export/`, or `adapters/`. (ADR 0002.)
- The OCR engine is swappable through `src/adapters/`. Any new engine is a new adapter file exporting `getOcr()` and `runOcrOnUrl(blobUrl)`. (ADR 0003.)
- Image data must not leave the device. No `fetch`, no `XMLHttpRequest`, no `postMessage`, no WebSocket, no `navigator.sendBeacon` carrying image bytes, detections, or contrast results. (ADR 0001.)
- New third-party libraries are added through `package.json`, pinned, and (where loaded from a Content Delivery Network) carry a Subresource Integrity hash. (ADR 0007.)
- The service worker controls a single scope and combines cross-origin isolation with Cache Storage caching for `/models/` and `/ort/`. Bump `MODEL_CACHE` when those files change. (ADR 0008.)
- The export contract is `AnalysedEntry[]` and nothing else. Adding a new export format means a new file in `src/export/` with that input. (ADR 0004.)
- Strings the user sees in PDF or Markdown live in `src/export/strings.js` only. (ADR 0004.)
- Version bumps happen in `package.json` for every behavioural change; once release-please is added, the bump moves into the release pull request. (ADR 0005.)

## Cross-cutting notes for Sonja

Three things in this review are not specific to ICCC and a future Browser AI Application project would benefit from them. Sonja decides whether they go to the global wiki.

- **The cross-origin isolation service-worker pattern.** A self-contained service worker that adds `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` to every response on a GitHub Pages host, so multi-threaded WebAssembly works. This is reusable for any Browser AI Application that needs `SharedArrayBuffer` on GitHub Pages. A candidate for `docs/patterns/cross-origin-isolation-service-worker.md`.
- **The vendored-models pattern.** A `postinstall`/`prebuild` script that copies model files from a packaged devDependency (here, `@gutenye/ocr-models`) into `public/models/` at install time, so the repository stays small while the model files are available to the build. A candidate for the Browser AI Application stack page as an alternative to the user-selectable model catalogue described in SWOT-Builder's ADR 0004.
- **The GoatCounter analytics pattern.** Described in detail in area 6 above. A candidate for `docs/patterns/goatcounter-analytics.md` once the supply-chain and sign-off work is done in ICCC's setup build. The team's wider analytics rollout (HANDOFF backlog) hangs on this pattern.

## Architecture Decision Records

The ADRs below are written for the ICCC project wiki's `decisions/` folder. ICCC has no project wiki yet, so numbering starts at 0001. Each ADR states context, decision, alternatives considered, and consequences.

---

### ADR 0001: Client-side-only browser application, no server

Status: accepted (backfilled 2026-05-23).

Context. ICCC audits screenshots for WCAG colour-contrast. The screenshots commonly carry confidential interface designs, internal product names, and customer data. A core goal is privacy: the user's image must not leave the device. A second goal is that the tool needs no account and no setup.

Decision. Build the whole application as static files (HyperText Markup Language, Cascading Style Sheets, JavaScript) that run entirely in the browser. Use no server, no database, and no server-side language. Run the Optical Character Recognition pipeline on the device through ONNX Runtime Web. Hold all analysis state in JavaScript memory; persist only one preference (`td-theme`) to `localStorage`.

Alternatives considered.

- A client-server application with a backend OCR service. Rejected: a server able to see the user's screenshots breaks the privacy goal and adds hosting and operational cost.
- A desktop application (for example an Electron wrapper). Rejected: it needs installation, which the no-setup goal rules out, and it is far heavier to build and ship.

Consequences. The privacy goal is met by construction: with no server there is nowhere for image data to go. Hosting is cheap and simple (see ADR 0008). The cost is browser-side: the visitor's device runs the full machine-learning pipeline, which is fine on a modern desktop and acceptable on a phone but excludes very old devices. The privacy promise is load-bearing: no later change may send image bytes, OCR detections, or contrast results off the device without a new ADR superseding this one.

---

### ADR 0002: Layered project structure (`core`, `adapters`, `render`, `export`, `ui`) with strict dependency direction

Status: accepted (backfilled 2026-05-23).

Context. The application has five distinct concerns: pure WCAG and image-analysis logic, integration with an Optical Character Recognition engine, canvas drawing, downloadable report generation, and Document Object Model rendering. Without a structure, these collapse into a single ball of code that is hard to test and hard to swap any piece of.

Decision. Split `src/` into five folders with strict dependency rules:

- `src/core/`: pure logic only. No Document Object Model, no browser-only Application Programming Interfaces (`document`, `window`, `HTMLCanvasElement`). Worker-safe. Never imports from `render/`, `ui/`, `export/`, or `adapters/`.
- `src/adapters/`: integration with one swappable Optical Character Recognition engine behind a fixed two-function interface (`getOcr()`, `runOcrOnUrl(url)`).
- `src/render/`: pure canvas drawing. No strings, no app state.
- `src/export/`: report generators that accept `AnalysedEntry[]` and produce downloadable files.
- `src/ui/`: app-specific Document Object Model components.
- `src/main.js`: orchestration only, no business logic.

Alternatives considered.

- A flat module structure with no layering. Rejected: the analysis logic and the Document Object Model code would entangle, and the Optical Character Recognition engine would be hard to swap.
- A user-interface framework (React, Svelte, Vue) with its own component model. Rejected: the user-interface state machine is small (landing → processing → results), and a framework would add bundle weight and complexity for no real gain. Recorded as ADR 0006.

Consequences. The layering makes the analysis logic testable in isolation, the Optical Character Recognition engine swappable in one file, and the report-export formats addable in one file. The cost is that the team must hold the dependency rules in mind on every change; the `CLAUDE.md` in the repository names them explicitly to keep them visible.

---

### ADR 0003: PaddleOCR PP-OCRv4 via `@gutenye/ocr-browser` and ONNX Runtime Web, with WebGPU and WASM execution providers

Status: accepted (backfilled 2026-05-23).

Context. ICCC needs to locate text in images, in the browser, with no upload to a server. The Optical Character Recognition engine must be accurate enough on user-interface screenshots to find real text reliably, and it must run on the device.

Decision. Use PaddleOCR PP-OCRv4 (detection plus recognition models) wrapped by `@gutenye/ocr-browser` and executed by ONNX Runtime Web. Select execution providers at runtime: WebGPU plus WASM fallback on desktop browsers exposing `navigator.gpu`; WASM only on iOS, iPadOS, and any browser without WebGPU. Bundle the models from `@gutenye/ocr-models` (a devDependency) and copy them into `public/models/` at install time through `scripts/copy-models.mjs`. Bundle the ONNX Runtime Web WASM binaries from `onnxruntime-web` and copy them into `public/ort/` by the same script.

Alternatives considered.

- Tesseract.js. Rejected: less accurate than PP-OCRv4 on user-interface screenshots in the team's experience, and tied to a different runtime.
- A cloud Optical Character Recognition Application Programming Interface (for example Google Vision, AWS Textract). Rejected: it needs an Application Programming Interface key and sends the image to a third party, breaking the privacy goal.
- Browser built-in Optical Character Recognition (the `BarcodeDetector` and `Shape Detection` family). Rejected: not available cross-browser and not designed for word-level detection.

Consequences. The application produces accurate detections on real screenshots, the user keeps their image, and the engine is swappable (the adapter pattern in `src/adapters/` is the seam). The cost is roughly 28 megabytes of model and runtime files on first use, cached afterwards in Cache Storage (ADR 0008). iOS and iPadOS exposing `navigator.gpu` is a known browser quirk where ONNX Runtime Web's WebGPU backend does not actually work; the code detects this and uses WASM there, and `preloader.js` and `paddle-ocr.js` keep their detection logic identical (a known fragile invariant noted in the code).

---

### ADR 0004: Single export contract, `AnalysedEntry[]`, with strings centralised in one file

Status: accepted (backfilled 2026-05-23).

Context. ICCC exports a report as Portable Document Format and as Markdown. Each export needs the same data (the analysed images, their colour pairs, the preview canvases) and the same user-facing copy (the disclaimer, the thresholds footer, the site Uniform Resource Locator). Without a contract, the two formats drift apart in both data and wording.

Decision. Both exporters (`src/export/pdf.js` and `src/export/markdown.js`) accept `AnalysedEntry[]` and nothing else from app internals. The `AnalysedEntry` type is defined in `src/core/schema.js` as JSDoc `@typedef` only, with no runtime code. All user-facing strings shared between the exporters live in `src/export/strings.js` (`APP_NAME`, `SITE_URL`, `THRESHOLDS_FOOTER`, `DISCLAIMER_TEXT`). Neither exporter may import from `ui/`, `adapters/`, or `core/image.js`.

Alternatives considered.

- Pass the live Document Object Model nodes to the exporters. Rejected: it ties exports to a particular renderer and forbids server-side or worker generation in the future.
- Inline strings in each exporter. Rejected: the two formats drift, and changes need to be made twice.

Consequences. New export formats (for example HyperText Markup Language, comma-separated values, JavaScript Object Notation) are a single new file under `src/export/`. The string source of truth is one file. The cost is that the renderer must populate `entry.previewDataUrl` and `entry.pairAssets` before the exporter runs; this is documented as a deliberate side effect in `src/ui/report-view.js`.

---

### ADR 0005: Vite with two HyperText Markup Language entry points, no framework, manual version bumping

Status: accepted, with release-please migration deferred to the setup build (backfilled 2026-05-23).

Context. ICCC has two distinct pages (the tool at `index.html` and the privacy statement at `privacy.html`), a non-trivial JavaScript graph (about 15 source files), and large static assets that must be served as separate files. The repository wants a build tool that bundles JavaScript without inlining the WebAssembly runtime, supports multiple entry points, and provides a development server with the required cross-origin isolation headers.

Decision. Use Vite 5.4 as the build tool. Configure two entry points (`index.html`, `privacy.html`) under `build.rollupOptions.input`. Exclude `onnxruntime-web` from `optimizeDeps` so its pre-bundled WebAssembly assets remain separate files. Set `build.assetsInlineLimit: 0` so nothing is inlined as a data Uniform Resource Locator. Emit workers as ECMAScript modules. Set the development server's `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers so `crossOriginIsolated` is true locally. Write no user-interface framework; render the Document Object Model with `document.createElement`. Bump `package.json` → `version` by hand on every behavioural change, until release-please is added.

Alternatives considered.

- A no-build setup (the SWOT-Builder approach). Rejected: the bundle size of `@gutenye/ocr-browser` and `onnxruntime-web` makes in-browser compilation impractical, and Vite's tree-shaking and asset graph are needed.
- Webpack or Rollup directly. Rejected: more configuration, no advantage at this size, and Vite's developer experience is better.
- React, Svelte, or Vue. Rejected as ADR 0002 records: the user-interface state machine is small and a framework adds bundle weight with no benefit at this scale.

Consequences. The build is fast and the developer loop is tight. The cost is a build step (the repository is not the deployed code) and a development manifest (`package.json`, `package-lock.json`, and `node_modules/`). The version-bump-by-hand process works but is fragile against forgetting; the setup build replaces it with release-please, after which this ADR is superseded for the release-process part only.

---

### ADR 0006: No user-interface framework

Status: accepted (backfilled 2026-05-23).

Context. ICCC's user interface has three states (landing, processing, results) and a small set of components (drop zone, queue rows, summary table, image cards, action bar). The team has to decide whether to render with a framework (React, Svelte, Vue) or with plain Document Object Model code.

Decision. Render with plain Document Object Model code. Use `document.createElement` and `appendChild` everywhere. Never use `innerHTML` for any user-derived value. Centralise rendering inside `src/ui/report-view.js`, `src/ui/dropzone.js`, and `src/ui/progress.js`. Wire interactions through `addEventListener` in `src/main.js`.

Alternatives considered.

- React, with or without a build step. Rejected: SWOT-Builder is the team's reference React-on-this-stack project; ICCC's user-interface state machine is smaller and the framework's weight is not justified.
- Svelte. Considered. Rejected for the same reason: not enough complexity to justify a framework's compile model.
- Lit or another web-component library. Rejected: the team has no experience with it, and the user-interface is small enough that plain Document Object Model wins on simplicity.

Consequences. The bundle is smaller, the load is faster, and the code is easy to read for anyone who knows the Document Object Model. The cost is that any future move to a heavier user interface (for example a batch-comparison view) might need to reach for a framework, at which point this ADR would be revisited. The strict avoidance of `innerHTML` keeps a class of cross-site-scripting risk out of the application by construction.

---

### ADR 0007: Bundled runtime dependencies with vendored model files

Status: accepted (backfilled 2026-05-23).

Context. ICCC has three runtime dependencies (`@gutenye/ocr-browser`, `onnxruntime-web`, `pdfmake`) and two development dependencies (`@gutenye/ocr-models`, `vite`). The models and the WebAssembly binaries are large (about 28 megabytes total) and would bloat git history if committed.

Decision. Declare runtime dependencies in `package.json` with caret pins; lock exact versions in `package-lock.json`. Declare `@gutenye/ocr-models` as a devDependency. At install time, the `postinstall` script (`scripts/copy-models.mjs`) copies the model files and the ONNX Runtime Web WebAssembly binaries from `node_modules/` into `public/models/` and `public/ort/`. Both destination folders are gitignored. The `predev` and `prebuild` scripts run the same copy step to keep the working directory honest. Vite bundles `@gutenye/ocr-browser` and `pdfmake` into the JavaScript output and serves the copied model and runtime files as static assets.

Alternatives considered.

- Commit the model files to the repository. Rejected: git is poor at large binary files, and `npm` already serves the models through a devDependency.
- Download the models at runtime from a Content Delivery Network. Rejected: it adds a runtime dependency on a third party, breaks offline use after a cold start, and exposes the visitor's Internet Protocol address to a Content Delivery Network on every visit.
- Use a Subresource Integrity hash on every dependency. Not applicable for bundled runtime dependencies (the lockfile is the integrity check at install time, and the build is deterministic). Applies to any Content Delivery Network script, which is currently only the GoatCounter `count.js` (ADR 0009).

Consequences. The repository stays small. The deployed `dist/` carries the models and the runtime as static files. The cost is that a new install fetches roughly 28 megabytes of `node_modules/` from npm, and the team must update the model and the runtime through `npm update` and a release. A small standards gap: the Browser AI Application stack page asks for a `models.json` manifest recording each model's identity, source, licence, size, and integrity hash. ICCC currently records this information in `scripts/copy-models.mjs`, `package.json`, `README.md`, and `ARCHITECTURE.md` rather than in a single `models.json` file. The setup build closes this gap or records a project-wiki exception explaining why a manifest is not warranted.

---

### ADR 0008: Hand-written service worker for cross-origin isolation and persistent model caching

Status: accepted, with the vendored upstream code carrying a small standing risk (backfilled 2026-05-23).

Context. Multi-threaded WebAssembly requires `SharedArrayBuffer`, which requires the page to be `crossOriginIsolated`, which requires the `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` response headers. GitHub Pages cannot send custom HyperText Transfer Protocol response headers (per `docs/decisions/006-adopted-static-project-standards.md`). Separately, iOS Safari evicts large files from its standard HyperText Transfer Protocol cache between visits, which would cause a 28 megabyte re-download every time the user returned.

Decision. Ship a single hand-written service worker at `public/sw.js` that does two jobs in one scope:

1. Cross-origin isolation, implemented as the `coi-serviceworker` v0.1.7 technique (by Guido Zuidhof, Massachusetts Institute of Technology licence), kept behaviourally identical. The page-context half registers the worker on every load; the worker-context half intercepts every fetch and re-emits the response with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` (or `credentialless` where appropriate).
2. Persistent caching, cache-first, for any request whose path matches `/models/` or `/ort/`, stored in Cache Storage under `icc-model-cache-v1`. The version suffix is bumped when the model or runtime files change so stale bytes are retired.

Alternatives considered.

- Move hosting to a platform that can send custom HyperText Transfer Protocol response headers (Cloudflare Pages, Netlify, a virtual private server). Rejected for now: the existing GitHub Pages deploy is working, and moving hosting is a separate decision.
- Use two service workers. Not possible; a single scope can have only one controlling service worker.
- Skip cross-origin isolation and live with single-threaded WebAssembly. Rejected: multi-threaded WebAssembly is roughly four times faster on the analysis, and the privacy-friendly fall-back to manual analysis the team uses elsewhere does not apply here.

Consequences. Multi-threaded WebAssembly works on GitHub Pages. The 28 megabytes of model and runtime files download once and then load instantly from Cache Storage. The cost is a hand-written service worker the team must maintain; the cross-origin isolation half is vendored from an upstream project with no version manifest and no Subresource Integrity check, so a future advisory against `coi-serviceworker` must be tracked manually. The two-jobs-one-worker shape is forced by the platform and is the right call. Bump `MODEL_CACHE` whenever the model or runtime files change to retire the previous cache.

---

### ADR 0009: GoatCounter analytics, no Subresource Integrity hash, no Content Security Policy in place

Status: accepted with risk; the supply-chain and sign-off gaps must close in the setup build (backfilled 2026-05-23).

Context. ICCC includes a single third-party script in production: the GoatCounter analytics snippet at the foot of `index.html` and `privacy.html`. GoatCounter is an open-source privacy-friendly analytics service that records page views without setting cookies, without cross-site tracking, and without persisting the visitor's Internet Protocol address. The privacy statement at `privacy.html` describes this accurately. The team plans to roll a similar analytics setup out to every project (HANDOFF backlog), and ICCC is the model.

Decision. Run a per-project GoatCounter counter at `iccc.goatcounter.com`. Load `count.js` from `gc.zgo.at` at the end of the body with `async`. Describe the analytics in the privacy statement, naming GoatCounter, listing the fields recorded (page path, document title, referrer, screen size, language, browser identifier), stating that no cookies are set and that the Internet Protocol address is used briefly and not stored.

Alternatives considered.

- No analytics at all. The Browser AI Application stack page reads this as the default position; ICCC is a deliberate exception. Tim has the standing decision pending: see the questions below.
- Self-hosted analytics (a copy of `count.js` served from the project's own origin, posting to the GoatCounter counter). The team's stack page prefers this for any third-party script. ICCC does not do it today.
- Cloud analytics with cookies and personal data (Google Analytics, Plausible without privacy mode, and similar). Rejected: breaks the privacy posture of the application.

Consequences. The team has a small, accurate, anonymous page-view count for ICCC. The cost is a runtime dependency on `gc.zgo.at` (a third-party origin) and the disclosure of the visitor's Internet Protocol address to GoatCounter on each page view. Two specific gaps the setup build must close:

- `count.js` is loaded from `gc.zgo.at` with no Subresource Integrity hash and no `crossorigin="anonymous"` attribute. Either self-host `count.js` from the application origin (preferred by the stack page) or add a Subresource Integrity hash and put a known refresh cadence in place.
- ICCC has no Content Security Policy `<meta http-equiv>` tag in either page. Once one is added (the static stack and the Browser AI Application stack both require it), it must allow-list `gc.zgo.at` in `script-src` if `count.js` is not self-hosted, and `iccc.goatcounter.com` in `connect-src`. The setup build writes the policy with the analytics in mind.
- The Browser AI Application stack page requires Tim's explicit sign-off on any analytics service. ICCC has analytics live in production today, but no sign-off record exists because ICCC has no project wiki. The setup build writes a project-wiki ADR ("Analytics: GoatCounter") that records the sign-off, the disclosure, and the supply-chain protections.

This ADR is the predecessor of `docs/patterns/goatcounter-analytics.md` in the global wiki once the gaps close.

## Questions for Tim

These are gathered for Sonja to put to Tim in one batch. Numbering is unset; Sonja allocates from the team's continuous Q sequence (next free is Q37 per the brief).

Q-number unset — The GoatCounter analytics on ICCC: the team's Browser AI Application stack page requires Tim's explicit sign-off on any analytics service. ICCC has been running GoatCounter for some time. Does Tim sign off retrospectively on the ICCC GoatCounter setup, and does he want the same setup rolled out to every project on the HANDOFF backlog as the canonical pattern?

- Option A: sign off ICCC's GoatCounter as built, and adopt it as the canonical pattern for every project, with the supply-chain fix (self-host `count.js` or add a Subresource Integrity hash) and a project-wiki ADR recorded as part of each setup build. (Recommended.)
- Option B: sign off ICCC only; decide the wider rollout case by case when each project's setup build runs.
- Option C: remove GoatCounter from ICCC and run no analytics anywhere.

Q-number unset — The GoatCounter `count.js` script tag has no Subresource Integrity hash and is not self-hosted. The team's Browser AI Application stack page prefers self-hosting any third-party script. What does Tim prefer?

- Option A: self-host `count.js` from the application origin; remove the `gc.zgo.at` dependency entirely. (Recommended.)
- Option B: keep loading from `gc.zgo.at` but add a Subresource Integrity hash, and review the hash monthly.
- Option C: keep loading from `gc.zgo.at` unhashed; accept the supply-chain risk.

Q-number unset — The per-project GoatCounter counter shape (`iccc.goatcounter.com`) is one of two reasonable patterns for the wider rollout. The other is a single team-wide counter (for example `timdixon.goatcounter.com`) with the page path distinguishing projects. Which pattern should the rollout use?

- Option A: per-project counters, registered for each new project. Clean per-project boundary and per-project dashboard, but one account to register each time. (Recommended.)
- Option B: a single team-wide counter for every project. One account, one dashboard, with the path identifying the project.
- Option C: keep ICCC's per-project counter and decide for each new project in its setup build.

Q-number unset — The team's Browser AI Application stack page asks for a `models.json` manifest at the repository root recording each model's identity, source, licence, size, and Subresource Integrity hash. ICCC has the information in `scripts/copy-models.mjs`, `package.json`, `README.md`, and `ARCHITECTURE.md`, but no `models.json` file. What should the setup build do?

- Option A: write `models.json` retrospectively, with the PaddleOCR PP-OCRv4 detection model, recognition model, character key file, and the ONNX Runtime Web binaries recorded against their sources, licences, sizes, and (where applicable) integrity hashes. (Recommended.)
- Option B: record a project-wiki exception explaining why a bundled-from-devDependency model set does not need a `models.json` manifest.
- Option C: defer the choice and leave the gap as is.

Q-number unset — ICCC's hand-written service worker vendors `coi-serviceworker` v0.1.7 inline, with the upstream author and licence noted in a comment but no version manifest or Subresource Integrity check. A future security advisory against `coi-serviceworker` would need to be tracked manually. What should the team do?

- Option A: keep the vendored copy, add a manual upstream-watch task to the team's monthly housekeeping ("Check coi-serviceworker upstream for advisories"). (Recommended for now.)
- Option B: replace the vendored half with a fresh upstream version on every release, with a note in the changelog.
- Option C: move ICCC to a host that can send `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` natively (Cloudflare Pages or Netlify), and remove the cross-origin isolation half of the service worker entirely. The Cache Storage caching half stays.

Q-number unset — The ICCC setup build will add the standard linter manifest (ESLint, Stylelint, HTMLHint pinned in `devDependencies`), a release-please workflow, and a Content Security Policy. The Content Security Policy on a Browser AI Application is non-trivial because of the WebAssembly runtime and the analytics script. Does Tim want the setup build to attempt the full policy in one pass, or to ship a permissive starter policy first and tighten it in a later pass?

- Option A: full policy in one pass, with the WebAssembly origins, the GoatCounter origins, and the inline-style exceptions written together. Higher risk of a small regression on first deploy, but the policy is right from the start. (Recommended.)
- Option B: permissive starter policy first (`default-src 'self'` with `script-src 'self' 'unsafe-inline' gc.zgo.at`), then tighten in a follow-up pass once the team has confirmed nothing regresses.
- Option C: defer the Content Security Policy entirely to a later piece of work.
