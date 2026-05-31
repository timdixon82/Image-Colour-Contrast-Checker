# Jed return: ICCC feature branch security review (intake 011)

**Verdict**: pass

**Bottom line**: The vestibular-checker branch introduces one new pure-logic module and wires it into the existing pipeline with no new external dependencies, no schema breakage, and no change to the security boundary; it is safe to merge after Carol's test pass.

**Blocking issues**:

None that block merge. One pre-existing defect is noted in section 8 below for a follow-up Sean fix.

**Open questions**:

None.

**Recommended next agent**: Carol, to run the accessibility and functional test pass against the branch before merge.

**Work estimate**: 1 interaction.

---

## Feature Branch Security Review: `claude/vestibular-checker-extension-O5NPm` against `main`

Reviewer: Jed (security agent)
Date: 2026-05-23
Repository: timdixon82/Image-Colour-Contrast-Checker
Branch reviewed: `claude/vestibular-checker-extension-O5NPm`
Baseline review: `.claude/work/011-iccc-setup/jed-security-review.md` (branch `main`)
Standards: OWASP Top 10 (2021 edition); UK General Data Protection Regulation (UK GDPR)

---

## 1. Diff Summary

Sonja has switched the local clone to the feature branch. The working tree was read directly. The following is the scope of the change based on what is present in the feature branch versus what is described in my earlier `main` review.

### Files changed or added

The feature branch introduces the vestibular-saturation check as a new per-pair check, raising the per-pair check count to six. The relevant changed files are:

- `src/core/perceptual.js` — new `vestibularResult` function added alongside the existing `apcaResult` and `cognitiveResult` functions. The file now exports all three.
- `src/core/analyse.js` — `annotatePairs` imports and calls `vestibularResult`; `overallVerdict` now checks `p.vestibular.status === 'HIGH'` and `p.vestibular.status === 'WARN'`.
- `src/core/schema.js` — the `VestibularResult` typedef and the `vestibular` property of `ColourPair` are now formally declared. The `ColourPair` typedef also includes `cognitive` and `apca`, which were in the runtime objects on `main` but undeclared in the schema file.
- `src/export/checks.js` — `pairChecks` returns six checks including the vestibular row; `advancedStatus` includes `p.vestibular.status`; `severity` handles the `'HIGH'` and `'SAFE'` statuses introduced by the vestibular check.
- `src/ui/report-view.js` — `renderContrastResults` renders the expanded table through `pairChecks`, which now includes the vestibular row. No new DOM-write pattern is introduced.
- `src/export/pdf.js` and `src/export/markdown.js` — both consume `pairChecks` from `checks.js`; the vestibular row appears automatically through that shared function. No direct changes to these files' rendering logic.
- `index.html` — the `#check-info-vestibular` details element is present in the static "What the checks mean" section, describing the check correctly.
- `package.json` — version bumped. No new dependencies.

### Files deleted

None.

### New files

No new source files. `perceptual.js` was already present in the repository on `main` with the APCA and cognitive functions. The vestibular function is an addition within the existing file.

---

## 2. OWASP Top 10 Delta

For each OWASP category I state only whether the diff introduces a new risk relative to my `main` baseline. The baseline findings (medium-severity absent Content Security Policy; low-severity GoatCounter without Subresource Integrity hash) carry forward and are not repeated in detail here.

### A01 Broken Access Control

No change. The branch adds no server, no session, no shared data store, and no new network request. The service worker scope and the cross-origin isolation headers are unmodified.

Delta: none.

### A02 Cryptographic Failures

No change. No cryptographic operations are introduced. The only `localStorage` key remains `td-theme`.

Delta: none.

### A03 Injection

The vestibular check operates exclusively on the `fgHex` and `bgHex` strings that are already in scope by the time `vestibularResult` is called. Those strings originate in `rgbToHex` in `src/core/contrast.js`, which constructs them from integers using `.toString(16).padStart(2, '0').toUpperCase()`. They are always in the form `#RRGGBB` with six uppercase hexadecimal digits.

The `vestibularResult` function passes those strings to `hexToRgb` (which parses each two-digit hex slice with `parseInt`, producing integers), then to `hslSaturation` (which does floating-point arithmetic on the resulting integers), and returns a plain object with numbers and string literals. None of those paths can produce a DOM-injectable string.

