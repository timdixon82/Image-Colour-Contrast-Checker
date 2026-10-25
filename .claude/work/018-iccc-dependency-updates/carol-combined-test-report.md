# Carol test report: combined release, PR 71 (release/combined-update, head 59b4600)

Overall verdict: FAIL on one acceptance item (the "kWh GRID" box still reports a ribbon/dark-panel pair). Everything else passes. One release risk to decide on (old service worker serving old ORT files on the first returning visit).

Method
- Baseline: my own worktree of origin/main (3bde7b4), removed afterwards with its node_modules. PR: existing release-combined worktree, `npm ci` re-run, `npm run build`.
- Production builds served two ways: `vite preview` (ports 4311/4312; these send COOP/COEP headers, so the service worker does NOT register there) and a plain static server with no-store caching (port 4330/4331, no isolation headers, so the service worker registers and does the real job). All SW, cache, export and theme tests used the static server.
- Playwright (Python) driving Google Chrome. Real OCR with the real models.
- Per-box numbers came from the Vite dev server on the same two trees (same core code), calling the app's own decode, OCR and `worstStripContrast`.
- Disk free stayed above 24 GB. No commits, merges or pushes. Servers stopped; my worktree and browser profiles removed.

Repo gates (PR worktree)
- `npm test`: 5 files, 29 tests pass, including the veraPDF PDF/UA tests (veraPDF 1.30.0 present, so they ran, not skipped) and the 5 real-crop tests. PASS
- `npm run lint`: clean. PASS
- `npm audit`: 6 low only (the vite-plugin-node-polyfills chain). No high or moderate left. PASS
- No `pbkdf2` in the built bundle. PASS

## 1. Swatch bug: FAIL (4 of 5 named boxes fixed, 1 not)

Per box, main then PR (fg on bg, contrast):
- "762.03 MWh": #8854D7 on #7452B4 1.19, then #3F366E on #8E56E2 2.33. Dark label text on the purple tile. PASS
- "BATTE.. 1.54": #8C55DE on #7752B3 1.23, then #34305D on #8B55DD 2.57. Dark text on purple. PASS
- "1.05 800.39": #4B6D74 on #598E90 1.52, then #2D3F53 on #598C8F 2.86. Dark text on the teal tile. PASS
- "MWh kWh": #51777B on #598E90 1.33, then #2E4255 on #588C8F 2.74. PASS
- "kWh GRID": #858DF1 on #6F76C1 1.40, then #4E5F7F on #393C46 1.71. FAIL. Neither colour is a text colour. The strip is the dark gap between ribbons plus the thin blue ribbon edge line (crop checked by eye). Real text in that box is dark "kWh" on lilac (about 3.4) and the "GRID" pill (about 2.4). The result still fails WCAG, so nothing is hidden, but the reported pair is wrong. The box "24.69% 63.33 kWh" shows the same defect (#4E52AC on #464986 1.22, then #4B577F on #393C46 1.56); the true "63.33 kWh" dark-on-indigo text is probably also low, so the verdict is unchanged but the colours are still not text.
- Cause (inferred from the crop): a thin minority line over a dark panel looks like a stroke to `isTextLike`.

Other boxes
- "Home Device Service Settings": #787B80 on #2E3138 3.07, then #A2A4A8 on #35383F 4.70. Plausible: the nav labels are mid grey on near black. PASS
- "SOLAR BATTe...": #B6B063 on #E3DA77 1.55, then #7B7A60 on #F4EDAB 3.66. Better, but the dark navy text on cream should read about 10+; 3.66 looks like an antialiased letter-edge strip winning the "lowest text-like strip" rule. Not hidden failure (it reads lower than truth). Minor.
- "2026 Lifet...": #3D3F4A on #2B2C32 1.33, then #7E7F83 on #303239 3.20. Plausible: the grey chevrons beside the year. PASS
- Unchanged: Energy Statistics, 33.21%, 43.69%, 31.62%, kWh, 595.07, 1.05 mwh 1.54 mwh, 0.00 kw.
- Pair count in the report: 17 on main, 14 on PR.

