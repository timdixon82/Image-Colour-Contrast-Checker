**Verdict**: pass

**Bottom line**: The Image-Colour-Contrast-Checker architecture is sound, fits the Browser AI Application stack as written, and is captured in nine Architecture Decision Records ready for the project wiki; two ADRs (the GoatCounter analytics and the vendored `coi-serviceworker` upstream code) are accepted-with-risk and the setup build must close their gaps.

**Blocking issues**:
None.

**Open questions**:
- Q-number unset — Retrospective sign-off on the ICCC GoatCounter analytics, and whether to adopt the ICCC pattern as canonical for the wider HANDOFF analytics rollout.
- Q-number unset — Self-host the GoatCounter `count.js` script or add a Subresource Integrity hash and review it on a known cadence.
- Q-number unset — Per-project GoatCounter counters versus a single team-wide counter for the rollout.
- Q-number unset — Write `models.json` retrospectively for ICCC, or record a project-wiki exception explaining why the bundled-from-devDependency model set does not need it.
- Q-number unset — How to handle the vendored `coi-serviceworker` upstream code (manual upstream-watch, periodic refresh, or move hosting off GitHub Pages).
- Q-number unset — Content Security Policy approach for the setup build: full policy in one pass, or permissive starter then tighten.

**Recommended next agent**: Sonja.

**Work estimate**: 1 interaction.

---

# Jacob's architecture review return for ICCC (intake 011)

The full architecture review is at [the ICCC architecture review file](.claude/work/011-iccc-setup/jacob-architecture-review.md). It covers:

1. **The stack.** ICCC is a Browser AI Application and fits the existing `docs/stacks/browser-ai-application.md` page without an exception. It is the second project on that stack and confirms several of the stack page's "SWOT-specific, expected to generalise" tags: the offline-build branch is real (Vite), and the no-framework branch is real (plain Document Object Model). ICCC adds a new pattern the stack page does not yet name: a single, fixed, bundled-at-install model set, which is worth lifting into the stack page as a second valid model-catalogue pattern alongside the user-selectable catalogue SWOT-Builder uses.

2. **The build and deploy setup.** `package.json` declares three runtime dependencies (`@gutenye/ocr-browser`, `onnxruntime-web`, `pdfmake`), two devDependencies (`@gutenye/ocr-models`, `vite`), and a `postinstall`/`predev`/`prebuild` script that copies models and WebAssembly into `public/`. `vite.config.js` excludes `onnxruntime-web` from dependency optimisation, sets `assetsInlineLimit: 0`, and adds the cross-origin isolation headers in dev. `.github/workflows/deploy.yml` is a canonical GitHub Pages deploy on push to `main`. Three concrete gaps against the team standards: no pinned ESLint, Stylelint, or HTMLHint per `docs/decisions/006-adopted-static-project-standards.md` standard 4; no release-please workflow; no Content Security Policy `<meta http-equiv>` tag. All three are the standard setup-build backfill items.

3. **The data flow.** Walked end to end. Images enter through a `<input type="file">` or a drag-and-drop zone, are decoded by `createImageBitmap`, downsized onto a bounded canvas, sent to PaddleOCR PP-OCRv4 through ONNX Runtime Web (WebGPU on desktop browsers exposing `navigator.gpu`, WASM elsewhere and on iOS or iPadOS regardless), analysed by `core/analyse.js` (k-means luminance clustering on character-width strips), rendered to the Document Object Model with `document.createElement` (no `innerHTML` for user data), and optionally exported as PDF or Markdown. No image data, no Optical Character Recognition detection, no contrast result ever leaves the device. The only outbound third-party request is the GoatCounter analytics ping.

4. **Named architecture decisions, captured as ADRs.** Nine ADRs, written in the SWOT-Builder shape, ready for the ICCC project wiki at `docs/decisions/`. Seven are accepted; two (the GoatCounter snippet and the vendored `coi-serviceworker` upstream code) are accepted-with-risk and the setup build closes the gaps.

5. **The GoatCounter analytics setup.** Walked in detail. Per-project counter at `iccc.goatcounter.com`. `count.js` loaded `async` from `gc.zgo.at` at the foot of `index.html` and `privacy.html`. Privacy disclosure at `privacy.html` is strong and accurate. Three gaps before this is lifted as the canonical pattern: no Subresource Integrity hash on `count.js`; no Content Security Policy to allow-list the GoatCounter origins; no project-wiki sign-off record (the Browser AI Application stack page requires one). Cross-referenced as a candidate `docs/patterns/goatcounter-analytics.md` once the gaps close.

6. **Open architecture questions.** Six questions for Tim, all in the envelope's Open questions section above, batched for Sonja to allocate Q-numbers from the team's continuous sequence (next free is Q37 per the brief).

## Cross-cutting flags for Sonja

Three patterns in this review are not specific to ICCC and a future Browser AI Application project would benefit from them. Sonja decides whether they go to the global wiki:

- The cross-origin isolation service-worker pattern. Reusable for any Browser AI Application that needs `SharedArrayBuffer` on GitHub Pages.
- The vendored-models pattern: `postinstall`/`prebuild` script copies model files from a packaged devDependency into `public/models/`. A second valid model-catalogue shape on the Browser AI Application stack.
- The GoatCounter analytics pattern, once the supply-chain and sign-off gaps close in ICCC's setup build.
