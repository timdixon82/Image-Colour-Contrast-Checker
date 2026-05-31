# Feature-branch review: vestibular extension to the Image-Colour-Contrast-Checker

Author: Jacob, architect.
Date: 2026-05-23.
Branch: `claude/vestibular-checker-extension-O5NPm` (head commit `76a5968`).
Compared against: `main` (head commit `e4ee2b0`).
Repository: `timdixon82/Image-Colour-Contrast-Checker`, working clone at `Inputs/Image-Colour-Contrast-Checker/`.

## Purpose of this review

Tim confirmed on 2026-05-23 (Q38A) that this branch is not a separate extension. It is an additional per-pair check inside the existing tool. After the change, every foreground-and-background colour pair gets six checks instead of four:

1. WCAG 2.2 AA contrast (already on `main`).
2. WCAG 2.2 AAA contrast (already on `main`).
3. APCA perceptual contrast (already on `main` as one of the four).
4. Colour-vision-deficiency contrast across three dichromacies (already on `main`).
5. Vestibular saturation (new).
6. Cognitive verdict, a derived cascade (new).

The vestibular check flags highly saturated foreground-or-background pairings that can shimmer, which is a known vestibular discomfort trigger. The cognitive check cascades through every other check and reports a single plain-language verdict for the pair.

This review judges whether the change is ready to merge into `main`.

## 1. Diff summary against `main`

I walked every changed file end to end. The change set is small, focused, and well-bounded.

### Files added on the branch

- **`src/core/perceptual.js`** (new). Exports three pure functions: `apcaResult(fgHex, bgHex)`, `vestibularResult(fgHex, bgHex)`, and `cognitiveResult({ contrast, passAA, heightPx, apcaLc, maxSat })`. The APCA verdict logic was previously elsewhere (on `main` the four-check version still computed APCA, so this file consolidates and extends). The vestibular and cognitive verdicts are new. No DOM, no browser-only Application Programming Interface, safe to run in Node, a Web Worker, or the browser. The file imports `APCAcontrast` and `sRGBtoY` from `core/apca.js` and `hexToRgb` from `core/contrast.js`. Dependency direction is correct.
- **`src/export/checks.js`** (new). Exports `overallLine(report)`, `cvdStatus(pair)`, `advancedStatus(pair)`, `statusWord(status)`, `pairBadges(pair)`, `pairChecks(pair)`, and the `CHECK_GROUPS` array. This is the new shared shape that the web report, the Portable Document Format export, and the Markdown export all consume. It splits the six checks into two display groups (formal WCAG compliance and Advanced checks) and rolls the four advanced checks into a single `advancedStatus` badge. Previously this shape was inlined in each renderer; this file is the consolidation that makes the new layout possible without drift.

### Files changed on the branch

