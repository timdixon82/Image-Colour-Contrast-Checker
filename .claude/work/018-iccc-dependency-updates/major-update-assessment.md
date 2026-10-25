# Major update assessment: vitest 5.0.5 and pdfkit 0.20.2

Date: 2026-10-25. Each major was tried alone on top of `main` in a throwaway worktree (since removed), using Node 22.23.1.

## vitest 4.1.10 to 5.0.5

- Lint: clean. Tests: 6/6 pass. Build: succeeds. No config or test changes were needed (`vitest.config.js` works as is).
- npm audit: 15 vulnerabilities (6 low, 4 moderate, 5 high) against 17 on main. No new issues.
- Peer range accepts vite 6, 7 and 8, so the current vite is fine.
- Requires Node `^22.12 || ^24 || >=26`. CI uses `node-version: lts/*`, which satisfies this. Developers on Node 20 or older 22.x would need to upgrade; `package.json` has no `engines` field to flag it.
- Effort: small. Risk: low (dev-only, no shipped code).
- Recommendation: safe to adopt once Tim approves. Do it after the minor-update PR merges so the lockfile does not conflict. Optionally add an `engines` field.
- Not checked: the Playwright and accessibility workflows (they use their own tooling), and whether CI itself is green on 5.x.

## pdfkit 0.19.1 to 0.20.2

- Lint: clean. Tests: 6/6 pass, and veraPDF was installed locally, so the three PDF/UA-1 compliance tests (wrapper, `addTable`, full report export) actually ran and passed. On CI they are skipped by design, so CI would not catch a PDF/UA regression. Build: succeeds. No source changes were needed.
- npm audit: unchanged (17).
- Sensitivity to internals: `src/lib/pdf-ua/index.js` relies on the `tagged` option, `doc.struct()`, `doc.link` wrapping, and one private member (`doc._normalizeColor`). It also works around two PDFKit 0.18.0 bugs (malformed CIDSet with `subset: 'PDF/UA'`, and `doc.struct('TH', { scope })` dropping attributes). The 0.20 changelog does not mention fixing either, and the workarounds still produce veraPDF-compliant output, so keep them. The file header and comments still say 0.18.0 although 0.19.1 is installed, so they are already stale.
- 0.20 breaking changes that matter here: the virtual file system was removed (the code uses `registerFont` with font data, not `pdfkit/virtual-fs`); standard fonts changed to generated modules (the app registers Roboto TTFs and does not use standard fonts, but any use of a built-in font such as Helvetica in the browser would now need explicit registration); internals now use `Uint8Array` instead of `Buffer`, which touches the `blob-stream` and Buffer polyfill path used in the browser; AcroForm and annotation option handling is stricter (the app uses link annotations only, and the tests pass).
- pdfmake: pdfmake 0.3.12 (in the minor-update PR) now depends on `pdfkit ^0.20.2`, while the root depends on `^0.19.1`. npm therefore installs two copies (root 0.19.1, nested 0.20.2 under pdfmake). This is harmless today: no file under `src/` imports pdfmake. It is only used as the source of the Roboto font files that `scripts/copy-models.mjs` copies. It is not a conflict, but it is a reason to move the root pdfkit to 0.20.x so there is one copy. pdfmake 0.3.11 uses pdfkit 0.19.1.
- Not verified: PDF export in a real browser. The browser bundle path changed in 0.20 (named exports, Uint8Array, no virtual fs), and the Node tests do not exercise it. `vite build` succeeds, which only proves it resolves.
- Effort: small to medium. Code change is probably none or a bump of the version comment, but a real-browser export check (Chrome, Firefox, Safari) and a veraPDF run are needed.
- Risk: medium. PDF/UA compliance is a core accessibility claim and CI does not check it; the browser path is unverified.
- Recommendation: adopt, as its own PR, after the minor-update PR merges, with Carol doing real-browser PDF export tests and a veraPDF pass on the produced file. Update the 0.18.0 comments at the same time.

## Order

1. Merge the minor-update PR and the onnxruntime-web PR (each after review and testing).
2. vitest 5 (small).
3. pdfkit 0.20 (after browser and veraPDF verification).
