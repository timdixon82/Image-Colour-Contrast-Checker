# Carol test report: 018 dependency updates (PR 69 and PR 70)

Date: 2026-10-25. Tester: Carol.

## Verdicts

- PR 69 (chore/dependency-updates, 50325a2): PASS.
- PR 70 (chore/onnxruntime-web-update, 6cc94a7): PASS, with one observation (first load after upgrade, below) that needs no rework.

## Method

- Worktrees: existing agent-a475516fe40e04934 (PR 69, `npm ci` re-run there and left in place; it is not mine), plus carol-onnx (PR 70) and carol-main (main at 3bde7b4, baseline). The two I created were removed, with node_modules. Main clone untouched. Free disk stayed above 19 GB.
- Each was `npm ci`, `vite build`, then served from `dist/`. Installed versions confirmed: PR 69 has ocr-browser 1.4.9, pdfmake 0.3.12, vite 8.3.5, vitest 4.1.12, onnxruntime-web 1.27.0. PR 70 has onnxruntime-web 1.30.0 and the main versions of everything else. Main has onnxruntime-web 1.27.0.
- Deviation: `vite preview` sends COOP/COEP headers itself (vite.config.js `server.headers` applies to preview), so the service worker never registers and the real isolation path is not exercised. I used a plain static server on `dist/` with no isolation headers (like GitHub Pages) plus `Cache-Control: no-cache`. The service worker registered, reloaded, and made the page cross-origin isolated, as in production.
- Browser: Playwright (Python) with installed Google Chrome 156, headless, persistent profiles. Test images: a generated image (/private/tmp/claude-501/carol/ not kept; 4 text lines on 4 backgrounds) and Tim's screenshot 2.png.
- Exports (PDF, Markdown) were downloaded by clicking the real buttons. Artifacts are in /private/tmp/claude-501/carol/out-* (main, pr69, pr70, up2, up3, mng, png).

## Static checks (each branch)

| Check | main | PR 69 | PR 70 |
|---|---|---|---|
| npm ci | pass | pass | pass |
| vitest (2 files, 6 tests; veraPDF tests ran, not skipped) | pass | pass | pass |
| lint (html, css, js) | pass | pass | pass |
| vite build | pass | pass | pass |

## 1. OCR end to end

Same words and pairs on main, PR 69 and PR 70 (fresh visit), and also PR 70 with the WebGPU path disabled (WASM) and main with WebGPU disabled. All result sets were identical, pair for pair, including hex values and detected text.

Generated image: 4 combinations (2 fail, 1 review, 1 pass) on WCAG; Advanced: 4 combinations, 2 fail, 1 need review.

| Verdict | Background | Foreground | Text |
|---|---|---|---|
| Fail | #EA9C53 | #9F978F | Grey words on orange |
| Fail | #FFFFFF | #D0D0D0 | Low contrast pale grey |
| Review | #16436A | #F7F8FA | Light text on navy panel |
| Pass | #FFFFFF | #2C2C2C | Welcome to the Contrast Checker |

Tim's 2.png: WCAG 17 combinations, 10 fail, 3 need review; Advanced 17 combinations, 12 fail, 4 need review. Rows (verdict, bg, fg, text):
Fail 7452B4/8854D7 "BATTE.. 1.54"; Fail 464986/4E52AC "24.69% 63.33 kWh"; Fail 2B2C32/3D3F4A "2026 Lifet..."; Fail 598E90/51777B "1.05 800.39"; Fail 6F76C1/858DF1 "kWh GRID"; Fail E3DA77/B6B063 "SOLAR BATTe..."; Fail 8E56E1/433A67 "64.17%"; Fail 646CB1/A9AFF6 "GRID"; Fail 598B8F/304658 "33.21%"; Fail 2E3138/737782 "Solar Load"; Fail CDA5F7/6A4CA4 "LOAD"; Fail 858CEF/363E68 "595.07"; Review 7FDFDD/3F6373 "kWh"; Review 3D404C/71C2BA "0.00 kw 0.00kW"; Review 3E4049/B9B9BD "17:02 三83"; Review E6DD70/545649 "43.69%"; Pass 484A54/F1F1F2 "Energy Statistics".

| Item | PR 69 | PR 70 |
|---|---|---|
| Generated image, same as main | PASS | PASS |
| 2.png, same as main | PASS | PASS |

## 2. PR 70 specifics