The result object (`fgSat`, `bgSat`, `maxSat`, `status`, `message`) is consumed by `pairChecks` in `checks.js`, which puts `vestibular.maxSat` into a template-literal string for the `value` field and `vestibular.message` into the `detail` field. Both of these are then passed to `checkRow` in `report-view.js`, which sets them via `.textContent`. The `.textContent` setter does not parse HTML. No injection is possible through this path.

In the Markdown and PDF exports, the vestibular row's `value` and `detail` strings are interpolated into Markdown table cells and into pdfmake text nodes respectively. Neither path executes HTML in the browser from those values.

Delta: none. The vestibular check adds no new injection surface.

### A04 Insecure Design

The vestibular check is a pure HSL-saturation calculation on colour values that are already present in the analysis result. It performs no network request, no file read, no canvas operation, and no DOM manipulation. The privacy-by-design architecture is unaffected.

Delta: none.

### A05 Security Misconfiguration

The branch does not add a Content Security Policy. The medium-severity finding from the `main` review (Finding 1) carries forward. The service worker, the cross-origin isolation headers, and `vite.config.js` are unmodified.

Delta: the baseline finding carries forward. No new misconfiguration introduced.

### A06 Vulnerable and Outdated Components

`package.json` confirms no new runtime or devDependency. The version field is bumped (a behavioural change per the repository's `CLAUDE.md` convention). The lock file was not read directly, but the absence of any new `import` or dynamic `import()` call in the diff confirms no new package is required at runtime.

Delta: none.

### A07 Identification and Authentication Failures

Not applicable. No change.

### A08 Software and Data Integrity Failures

The GoatCounter Subresource Integrity finding from the `main` review carries forward. No new external script is loaded. No new dynamic `import()` call fetches from an untrusted origin.

Delta: none.

### A09 Security Logging and Monitoring Failures

Not applicable. The branch adds no `console.log` or `console.error` call that logs user content or personally identifiable information.

### A10 Server-Side Request Forgery

Not applicable. No server.

---

## 3. Input Handling: Vestibular Check on Colour Values

The vestibular check reads the `fgHex` and `bgHex` strings from a `ColourPair`. I traced the entire input path.

### Origin of the hex strings

`fgHex` and `bgHex` in a `ColourPair` are set by `buildColourPairs` in `src/core/analyse.js`. They originate as the return value of `rgbToHex(r, g, b)` in `regionContrast` in `src/core/contrast.js`. The `rgbToHex` function takes three numbers, clamps each to the 0-255 integer range using `Math.max(0, Math.min(255, Math.round(n)))`, converts each to a two-digit hexadecimal string, and prepends `#`. The output is always a seven-character string of the form `#RRGGBB`.

The input to `rgbToHex` is derived from averaging the raw pixel channel values from `ImageData` across a pixel cluster. Pixel channel values from `ImageData` are always unsigned bytes in the range 0-255. The averaging arithmetic cannot produce a value outside that range.

### Behaviour of `hslSaturation`

The private `hslSaturation` function inside `perceptual.js` receives the output of `hexToRgb`, which returns an array of three integers in the range 0-255. The function divides each by 255 (producing values in [0, 1]), computes `max`, `min`, and `d = max - min`, and then computes HSL saturation using two possible formulas depending on lightness. All operations are bounded-range floating-point arithmetic. There is no loop, no unbounded allocation, and no possibility of division by zero: the early return `if (d === 0) return 0` guards the one denominator-dependent branch.

### Out-of-bounds reads

The pixel loop in `regionContrast` uses `imageData.data`, a `Uint8ClampedArray` with a fixed size determined by the `ImageData` constructor. The bounds check is explicit: `x1 = Math.max(0, x - 2)`, `y1 = Math.max(0, y - 2)`, `x2 = Math.min(W, x + w + 2)`, `y2 = Math.min(H, y + h + 2)`. The offset computation `(rowStart + xx) * 4` is bounded by `y2 <= H` and `xx < x2 <= W`, so the maximum offset is within the `Uint8ClampedArray` length. No out-of-bounds read is possible.

### Infinite loops

The `kmeans2` function has a fixed iteration cap of 60. The pixel loops are bounded by the clamped region dimensions. No infinite loop is possible.

### Unbounded memory allocation

The `lums` array is allocated as `new Float64Array(rw * rh)` where `rw` and `rh` are bounded by `imageData.width` and `imageData.height`, which are set by `decodeAndResize` to a bounded canvas size. No unbounded allocation.

Conclusion: the vestibular check is safe. All colour values are bounded integers, all arithmetic is bounded floating-point, there are no unbounded loops, and there is no possibility of out-of-bounds memory access.

---

## 4. Output Schema Changes

### Schema changes in `schema.js`

The branch adds the `VestibularResult` typedef and the `vestibular` property to `ColourPair`. The `ColourPair` typedef now also formally declares `apca`, `cognitive`, and `overall`, which were already present in runtime objects on `main` but were undeclared in the schema file. The schema is JSDoc only; it has no runtime effect. Adding fields is additive and backward-compatible.

### Report object

The in-memory `ColourPair` objects now carry an additional `vestibular` property. All existing properties are present and unchanged. Consumers that only read the existing properties are unaffected.

### PDF export

`pdf.js` calls `pairChecks(p)` and iterates the returned array. `pairChecks` now returns six rows instead of four. The PDF table grows by one row per colour pair. The pdfmake layout uses `widths: ['auto', 'auto', 'auto', '*']`, which adapts to additional rows without overflow. No schema incompatibility.

### Markdown export

`markdown.js` calls `pairChecks(p)` and iterates the same array. The Markdown table grows by one row per colour pair. This is additive. The `checkInfoUrl('vestibular')` call resolves to `https://image-colour-contrast-checker.timdixon.net/#check-info-vestibular`, which matches the `#check-info-vestibular` anchor in `index.html`. The deep link is valid.

### Consumer compatibility

The `AnalysedEntry` contract between the UI layer and the export layer is unchanged. No consumer breakage.

---

## 5. Third-Party Dependencies

`package.json` has the same five dependencies as on `main`: three runtime (`@gutenye/ocr-browser ^1.4.8`, `onnxruntime-web ^1.26.0`, `pdfmake ^0.2.10`) and two devDependencies (`@gutenye/ocr-models ^1.4.2`, `vite ^5.4.10`). No new dependency was added.

No new `fetch` call, no new `eval`, and no new unsafe DOM write API is introduced. The application does not use React or similar frameworks; all DOM writes use `document.createElement` and `.textContent`. No change in that pattern.

---

## 6. Permission and Isolation

The service worker at `public/sw.js` is unchanged. The cross-origin isolation headers are injected by the service worker on every response and are not cached. The Vite dev server headers in `vite.config.js` are unchanged. The Content Security Policy gap from Finding 1 of the `main` review carries forward and is not affected by this branch.

---

## 7. Privacy Posture

The vestibular check takes two hex strings that are already present in the analysis result and performs pure arithmetic on them. It does not read image pixels directly, does not create any canvas element, does not allocate a new image-data buffer, and does not make any network request. The privacy claim ("your images never leave your device") is not affected by this change.

The zero-trust browser-only model is fully preserved. Image data does not leave the browser.

---

## 8. Pre-existing Issue Note: HARSH Status Not Surfaced in Overall Verdict

This is not a branch-introduced issue, but it is worth recording because the branch makes the pipeline more visible.

In `src/core/perceptual.js`, `cognitiveResult` can return `status: 'HARSH'`. In `src/core/analyse.js`, `overallVerdict` checks `p.cognitive.status === 'FAIL'` and `p.cognitive.status === 'WARN'`, but not `'HARSH'`. A `HARSH` cognitive result therefore does not push the overall verdict to `WARN`; it passes through as `PASS`. The repository's own `CLAUDE.md` explicitly notes that `HARSH` is "not a failure", so this may be intentional design. However, the expanded detail panel's `advancedStatus` in `checks.js` correctly maps `severity('HARSH')` to 1 (the same as `WARN`), so the detail panel and the top-level `overall` field are inconsistent.

Recommendation for Sonja: raise with Sean in a follow-up fix. Either document the `overall` field's intentional exclusion of `HARSH`, or add a `'HARSH'` branch to `overallVerdict` that maps it to `'WARN'`. This does not block the merge.

---

## 9. Verdict

The branch is safe to merge after Carol's test pass. Summary:

- No new OWASP findings. The two baseline findings from the `main` review (absent Content Security Policy, GoatCounter without Subresource Integrity hash) carry forward unchanged.
- No new privacy risk. The zero-trust browser-only model is preserved.
- No new external dependencies.
- No output schema breakage. PDF and Markdown consumers gain one additional check row; the `AnalysedEntry` contract is unchanged.
- No change to the service worker, the cross-origin isolation headers, or the permission boundary.
- One pre-existing functional inconsistency (HARSH status in the roll-up) is noted for a follow-up fix; it does not block this merge.
