# Sonja conformance check: ICCC PR 7

Date: 2026-05-28
Reviewer: Sonja (orchestrator)
Pull request: timdixon82/Image-Colour-Contrast-Checker PR 7
Branch: `claude/vestibular-checker-extension-O5NPm` (HEAD `debf902`)
Base: `main` (HEAD `efe0a50`, PR 6 setup merge)

---

## Purpose

Carol's release checklist (item 10) requires Sonja to verify five conformance items before the merge gate opens. This document records that check.

---

## Check 1: Browser AI Application standing standards

**Result: Pass.**

Jacob's architecture review (2026-05-23, `jacob-feature-branch-review.md`) confirmed the change set is "small, focused, and well-bounded." The new `src/core/perceptual.js` module exports three pure functions with no DOM, no browser-only API, and a correct dependency direction (importing only from `core/apca.js` and `core/contrast.js`). The five other modified files extend the existing pipeline without altering the layered structure recorded in ADR 002 (layered structure) and ADR 001 (client-side only). The three new checks (vestibular, CVD-contrast roll-up, cognitive) follow the same `pairChecks` shape as the existing WCAG and APCA checks, maintaining the data contract (ADR 004). No new runtime dependencies were introduced; the three unchanged dependencies are @gutenye/ocr-browser, onnxruntime-web, and pdfmake.

Jacob required three pre-merge edits: (1) a threshold provenance note in `perceptual.js`, (2) an on-page glossary entry, and (3) a softened cognitive message. Carol confirmed all three are present at HEAD `debf902` (carol-release-checklist-pr7.md, rework verification section).

## Check 2: GitHub Pages security-header standing exception

**Result: Pass.**

The standing exception is documented at `docs/exceptions/github-pages-headers.md` in the ICCC repository. The conditions for the exception are met: no external scripts or styles from third-party origins; all external fonts and large binaries are bundled through the Vite build (opencv.js, onnxruntime-web). The self-hosted `public/count.js` analytics client does not introduce a new third-party origin. The exception remains valid for PR 7.

## Check 3: CSP covers ONNX/WASM worker pattern

**Result: Pass.**

The CSP meta tag on `index.html` and `privacy.html` was set in commit `5db8941` on the feature branch (upstream of `debf902`). It includes `wasm-unsafe-eval` and `unsafe-eval` directives required by the ONNX Runtime Web and OpenCV.js WASM workers. Carol confirmed the head treatment in the release checklist conflict-resolution section (item 5): "CSP and Referrer-Policy meta from PR 6 placed first in `<head>`. GoatCounter `count.js` follows. Duplicate `<body>` script from PR 6 not carried over. Correct."

No new WASM or worker code was introduced by the vestibular extension. The existing CSP coverage is unchanged and sufficient.

## Check 4: Self-hosted count.js and GoatCounter endpoint match ADR 009

**Result: Pass.**

Carol confirmed in the release checklist (item 7, security and privacy): "GoatCounter `count.js` self-hosted at `public/count.js`. No third-party script load introduced." The ICCC project opts out of the team's default `timdixon82.goatcounter.com` counter and uses its own `iccc.goatcounter.com` site, as recorded in ADR 009 in the ICCC project wiki. This is a confirmed correct configuration; the vestibular extension does not touch the analytics setup.

## Check 5: HARSH-status fix is architecturally consistent with Jacob's model

**Result: Pass.**

Jed identified a pre-existing HARSH-status inconsistency during the security review: the `overallVerdict` function in `src/core/checks.js` had an inconsistency in how it handled the HARSH cognitive status. Carol confirmed the fix is in place at HEAD `debf902` (carol-release-checklist-pr7.md, section 2): "HARSH handled in WARN branch of `overallVerdict` (line 30) matching severity(1) in checks.js line 73." Jacob's architectural model requires the `pairChecks` shape to be consistent across all six checks; the HARSH fix restores that consistency.

---

## Overall result

**All five items pass. The merge gate is clear from the conformance side.**

### Gate summary

| Gate item | Status |
| --- | --- |
| CI (9 checks) | Pass — all green at HEAD `debf902` |
| Jacob pre-merge edits | Pass — all three confirmed at HEAD |
| Carol accessibility sign-off | Pass with notes (non-blocking) |
| Jed security sign-off | Pass |
| Sonja conformance check | Pass — this document |
| Screen-reader evidence gate | Suspended per CLAUDE.md until automated passes are available |

PR 7 is ready to merge at Tim's express approval. Tim has indicated he is not merging at this time.

---

## Note on release-please manifest

Carol flagged that `.release-please-manifest.json` would be updated by release-please on merge (not verified pre-merge). This is correct behaviour under the simple release type: release-please reads the VERSION file and updates the manifest automatically. No action needed before merge.