Regression and sweeps (main vs PR run in the same browser; real system fonts rendered on canvas)
- Re-created sweep (my earlier 576-case script was not kept): 38,880 cases = 4 fonts (Helvetica Neue, Georgia, Menlo, Arial) x 3 weights (200/400/700) x 6 sizes (10-40 px) x 9 colour pairs x 3 backgrounds (flat, gentle ramp, steep ramp) x 2 strings x 5 encodings (PNG, JPEG q90/70/50/30) x 2 box types (tight, padded). Plus 1,440 wide-box cases with a 140 px text-free gap (the bug shape).
- Real failing text turned into a pass: none. Where the true contrast is below the threshold everywhere (19,650 cases) PR passes 0 (main 0).
- Faint #BBB on white (1,440 + 80 gap cases): PR never passes (max 1.83). PASS. Black on white: passes 1,163 of 1,440 flat cases; the failures are only 10-12 px text and punctuation-only strings plus ultralight 16 px, all antialiasing grey, and main fails more (352). PASS
- Faint text on a gentle ramp: fails in PR as on main. PASS
- PR is higher than main in 3,410 cases (mostly main's wrong 1.03-1.2 on tight boxes, now fixed) and lower than main in 3 cases, all by under 0.1.
- Watch item (not a blocker): 27 of 38,880 cases flip from fail to pass on a steep ramp with ultralight or sparse punctuation glyphs. True worst-end contrast 2.47 against a threshold of 3; PR reads 3.0 to 3.5, main 2.6 to 2.9. Both builds already pass 668 similar borderline cases.
- Heavy per-pixel noise (+/-25 levels, text over a noisy photo-like gradient): PR and main return the identical noise-only pair (1.35, 1.11, 1.72, ...) for both white and dark text. Not a regression; the fallback keeps main's behaviour.

## 2. OCR, cache, isolation: PASS (one risk noted)
- Clean text image (five lines): the same 5 text lines found on main and PR, identical contrast to two decimals except one light-on-dark swatch (12.2 vs 12.34). PASS
- Fresh visit on PR (two visits): crossOriginIsolated true, service worker controls the page, `icc-model-cache-v2` holds 5 files (det and rec models, dictionary, jsep .mjs and .wasm at the 1.30.0 sizes 46,851 bytes and 28,312,028 bytes). No WASM/ORT version errors. PASS
- Returning visit holding the v1 cache (main loaded twice on the same origin and profile, then PR):
  - First PR visit: the old service worker and v1 cache served the OLD 1.27 files (26,827,543 byte wasm) to the new 1.30 page code. OCR still worked and the console was clean, but it is a mixed-version state. The worker then updated: v1 was deleted that visit.
  - Second PR visit: v2 populated with the 1.30 files, v1 gone. PASS
- Risk (for Sonja and Tim, not a test failure): because the page only calls `register()` when not yet isolated, a returning visitor depends on the browser's own update check to get the new worker. In my run it updated on the first visit, but Chrome can defer update checks of an unchanged scope for up to 24 hours, so some visitors may run 1.30 JS on 1.27 WASM for a while. It worked here; a failure would show as an OCR load error. A cheap hardening would be to derive the cache path or file names from the ORT version.
- Console errors on PR equal those on main: CSP `frame-ancestors` ignored in a meta tag, the data: URL wasm fetch message, and two onnxruntime assignment warnings logged as errors. Nothing new. PASS

## 3. Exports: PASS
- Markdown (real browser): per-pair `[VADChecker](https://vadchecker.com/tool/?txt=...&bg=...)` links; the set of URLs equals the on-screen pairs exactly (5 of 5 on the clean image, 14 of 14 on Tim's image). WebAIM links also present. No `tastheartist` text anywhere. PASS
- PDF (real browser, pdfkit 0.20.2 bundle): downloads, opens in poppler (`pdfinfo`: tagged, 10 pages for Tim's image, 12 on main because of more pairs), page render checked: per-pair "Check and adjust this colour pair with VADChecker (opens in new window)" link visible. Link annotations carry per-pair `txt`/`bg` URIs; sets equal the on-screen pairs (5 of 5 and 14 of 14, each URI appearing twice as before). PASS
- PDF/UA: project tests pass with veraPDF. veraPDF on the browser-made PDF: clean image fully compliant (106 rules passed, 0 failed). Tim's image fails 2 rules (7.21.7 and 7.21.8, the .notdef glyph) for the OCR word "三83" that Roboto cannot render. The main-built PDF fails the identical 2 rules, so not caused by the PR. PASS
- No console errors during either export.

## 4. VADChecker links: PASS
- Hrefs (txt is the foreground, bg the background): #8E8E8E on #FDFDFD gives `?txt=8e8e8e&bg=fdfdfd`; #DB934F on #1D2825 gives `?txt=db934f&bg=1d2825`; #515151 on #FEFEFE gives `?txt=515151&bg=fefefe`. All 14 pairs on Tim's image were also checked in the exports. PASS
- Accessible name: "Check and adjust this colour pair with VADChecker (opens in new window)". WebAIM link name includes "(opens in new window)" in its visible text. `target=_blank`, `rel=noopener noreferrer`. PASS
- Target size: both links measure 44 px high (VADChecker 92 px wide, WebAIM 180 px wide) in all four themes and all 14 rows. PASS (the earlier 44 px gap is closed)
- Link contrast on its real background (14 rows, unrounded): light 11.51, dark 7.004, muted-light 9.14, muted-dark 7.78. All at least 7:1. PASS (dark is only just over 7)
- Focus ring: 3 px solid, 3 px offset, `:focus-visible` true, in the accent colour of each theme (navy in light themes, orange or sand in dark themes). The ring of the 44 px target sits close to the neighbouring link but does not hide it. PASS
- Screenshots (report with the second pair expanded, VADChecker link focused):
  - Light: pale grey page, white card, navy headers; links in navy with an underline and a small arrow; focus ring is a navy rounded box around "VADChecker"; green and red pills; Download PDF button navy.
  - Dark: deep navy page and cards; links in orange; ring orange; pills dark green, brown and red tints with light text; Download PDF button orange.
  - Muted light: same layout as light but softer, grey-blue headers and slate navy links and ring; pills slightly desaturated.
  - Muted dark: slate blue-grey surfaces; links and ring in a pale sand; pills muted; Download PDF button sand.
  - In all four the link rows are taller than before (44 px each), the table did not break, nothing is clipped and the stacked links read clearly.

## 5. Console, axe, keyboard: PASS
- axe-core (wcag2a, 2aa, 21a, 21aa, 22aa, best-practice), report loaded, all four themes switched with `tdTheme.set`: zero violations, including the 2.5.8 target-size rule. PR and main equal. PASS
- The wcag2aaa tag shows `color-contrast-enhanced` on the small status pills in the light themes (light: 17 on PR and main in my re-run, muted-light: 3). Identical on main, none are the links. Pre-existing and worth a follow-up because the project says all tokens are 7:1 (the pass pill measures 5.88 in light).
- Keyboard only: Tab goes skip link, theme select, "Show/hide explanations", "Choose files"; Enter opens the file chooser; after the report appears focus is on `body` (pre-existing), two Tabs reach the first row toggle; Enter expands the pair (`aria-expanded` true, detail visible); the next Tabs reach the WebAIM link then the VADChecker link, both with a visible focus ring; Enter on VADChecker opens a new tab; Shift+Tab goes back. PASS
- Not run: VoiceOver, JAWS, NVDA, and a 375 px mobile pass this time.

## Rework needed (for Sonja to route)
1. Sean: `isTextLike` still accepts a thin ribbon edge line over the dark panel as text. "kWh GRID" (and "24.69% 63.33 kWh") report #4E5F7F/#393C46 (1.71, 1.56) instead of text colours. Add real crops of those two boxes (from Tim's image, resized by `decodeAndResize`: boxes [62,924,470,25] and [59,965,490,26]) to `contrast.real.test.js` and tighten the test; re-run my sweep (cases above) to make sure no real faint text becomes a pass.
2. Sonja or Tim decide: the first returning visit runs 1.30 code with the cached 1.27 WASM until the browser updates the worker (up to about 24 hours in Chrome). It worked in my test. Jed already suggested deriving the cache name from the ORT version; consider also versioning the `/ort/` file path.
3. Version: `package.json` is still 0.5.1, the same as main, although the combined branch changes behaviour. Confirm release-please handles the bump.
4. Follow-up (not release blocking): AAA contrast of the status pills in the light themes (5.88 and 6.53) is under 7:1.

<!-- TASK -->
- [ ] Fix isTextLike so a thin ribbon edge over the dark panel is not text: add real crops for "kWh GRID" and "24.69% 63.33 kWh" and re-run the main-vs-PR sweep `priority:high` `owner:sean` `from:carol-combined-release`
<!-- /TASK -->

<!-- TASK -->
- [ ] Raise the light-theme status pill colours to 7:1 (axe color-contrast-enhanced) `priority:low` `owner:sean` `from:carol-combined-release`
<!-- /TASK -->