- **`src/core/schema.js`** (changed). Three new JSDoc typedefs added: `ApcaResult`, `VestibularResult`, `CognitiveResult`. The `ColourPair` typedef is extended with `apca`, `vestibular`, `cognitive`, and `overall` fields. No runtime code added (the file remains pure JSDoc, as ADR 0002 on `main` requires).
- **`src/core/analyse.js`** (changed). `annotatePairs(pairs)` now also calls `apcaResult`, `vestibularResult`, and `cognitiveResult` per pair and stores the results on the pair. A new helper `overallVerdict(p)` rolls every check into one of `PASS`, `WARN`, `FAIL`. The text-size proxy (`heightPx`) is computed from the minimum bounding-box height across the pair's bboxes, which is the correct conservative choice. No change to the pipeline shape or to the public Application Programming Interface (`analyseImage` still returns a `ReportData`).
- **`src/ui/report-view.js`** (changed). The detail panel now renders the six checks split into two groups using `pairChecks` and `CHECK_GROUPS`. The roll-up badges on a collapsed row use `pairBadges` (two WCAG badges, one Advanced badge). The summary table grows one column ("Advanced checks") next to the existing WCAG column. No renderer hardcodes "vestibular" or "cognitive": every renderer reads the shared `pairChecks` shape, which means PDF and Markdown automatically inherit the two new rows without their own diffs to the check list.
- **`src/export/markdown.js`** (changed). Imports `pairChecks`, `pairBadges`, `statusWord`, `CHECK_GROUPS` from `./checks.js` and renders the same six-check table the web report does, grouped the same way. No vestibular-specific code; it consumes the shared shape.
- **`src/export/pdf.js`** (changed). Same pattern as Markdown. Imports the shared shape and renders the grouped six-check table per pair.
- **`index.html`** (changed). The "What the checks mean" section gains two new `<details id="check-info-vestibular">` and `<details id="check-info-cognitive">` entries, plus an `id="check-info-overall"` panel explaining how the six checks roll up into the three badges. Headings remain in order (H1, H2, H3 with no skipped levels). The existing WCAG, APCA, and CVD entries keep their wording.
- **`privacy.html`** (changed). Small textual update to keep parity with `index.html` on the GoatCounter sentence. Not feature-related, but the change is benign.
- **`ARCHITECTURE.md`** (changed). The data-types table, the pipeline diagram, and the module reference are updated to mention `perceptual.js`, the new typedefs, and the six checks. Accurate against the code.
- **`README.md`** (changed). Headline changes from "four checks" to "six checks." Adds the vestibular and cognitive sentences. The "Vestibular and cognitive checks" bullet describes them in one line each. Accurate.
- **`CLAUDE.md`** (changed). The Architecture Guide for AI agents is updated alongside the code: the module map names `perceptual.js` and `checks.js`, the data-types section names the new typedefs, and the rules for `core/perceptual.js` and `export/checks.js` are spelled out. Version recorded as 0.2.20. Consistent.
- **`package.json`** (changed). Version bumped to `0.2.20`. No new dependencies. No script changes. The version bump follows the ADR 0005 manual-version-bump rule.

### Files not changed on the branch

- No change to `core/contrast.js`, `core/colour-vision.js`, `core/apca.js`, `core/image.js`, `adapters/paddle-ocr.js`, `render/canvas.js`, `export/strings.js`, `preloader.js`, `main.js`, `vite.config.js`, `scripts/copy-models.mjs`, `.github/workflows/deploy.yml`, or `public/sw.js`. The export contract (`AnalysedEntry[]`) is unchanged. The data-flow pipeline is unchanged.

The change is well scoped: it adds two pure-logic functions, one shared check-shape module, and the type definitions to match. Every renderer picks up the new checks through the shared shape, so the three outputs (web, Portable Document Format, Markdown) stay in sync by construction.

## 2. Architectural alignment

The change conforms to every Architecture Decision Record I recorded for `main`.