| Item | Result |
|---|---|
| Fresh visit: model ready in about 6 s, OCR works, service worker active | PASS |
| crossOriginIsolated true (fresh, returning, WASM-only runs) | PASS |
| Console errors about WASM or ORT version mismatch | PASS: none. No "version" or "mismatch" text in any console log. |
| Backend: WebGPU adapter was available (Apple). Loaded the JSEP build (`ort-wasm-simd-threaded.jsep.*`), run on WebGPU. | PASS |
| WASM fallback (navigator.gpu hidden): loaded `ort-wasm-simd-threaded.wasm/.mjs`, OCR results identical to main | PASS |
| New cache name: only `icc-model-cache-v2` exists after a fresh visit, holding both detector and recogniser models, the key file and the jsep (and, for fallback, plain) ORT .wasm/.mjs | PASS |
| Returning visit from main's v1 cache (profile that had loaded main first, same origin, then PR 70 build): old v1 cache is deleted on activate; next page load rebuilds cache as v2 and OCR gives identical results | PASS |
| PR 69 keeps `icc-model-cache-v1` (unchanged, as intended) | PASS |

Observation (no rework required): on the very first page load after upgrading, the page is still controlled by the old v1 worker. In that run the model files came from the v1 cache, including the old 1.27 `/ort/*.mjs` and `.wasm` (26.8 MB versus 28.3 MB for 1.30), paired with the 1.30 application bundle. OCR still completed with identical results and no console errors. The new worker then activated, deleted v1, and the second load populated v2. So the cache bump works, but a returning user gets one load on mixed runtime versions. That is how this cache design behaves and is not a regression. A hard guard (a versioned ORT path) would remove it if Tim wants one.

## 3. Exports

| Item | main | PR 69 | PR 70 |
|---|---|---|---|
| Report renders | yes | PASS | PASS |
| Markdown export | yes | PASS: identical to main apart from timestamp and embedded images (154 and 466 lines) | PASS: identical (same) |
| PDF export opens (pdfinfo: tagged, 4 and 12 pages) | yes | PASS | PASS |
| PDF link annotations (veraPDF extract, Link subtype, URLs such as site and WebAIM checker) | 38 and 155 | PASS: 38 and 155 | PASS: 38 and 155 |
| veraPDF `--flavour ua1` on generated image PDF | pass | PASS | PASS |
| veraPDF `--flavour ua1` on 2.png PDF | fail (7.21.7, 7.21.8) | same two failures as main | same two failures as main |
| Project PDF/UA vitest suite with veraPDF 1.30.0 (not skipped) | pass | PASS | PASS |

The two veraPDF failures on the 2.png PDF are pre-existing on main (likely the CJK glyph the OCR read, "三"; font clause 7.21.7 and 7.21.8). They are not caused by either PR. Worth a follow-up task.

## 4. Console and accessibility versus main

| Item | PR 69 | PR 70 |
|---|---|---|
| Console messages identical in kind to main (no new errors) | PASS | PASS |
| Accessibility: axe-core (wcag2a, aa, 21, 22, aaa, best-practice): landing 0 violations; report 1 rule, color-contrast-enhanced, 53 nodes, identical to main | PASS (unchanged) | PASS (unchanged) |
| Report structure digest (headings, buttons, landmarks, tables, live regions) and focusable count (75) identical to main | PASS | PASS |

Console messages present on main and both PRs (pre-existing, not regressions): CSP `frame-ancestors` ignored in a meta element; goatcounter skipped on localhost; "Connecting to data:application/octet-stream" blocked by CSP (ORT wasm data URL fetch; OCR still works); ORT "Some nodes were not assigned to the preferred execution providers" warnings at session creation; one aborted model request (ERR_ABORTED) when the page reloads for the service worker.

## Pre-existing findings for follow-up (not caused by these PRs)

- 53 `color-contrast-enhanced` (AAA) axe nodes in the report. Likely swatch or pair-sample text. Needs triage against the 7:1 target.
- 136 `th` elements in the report lack `scope="col"` (likely row headers or `scope` set differently), against the CLAUDE.md rule. Worth a check by Sean.
- PDF/UA-1 failure on the CJK-containing 2.png PDF (above).

## Rework needed

None for either PR.

<!-- TASK -->
- [ ] Triage 53 axe color-contrast-enhanced nodes and th elements without scope="col" in the report (present on main) `priority:medium` `owner:sean` `from:carol-018`
- [ ] Investigate veraPDF PDF/UA-1 failures 7.21.7 and 7.21.8 on a PDF containing a CJK glyph `priority:low` `owner:sean` `from:carol-018`
<!-- /TASK -->