- **ADR 0001 (client-side-only browser application, no server).** Unchanged. The new checks are pure mathematical functions on hex colour strings; nothing is sent off the device.
- **ADR 0002 (layered project structure with strict dependency direction).** Preserved exactly. `core/perceptual.js` imports only from `core/apca.js` and `core/contrast.js`; it does not import from `render`, `ui`, `export`, or `adapters`. `export/checks.js` imports nothing from `core/image.js`, `adapters`, or `ui`. The renderers continue to consume `AnalysedEntry[]` and the shared check shape, not internal app state. No dependency rule is violated by any file in the diff.
- **ADR 0003 (PaddleOCR PP-OCRv4 via `@gutenye/ocr-browser`).** Unchanged. The OCR adapter is not touched.
- **ADR 0004 (single export contract, `AnalysedEntry[]`, with strings centralised).** Preserved and strengthened. `export/checks.js` is a new shared shape that sits next to `export/strings.js` and is the canonical source for "what the six checks look like." Both the PDF and the Markdown exports consume it. No hardcoded check list anywhere in the renderers.
- **ADR 0005 (Vite, two HyperText Markup Language entry points, no framework, manual version bumping).** Preserved. The version is bumped to 0.2.20 in `package.json`, which is the rule until release-please is added.
- **ADR 0006 (no user-interface framework).** Preserved. The renderer still uses `document.createElement` and `appendChild`. No `innerHTML` is used for any user-derived value (the only `innerHTML` calls are static literal template strings in `renderSummary` and `renderContrastResults`, which is the same pattern already present on `main`).
- **ADR 0007 (bundled runtime dependencies with vendored model files).** Unchanged. No new dependency. No model file changed.
- **ADR 0008 (hand-written service worker for cross-origin isolation and persistent model caching).** Unchanged. `public/sw.js` is not touched. `MODEL_CACHE` does not need a bump because no model or runtime file changed.
- **ADR 0009 (GoatCounter analytics).** **Improved on this branch.** `public/count.js` is now present and is the vendored, self-hosted copy of the GoatCounter client. The script tag in `index.html` and `privacy.html` reads `src="count.js"` (same-origin) instead of the previous `src="//gc.zgo.at/count.js"` (third-party). This closes one of the two non-cosmetic risks I flagged in the `main` review. Two leftover items remain: the new `count.js` carries no recorded provenance or version-pin (it's listed as "vendored, ISC" in `ARCHITECTURE.md`, which is good, but neither the file header nor `package.json` records an upstream version), and the project-wiki sign-off ADR is still to be written. Both should land in the setup build, not in this branch.

### New concept introduced by this branch

There is one new concept the branch adds that I think is worth flagging as an architecture observation, even though no new Architecture Decision Record is needed:

**A "shared check shape" module.** `src/export/checks.js` is a new layer between the pure analysis (`core/`) and the renderers (`ui/`, `export/pdf.js`, `export/markdown.js`). It does not generate any output; it shapes a `ColourPair` into the display rows and badges that every renderer then formats. This is the right place for it: it's not pure WCAG math (so it doesn't belong in `core/`), it's not output (so it doesn't belong in a particular `export/*.js`), and it's reused by three renderers (so it doesn't belong in any of them).

The pattern is mild and the file is small, but it deserves naming in the `CLAUDE.md` rules, which the branch already does. No new Architecture Decision Record is required because no design choice is being decided differently; the file is best read as an extension of ADR 0004 (the export contract). If a third feature later adds an "exports configuration" module of similar shape, the team could promote the pattern to a global wiki pattern; for now, leaving it as ICCC-internal is correct.

## 3. Implementation quality

Strong overall. Style is consistent with the rest of the codebase.

- **Naming.** Function names follow the existing convention: `apcaResult`, `vestibularResult`, `cognitiveResult` parallel the existing `cvdPairContrast`. Module names follow the existing convention (`perceptual.js`, `checks.js`). The badge helper `advancedStatus` parallels `cvdStatus` in the same file.
- **Comment density.** JSDoc on every exported function with parameter and return shapes. The header comment of `perceptual.js` names APCA's beta-only status explicitly, which is the right disclosure.
- **Pure-logic discipline.** `core/perceptual.js` imports only from other `core/` files, has no `document` reference, no `window` reference, and would run unchanged in a Web Worker or in Node. Confirmed by reading the file end to end.
- **Error handling.** `cognitiveResult` cascades through six conditions in a fixed order and returns the first match; the final fallback is `PASS`. The cascade order is deliberate (most serious first), which is how the same kind of rule was written for `overallVerdict` on `main`. `vestibularResult` handles the achromatic case correctly: `hslSaturation` returns 0 when red, green, and blue are equal (the early `if (d === 0) return 0` branch), so a pure-grey pair lands in the `SAFE` band.
- **Mathematical correctness of the saturation formula.** I traced `hslSaturation` against the standard HSL definition (Hue Saturation Lightness, per Cascading Style Sheets Color Level 3 and the original Smith 1978 paper). The formula `d / (2 - max - min)` when lightness exceeds 0.5 and `d / (max + min)` otherwise is the canonical Hue-Saturation-Lightness saturation. Returns a value in 0 to 1 which is then rounded to a percentage. Correct.
- **The `cognitiveResult` cascade.** The order is: text too small (height under 10 pixels) fails, then WCAG AA failure fails, then high saturation (max saturation at or above 80) fails, then an extremely bright APCA pairing (absolute Lc above 105) warns, then a "bright and saturated" pairing (max saturation above 65 and contrast above 10) warns, then very high contrast (above 18) reports `HARSH`, else `PASS`. The cascade is well thought through and the messages are written in plain language. One small thing: the `HARSH` status is new (it appears only in this cascade), and the on-page glossary at `#check-info-cognitive` explains that a `HARSH` result is "not a failure" but a flag. That is the right framing.
- **Test coverage.** None. There are no unit tests in the repository (this matches the `main` baseline I flagged in the architecture review). The setup build will add a small `vitest` suite for `core/perceptual.js`, `core/contrast.js`, and `core/colour-vision.js`. This is not a blocker for the merge, but I want to record it: the new module is small, pure, and exactly the kind of code that wants a test file. A `tests/core/perceptual.test.js` covering eight to ten cases (one per band, one boundary value per threshold, one achromatic pair) would be ten minutes of work and would prevent any later regression on the saturation thresholds. Worth doing in the setup build immediately after the merge.

No style violations found. No naming inconsistencies found. No leftover console statements, no commented-out code, no `TODO` markers anywhere in the four named implementation files.

## 4. Vestibular check algorithm

This is the most important area of the review. The check is small, but the thresholds are the load-bearing design choice and they need to be defensible.

### What the algorithm computes

For each colour pair, the algorithm:

1. Reads the foreground and the background as integer red-green-blue triples (the hex string is parsed by `hexToRgb`, which already lives in `core/contrast.js`).
2. Converts each triple to Hue-Saturation-Lightness saturation by the canonical formula (`hslSaturation` returns a value 0 to 100).
3. Takes the higher of the two saturation values (`maxSat = max(fgSat, bgSat)`).
4. Buckets `maxSat` into one of three bands:
   - `maxSat` 80 or higher: `HIGH` ("Very saturated; can shimmer and cause sensory overload.").
   - `maxSat` 60 to 79: `WARN` ("Moderately saturated; may shimmer for sensitive viewers.").
   - `maxSat` under 60: `SAFE` ("Low saturation; no shimmer risk.").

The check measures both colours because saturated text shimmers as readily as a saturated background does. This is the right design.

### What the thresholds are drawn from

I read `src/core/perceptual.js`, the `<details id="check-info-vestibular">` entry in `index.html`, the headline copy in `README.md`, the relevant section of `ARCHITECTURE.md`, and the `CLAUDE.md` file. **No source is cited anywhere for the 60 % and 80 % thresholds.** The on-page glossary describes the bands but does not say where the cut-offs come from.

- The Web Content Accessibility Guidelines 2.2 does not define a saturation threshold. Success Criterion 2.3.1 (Three Flashes or Below Threshold) addresses flashing in motion, not still-image saturation; Success Criterion 2.3.3 (Animation from Interactions) is about user-triggered motion. Neither would justify a 60 or 80 percent figure on a saturation axis.
- The World Wide Web Consortium has a "Cognitive Accessibility Roadmap and Gap Analysis" (Editor's Draft) and the "Making Content Usable for People with Cognitive and Learning Disabilities" Note. Both name colour and saturation as risk factors qualitatively. Neither sets a numeric saturation threshold.
- I am not aware of a published peer-reviewed paper that pins the vestibular shimmer threshold at a specific Hue-Saturation-Lightness saturation percentage. The accessibility literature on photosensitive epilepsy (the Harding Flash and Pattern Analyser thresholds, ISO/IEC 60601-2-57) is about luminance flicker rate, not still saturation, and so does not transfer.
- The thresholds are therefore an in-house heuristic. They feel defensible — 80 percent saturation captures very intense colours that anyone would describe as "vivid," and 60 percent captures the borderline — but the source is the author's judgement, not a citation.

### Verdict on the algorithm

The algorithm itself is sound: measuring saturation in Hue-Saturation-Lightness on both colours and taking the maximum is the right shape. The thresholds are credible. They are not arbitrary in the sense of "picked at random," but they **are arbitrary in the sense of "not traceable to a published source."** This needs to be said plainly to the reader, both in the code and in the on-page glossary, before the branch merges. Three small edits cover it:

1. **Add a one-paragraph source note to the header of `src/core/perceptual.js`** along the lines of "The 60 / 80 saturation bands are the project's in-house heuristic for flagging shimmer risk on still images. The Web Content Accessibility Guidelines do not define a saturation threshold; the wider literature treats vestibular trigger thresholds qualitatively rather than numerically. Reviewers should adjust the bands as evidence improves." This is the most important edit. It is two sentences and ten minutes of work.
2. **Add the same sentence to the `<details id="check-info-vestibular">` entry in `index.html`** so a sighted or screen-reader user who opens the glossary sees the provenance. The current copy explains what is measured and what the bands are but not where they come from. The reader deserves the honesty.
3. **Re-word the `cognitiveResult` "High saturation can cause sensory overload" message** to soften the implied confidence. The current copy reads as a clinical claim. A more honest framing is "High saturation can feel uncomfortable for sensitive viewers." This is the same point made differently: the band threshold is a project heuristic, not a clinical finding, so the language should match.

None of these is a blocker. They are minor edits that bring the wording into line with the accessibility ethic the rest of the application already shows.

## 5. Dependencies

- **No new third-party runtime dependencies.** `package.json` is unchanged except for the `version` field.
- **No new development dependencies.** `vite` and `@gutenye/ocr-models` are unchanged.
- **No new Content Delivery Network script tags.** The `count.js` script remains same-origin (and is in fact better placed on this branch than on `main`).
- **Version pinning.** `package.json` carries caret pins and `package-lock.json` (unchanged on this branch except for the version bump) carries the exact versions. Standard.
- **Subresource Integrity hashes.** Not applicable to this diff. No third-party script tag is added; the existing `count.js` is same-origin and so does not need a hash.
- **Deviation from `docs/decisions/006-adopted-static-project-standards.md`.** None introduced by this branch. The pre-existing deviations I named in the architecture review (no linter manifest, no release-please, no Content Security Policy, no test job in continuous integration) all carry over from `main`. They are setup-build items, not feature-branch items.

The branch is dependency-clean.

## 6. Compatibility

I checked every contract the branch touches.

- **`AnalysedEntry`, the export contract.** Unchanged. The export modules still accept the same array shape.
- **`ReportData`, the analysis output.** The shape gains four fields on each `ColourPair` (`apca`, `vestibular`, `cognitive`, `overall`). All four are required; an `AnalysedEntry` produced by the new code will not be processable by an older renderer that does not know about these fields. This is not a public Application Programming Interface in any external sense (no other repository consumes `ReportData`), but it is worth recording: any future fork or downstream tool reading `ReportData` would need to update. The change is monotone — fields are added, none are removed — so anything that ignores the new fields is unaffected. The existing renderers ignore nothing; they all consume the new fields through the shared shape.
- **Existing four checks.** `pairBadges` and `pairChecks` continue to compute WCAG AA, WCAG AAA, APCA, and CVD-contrast for every pair, with the same threshold values as on `main`. Nothing in the diff alters the WCAG math primitives in `core/contrast.js` or the CVD math in `core/colour-vision.js`. Behaviour for the previous four checks is preserved exactly.
- **Public report layout.** The summary table grows from "WCAG" to "WCAG + Advanced checks" (one new column). The detail panel grows from a flat four-check table to a two-group six-check table (WCAG compliance group, Advanced checks group). The expandable-row pattern is preserved. The on-page anchors (`#check-info-wcag-aa`, `#check-info-wcag-aaa`, `#check-info-apca`, `#check-info-cvd`) are preserved; two new anchors (`#check-info-vestibular`, `#check-info-cognitive`) are added without changing the existing ones. Old deep links still work.
- **Portable Document Format and Markdown exports.** The exporters produce the same per-pair block shape as before, with two additional rows (Vestibular, Cognitive) inside the per-pair table and the new Advanced-checks badge alongside the existing AA and AAA badges. A user generating a Portable Document Format on this branch will get a slightly longer report than on `main` for the same input image, but every cell that existed on `main` still exists in the same place. Backwards-readable.

No regression risk identified.

## 7. Tim Dixon brand and design-system tokens

I checked `index.html`, the new glossary entries, and `src/ui/report-view.js` against `docs/brand.md` and the design-system tokens documented in `src/styles.css` (palette, focus-visible ring, minimum 44 pixel touch targets, status pill background rules).

- **The branded header (`<header class="app-header">`)** is unchanged on this branch. Navy primary background, orange accent under-line, the same `<h1>` markup. No regression.
- **Status pill colours.** The new Vestibular and Cognitive checks use the existing `pill-pass`, `pill-warn`, and `pill-fail` classes via the `pillClass(status)` helper. `HIGH` maps to `pill-fail`, `SAFE` maps to `pill-pass`, `WARN` and `HARSH` both map to `pill-warn`. No new colour token is introduced. The contrast ratios documented in `CLAUDE.md` for these pills (light mode at or above eight to one, dark mode at or above seven-point-nine to one) therefore apply unchanged.
- **The new `Advanced checks` column header** uses the existing `<th scope="col">` pattern. No new heading style needed.
- **The new info-link affordance (the small letter "i" next to each check name in the detail panel).** Already present on `main` via `infoLink(id, label)`; the branch adds the same affordance to the two new check rows. Focus-visible ring, 44 pixel target rule, and `aria-label` are inherited from the helper. Correct.
- **No new typography.** The new glossary entries use the same `<details>` and `<summary>` elements as the existing ones.
- **No emoji-led headings** introduced.
- **No new image assets** introduced.

The brand and the design-system tokens are consumed correctly. The branch adds no visual element that would justify a new token.

## 8. Verdict

**Ready to merge after the listed minor edits.**

The change is well-scoped, well-layered, dependency-clean, and architecturally aligned with every Architecture Decision Record I recorded for `main`. It also closes one of the two non-cosmetic risks from the architecture review (the GoatCounter `count.js` script is now self-hosted on the branch). The branch is not blocked.

The minor edits required before merge:

1. **Record the provenance of the vestibular saturation thresholds.** Add a one-paragraph source note to the header of `src/core/perceptual.js` saying the 60 / 80 bands are the project's in-house heuristic and that no Web Content Accessibility Guidelines criterion or published paper pins a saturation threshold. (Most important edit in this review.)
2. **Mirror the source note in `index.html`** under the `<details id="check-info-vestibular">` entry, so an end-reader sees the same provenance the code records.
3. **Soften the "High saturation can cause sensory overload" wording** in `cognitiveResult` to something like "High saturation can feel uncomfortable for sensitive viewers." Consistent with the heuristic framing.

Nice-to-have, not required for the merge:

4. **Add a small `vitest` suite for `core/perceptual.js`.** Eight to ten cases covering the band boundaries and the achromatic edge case. Belongs in the setup build, not in this branch.
5. **Record the upstream provenance of the new `public/count.js`** in a one-line file header or in `package.json` (a URL and a date pulled, or the upstream version tag). Belongs in the setup build's GoatCounter Architecture Decision Record, not in this branch.

If Tim wants the three required edits applied before the merge, Sean's smallest unit of work is the three text edits in the order above; the changes are confined to two files (`src/core/perceptual.js` and `index.html`). The branch can then be re-pushed and the merge gate run.

If Tim prefers to merge as-is and capture the three edits as a follow-up, the merge is still safe: the heuristic thresholds are documented in `ARCHITECTURE.md`'s "Design decisions" area implicitly, and the on-page glossary explains what the check measures. The risk is reputational rather than technical: the on-page text reads with a confidence the literature does not yet support.

## Questions for Tim

Four open questions, gathered for Sonja to put to Tim in a single batch. Sonja allocates question numbers from the team's continuous Q sequence (intake conversation said the next free number is Q39).

**Q-unset.** The vestibular saturation thresholds (60 % WARN, 80 % HIGH) are an in-house heuristic. They are credible but not traceable to a published source. Does Tim want the three small wording edits (source note in `core/perceptual.js`, source note in `index.html`, softened cognitive-cascade message) to land before the merge, or as a follow-up immediately after?

- Option A: apply the three edits before the merge. Sean prepares them and re-pushes the branch; Carol re-tests; Sonja runs the merge gate. (Recommended.)
- Option B: merge as-is now, and open a follow-up issue for the three edits to land as the first commit on `main` afterwards. Slightly faster, but ships the on-page text in its current confident form for the short window before the follow-up lands.
- Option C: defer the wording question entirely and merge as-is.

**Q-unset.** The new `core/perceptual.js` module is pure, small, and exactly the kind of code that wants a unit test. The repository has no test suite today. Does Tim want the setup build to add a `vitest` suite covering `core/perceptual.js`, `core/contrast.js`, and `core/colour-vision.js` as its first developer-tooling addition?

- Option A: yes, add the `vitest` suite in the setup build, alongside the linter manifests. (Recommended; lifts the team's standard onto the project once.)
- Option B: defer testing to a later piece of work and ship the lint job first.
- Option C: rely on Carol's functional tests in the work folder rather than committing automated tests to the repository.

**Q-unset.** The branch adds three new field types to `ColourPair` (`apca`, `vestibular`, `cognitive`) and the rolled-up `overall`. Once these merge, any downstream code reading `ReportData` would need to update. There is no known downstream code today. Does Tim want the team to record this as a soft data-shape ratchet (the type is allowed to grow, never to shrink) in the project Architecture Decision Records?

- Option A: yes, record a small project Architecture Decision Record ("Adding fields to `ColourPair` is allowed; renaming or removing fields requires a new decision"). Cheap insurance. (Recommended.)
- Option B: no formal rule yet; revisit if a downstream tool ever consumes `ReportData`.
- Option C: tighten further: any change to `ColourPair` needs a project Architecture Decision Record (more cautious, more friction).

**Q-unset.** The branch already vendors `public/count.js` (the GoatCounter analytics client) as a same-origin file. The earlier architecture review of `main` flagged the third-party `gc.zgo.at` `count.js` as a supply-chain risk; the branch fixes it. The remaining gap is the absence of a recorded upstream version and provenance for the vendored file. Should this be closed on the feature branch or in the setup build?

- Option A: close it in the setup build, alongside the project Architecture Decision Record for GoatCounter analytics. The branch already does enough by self-hosting. (Recommended.)
- Option B: close it on the feature branch before the merge, by adding a one-line header to `public/count.js` recording the upstream Uniform Resource Locator and the date the file was pulled.
- Option C: defer entirely; record only at the next monthly housekeeping pass.

## Hand-back to Sonja

The full detail is above. The verdict is "ready to merge after the listed minor edits." The merge is not blocked. The most important pre-merge edit is the vestibular threshold provenance note; the other two listed edits are short and cheap and tighten the on-page wording. The four open questions are gathered for the next batch to Tim.

The two cross-cutting flags worth carrying to Sonja for the global wiki later, if she chooses:

- **A "shared check-shape" pattern.** `export/checks.js` is the right shape for any future tool that has more than one renderer and more than three check types. Worth a global wiki pattern entry once a second project needs it.
- **The "in-house heuristic" disclosure pattern.** The provenance edit recommended for `core/perceptual.js` is a small pattern: when a project pins a threshold the literature does not pin, the code's header comment and the on-page glossary entry both say so plainly. Worth a global wiki note as part of the team's accessibility writing standards, alongside the existing "manual verification is required before citing for formal WCAG compliance" disclaimer.

Both are flags only; the call on whether to promote them belongs to Sonja.
